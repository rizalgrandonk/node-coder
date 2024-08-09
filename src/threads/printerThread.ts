import "dotenv/config";
import { expose } from "threads";
import { sleep } from "../utils/helper";
import { SharedPrimitive, SharedQueue } from "../utils/sharedBuffer";
import LiebingerClass, {
  MACHINE_STATE,
  NOZZLE_STATE,
  ConnectionStatus,
} from "../actions/leibinger";
import { setBulkUNEStatus } from "../services/uniquecodes";
import * as ErrorCodeService from "../services/errorcode";
import {
  parseCheckMailingStatus,
  parseCheckPrinterStatus,
  parseCurrentCouter,
} from "../utils/leibinger";
import { isMainThread } from "worker_threads";

const MIN_PRINT_QUEUE = Number(process.env.MIN_PRINT_QUEUE ?? 180);
const CONNECTION_ERROR_LIST = {
  CLOSED: "PRINTER CONNECTION CLOSED",
  ERROR: "PRINTER CONNECTION ERROR",
  ENDED: "PRINTER CONNECTION ENDED",
};

// ? Configuration for printer connection
const PRINTER_CONNECTION = process.env.PRINTER_CONNECTION
  ? (process.env.PRINTER_CONNECTION as "socket" | "serial")
  : "socket";

// ? Initialize printer instance based on connection type
const printer = new LiebingerClass(
  PRINTER_CONNECTION === "socket"
    ? {
        connectionType: PRINTER_CONNECTION,
        connectionConfig: {
          host: process.env.SOCKET_HOST ?? "0.0.0.0",
          port: Number(process.env.SOCKET_PORT ?? 515),
        },
      }
    : {
        connectionType: PRINTER_CONNECTION,
        connectionConfig: {
          portOptions: {
            path: process.env.SOCKET_HOST ?? "",
            baudRate: 115200,
          },
          parserOptions: {
            delimiter: "\r\n",
          },
        },
      }
);

let printCounter: SharedPrimitive<number>;
let isPrinting: SharedPrimitive<boolean>;
let isPrinterFinished: SharedPrimitive<boolean>;
let clientDisplayMessage: SharedPrimitive<string>;
let printQueue: SharedQueue;
let printedQueue: SharedQueue;
let DBUpdateQueue: SharedQueue;
let isFirstRun: boolean = true;
let isFirstRefill: boolean = true;
let lastUpdate: boolean = false;
let lastMailingStatusKey: string;
let sameMailingStatusCounter: number;
let prevLastStartPrinNo: number;

let isPrinterStopping: boolean = false;

let mailingCounter: number;
const setMailingCounter = (value: number) => {
  mailingCounter = value;
  return mailingCounter;
};
const incrementMailingCounter = () => {
  return setMailingCounter(mailingCounter + 1);
};

type InitParams = {
  isPrintBuffer: SharedArrayBuffer;
  printBuffer: SharedArrayBuffer;
  printedBuffer: SharedArrayBuffer;
  printCounterBuffer: SharedArrayBuffer;
  DBUpdateBuffer: SharedArrayBuffer;
  displayMessageBuffer: SharedArrayBuffer;
  isPrinterFinishedBuffer: SharedArrayBuffer;
};
// ? Initialization function for shared buffers
const init = ({
  isPrintBuffer,
  printCounterBuffer,
  printBuffer,
  printedBuffer,
  DBUpdateBuffer,
  displayMessageBuffer,
  isPrinterFinishedBuffer,
}: InitParams) => {
  printCounter = new SharedPrimitive<number>(printCounterBuffer);
  isPrinting = new SharedPrimitive<boolean>(isPrintBuffer);
  clientDisplayMessage = new SharedPrimitive<string>(displayMessageBuffer);
  printQueue = new SharedQueue(printBuffer);
  printedQueue = new SharedQueue(printedBuffer);
  DBUpdateQueue = new SharedQueue(DBUpdateBuffer);
  isPrinterFinished = new SharedPrimitive<boolean>(isPrinterFinishedBuffer);
};

