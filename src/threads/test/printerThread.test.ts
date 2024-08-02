import type { PrinterThread } from "../printerThread";
import { SharedPrimitive, SharedQueue } from "../../utils/sharedBuffer";
import LiebingerClass from "../../actions/leibinger";

jest.mock("../../actions/leibinger");
jest.mock("threads", () => ({
  expose: () => {},
}));

describe("Printer Thread - Check Printer Status", () => {
  let printerThread: PrinterThread;
  let isPrinting: SharedPrimitive<boolean>;
  let printCounter: SharedPrimitive<number>;
  let printQueue: SharedQueue;
  let printedQueue: SharedQueue;
  let DBUpdateQueue: SharedQueue;
  let clientDisplayMessage: SharedPrimitive<string>;

  beforeEach(() => {
    jest.resetAllMocks();

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
  });

  it.only("should send stopPrint command when isPrinting is false and machine state is 6", async () => {
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

  it("should send showDisplay and maskedUniquecode command when isPrinting is false and machine state isn't 6", async () => {
    isPrinting.set(false);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();

    const onDataCallback = onData.mock.calls[0][0];

    await onDataCallback("^0=RS4\t4\t0\t0\t80\t0\r");

    expect(clientDisplayMessage.get()).toBe("STOP PRINTING");
    expect(LiebingerClass.prototype.showDisplay).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.appendFifo).toHaveBeenCalledTimes(1);
  });
  it("should update clientDisplayMessage when printer disconnected", async () => {});
  it("should automatically reconnect when connection disconnected", async () => {});
  it("should update clientDisplayMessage when nozzle state is 1", async () => {});
  it("should send openNozzle and update clientDisplayMessage when nozzle state is 3 or 4", async () => {});
  it("should send startPrint when nozzle state is 2 but machine state is 6", async () => {});
  it("should update clientDisplayMessage when receiving unskipped eror state", async () => {});
  it("should update clientDisplayMessage when receiving unskipped eror state", async () => {});
  it("should update clientDisplayMessage when receiving unidentified eror state", async () => {});
});
