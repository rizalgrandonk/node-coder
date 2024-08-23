import "dotenv/config";
import { expose } from "threads";
import { sleep } from "../utils/helper";
import { SharedPrimitive, SharedQueue } from "../utils/sharedBuffer";
import LiebingerClass, {
  MACHINE_STATE,
  NOZZLE_STATE,
  ConnectionStatus,
  HEADCOVER_STATE,
} from "../actions/leibinger";
import { setBulkUNEStatus } from "../services/uniquecodes";
import * as ErrorCodeService from "../services/errorcode";
import {
  parseCheckMailingStatus,
  parseCheckPrinterStatus,
  parseCurrentCouter,
} from "../utils/leibinger";
import { isMainThread } from "worker_threads";
import { insertErrorLog } from "../services/codererrorlogs";
import {
  QUEUE_ERROR_LIST,
  CONNECTION_ERROR_LIST,
  isConnectionError,
  PRINTER_ERROR_LIST,
  PRINTER_MESSAGE_LIST,
  ErrorList,
} from "../utils/errors";
import { Batch } from "../types/data";

// Delay Interval when opening nozzle
const NOZZLE_OPEN_DELAY = Number(process.env.NOZZLE_OPEN_DELAY ?? 7500);

// Maximum Nozzle Delay Attempt
const MAX_NOZZLE_OPEN_ATTEMPT = Number(
  process.env.MAX_NOZZLE_OPEN_ATTEMPT ?? 8
);

// ? Configuration for printer
const MIN_PRINT_QUEUE = Number(process.env.MIN_PRINT_QUEUE ?? 180);
const MIN_LIMIT_PRINTQUEUE = Number(process.env.MIN_LIMIT_PRINTQUEUE ?? 60);
const MAX_PRINTED_QUEUE = Number(process.env.MAX_PRINTED_QUEUE ?? 60);
const MAX_QUEUE_REFILL = Number(process.env.MAX_QUEUE_REFILL ?? 30);

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
let prevLastStartPrinNo: number = 0;

let openNozzleAttempt = 0;

let batchData: Batch;

type InitParams = {
  isPrintBuffer: SharedArrayBuffer;
  printBuffer: SharedArrayBuffer;
  printedBuffer: SharedArrayBuffer;
  printCounterBuffer: SharedArrayBuffer;
  DBUpdateBuffer: SharedArrayBuffer;
  displayMessageBuffer: SharedArrayBuffer;
  isPrinterFinishedBuffer: SharedArrayBuffer;
  batchInfo: Batch;
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
  batchInfo,
}: InitParams) => {
  printCounter = new SharedPrimitive<number>(printCounterBuffer);
  isPrinting = new SharedPrimitive<boolean>(isPrintBuffer);
  clientDisplayMessage = new SharedPrimitive<string>(displayMessageBuffer);
  printQueue = new SharedQueue(printBuffer);
  printedQueue = new SharedQueue(printedBuffer);
  DBUpdateQueue = new SharedQueue(DBUpdateBuffer);
  isPrinterFinished = new SharedPrimitive<boolean>(isPrinterFinishedBuffer);

  batchData = batchInfo;
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
          printer.offConnectionChange(changeHandler);
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
          clearInterval(interval);
        }
      }, 1000);
    }),
  ]);

  return printer.getConnectionStatus() === "connect";
};