// ? Function for wait until the printer connection is ready
const waitConnectionReady = async () => {
  if (printer.getConnectionStatus() === "connect") {
    return true;
  }
  await Promise.race([
    new Promise((resolve) => {
      const changeHandler = (status: ConnectionStatus, error?: Error) => {
        console.log(
          "printer.getConnectionStatus()",
          printer.getConnectionStatus()
        );
        console.log("status", status);
        if (status === "connect") {
          printer.offConnectionChange(changeHandler);
          resolve(true);
        }

        if (!isPrinting.get() && isPrinterFinished.get()) {
          resolve(true);
        }
      };
      printer.onConnectionChange(changeHandler);
    }),
    new Promise((resolve) => {
      const interval = setInterval(() => {
        console.log(
          "printer.getConnectionStatus()",
          printer.getConnectionStatus()
        );
        if (printer.getConnectionStatus() === "connect") {
          resolve(true);
          clearInterval(interval);
        }
        if (!isPrinting.get() && isPrinterFinished.get()) {
          resolve(true);
        }
      }, 1000);
    }),
  ]);

  return printer.getConnectionStatus() === "connect";
};

const listenPrinterResponse = async () => {
  return await new Promise<void>((resolve) => {
    const connectionChangeHandler = async (
      status: ConnectionStatus,
      err?: Error
    ) => {
      if (status === "close") {
        console.log("Printer Connection Closed", printedQueue.size());
        refillDBUpdateQueue(printedQueue.size());
        isPrinting.set(false);
        isPrinterFinished.set(true);

        clientDisplayMessage.set(CONNECTION_ERROR_LIST.CLOSED);

        printer.offData(listenerHandler);
        printer.offConnectionChange(connectionChangeHandler);
        resolve();
      } else if (status === "error") {
        console.log("Printer Connection Error", err, printedQueue.size());
        refillDBUpdateQueue(printedQueue.size());
        isPrinting.set(false);
        isPrinterFinished.set(true);
        clientDisplayMessage.set(CONNECTION_ERROR_LIST.ERROR);

        printer.offData(listenerHandler);
        printer.offConnectionChange(connectionChangeHandler);
        resolve();
      } else if (status === "end") {
        console.log("Printer Connection Ended", printedQueue.size());
        refillDBUpdateQueue(printedQueue.size());
        isPrinting.set(false);
        isPrinterFinished.set(true);
        clientDisplayMessage.set(CONNECTION_ERROR_LIST.ENDED);

        printer.offData(listenerHandler);
        printer.offConnectionChange(connectionChangeHandler);
        resolve();
      } else if (status === "connect") {
        console.log("Printer Connection Established");
        if (
          Object.values(CONNECTION_ERROR_LIST).includes(
            clientDisplayMessage.get()
          )
        ) {
          clientDisplayMessage.set("");
          await printer.checkPrinterStatus();
        }
      }
    };

    const listenerHandler = async (printerResponseBuffer: Buffer) => {
      const printerResponse = printerResponseBuffer.toString();

      console.log({ printerResponse });
      await sleep(100);

      if (printer.getConnectionStatus() !== "connect") {
        console.log("LISTENER HANDLER - Connection Lost, wait till connect");
        await waitConnectionReady();
        await printer.checkPrinterStatus();
        return;
      }

      if (!printerResponse.startsWith("^0")) {
        clientDisplayMessage.set(printerResponse);
        if (printedQueue.size() > 0) {
          // Flush Printed Queue
          const deletedQueue = printedQueue.shiftAll();

          // Update uniquecode SET coderstatus = 'UNE'
          const deletedQueueIds = deletedQueue.map((item) => item.id);
          await setBulkUNEStatus(deletedQueueIds, new Date());
        }
        // TODO: Send Error Code To PLC
        // DO NOT SEND ANY COMMAND
        return;
      }

      // Check if response length is not more than 5
      if (printerResponse.length < 5) {
        // DO NOT SEND ANY COMMAND
        return;
      }

      // Handle as printer status
      if (printerResponse.startsWith("^0=RS")) {
        await handlePrinterStatus(printerResponse);
        if (!isPrinting.get() && isPrinterFinished.get()) {
          printer.offData(listenerHandler);
          printer.offConnectionChange(connectionChangeHandler);
          resolve();
        }
      }

      // Handle as mailing status
      if (printerResponse.startsWith("^0=SM")) {
        await handleMailingStatus(printerResponse);
      }
    };

    printer.onData(listenerHandler);

    printer.onConnectionChange(connectionChangeHandler);
  });
};

