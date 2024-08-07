import "dotenv/config";
import { expose } from "threads";
import { Observable, Subject } from "threads/observable";
import { sleep } from "../utils/helper";
import { SharedPrimitive, SharedQueue } from "../utils/sharedBuffer";
import SocketConnection from "../connections/socket";
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

// console.log("Printer Thread Spawned");

const PRINTER_CONNECTION = process.env.PRINTER_CONNECTION
  ? (process.env.PRINTER_CONNECTION as "socket" | "serial")
  : "socket";

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

type InitParams = {
  isPrintBuffer: SharedArrayBuffer;
  printBuffer: SharedArrayBuffer;
  printedBuffer: SharedArrayBuffer;
  printCounterBuffer: SharedArrayBuffer;
  DBUpdateBuffer: SharedArrayBuffer;
  displayMessageBuffer: SharedArrayBuffer;
  isPrinterFinishedBuffer: SharedArrayBuffer;
};
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
      }, 1000);
    }),
  ]);

  return printer.getConnectionStatus() === "connect";
};

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

const listenPrinterResponse = async () => {
  return await new Promise<void>((resolve) => {
    const connectionChangeHandler = async (
      status: ConnectionStatus,
      err?: Error
    ) => {
      if (status === "close") {
        console.log("Printer Connection Closed");
        clientDisplayMessage.set("PRINTER CONNECTION CLOSED");
      } else if (status === "error") {
        console.log("Printer Connection Error");
        clientDisplayMessage.set(`PRINTER CONNECTION ERROR : ${err}`);
      } else if (status === "end") {
        console.log("Printer Connection Ended");
        clientDisplayMessage.set("PRINTER CONNECTION ENDED");
      } else if (status === "connect") {
        await printer.checkPrinterStatus();
      }
    };

    const listenerHandler = async (printerResponseBuffer: Buffer) => {
      // await sleep(500)
      const printerResponse = printerResponseBuffer.toString();

      if (printer.getConnectionStatus() !== "connect") {
        await waitConnectionReady();
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

  // set first refill to true
  isFirstRefill = true;
  lastUpdate = false;
  sameMailingStatusCounter = 0;
  lastMailingStatusKey = "";

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

  prevLastStartPrinNo = printCounter.get();

  await printer.checkPrinterStatus();

  console.log("AFTER CHECK PRINTER STATUS");

  // set first run to true
  isFirstRun = true;

  console.log("WAIT LISTENER");
  await listener;
};

const incrementPrintCounter = () => {
  const currentPrintCounter = printCounter.get() + 1;
  printCounter.set(currentPrintCounter);

  return currentPrintCounter;
};

// Handle Printer Status Response
const handlePrinterStatus = async (printerResponse: string) => {
  const { machineState, errorState, nozzleState } =
    parseCheckPrinterStatus(printerResponse);

  // console.log({ machineState, errorState, nozzleState, isFirstRun, isPrinterFinished: isPrinterFinished.get(), isPrinting: isPrinting.get() });

  // If there is no print action initiated from client
  if (!isPrinting.get() && lastUpdate) {
    console.log("STOP PRINTING");
    clientDisplayMessage.set("STOP PRINTING");

    // Stop Printer Status
    if (machineState === MACHINE_STATE.READY) {
      // if (!lastUpdate) {
      //   lastUpdate = true;
      //   // Check mailing status last time to make sure printer stop printing
      //   await printer.checkMailingStatus();
      // }

      await printer.stopPrint();
      await printer.checkPrinterStatus();
    }

    // End Printing Process
    else {
      await printer.showDisplay();

      // Mask the current printer display
      // const currentPrintCounter = incrementPrintCounter();
      await printer.appendFifo(0, "XXXXXXXXXX");

      isPrinterFinished.set(true);

      /** --- PRINTING ENDED --- */
      await printer.checkMailingStatus();
    }
  }

  // Check if printer in error condition
  else if (errorState != 0) {
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

    await printer.closeError();
    await printer.checkPrinterStatus();
  }

  // Open Nozzle if nozzle is closed and update Client Display Message
  else if (
    nozzleState === NOZZLE_STATE.CLOSED ||
    nozzleState === NOZZLE_STATE.CLOSING ||
    nozzleState === NOZZLE_STATE.INBETWEEN
  ) {
    await printer.openNozzle();
    clientDisplayMessage.set("OPENING NOZZLE");
    await printer.checkPrinterStatus();
  }

  // Update Client Display Message if nozzle is in opening state
  else if (nozzleState === NOZZLE_STATE.OPENING) {
    clientDisplayMessage.set("OPENING NOZZLE");
    await sleep(500);
    await printer.checkPrinterStatus();
  }

  // Start Print if nozzle is opened but printer is not started
  else if (
    nozzleState === NOZZLE_STATE.READY &&
    machineState != MACHINE_STATE.READY
  ) {
    clientDisplayMessage.set("");

    await printer.startPrint();
    await printer.checkPrinterStatus();
  }

  // Flush FIFO and Hide Display if machine is started and on first run
  else if (
    nozzleState === NOZZLE_STATE.READY &&
    machineState === MACHINE_STATE.READY &&
    isFirstRun
  ) {
    await printer.flushFIFO();
    await printer.hideDisplay();
    await printer.enableEchoMode();

    console.log("AFTER RESET");

    isFirstRun = false;
    await printer.checkPrinterStatus();
  }

  // Check Mailing Status if machine is started and not on first run
  else if (
    nozzleState === NOZZLE_STATE.READY &&
    machineState === MACHINE_STATE.READY &&
    !isFirstRun
  ) {
    await printer.checkMailingStatus();
    await printer.checkPrinterStatus();
  }
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

  const emptySlot =
    maxPrintedQueueSize - (actualFifoEntries + (isFirstRefill ? 0 : 1));

  console.log("GET REFILL COUNT", {
    toUpdateCount,
    emptySlot,
  });

  /**
   * Refill count based on lastStartedPrinNo when not first refill
   * Program will use this formula if previous lastStartedPrinNo > 0
   * and its not the first refill
   */
  if (prevLastStartPrinNo > 0 && toUpdateCount > 0 && !isFirstRefill) {
    return toUpdateCount;
  }

  /**
   * Refill count based on maxPrintedQueueSize and fifoEntries
   * It will prevent mismatch updated value when user manual adjust counter on device without print any code
   */
  if ((actualFifoEntries > 0 || isFirstRefill) && emptySlot > 0) {
    return emptySlot;
  }

  // Fallback value
  return 0;
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
    toUpdateCount: lastStartedPrintNo - prevLastStartPrinNo,
  });

  if (
    maxPrintedQueueSize -
      (fifoEntries + (isFirstRefill ? 0 : 1)) -
      (lastUpdate ? 1 : 0) !==
    lastStartedPrintNo - prevLastStartPrinNo
  ) {
    console.log(
      "####################################",
      {
        prevLastStartPrinNo,
        lastStartedPrintNo,
        toUpdateCount: lastStartedPrintNo - prevLastStartPrinNo,
        refillCount:
          maxPrintedQueueSize -
          (fifoEntries + (isFirstRefill ? 0 : 1)) -
          (lastUpdate ? 1 : 0),
      },
      "####################################"
    );
  }

  prevLastStartPrinNo = lastStartedPrintNo;

  // Move Queue From Printed Queue To DB Update Queue
  if (currentPrintedQueueSize > 0 && refillCount > 0) {
    for (let i = 0; i < refillCount; i++) {
      const deletedPrinted = printedQueue.shift();

      if (!deletedPrinted) {
        break;
      }
      DBUpdateQueue.push(deletedPrinted);
    }
  }

  if (!isPrinting.get()) {
    const currentMailingStatusKey = `${fifoEntries}_${lastStartedPrintNo}`;
    // console.log({
    //   lastMailingStatusKey,
    //   currentMailingStatusKey,
    //   sameMailingStatusCounter,
    // });
    if (lastMailingStatusKey === currentMailingStatusKey) {
      sameMailingStatusCounter++;
    }

    if (sameMailingStatusCounter >= 3 || fifoEntries <= 1) {
      lastUpdate = true;
      await printer.stopPrint();
      await printer.checkMailingStatus();
    }

    lastMailingStatusKey = currentMailingStatusKey;

    return;
  }

  // if (lastUpdate) {
  //   console.log("MAILING STATUS LAST UPDATE")
  //   isPrinterFinished.set(true);

  //   return;
  // }

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
    await printer.executeCommand(sendUniqueCodeCommand.join("\r") + "\r\n");
  }
};

export const printerThread = {
  init,
  run,
  listenPrinterResponse,
};

export type PrinterThread = typeof printerThread;

if (!isMainThread) {
  expose(printerThread);
}
