import { DatabaseThread } from "../databaseThread";
import {
  getUniquecodes,
  setBulkPrintedStatus,
} from "../../services/uniquecodes";
import { SharedPrimitive, SharedQueue } from "../../utils/sharedBuffer";
import { sleep } from "../../utils/helper";

// Only mock the database services
jest.mock("../../services/uniquecodes");
jest.mock("threads", () => ({
  expose: () => {},
}));

const mockedGetUniquecodes = getUniquecodes as jest.MockedFunction<
  typeof getUniquecodes
>;
const mockedSetBulkPrintedStatus = setBulkPrintedStatus as jest.MockedFunction<
  typeof setBulkPrintedStatus
>;

describe("DatabaseThread", () => {
  let databaseThread: DatabaseThread;
  let isPrinting: SharedPrimitive<boolean>;
  let printQueue: SharedQueue;
  let printedQueue: SharedQueue;
  let DBUpdateQueue: SharedQueue;

  beforeEach(() => {
    jest.resetAllMocks();

    // Create actual SharedPrimitive and SharedQueue instances
    isPrinting = new SharedPrimitive<boolean>(false);
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
      printBuffer: printQueue.getBuffer(),
      printedBuffer: printedQueue.getBuffer(),
      DBUpdateBuffer: DBUpdateQueue.getBuffer(),
    });
  });

  it("should exit when isPrinting is false", async () => {
    isPrinting.set(false);
    await databaseThread.run();

    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).not.toHaveBeenCalled();
  });

  it("should exit when isPrinting is false and update if item exist", async () => {
    isPrinting.set(false);
    DBUpdateQueue.push(
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" }
    );
    printQueue.push(
      ...Array.from(new Array(50), (_, index) => ({
        id: 1000000 + index + 1,
        uniquecode: `CODE${index + 1}`,
      }))
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

    isPrinting.set(false);

    await runPromise;

    expect(mockedGetUniquecodes).toHaveBeenCalled();
    expect(printQueue.size()).toEqual(rawQueueData.length + 1);
    expect(printQueue.getAll()).toEqual([
      ...rawQueueData,
      { id: 1111000, uniquecode: "NEW_CODE" },
    ]);
  });
});