// ? Function for listening printer response
const listenPrinterResponse = async () => {
  return await new Promise<void>((resolve) => {
    const connectionChangeHandler = async (
      status: ConnectionStatus,
      err?: Error
    ) => {
      if (status === "close") {
        console.log("Printer Connection Closed", printedQueue.size());
        // refillDBUpdateQueue(printedQueue.size());
        await updatePrintedQueueToUNEStatus();

        isPrinting.set(false);
        isPrinterFinished.set(true);

        clientDisplayMessage.set(CONNECTION_ERROR_LIST.CLOSED);
        createErrorLog(CONNECTION_ERROR_LIST.CLOSED);

        printer.offData(listenerHandler);
        printer.offConnectionChange(connectionChangeHandler);

        resolve();
      } else if (status === "error") {
        console.log("Printer Connection Error", err, printedQueue.size());
        // refillDBUpdateQueue(printedQueue.size());
        await updatePrintedQueueToUNEStatus();

        isPrinting.set(false);
        isPrinterFinished.set(true);

        clientDisplayMessage.set(CONNECTION_ERROR_LIST.ERROR);
        createErrorLog(CONNECTION_ERROR_LIST.ERROR);

        printer.offData(listenerHandler);
        printer.offConnectionChange(connectionChangeHandler);

        resolve();
      } else if (status === "end") {
        console.log("Printer Connection Ended", printedQueue.size());
        // refillDBUpdateQueue(printedQueue.size());
        await updatePrintedQueueToUNEStatus();

        isPrinting.set(false);
        isPrinterFinished.set(true);

        clientDisplayMessage.set(CONNECTION_ERROR_LIST.ENDED);
        createErrorLog(CONNECTION_ERROR_LIST.ENDED);

        printer.offData(listenerHandler);
        printer.offConnectionChange(connectionChangeHandler);
        resolve();
      } else if (status === "connect") {
        console.log("Printer Connection Established");
        if (isConnectionError(clientDisplayMessage.get())) {
          clientDisplayMessage.set("");
          await printer.checkPrinterStatus();
        }
      }
    };

    const listenerHandler = async (printerResponseBuffer: Buffer) => {
      const printerResponse = printerResponseBuffer.toString();

      console.log({ printerResponse });
      // await sleep(100);

      // Check if printer connection is lost
      if (printer.getConnectionStatus() !== "connect") {
        console.log("LISTENER HANDLER - Connection Lost, wait till connect");
        await waitConnectionReady();
        await printer.checkPrinterStatus();
        return;
      }

      // Check if printer response is not valid
      if (!printerResponse.startsWith("^0")) {
        clientDisplayMessage.set(printerResponse);
        createErrorLog(printerResponse);
        await updatePrintedQueueToUNEStatus();
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

          // clientDisplayMessage.set("");
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

// ? Function for running the printer cycle
const run = async () => {
  console.log("PRINTER THREAD RUN");

  // Reset Thread State
  openNozzleAttempt = 0;
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

    console.log("AFTER START BATCH");
  } else {
    const printerCounter = await getCounter();

    // +1 to cover unprinted masking XXX
    const productCounter =
      printerCounter === 0 ? printerCounter : printerCounter + 1;
    console.log({ productCounter });

    printCounter.set(productCounter);
    console.log({ productCounter }, "AFTER SET");
  }

  // ? Reset Mailing Counter

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

  // -1 for the XXX masking entry when printer is stoping
  const actualFifoEntries = isPrinterFinished.get()
    ? fifoEntries - 1
    : fifoEntries;

  // +1 for fifo que + ready to print (1) when it's not first refill
  const fifoEntriesPrinter = actualFifoEntries + (isFirstRefill ? 0 : 1);

  const emptySlot = maxPrintedQueueSize - fifoEntriesPrinter;

  console.log({
    fifoEntries,
    isFirstRefill,
    lastUpdate,
    actualFifoEntries,
    fifoEntriesPrinter,
    emptySlot,
    lastStartedPrintNo,
    prevLastStartPrinNo,
    printedQueue: printedQueue.size(),
  });

  if (isFirstRefill) {
    return {
      refillCount: emptySlot,
      emptySlot,
    };
  }

  if (!isFirstRefill && lastStartedPrintNo > 0) {
    prevLastStartPrinNo = lastStartedPrintNo;
  }

  // Condition after receive an error
  if (
    printedQueue.size() <= 0 &&
    fifoEntriesPrinter <= 1 &&
    prevLastStartPrinNo > 0 &&
    lastStartedPrintNo > 0 &&
    prevLastStartPrinNo !== lastStartedPrintNo
  ) {
    console.log("Condition after receive an error");
    return {
      refillCount: emptySlot,
      emptySlot,
    };
  }

  if (fifoEntriesPrinter >= printedQueue.size() && !lastUpdate) {
    // return 0;
    return {
      refillCount: 0,
      emptySlot,
    };
  }

  /**
   * Refill count based on lastStartedPrinNo when not first refill
   * Program will use this formula if previous lastStartedPrinNo > 0
   * and its not the first refill
   */
  if (prevLastStartPrinNo > 0 && lastStartedPrintNo > 0 && !isFirstRefill) {
    if (toUpdateCount <= 0 && printedQueue.size() - fifoEntriesPrinter > 0) {
      return {
        refillCount: printedQueue.size() - fifoEntriesPrinter,
        emptySlot,
      };
    }
    console.log("toUpdateCount", toUpdateCount);
    return {
      refillCount: Math.max(toUpdateCount, 0),
      emptySlot,
    };
  }

  if (
    fifoEntriesPrinter > 0 &&
    fifoEntriesPrinter < printedQueue.size() &&
    !lastUpdate
  ) {
    return {
      refillCount: printedQueue.size() - fifoEntriesPrinter,
      emptySlot,
    };
  }

  return {
    refillCount: 0,
    emptySlot,
  };
};

// Handle Printer Status Response
const handlePrinterStatus = async (printerResponse: string) => {
  const { machineState, errorState, nozzleState, headCover } =
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
    clientDisplayMessage.set(PRINTER_MESSAGE_LIST.STOP_PRINT);

    // Stop Printer Status
    if (machineState === MACHINE_STATE.READY) {
      await printer.stopPrint();
      await printer.enableUserInteraction();
      await printer.checkPrinterStatus();
    }

    // End Printing Process
    else {
      await printer.showDisplay();

      // Mask the current printer display
      const currentPrintCounter = incrementPrintCounter();
      await printer.appendFifo(currentPrintCounter, "XXXXXXXXXX");

      // Set Printer Finished to Stop DatabaseThread Process
      isPrinterFinished.set(true);

      /** --- PRINTING ENDED --- */
      await printer.checkMailingStatus();
    }
  }

  // Check if printer in error condition
  else if (errorState != 0) {
    console.log("RECEIVE AN ERROR STATE", errorState, printerResponse);
    const identifiedErrors = await ErrorCodeService.findByCode(
      errorState.toString()
    );
    const skipableError = ErrorCodeService.skipableError().find(
      (err) => err.errorcode === errorState.toString()
    );

    // Update Client Display Message if error is not identified
    if (identifiedErrors?.length <= 0) {
      clientDisplayMessage.set(`error:Unidentified Error Code: ${errorState}`);
      createErrorLog(`Unidentified Error Code: ${errorState}`);
    }

    // Update Client Display Message if error is not skipable error
    else if (identifiedErrors?.length > 0 && !skipableError) {
      clientDisplayMessage.set(`error:${identifiedErrors[0]?.errorname}`);
      createErrorLog(identifiedErrors[0]?.errorname);
    }

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
    clientDisplayMessage.set(PRINTER_MESSAGE_LIST.OPENINNG_NOZZLE);
    await printer.checkPrinterStatus();
  }

  // Update Client Display Message if nozzle is in OPENING state
  else if (nozzleState === NOZZLE_STATE.OPENING) {
    console.log({ openNozzleAttempt });
    clientDisplayMessage.set(PRINTER_MESSAGE_LIST.OPENINNG_NOZZLE);

    // Handle if nozzle not opening in few tries
    if (openNozzleAttempt >= MAX_NOZZLE_OPEN_ATTEMPT) {
      // Set Client Display Message
      clientDisplayMessage.set(PRINTER_ERROR_LIST.OPEN_NOZZLE_TIMEOUT);
      createErrorLog(PRINTER_ERROR_LIST.OPEN_NOZZLE_TIMEOUT);

      isPrinting.set(false);
      isPrinterFinished.set(true);

      openNozzleAttempt = 0;
    }

    openNozzleAttempt++;

    await sleep(NOZZLE_OPEN_DELAY);
    await printer.checkPrinterStatus();
  }

  // Start Print if nozzle is READY but printer is not READY
  else if (
    nozzleState === NOZZLE_STATE.READY &&
    machineState === MACHINE_STATE.AVAILABLE_TO_START
  ) {
    console.log("aku start print", printerResponse);
    setFirstRefill(true);

    // ? Reset Print Counter
    // const productCounter = await getCounter();
    // console.log({ productCounter });
    // printCounter.set(productCounter);
    // console.log({ productCounter }, "AFTER SET IN START PRINT");

    // isPrinterStopping = false;
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
    clientDisplayMessage.set(""); // Reset Client Display Message

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
    if (!isConnectionError(clientDisplayMessage.get())) {
      // Check if mailing buffer is empty
      if (printQueue.size() <= 0 && printedQueue.size() <= 0) {
        clientDisplayMessage.set(QUEUE_ERROR_LIST.MAILING_BUFFER_EMPTY);
        createErrorLog(QUEUE_ERROR_LIST.MAILING_BUFFER_EMPTY);
      }

      // Check if mailing buffer is under limit
      else if (printQueue.size() < MIN_LIMIT_PRINTQUEUE) {
        clientDisplayMessage.set(QUEUE_ERROR_LIST.UNDER_LIMIT);
        createErrorLog(QUEUE_ERROR_LIST.UNDER_LIMIT);
      }

      // Otherwise, reset display message
      else {
        clientDisplayMessage.set("");
      }
    }

    await printer.disableUserInteraction();
    await printer.checkMailingStatus();
    await printer.checkPrinterStatus();
  }

  // Check if machine is not available to start
  else if (
    machineState !== MACHINE_STATE.AVAILABLE_TO_START &&
    machineState !== MACHINE_STATE.READY
  ) {
    if (headCover === HEADCOVER_STATE.OPEN) {
      clientDisplayMessage.set(PRINTER_ERROR_LIST.HEADCOVER_OPEN);
      createErrorLog(PRINTER_ERROR_LIST.HEADCOVER_OPEN);
      await sleep(1000);
    }
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

  const { refillCount, emptySlot } = getRefillCount({
    fifoEntries,
    maxPrintedQueueSize: MAX_PRINTED_QUEUE,
    lastStartedPrintNo,
  });

  const currentPrintedQueueSize = printedQueue.size();

  console.log({
    fifoEntries,
    fifoDepth,
    lastStartedPrintNo,
    lastStartedPrintNoWasFinished,
    MAX_PRINTED_QUEUE,
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

  // Create error if refillCount is HIGHER  MAX_QUEUE_REFILL
  if (
    emptySlot > MAX_QUEUE_REFILL &&
    !isFirstRefill &&
    !lastUpdate &&
    isPrinting.get()
  ) {
    clientDisplayMessage.set(QUEUE_ERROR_LIST.UNDER_SPEED);
    createErrorLog(QUEUE_ERROR_LIST.UNDER_SPEED);
  }

  // Disable first refill
  if (isFirstRefill) {
    setFirstRefill(false);
  }

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
      console.log("disini stop print mailing status", {
        sameMailingStatusCounter,
        fifoEntries,
      });

      // Shutdown Printer Directly to Prevent Mailing Buffer Empty
      if (fifoEntries <= 1) {
        await printer.stopPrint();
        await printer.checkMailingStatus();
      }

      setLastUpdate(true);
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

      const currentPrintCounter = incrementPrintCounter();
      const command = `^0=MR${currentPrintCounter}\t${deletedPrint.uniquecode}`;
      sendUniqueCodeCommand.push(command);
    }
  }

  // Send Unique Code Command To Printer
  if (sendUniqueCodeCommand.length > 0) {
    console.log({ sendUniqueCodeCommand });
    await printer.executeCommand(sendUniqueCodeCommand.join("\r") + "\r\n");
  }
};

// ? Function for moving Queue From Printed Queue To DB Update Queue
const refillDBUpdateQueue = (refillCount: number) => {
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
  if (printer.getConnectionStatus() !== "connect") {
    return 0;
  }

  const res = await Promise.race([
    new Promise<string | null>((resolve) => {
      const resHandler = (printerResponseBuffer: Buffer) => {
        const printerResponse = printerResponseBuffer.toString();
        if (!printerResponse.includes("CC")) {
          return;
        }

        printer.offData(resHandler);
        return resolve(printerResponse);
      };
      printer.onData(resHandler);

      printer.currentCounter();
    }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
  ]);

  console.log("res CC", res);

  if (!res) {
    return 0;
  }

  // Parsing response
  const { productCounter } = parseCurrentCouter(res);

  return productCounter;
};

// ? Function for creating error log to database
const createErrorLog = async (message: string) => {
  return await insertErrorLog({
    batchid: 1,
    batchno: "TEST-BATCH",
    errormessage: message,
    errorTimestamp: new Date(),
    markingprinterid: 1,
    sendconfirmed: new Date(),
  }).catch((err) => {
    console.log("Error create error log", err);
    return null;
  });
};

// ? Function for updating uniquecode in Printed Queue SET coderstatus = 'UNE'
const updatePrintedQueueToUNEStatus = async () => {
  if (printedQueue.size() > 0) {
    // Flush Printed Queue
    const deletedQueue = printedQueue.shiftAll();

    // Update uniquecode SET coderstatus = 'UNE'
    const deletedQueueIds = deletedQueue.map((item) => item.id);
    await setBulkUNEStatus(deletedQueueIds, new Date());
  }
};

// ? Function for incrementing print counter
const incrementPrintCounter = () => {
  // const currentPrintCounter = printCounter.get() + 1;
  // printCounter.set(currentPrintCounter);

  const currentPrintCounter = printCounter.get();
  printCounter.set(currentPrintCounter + 1);

  return currentPrintCounter;
};

// ? Function for setting last update
const setLastUpdate = (status: boolean) => {
  lastUpdate = status;
};

// ? Function for setting first run
const setFirstRun = (status: boolean) => {
  isFirstRun = status;
};

// ? Function for setting first refill
const setFirstRefill = (status: boolean) => {
  isFirstRefill = status;
};

export const printerThread = {
  init,
  run,

  /** for testing purpose */
  listenPrinterResponse,
  setLastUpdate,
  setFirstRefill,
  setFirstRun,
  getCounter,
};

export type PrinterThread = typeof printerThread;

if (!isMainThread) {
  expose(printerThread);
}
