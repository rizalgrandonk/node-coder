import * as TestPrinterThread from "../printerThread";
import type { PrinterThread } from "../printerThread";
import { SharedPrimitive, SharedQueue } from "../../utils/sharedBuffer";
import LiebingerClass from "../../actions/leibinger";
import { sleep } from "../../utils/helper";
import * as ErrorCodeService from "../../services/errorcode";

jest.mock("../../services/errorcode");
jest.mock("../../actions/leibinger");
jest.mock("threads", () => ({
  expose: () => {},
}));
jest.mock("../../utils/helper");

let printerThread: PrinterThread;
let isPrinting: SharedPrimitive<boolean>;
let isPrinterFinished: SharedPrimitive<boolean>;
let printCounter: SharedPrimitive<number>;
let printQueue: SharedQueue;
let printedQueue: SharedQueue;
let DBUpdateQueue: SharedQueue;
let clientDisplayMessage: SharedPrimitive<string>;

const setupPrinterThread = () => {
  jest.resetAllMocks();
  jest.spyOn(ErrorCodeService, "findByCode").mockResolvedValue([]);
  jest.spyOn(ErrorCodeService, "skipableError").mockReturnValue([]);
  jest
    .spyOn(LiebingerClass.prototype, "getConnectionStatus")
    .mockReturnValue("connect");

  // Create actual SharedPrimitive and SharedQueue instances
  isPrinting = new SharedPrimitive<boolean>(false);
  isPrinterFinished = new SharedPrimitive<boolean>(false);
  printCounter = new SharedPrimitive<number>(0);
  printQueue = new SharedQueue(400);
  printedQueue = new SharedQueue(400);
  DBUpdateQueue = new SharedQueue(400);
  clientDisplayMessage = new SharedPrimitive<string>("");

  // Import the module dynamically to reset the module state
  jest.isolateModules(() => {
    printerThread = require("../printerThread").printerThread;
  });

  // Initialize the thread with real shared buffers
  printerThread.init({
    isPrintBuffer: isPrinting.getBuffer(),
    isPrinterFinishedBuffer: isPrinterFinished.getBuffer(),
    printCounterBuffer: printCounter.getBuffer(),
    printBuffer: printQueue.getBuffer(),
    printedBuffer: printedQueue.getBuffer(),
    DBUpdateBuffer: DBUpdateQueue.getBuffer(),
    displayMessageBuffer: clientDisplayMessage.getBuffer(),
  });
};

describe("Printer Thread - Check Printer Status", () => {
  beforeEach(() => {
    setupPrinterThread();
  });

  it("should update `clientDisplayMessage` when nozzle state is `OPENING`", async () => {
    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS1\t4\t0\t0\t80\t0\r"));

    expect(clientDisplayMessage.get()).toBe("OPENING NOZZLE");
    expect(sleep).toHaveBeenCalledWith(500); // Delay for machine nozzle open
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });

  it("should call `openNozzle` command and update `clientDisplayMessage` when nozzle state is `CLOSED` or `CLOSING`", async () => {
    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS1\t4\t0\t0\t80\t0\r"));

    expect(clientDisplayMessage.get()).toBe("OPENING NOZZLE");
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });

  it("should call `startPrint` command when nozzle state is `READY` but machine state is not `READY`", async () => {
    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS2\t4\t0\t0\t80\t0\r"));

    expect(LiebingerClass.prototype.startPrint).toHaveBeenCalledTimes(1);
  });

  it("should update `clientDisplayMessage` upon receiving an unidentified error state", async () => {
    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS2\t6\t1\t0\t80\t0\r"));

    expect(clientDisplayMessage.get()).toBe("Unidentified Error Code: 1");
    expect(LiebingerClass.prototype.closeError).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });

  it("should update `clientDisplayMessage` upon receiving an unskippable error state", async () => {
    jest.spyOn(ErrorCodeService, "findByCode").mockResolvedValue([
      {
        errorcode: "0123456789",
        errorname: "Unskipable Error",
        description: null,
      },
    ]);

    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS2\t6\t1\t0\t80\t0\r"));

    expect(clientDisplayMessage.get()).toBe("Unskipable Error");
    expect(LiebingerClass.prototype.closeError).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });

  it("should update `clientDisplayMessage` upon receiving a skipped error state", async () => {
    jest.spyOn(clientDisplayMessage, "set");
    jest.spyOn(ErrorCodeService, "findByCode").mockResolvedValue([
      {
        errorcode: "1476405210",
        errorname: "Battery Low",
        description: null,
      },
    ]);

    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS2\t6\t1476405210\t0\t80\t0\r"));

    expect(clientDisplayMessage.set).not.toHaveBeenCalledWith("Battery Low");
    expect(LiebingerClass.prototype.closeError).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });

  it("should update `clientDisplayMessage` when printer disconnected", async () => {
    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onConnectionChange");

    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback("close");

    expect(clientDisplayMessage.get()).toBe("PRINTER CONNECTION CLOSED");
  });

  it("should clear `clientDisplayMessage` when printer connected", async () => {
    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onConnectionChange");

    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback("connect");

    expect(clientDisplayMessage.get()).toBe("");
  });

  it("should update `clientDisplayMessage` when printerQueue is under minimum queue", async () => {
    isPrinting.set(true);
    printQueue.shiftAll();
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];

    /** ON FIRST RUN PRINT */
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));

    /** ON NEXT RUN UNTIL PRINT STOP */
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));

    expect(clientDisplayMessage.get()).toBe("PRINT BUFFER UNDER LIMIT");
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      2
    );
    expect(LiebingerClass.prototype.checkMailingStatus).toHaveBeenCalledTimes(
      1
    );
  });
});