const run = async () => {
  console.log("PRINTER THREAD RUN");

  // Reset Thread State
  isPrinterStopping = false;
  sameMailingStatusCounter = 0;
  lastMailingStatusKey = "";

  setLastUpdate(false);
  setFirstRefill(true);

  const listener = listenPrinterResponse();

  if (printer.getConnectionStatus() !== "connect") {
    await waitConnectionReady();
  }

  console.log("PRINTER CONNECTED");
  // Reset Counter On First Run
  if (isFirstRun) {
    await printer.resetCounter();
    printCounter.set(0);
  } else {
    const productCounter = await getCounter();
    console.log({ productCounter });
    printCounter.set(productCounter);

    console.log({ productCounter }, "AFTER SET");
  }

  // ? Reset Mailing Counter
  setMailingCounter(0);

  prevLastStartPrinNo = printCounter.get();

  await printer.checkPrinterStatus();

  console.log("AFTER CHECK PRINTER STATUS");

  // set first run to true
  setFirstRun(true);

  console.log("WAIT LISTENER");
  await listener;
};

const getRefillCount = (values: {
  fifoEntries: number;
  maxPrintedQueueSize: number;
  lastStartedPrintNo: number;
}) => {
  const { fifoEntries, maxPrintedQueueSize, lastStartedPrintNo } = values;
  const toUpdateCount = lastStartedPrintNo - prevLastStartPrinNo;

  const actualFifoEntries = isPrinterFinished.get()
    ? fifoEntries - 1
    : fifoEntries;

  const fifoEntriesPrinter = actualFifoEntries + (isFirstRefill ? 0 : 1);

  const emptySlot = maxPrintedQueueSize - fifoEntriesPrinter;

  console.log({
    fifoEntries,
    isFirstRefill,
    actualFifoEntries,
    fifoEntriesPrinter,
    emptySlot,
    lastStartedPrintNo,
    prevLastStartPrinNo,
  });

  if (isFirstRefill) {
    isFirstRefill = false;
    return emptySlot;
  }

  if (isPrinterStopping) {
    return 0;
  }

  if (!isFirstRefill && lastStartedPrintNo > 0) {
    prevLastStartPrinNo = lastStartedPrintNo;
  }

  if (
    printedQueue.size() <= 0 &&
    fifoEntriesPrinter <= 1 &&
    prevLastStartPrinNo > 0 &&
    lastStartedPrintNo > 0 &&
    prevLastStartPrinNo !== lastStartedPrintNo
  ) {
    return emptySlot;
  }

  if (
    fifoEntriesPrinter === printedQueue.size() ||
    fifoEntriesPrinter > printedQueue.size()
  ) {
    return 0;
  }

  if (prevLastStartPrinNo > 0 && lastStartedPrintNo > 0 && !isFirstRefill) {
    if (
      toUpdateCount <= 0 &&
      printedQueue.size() - fifoEntriesPrinter > 0 &&
      !isPrinterStopping
    ) {
      return printedQueue.size() - fifoEntriesPrinter;
    }
    console.log("toUpdateCount", toUpdateCount);
    return Math.max(toUpdateCount, 0);
  }

  // return Math.max(printedQueue.size() - fifoEntriesPrinter, 0);
  // return fifoEntriesPrinter === printedQueue.size() ||
  //   fifoEntriesPrinter > printedQueue.size()
  //   ? 0
  //   : printedQueue.size() - fifoEntriesPrinter;

  if (fifoEntriesPrinter > 0 && fifoEntriesPrinter < printedQueue.size()) {
    return printedQueue.size() - fifoEntriesPrinter;
  }

  return 0;

  /**
   * Refill count based on lastStartedPrinNo when not first refill
   * Program will use this formula if previous lastStartedPrinNo > 0
   * and its not the first refill
   */
  // if (prevLastStartPrinNo > 0 && toUpdateCount > 0 && !isFirstRefill) {
  //   console.log("toUpdateCount", toUpdateCount);
  //   return toUpdateCount;
  // }

  // if (actualFifoEntries > 0 && printQueue.size() === 0 && !isFirstRefill) {
  //   console.log(
  //     "actualFifoEntries > 0 && printQueue.size() === 0 && !isFirstRefill",
  //     toUpdateCount
  //   );
  //   return 0;
  // }
  /**
   * Refill count based on maxPrintedQueueSize and fifoEntries
   * It will prevent mismatch updated value when user manual adjust counter on device without print any code
   */
  // if ((actualFifoEntries > 0 || isFirstRefill) && emptySlot > 0) {
  //   console.log("emptySlot", emptySlot);
  //   return emptySlot;
  // }

  // Fallback value
  // return 0;
};

