import type { DatabaseThread } from "../databaseThread";
import {
  getUniquecodes,
  setBulkPrintedStatus,
  resetBulkBuffered,
} from "../../services/uniquecodes";
import { SharedPrimitive, SharedQueue } from "../../utils/sharedBuffer";
import { sleep } from "../../utils/helper";

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

const mockBatch = {
  id: 2049,
  created: new Date("2024-08-20T09:26:13.419Z"),
  sent: null,
  sendconfirmed: null,
  description: null,
  blockcodecount: 0,
  qty: 100000,
  endqueue: 10,
  printedqty: 0,
  batchno: "TEST2008241625",
  printerlineid: 0,
  createdby: 1000000,
  updated: new Date("2024-08-20T09:26:13.419Z"),
  updatedby: 1000000,
  productid: 1000371,
  isactive: true,
  nik: null,
  triggercount: null,
  goodreadcount: null,
  noreadcount: null,
  matchcount: null,
  mismatchcount: null,
};

describe("DatabaseThread", () => {
  // Declare variables for the DatabaseThread and shared data structures
  let databaseThread: DatabaseThread;
  let isPrinting: SharedPrimitive<boolean>;
  let isPrinterFinished: SharedPrimitive<boolean>;
  let printQueue: SharedQueue;
  let printedQueue: SharedQueue;
  let DBUpdateQueue: SharedQueue;
  let printerCounter: SharedPrimitive<number>;
  let displayMessage: SharedPrimitive<string>;
  let printedUpdateCount: SharedPrimitive<number>;

  // This function runs before each test, setting up the environment
  beforeEach(() => {
    // Reset all mocks to ensure each test is isolated
    jest.resetAllMocks();

    // Initialize actual SharedPrimitive and SharedQueue instances
    isPrinting = new SharedPrimitive<boolean>(false);
    isPrinterFinished = new SharedPrimitive<boolean>(false);
    printerCounter = new SharedPrimitive<number>(0);
    printedUpdateCount = new SharedPrimitive<number>(0);
    displayMessage = new SharedPrimitive<string>("");
    printQueue = new SharedQueue(400);
    printedQueue = new SharedQueue(400);
    DBUpdateQueue = new SharedQueue(400);

    // Dynamically import the DatabaseThread module to reset its state
    jest.isolateModules(() => {
      databaseThread = require("../databaseThread").databaseThread;
    });

    // Initialize the databaseThread with the shared buffers
    databaseThread.init({
      isPrintBuffer: isPrinting.getBuffer(),
      isPrinterFinishedBuffer: isPrinterFinished.getBuffer(),
      printedUpdateCountBuffer: printedUpdateCount.getBuffer(),
      printerCounterBuffer: printerCounter.getBuffer(),
      printBuffer: printQueue.getBuffer(),
      printedBuffer: printedQueue.getBuffer(),
      DBUpdateBuffer: DBUpdateQueue.getBuffer(),
      displayMessageBuffer: displayMessage.getBuffer(),
      batchInfo: mockBatch,
    });
  });

  // Test that the thread exits immediately if printing has finished
  it("should exit when isPrinterFinished", async () => {
    isPrinterFinished.set(true); // Simulate the printer finishing its job
    await databaseThread.run(); // Run the thread

    // Ensure that no database operations are called
    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).not.toHaveBeenCalled();
  });

  // Test that the thread exits if printing is not in progress
  it("should exit and not get new uniquecodes when isPrinting is false", async () => {
    isPrinting.set(false); // Simulate that the printer is not printing
    isPrinterFinished.set(true); // Simulate that the printer has finished
    await databaseThread.run(); // Run the thread

    // Ensure that no database operations are called
    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).not.toHaveBeenCalled();
  });

  // Test that the thread updates the database when items exist in the DBUpdateQueue
  it("should exit when isPrinting is false and update if item exist", async () => {
    isPrinting.set(false); // Simulate that the printer is not printing
    isPrinterFinished.set(true); // Simulate that the printer has finished
    DBUpdateQueue.push(
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" }
    ); // Add items to the DBUpdateQueue

    await databaseThread.run(); // Run the thread

    // Ensure that no new unique codes are fetched, but bulk printed status is updated
    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).toHaveBeenCalledWith(
      [1000004, 1000005],
      expect.any(Date)
    );
  });

  // Test that the thread processes DBUpdateQueue items when printing is active
  it("should update buffer when DBUpdateQueue has items", async () => {
    isPrinting.set(true); // Simulate that the printer is printing
    DBUpdateQueue.push(
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" }
    ); // Add items to the DBUpdateQueue
    printQueue.push(
      ...Array.from(new Array(200), (_, index) => ({
        id: 1000000 + index + 1,
        uniquecode: `CODE${index + 1}`,
      }))
    ); // Populate printQueue with some items

    const runPromise = databaseThread.run(); // Start running the thread

    // Simulate a short delay to allow the thread to process
    await sleep(1);

    // Simulate stopping the print and finishing the job
    isPrinting.set(false);
    isPrinterFinished.set(true);

    await runPromise; // Await the completion of the thread

    // Ensure that the thread processed the DBUpdateQueue and updated bulk printed status
    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).toHaveBeenCalled();
    expect(mockedSetBulkPrintedStatus).toHaveBeenCalledWith(
      [1000004, 1000005],
      expect.any(Date)
    );
  });

  // Test that the thread fetches new unique codes when the printQueue is below a certain size
  it("should populate buffer when printQueue is below MIN_QUEUE", async () => {
    const rawQueueData = Array.from(new Array(50), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    })); // Create initial printQueue data
    isPrinting.set(true); // Simulate that the printer is printing
    DBUpdateQueue.push(
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" }
    ); // Add items to the DBUpdateQueue
    printQueue.push(...rawQueueData); // Add raw data to printQueue

    // Mock fetching new unique codes from the database
    mockedGetUniquecodes.mockResolvedValue([
      { id: 1111000, uniquecode: "NEW_CODE" } as any,
    ]);

    expect(printQueue.size()).toBe(rawQueueData.length); // Check initial printQueue size

    const runPromise = databaseThread.run(); // Start running the thread

    // Simulate a short delay to allow the thread to process
    await sleep(1);

    // Ensure new unique codes are fetched and added to the queue
    expect(mockedGetUniquecodes).toHaveBeenCalled();
    expect(printQueue.size()).toEqual(rawQueueData.length + 1);
    expect(printQueue.getAll()).toEqual([
      ...rawQueueData,
      { id: 1111000, uniquecode: "NEW_CODE" },
    ]);

    // Simulate stopping the print and finishing the job
    isPrinting.set(false);
    isPrinterFinished.set(true);

    await runPromise; // Await the completion of the thread
  });

  // Test that the thread resets any remaining unique codes in the printedQueue when printing stops
  it("should exit and reset uniquecodes left in printed queue when isPrinting is false", async () => {
    const rawPrintedQueueData = Array.from(new Array(50), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    })); // Create initial printedQueue data
    printedQueue.push(...rawPrintedQueueData); // Add raw data to printedQueue

    expect(printedQueue.size()).toBe(rawPrintedQueueData.length); // Check initial printedQueue size

    isPrinting.set(false); // Simulate that the printer is not printing
    isPrinterFinished.set(true); // Simulate that the printer has finished

    await databaseThread.run(); // Run the thread

    // Ensure that the thread resets the buffered unique codes and empties the queue
    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalledWith(
      rawPrintedQueueData.map((uc) => uc.id)
    );
    expect(printedQueue.size()).toBe(0); // Ensure the printedQueue is empty
  });

  // Test that the thread resets any remaining unique codes in the printQueue when printing stops
  it("should exit and reset uniquecodes left in print queue when isPrinting is false", async () => {
    const rawPrintQueueData = Array.from(new Array(100), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    })); // Create initial printQueue data
    printQueue.push(...rawPrintQueueData); // Add raw data to printQueue

    expect(printQueue.size()).toBe(rawPrintQueueData.length); // Check initial printQueue size

    isPrinting.set(false); // Simulate that the printer is not printing
    isPrinterFinished.set(true); // Simulate that the printer has finished

    await databaseThread.run(); // Run the thread

    // Ensure that the thread resets the buffered unique codes and empties the queue
    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalledWith(
      rawPrintQueueData.map((uc) => uc.id)
    );
    expect(printQueue.size()).toBe(0); // Ensure the printQueue is empty
  });

  // Test that the thread resets any remaining unique codes in both the printQueue and printedQueue when printing stops
  it("should exit and reset uniquecodes left in print and printed queue when isPrinting is false", async () => {
    const rawPrintQueueData = Array.from(new Array(100), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    })); // Create initial printQueue data
    printQueue.push(...rawPrintQueueData); // Add raw data to printQueue

    const rawPrintedQueueData = Array.from(new Array(50), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    })); // Create initial printedQueue data
    printedQueue.push(...rawPrintedQueueData); // Add raw data to printedQueue

    expect(printQueue.size()).toBe(rawPrintQueueData.length); // Check initial printQueue size
    expect(printedQueue.size()).toBe(rawPrintedQueueData.length); // Check initial printedQueue size

    isPrinting.set(false); // Simulate that the printer is not printing
    isPrinterFinished.set(true); // Simulate that the printer has finished

    await databaseThread.run(); // Run the thread

    // Ensure that the thread resets the buffered unique codes and empties both queues
    expect(mockedGetUniquecodes).not.toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalled();
    expect(mockedResetBulkBuffered).toHaveBeenCalledWith([
      ...rawPrintQueueData.map((uc) => uc.id),
      ...rawPrintedQueueData.map((uc) => uc.id),
    ]);
    expect(printQueue.size()).toBe(0); // Ensure the printQueue is empty
    expect(printedQueue.size()).toBe(0); // Ensure the printedQueue is empty
  });
});