describe("Printer Thread - On Print Process", () => {
  beforeEach(() => {
    setupPrinterThread();
  });

  it("Move printed queue to DB update queue based on FIFO entries", async () => {
    const queueData = [
      { id: 1000004, uniquecode: "UNIQUECODE4" },
      { id: 1000005, uniquecode: "UNIQUECODE5" },
      { id: 1000006, uniquecode: "UNIQUECODE6" },
      { id: 1000007, uniquecode: "UNIQUECODE7" },
    ];
    printedQueue.push(...queueData);

    expect(printedQueue.size()).toEqual(queueData.length);
    expect(printedQueue.getAll()).toEqual(queueData);

    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=SM256\t56\t0\t0\t0\t0\r"));

    expect(printedQueue.size()).toEqual(0);
    expect(printedQueue.getAll()).toEqual([]);

    expect(DBUpdateQueue.size()).toEqual(queueData.length);
    expect(DBUpdateQueue.getAll()).toEqual(queueData);
  });

  it("Move printed queue to DB update queue based on FIFO entries (partial)", async () => {
    const queueData = [
      { id: 1000004, uniquecode: "UNIQUECODE4" },
      { id: 1000005, uniquecode: "UNIQUECODE5" },
      { id: 1000006, uniquecode: "UNIQUECODE6" },
      { id: 1000007, uniquecode: "UNIQUECODE7" },
    ];
    printedQueue.push(...queueData);

    expect(printedQueue.size()).toEqual(queueData.length);
    expect(printedQueue.getAll()).toEqual(queueData);

    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];

    /** ON FIRST RUN PRINT */
    await onDataCallback(Buffer.from("^0=SM256\t58\t0\t0\t0\t0\r"));

    expect(printedQueue.size()).toEqual(2);
    expect(printedQueue.getAll()).toEqual(queueData.slice(2));

    expect(DBUpdateQueue.size()).toEqual(2);
    expect(DBUpdateQueue.getAll()).toEqual(queueData.slice(0, 2));

    /** ON NEXT RUN UNTIL PRINT STOP */
    await onDataCallback(Buffer.from("^0=SM256\t59\t0\t0\t0\t0\r"));

    expect(printedQueue.size()).toEqual(1);
    expect(printedQueue.getAll()).toEqual(queueData.slice(3));

    expect(DBUpdateQueue.size()).toEqual(3);
    expect(DBUpdateQueue.getAll()).toEqual(queueData.slice(0, 3));
  });

  it("should call append uniquecode command and send it to the printer, and move print queue data to printed queue", async () => {
    const queueData = [
      { id: 1000004, uniquecode: "UNIQUECODE4" },
      { id: 1000005, uniquecode: "UNIQUECODE5" },
      { id: 1000006, uniquecode: "UNIQUECODE6" },
      { id: 1000007, uniquecode: "UNIQUECODE7" },
    ];
    printQueue.push(...queueData);

    expect(printQueue.size()).toEqual(queueData.length);
    expect(printQueue.getAll()).toEqual(queueData);

    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=SM256\t56\t0\t0\t0\t0\r"));

    expect(printQueue.size()).toEqual(0);
    expect(printQueue.getAll()).toEqual([]);

    expect(printedQueue.size()).toEqual(queueData.length);
    expect(printedQueue.getAll()).toEqual(queueData);

    expect(LiebingerClass.prototype.executeCommand).toHaveBeenCalledWith(
      `${queueData
        .map((code, i) => `^0=MR${i + 1}\t${code.uniquecode}`)
        .join("\r")}\r\n`
    );
  });

  it("should call append uniquecode command and send it to the printer, and move print queue data to printed queue (partial)", async () => {
    const queueData = [
      { id: 1000004, uniquecode: "UNIQUECODE4" },
      { id: 1000005, uniquecode: "UNIQUECODE5" },
      { id: 1000006, uniquecode: "UNIQUECODE6" },
      { id: 1000007, uniquecode: "UNIQUECODE7" },
    ];
    printQueue.push(...queueData);

    expect(printQueue.size()).toEqual(queueData.length);
    expect(printQueue.getAll()).toEqual(queueData);

    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];

    /** ON FIRST RUN PRINT */
    await onDataCallback(Buffer.from("^0=SM256\t58\t0\t0\t0\t0\r"));

    expect(printQueue.size()).toEqual(2);
    expect(printQueue.getAll()).toEqual(queueData.slice(2));

    expect(DBUpdateQueue.size()).toEqual(0);
    expect(DBUpdateQueue.getAll()).toEqual([]);

    expect(printedQueue.size()).toEqual(2);
    expect(printedQueue.getAll()).toEqual(queueData.slice(0, 2));

    expect(LiebingerClass.prototype.executeCommand).toHaveBeenCalledWith(
      `${queueData
        .slice(0, 2)
        .map((code, i) => `^0=MR${i + 1}\t${code.uniquecode}`)
        .join("\r")}\r\n`
    );

    /** ON NEXT RUN UNTIL PRINT STOP (firstRefill == false) */
    await onDataCallback(Buffer.from("^0=SM256\t58\t0\t0\t0\t0\r"));

    expect(printQueue.size()).toEqual(1);
    expect(printQueue.getAll()).toEqual(queueData.slice(3, 4));

    expect(DBUpdateQueue.size()).toEqual(1);
    expect(DBUpdateQueue.getAll()).toEqual(queueData.slice(0, 1));

    expect(printedQueue.size()).toEqual(2);
    expect(printedQueue.getAll()).toEqual(queueData.slice(1, 3));

    expect(LiebingerClass.prototype.executeCommand).toHaveBeenCalledWith(
      `${queueData
        .slice(2, 3)
        .map((code, i) => `^0=MR${i + 3}\t${code.uniquecode}`)
        .join("\r")}\r\n`
    );
  });
});

