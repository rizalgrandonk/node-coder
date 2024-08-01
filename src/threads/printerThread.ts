import "dotenv/config";
import { expose } from "threads/worker";
import { Observable, Subject } from "threads/observable";
import { sleep } from "../utils/helper";
import { SharedPrimitive, SharedQueue } from "../utils/sharedBuffer";
import SocketConnection from "../connections/socket";
import LiebingerClass, {
  MACHINE_STATE,
  NOZZLE_STATE,
  parseCheckMailingStatus,
  parseCheckPrinterStatus,
} from "../actions/leibinger";
import { setBulkUNEStatus } from "../services/uniquecodes";
import * as ErrorCodeService from "../services/errorcode";

console.log("Printer Thread Spawned");
const printer = new LiebingerClass({
  connectionType: "socket",
  connectionConfig: {
    host: "0.0.0.0",
    port: 515,
  },
});

let printCounter: SharedPrimitive<number>;
let isPrinting: SharedPrimitive<boolean>;
let clientDisplayMessage: SharedPrimitive<string>;
let printQueue: SharedQueue;
let printedQueue: SharedQueue;
let DBUpdateQueue: SharedQueue;
let isFirstRun: boolean = false;

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

const run = async () => {
  await printer.resetCounter();
  await printer.checkPrinterStatus();
};

const batchStart = async () => {
  await printer.resetCounter();

  // set first run to true
  isFirstRun = true;
};

printer.onData(async (printerResponse: string) => {
  console.log("printerResponse", { printerResponse });
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
    return;
  }

  // Check if response length is not more than 5
  if (printerResponse.length < 5) {
    return;
  }

  // Handle as printer status
  if (printerResponse.startsWith("^0=RS")) {
    handlePrinterStatus(printerResponse);
  }

  // Handle as printer status
  if (printerResponse.startsWith("^0=SM")) {
    handleMailingStatus(printerResponse);
  }
});

const incrementPrintCounter = () => {
  const currentPrintCounter = printCounter.get() + 1;
  printCounter.set(currentPrintCounter);

  return currentPrintCounter;
};

const handlePrinterStatus = async (printerResponse: string) => {
  const { machineState, errorState, nozzleState } =
    parseCheckPrinterStatus(printerResponse);

  // If there is no print action initiated from client
  if (!isPrinting.get()) {
    clientDisplayMessage.set("STOP PRINTING");
    if (machineState === MACHINE_STATE.STARTED) {
      await printer.stopPrint();
      await printer.checkPrinterStatus();
    } else {
      await printer.showDisplay();

      // Mask the current printer display
      const currentPrintCounter = incrementPrintCounter();
      printer.appendFifo(currentPrintCounter, "XXXXXXXXXX");
    }
  }

  // Check if printer in error condition
  else if (errorState != 0) {
    const identifiedErrors = await ErrorCodeService.findByCode(
      errorState.toString()
    );
    const skipableError = ErrorCodeService.skipableError.find(
      (err) => err.errorcode === errorState.toString()
    );
    // Update Client Display Message if error is not identified
    if (!identifiedErrors) {
      clientDisplayMessage.set(`Unidentified Error Code: ${errorState}`);
    }

    // Update Client Display Message if error is not skipable error
    else if (!skipableError) {
      clientDisplayMessage.set(identifiedErrors[0].errorname);
    }

    await printer.closeError();
    await printer.checkPrinterStatus();
  }

  // Open Nozzle if nozzle is closed and update Client Display Message
  else if (
    nozzleState === NOZZLE_STATE.CLOSED ||
    nozzleState === NOZZLE_STATE.CLOSING
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
  else if (machineState === 6 && isFirstRun) {
    await printer.flushFIFO();
    await printer.hideDisplay();
    isFirstRun = false;
  }

  // Check Mailing Status if machine is started and not on first run
  else if (machineState === 6 && !isFirstRun) {
    await printer.checkMailingStatus();
    await printer.checkPrinterStatus();
  }
};

const handleMailingStatus = async (printerResponse: string) => {
  const { fifoEntries } = parseCheckMailingStatus(printerResponse);
  const maxPrintedQueueSize = Number(process.env.MAX_PRINTED_QUEUE ?? 60);
  const refillCount = maxPrintedQueueSize - fifoEntries + 1;
  const currentPrintedQueueSize = printedQueue.size();

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

  // Create Unique Code Command
  const sendUniqueCodeCommand: string[] = [];
  if (printQueue.size() > 0 && refillCount > 0) {
    for (let i = 0; i < refillCount; i++) {
      const deletedPrint = printQueue.shift();
      if (!deletedPrint) {
        break;
      }
      printedQueue.push(deletedPrint);
      const currentPrintCounter = incrementPrintCounter();
      const command = `^0=MR${currentPrintCounter}\t${deletedPrint}`;
      sendUniqueCodeCommand.push(command);
    }
  }

  // Send Unique Code Command To Printer
  if (sendUniqueCodeCommand.length > 0) {
    await printer.executeCommand(sendUniqueCodeCommand.join("\r"));
  }
};

const printerThread = {
  init,
  run,
  batchStart,
};

export type PrinterThread = typeof printerThread;

expose(printerThread);