// Handle Printer Status Response
const handlePrinterStatus = async (printerResponse: string) => {
  const { machineState, errorState, nozzleState } =
    parseCheckPrinterStatus(printerResponse);

  // console.log({
  //   machineState,
  //   errorState,
  //   nozzleState,
  //   isFirstRun,
  //   isPrinterFinished: isPrinterFinished.get(),
  //   isPrinting: isPrinting.get(),
  //   lastUpdate,
  // });

  // If there is no print action initiated from client
  if (!isPrinting.get() && lastUpdate) {
    console.log("STOP PRINTING");
    clientDisplayMessage.set("STOP PRINTING");

    // Stop Printer Status
    if (machineState === MACHINE_STATE.READY) {
      console.log("disini stop print printer status");
      await printer.stopPrint();
      // ? Set printer stop for get refill count
      isPrinterStopping = true;

      await printer.checkPrinterStatus();
    }

    // End Printing Process
    else {
      await printer.showDisplay();

      // Mask the current printer display
      // const currentPrintCounter = incrementPrintCounter();
      await printer.appendFifo(0, "XXXXXXXXXX");

      // Set Printer Finished to Stop DatabaseThread Process
      isPrinterFinished.set(true);

      /** --- PRINTING ENDED --- */
      await printer.checkMailingStatus();
    }
  }

  // Check if printer in error condition
  else if (errorState != 0) {
    console.log("aku ada error", errorState, printerResponse);
    const identifiedErrors = await ErrorCodeService.findByCode(
      errorState.toString()
    );
    const skipableError = ErrorCodeService.skipableError().find(
      (err) => err.errorcode === errorState.toString()
    );

    // Update Client Display Message if error is not identified
    if (identifiedErrors?.length <= 0) {
      clientDisplayMessage.set(`Unidentified Error Code: ${errorState}`);
    }

    // Update Client Display Message if error is not skipable error
    else if (identifiedErrors?.length > 0 && !skipableError) {
      clientDisplayMessage.set(identifiedErrors[0]?.errorname);
    }

    console.log("aku close error", errorState);

    setFirstRefill(true);
    await printer.closeError();
    await printer.checkPrinterStatus();
  }

  // Open Nozzle if nozzle is CLOSED and update Client Display Message
  else if (
    nozzleState === NOZZLE_STATE.CLOSED ||
    nozzleState === NOZZLE_STATE.CLOSING ||
    nozzleState === NOZZLE_STATE.INBETWEEN
  ) {
    await printer.openNozzle();
    clientDisplayMessage.set("OPENING NOZZLE");
    await printer.checkPrinterStatus();
  }

  // Update Client Display Message if nozzle is in OPENING state
  else if (nozzleState === NOZZLE_STATE.OPENING) {
    clientDisplayMessage.set("OPENING NOZZLE");
    await sleep(500);
    await printer.checkPrinterStatus();
  }

  // Start Print if nozzle is READY but printer is not READY
  else if (
    nozzleState === NOZZLE_STATE.READY &&
    machineState != MACHINE_STATE.READY
  ) {
    console.log("aku start print", printerResponse);
    isFirstRefill = true;

    // ? Reset Print Counter
    const productCounter = await getCounter();
    console.log({ productCounter });
    printCounter.set(productCounter);
    console.log({ productCounter }, "AFTER SET IN START PRINT");

    // ? Reset Mailing Counter
    setMailingCounter(0);

    isPrinterStopping = false;
    await printer.startPrint();
    await printer.checkPrinterStatus();
  }

  // Flush fifo and Hide Display if machine is started and on first run
  else if (
    nozzleState === NOZZLE_STATE.READY &&
    machineState === MACHINE_STATE.READY &&
    isFirstRun
  ) {
    await printer.flushFIFO();
    await printer.hideDisplay();
    await printer.enableEchoMode();

    console.log("AFTER RESET");

    setFirstRun(false);
    await printer.checkPrinterStatus();
  }

  // Check Mailing Status if machine is started and not on first run
  else if (
    nozzleState === NOZZLE_STATE.READY &&
    machineState === MACHINE_STATE.READY &&
    !isFirstRun
  ) {
    // Reset Display Error Message
    if (
      !Object.values(CONNECTION_ERROR_LIST).includes(clientDisplayMessage.get())
    ) {
      if (printQueue.size() < MIN_PRINT_QUEUE) {
        clientDisplayMessage.set("PRINT BUFFER UNDER LIMIT");
      } else {
        clientDisplayMessage.set("");
      }
    }

    await printer.checkMailingStatus();
    await printer.checkPrinterStatus();
  }
};