describe("Printer Thread - On Start Batch", () => {
  beforeEach(() => {
    setupPrinterThread();
  });

  it("should call `resetCounter` command on first print", async () => {
    isPrinting.set(false);
    isPrinterFinished.set(true);

    const printerThreadRun = printerThread.run();
    printerThread.setLastUpdate(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    const onDataCallback = onData.mock.calls[0][0];

    await onDataCallback(Buffer.from("^0=RS2\t5\t0\t0\t80\t0\r"));
    // await onDataCallback(Buffer.from("^0=SM256\t0\t0\t0\t0\t0\r"));

    await printerThreadRun;
    expect(LiebingerClass.prototype.resetCounter).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });
});

describe("Printer Thread - On Start Print", () => {
  beforeEach(() => {
    setupPrinterThread();
  });

  it("should call `flushFifo`, `hideDisplay` and `enableEchoMode` commands on the first print", async () => {
    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];

    /** ON FIRST RUN PRINT */
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));
    expect(LiebingerClass.prototype.flushFIFO).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.hideDisplay).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.enableEchoMode).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );

    /** ON NEXT RUN UNTIL PRINT STOP */
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));
    expect(LiebingerClass.prototype.checkMailingStatus).toHaveBeenCalledTimes(
      1
    );
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      2
    );
  });

  it("should call `checkPrintStatus` and `checkMailingStatus` commands when not on the first print", async () => {
    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];

    /** ON FIRST RUN PRINT */
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));

    /** ON NEXT RUN UNTIL PRINT STOP */
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));
    expect(LiebingerClass.prototype.checkMailingStatus).toHaveBeenCalledTimes(
      1
    );
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      2
    );
  });
});

describe("Printer Thread - On Stop Print", () => {
  beforeEach(() => {
    setupPrinterThread();
  });

  it("should call `stopPrint` command when machine state still `READY`", async () => {
    isPrinting.set(false);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    printerThread.setLastUpdate(true);

    const onDataCallback = onData.mock.calls[0][0];

    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));

    expect(clientDisplayMessage.get()).toBe("STOP PRINTING");
    expect(LiebingerClass.prototype.stopPrint).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });

  it("should call `showDisplay` and `maskedUniquecode` command when machine state is already `STOPPED`", async () => {
    isPrinting.set(false);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    printerThread.setLastUpdate(true);
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS4\t4\t0\t0\t80\t0\r"));

    expect(clientDisplayMessage.get()).toBe("STOP PRINTING");
    expect(LiebingerClass.prototype.showDisplay).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.appendFifo).toHaveBeenCalledTimes(1);
  });
});
