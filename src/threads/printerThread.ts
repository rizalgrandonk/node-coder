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
let clientDisplayMessage: SharedPrimitive<string>;
let printQueue: SharedQueue;
let printedQueue: SharedQueue;
let DBUpdateQueue: SharedQueue;
let isFirstRun: boolean = true;
let isFirstRefill: boolean = true;
let lastUpdate: boolean = false;

type InitParams = {
  isPrintBuffer: SharedArrayBuffer;
  printBuffer: SharedArrayBuffer;
  printedBuffer: SharedArrayBuffer;
  printCounterBuffer: SharedArrayBuffer;
  DBUpdateBuffer: SharedArrayBuffer;
  displayMessageBuffer: SharedArrayBuffer;
};
const init = ({
  isPrintBuffer,
  printCounterBuffer,
  printBuffer,
  printedBuffer,
  DBUpdateBuffer,
  displayMessageBuffer,
}: InitParams) => {
  printCounter = new SharedPrimitive<number>(printCounterBuffer);
  isPrinting = new SharedPrimitive<boolean>(isPrintBuffer);
  clientDisplayMessage = new SharedPrimitive<string>(displayMessageBuffer);
  printQueue = new SharedQueue(printBuffer);
  printedQueue = new SharedQueue(printedBuffer);
  DBUpdateQueue = new SharedQueue(DBUpdateBuffer);
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

    const listenerHandler = async (printerResponse: string) => {
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
      }

      // Handle as mailing status
      if (printerResponse.startsWith("^0=SM")) {
        await handleMailingStatus(printerResponse);
        if (lastUpdate) {
          printer.offData(listenerHandler);
          printer.offConnectionChange(connectionChangeHandler);
          resolve();
        }
      }
    };

    printer.onData(listenerHandler);

    printer.onConnectionChange(connectionChangeHandler);
  });
};

const run = async () => {
  console.log("PRINTER THREAD RUN");
  const listener = listenPrinterResponse();

  if (printer.getConnectionStatus() !== "connect") {
    await waitConnectionReady();
  }

  // Reset Counter On First Run
  if (isFirstRun) {
    await printer.resetCounter();
    printCounter.set(0);
  }

  await printer.checkPrinterStatus();

  // set first run to true
  lastUpdate = false;

  await listener;
};

const incrementPrintCounter = () => {
  const currentPrintCounter = printCounter.get() + 1;
  printCounter.set(currentPrintCounter);

  return currentPrintCounter;
};

const handlePrinterStatus = async (printerResponse: string) => {
  const { machineState, errorState, nozzleState } =
    parseCheckPrinterStatus(printerResponse);

  // console.log({ machineState, errorState, nozzleState, isFirstRun });

  // If there is no print action initiated from client
  if (!isPrinting.get()) {
    clientDisplayMessage.set("STOP PRINTING");

    // Stop Printer Status
    if (machineState === MACHINE_STATE.STARTED) {
      await printer.stopPrint();
      await printer.checkPrinterStatus();
    }

    // End Printing Process
    else {
      await printer.showDisplay();

      // Mask the current printer display
      // const currentPrintCounter = incrementPrintCounter();
      await printer.appendFifo(1, "XXXXXXXXXX");

      /** --- PRINTING ENDED --- */
      lastUpdate = true;
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

    // console.log({
    //   identifiedErrors,
    //   skipableError,
    // });

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
    nozzleState === NOZZLE_STATE.OPENED &&
    machineState != MACHINE_STATE.STARTED
  ) {
    await printer.startPrint();
    await printer.checkPrinterStatus();
  }

  // Flush FIFO and Hide Display if machine is started and on first run
  else if (
    nozzleState === NOZZLE_STATE.OPENED &&
    machineState === MACHINE_STATE.STARTED &&
    isFirstRun
  ) {
    await printer.flushFIFO();
    await printer.hideDisplay();
    await printer.enableEchoMode();

    isFirstRun = false;
    await printer.checkPrinterStatus();
  }

  // Check Mailing Status if machine is started and not on first run
  else if (
    nozzleState === NOZZLE_STATE.OPENED &&
    machineState === MACHINE_STATE.STARTED &&
    !isFirstRun
  ) {
    await printer.checkMailingStatus();
    await printer.checkPrinterStatus();
  }
};

const handleMailingStatus = async (printerResponse: string) => {
  const { fifoEntries, fifoDepth, lastStartedPrintNo } =
    parseCheckMailingStatus(printerResponse);

  const maxPrintedQueueSize = Number(process.env.MAX_PRINTED_QUEUE ?? 60);
  const refillCount =
    maxPrintedQueueSize - (fifoEntries + (isFirstRefill ? 0 : 1));
  const currentPrintedQueueSize = printedQueue.size();

  // console.log({
  //   fifoEntries,
  //   fifoDepth,
  //   lastStartedPrintNo,
  //   maxPrintedQueueSize,
  //   refillCount,
  // });

  if (lastUpdate) {
    refillCount - 1;
  }

  // Move Queue From Printed Queue To DB Update Queue
  if (currentPrintedQueueSize > 0) {
    for (let i = 0; i < refillCount; i++) {
      const deletedPrinted = printedQueue.shift();

      if (!deletedPrinted) {
        break;
      }
      DBUpdateQueue.push(deletedPrinted);
    }
  }

  if (lastUpdate) {
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