const handleMailingStatus = async (printerResponse: string) => {
  const {
    fifoEntries,
    fifoDepth,
    lastStartedPrintNo,
    lastStartedPrintNoWasFinished,
  } = parseCheckMailingStatus(printerResponse);

  const maxPrintedQueueSize = Number(process.env.MAX_PRINTED_QUEUE ?? 60);

  const refillCount = getRefillCount({
    fifoEntries,
    maxPrintedQueueSize,
    lastStartedPrintNo,
  });

  const currentPrintedQueueSize = printedQueue.size();

  console.log({
    fifoEntries,
    fifoDepth,
    lastStartedPrintNo,
    lastStartedPrintNoWasFinished,
    maxPrintedQueueSize,
    refillCount,
    lastUpdate,
    isFirstRun,
    isPrinting: isPrinting.get(),
    printQueue: printQueue.size(),
    printedQueue: printedQueue.size(),
    DBUpdateQueue: DBUpdateQueue.size(),
    printerCounter: printCounter.get(),
    displayMessage: clientDisplayMessage.get(),
    prevLastStartPrinNo,
  });

  // Set Last Start Print No

  // Move Queue From Printed Queue To DB Update Queue
  if (currentPrintedQueueSize > 0 && refillCount > 0) {
    refillDBUpdateQueue(refillCount);
  }

  /**
   * Handle User Stop Print Request
   * Wait for 3 consecutive mailing status to be same to make sure
   * there is no print in progress then stop print
   * (to stop print when no print action by user)
   * Or if fifo entries is one or less then stop print
   * (to prevent error Empty Mailing Buffer)
   *
   * */
  if (!isPrinting.get()) {
    const currentMailingStatusKey = `${fifoEntries}_${lastStartedPrintNo}`;
    if (lastMailingStatusKey === currentMailingStatusKey) {
      sameMailingStatusCounter++;
    }

    if ((sameMailingStatusCounter >= 3 || fifoEntries <= 1) && !lastUpdate) {
      console.log("disini stop print mailing status");
      setLastUpdate(true);
      await printer.stopPrint();
      isPrinterStopping = true;

      await printer.checkMailingStatus();
    }

    lastMailingStatusKey = currentMailingStatusKey;

    return;
  }

  // Create Unique Code Command
  const sendUniqueCodeCommand: string[] = [];
  if (printQueue.size() > 0 && refillCount > 0) {
    if (isFirstRefill) isFirstRefill = false;
    for (let i = 0; i < refillCount; i++) {
      const deletedPrint = printQueue.shift();
      if (!deletedPrint) {
        break;
      }
      printedQueue.push(deletedPrint);
      const currentMailingCounter = incrementMailingCounter();
      const command = `^0=MR${currentMailingCounter}\t${deletedPrint.uniquecode}`;

      // Increment Print Counter
      incrementPrintCounter();

      // const currentPrintCounter = incrementPrintCounter();
      // const command = `^0=MR${currentPrintCounter}\t${deletedPrint.uniquecode}`;
      sendUniqueCodeCommand.push(command);
    }
  }

  // Send Unique Code Command To Printer
  if (sendUniqueCodeCommand.length > 0) {
    await printer.executeCommand(sendUniqueCodeCommand.join("\r") + "\r\n");
  }
};

const refillDBUpdateQueue = (refillCount: number) => {
  console.log("refillDBUpdateQueue", refillCount);
  for (let i = 0; i < refillCount; i++) {
    const deletedPrinted = printedQueue.shift();

    if (!deletedPrinted) {
      break;
    }
    DBUpdateQueue.push(deletedPrinted);
  }
};

// ? Function for getting the current counter from the printer
const getCounter = async () => {
  const res = await new Promise<string>((resolve) => {
    const resHandler = (printerResponseBuffer: Buffer) => {
      const printerResponse = printerResponseBuffer.toString();
      console.log({ printerResponse });
      if (!printerResponse.includes("CC")) {
        return;
      }

      printer.offData(resHandler);
      return resolve(printerResponse);
    };
    printer.onData(resHandler);

    printer.currentCounter();
  });

  console.log("res CC", res);

  // Parsing response
  const { productCounter } = parseCurrentCouter(res);

  return productCounter;
};

const incrementPrintCounter = () => {
  const currentPrintCounter = printCounter.get() + 1;
  printCounter.set(currentPrintCounter);

  return currentPrintCounter;
};

const setLastUpdate = (status: boolean) => {
  lastUpdate = status;
};

const setFirstRun = (status: boolean) => {
  isFirstRun = status;
};

const setFirstRefill = (status: boolean) => {
  isFirstRefill = status;
};

export const printerThread = {
  init,
  run,

  /** for testing purpose */
  listenPrinterResponse,
  setLastUpdate,
};

export type PrinterThread = typeof printerThread;

if (!isMainThread) {
  expose(printerThread);
}
