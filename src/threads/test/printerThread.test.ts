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
    await onDataCallback("^0=RS1\t4\t0\t0\t80\t0\r");

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
    await onDataCallback("^0=RS1\t4\t0\t0\t80\t0\r");

    expect(clientDisplayMessage.get()).toBe("OPENING NOZZLE");
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });

  it("should call `startPrint` command when nozzle state is `OPENED` but machine state is not `STARTED`", async () => {
    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback("^0=RS2\t4\t0\t0\t80\t0\r");

    expect(LiebingerClass.prototype.startPrint).toHaveBeenCalledTimes(1);
  });

  it("should update `clientDisplayMessage` upon receiving an unidentified error state", async () => {
    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback("^0=RS2\t6\t1\t0\t80\t0\r");

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
    await onDataCallback("^0=RS2\t6\t1\t0\t80\t0\r");

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
    await onDataCallback("^0=RS2\t6\t1476405210\t0\t80\t0\r");

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
});

describe("Printer Thread - On Start Batch", () => {
  beforeEach(() => {
    setupPrinterThread();
  });

  it("should call `resetCounter` command on first print", async () => {
    isPrinting.set(false);

    const printerThreadRun = printerThread.run();
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    const onDataCallback = onData.mock.calls[0][0];

    await onDataCallback("^0=RS2\t5\t0\t0\t80\t0\r");
    await onDataCallback("^0=SM256\t0\t0\t0\t0\t0\r");

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
    await onDataCallback("^0=RS2\t6\t0\t0\t80\t0\r");
    expect(LiebingerClass.prototype.flushFIFO).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.hideDisplay).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.enableEchoMode).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );

    /** ON NEXT RUN UNTIL PRINT STOP */
    await onDataCallback("^0=RS2\t6\t0\t0\t80\t0\r");
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
    await onDataCallback("^0=RS2\t6\t0\t0\t80\t0\r");

    /** ON NEXT RUN UNTIL PRINT STOP */
    await onDataCallback("^0=RS2\t6\t0\t0\t80\t0\r");
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

  it("should call `stopPrint` command when machine state still `STARTED`", async () => {
    isPrinting.set(false);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();

    const onDataCallback = onData.mock.calls[0][0];

    await onDataCallback("^0=RS2\t6\t0\t0\t80\t0\r");

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
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback("^0=RS4\t4\t0\t0\t80\t0\r");

    expect(clientDisplayMessage.get()).toBe("STOP PRINTING");
    expect(LiebingerClass.prototype.showDisplay).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.appendFifo).toHaveBeenCalledTimes(1);
  });
});
