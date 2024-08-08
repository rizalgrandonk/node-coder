import type { DatabaseThread } from "../databaseThread";
import {
  getUniquecodes,
  setBulkPrintedStatus,
  resetBulkBuffered,
} from "../../services/uniquecodes";
import { SharedPrimitive, SharedQueue } from "../../utils/sharedBuffer";

const sleep = async (time: number) => {
  return await new Promise((res) => setTimeout(res, time));
};

// Only mock the database services
jest.mock("../../services/uniquecodes");
jest.mock("../../utils/helper", () => ({
  ...jest.requireActual("../../utils/helper"),
  sleep: async () => {
    return await new Promise((res) => setTimeout(res, 5));
  },
}));
jest.mock("threads", () => ({
  expose: () => {},
}));

const mockedGetUniquecodes = getUniquecodes as jest.MockedFunction<
  typeof getUniquecodes
>;
const mockedSetBulkPrintedStatus = setBulkPrintedStatus as jest.MockedFunction<
  typeof setBulkPrintedStatus
>;
const mockedResetBulkBuffered = resetBulkBuffered as jest.MockedFunction<
  typeof resetBulkBuffered
>;

describe("DatabaseThread", () => {
  let databaseThread: DatabaseThread;
  let isPrinting: SharedPrimitive<boolean>;
  let isPrinterFinished: SharedPrimitive<boolean>;
  let printQueue: SharedQueue;
  let printedQueue: SharedQueue;
  let DBUpdateQueue: SharedQueue;
  let printerCounter: SharedPrimitive<number>;

  beforeEach(() => {
    jest.resetAllMocks();

    // Create actual SharedPrimitive and SharedQueue instances
    isPrinting = new SharedPrimitive<boolean>(false);
    isPrinterFinished = new SharedPrimitive<boolean>(false);
    printerCounter = new SharedPrimitive<number>(0);
    printQueue = new SharedQueue(400);
    printedQueue = new SharedQueue(400);
    DBUpdateQueue = new SharedQueue(400);

    // Import the module dynamically to reset the module state
    jest.isolateModules(() => {
      databaseThread = require("../databaseThread").databaseThread;
    });

    // Initialize the thread with real shared buffers
    databaseThread.init({
      isPrintBuffer: isPrinting.getBuffer(),
      isPrinterFinishedBuffer: isPrinterFinished.getBuffer(),
      printerCounterBuffer: printerCounter.getBuffer(),
      printBuffer: printQueue.getBuffer(),
      printedBuffer: printedQueue.getBuffer(),
      DBUpdateBuffer: DBUpdateQueue.getBuffer(),
    });
  });

  it("should exit when isPrinterFinished", async () => {
    isPrinterFinished.set(true);
    await databaseThread.run();

    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).not.toHaveBeenCalled();
  });

  it("should exit and not get new uniquecodes when isPrinting is false", async () => {
    isPrinting.set(false);
    isPrinterFinished.set(true);
    await databaseThread.run();

    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).not.toHaveBeenCalled();
  });

  it("should exit when isPrinting is false and update if item exist", async () => {
    isPrinting.set(false);
    isPrinterFinished.set(true);
    DBUpdateQueue.push(
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" }
    );

    await databaseThread.run();

    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).toHaveBeenCalledWith(
      [1000004, 1000005],
      expect.any(Date)
    );
  });

  it("should update buffer when DBUpdateQueue has items", async () => {
    isPrinting.set(true);
    DBUpdateQueue.push(
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" }
    );
    printQueue.push(
      ...Array.from(new Array(200), (_, index) => ({
        id: 1000000 + index + 1,
        uniquecode: `CODE${index + 1}`,
      }))
    );

    const runPromise = databaseThread.run();

    // Wait a short time to allow the function to process
    await sleep(1);

    isPrinting.set(false);
    isPrinterFinished.set(true);

    await runPromise;

    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).toHaveBeenCalledWith(
      [1000004, 1000005],
      expect.any(Date)
    );
  });

  it("should populate buffer when printQueue is below MIN_QUEUE", async () => {
    const rawQueueData = Array.from(new Array(50), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    }));
    isPrinting.set(true);
    DBUpdateQueue.push(
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" }
    );
    printQueue.push(...rawQueueData);

    mockedGetUniquecodes.mockResolvedValue([
      { id: 1111000, uniquecode: "NEW_CODE" },
    ]);

    expect(printQueue.size()).toBe(rawQueueData.length);

    const runPromise = databaseThread.run();

    // Wait a short time to allow the function to process
    await sleep(1);
    expect(mockedGetUniquecodes).toHaveBeenCalled();
    expect(printQueue.size()).toEqual(rawQueueData.length + 1);
    expect(printQueue.getAll()).toEqual([
      ...rawQueueData,
      { id: 1111000, uniquecode: "NEW_CODE" },
    ]);

    isPrinting.set(false);
    isPrinterFinished.set(true);

    await runPromise;
  });

  it("should exit and reset uniquecodes left in printed queue when isPrinting is false", async () => {
    const rawPrintedQueueData = Array.from(new Array(50), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    }));
    printedQueue.push(...rawPrintedQueueData);

    expect(printedQueue.size()).toBe(rawPrintedQueueData.length);

    isPrinting.set(false);
    isPrinterFinished.set(true);

    await databaseThread.run();

    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalledWith(
      rawPrintedQueueData.map((uc) => uc.id)
    );
    expect(printedQueue.size()).toBe(0);
  });

  it("should exit and reset uniquecodes left in print queue when isPrinting is false", async () => {
    const rawPrintQueueData = Array.from(new Array(100), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    }));
    printQueue.push(...rawPrintQueueData);

    expect(printQueue.size()).toBe(rawPrintQueueData.length);

    isPrinting.set(false);
    isPrinterFinished.set(true);

    await databaseThread.run();

    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalledWith(
      rawPrintQueueData.map((uc) => uc.id)
    );
    expect(printQueue.size()).toBe(0);
  });

  it("should exit and reset uniquecodes left in print and printed queue when isPrinting is false", async () => {
    const rawPrintQueueData = Array.from(new Array(100), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    }));
    printQueue.push(...rawPrintQueueData);

    const rawPrintedQueueData = Array.from(new Array(50), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    }));
    printedQueue.push(...rawPrintedQueueData);

    expect(printQueue.size()).toBe(rawPrintQueueData.length);
    expect(printedQueue.size()).toBe(rawPrintedQueueData.length);

    isPrinting.set(false);
    isPrinterFinished.set(true);

    await databaseThread.run();

    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalledWith([
      ...rawPrintQueueData.map((uc) => uc.id),
      ...rawPrintedQueueData.map((uc) => uc.id),
    ]);
    expect(printQueue.size()).toBe(0);
    expect(printedQueue.size()).toBe(0);
  });
});
