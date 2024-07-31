import { DatabaseThread } from "../databaseThread";
import {
  getUniquecodes,
  setBulkPrintedStatus,
} from "../../services/uniquecodes";
import { sleep } from "../../utils/helper";
import { SharedPrimitive, SharedQueue } from "../../utils/sharedBuffer";

// Mock dependencies
jest.mock("../../services/uniquecodes");
jest.mock("../../utils/helper");
jest.mock("threads", () => ({
  expose: () => {},
}));
// jest.mock('../../utils/sharedBuffer');

const mockedGetUniquecodes = getUniquecodes as jest.MockedFunction<
  typeof getUniquecodes
>;
const mockedSetBulkPrintedStatus = setBulkPrintedStatus as jest.MockedFunction<
  typeof setBulkPrintedStatus
>;
const mockedSleep = sleep as jest.MockedFunction<typeof sleep>;

describe("DatabaseThread", () => {
  let databaseThread: DatabaseThread;
  let mockIsPrinting: SharedPrimitive<boolean>;
  let mockPrintQueue: SharedQueue;
  let mockPrintedQueue: SharedQueue;

  beforeEach(() => {
    jest.resetAllMocks();

    // Create mock instances
    mockIsPrinting = new SharedPrimitive<boolean>(false);
    mockPrintQueue = new SharedQueue(100);
    mockPrintedQueue = new SharedQueue(100);

    // Import the module dynamically to reset the module state
    jest.isolateModules(() => {
      databaseThread = require("../databaseThread").databaseThread;
    });

    // Initialize the thread
    databaseThread.init({
      isPrintBuffer: mockIsPrinting.getBuffer(),
      printBuffer: mockPrintQueue.getBuffer(),
      printedBuffer: mockPrintedQueue.getBuffer(),
    });
  });

  describe("run", () => {
    it("should exit when isPrinting is false", async () => {
      mockIsPrinting.get = jest.fn().mockReturnValue(false);
      await databaseThread.run();
      expect(mockedSleep).not.toHaveBeenCalled();
    });

    it("should update buffer when printedQueue has items", async () => {
      mockIsPrinting.get = jest
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      mockPrintedQueue.size = jest.fn().mockReturnValue(1);
      mockPrintedQueue.shiftAll = jest.fn().mockReturnValue(["code1"]);

      await databaseThread.run();

      expect(mockedSetBulkPrintedStatus).toHaveBeenCalledWith(
        ["code1"],
        expect.any(Date)
      );
    });

    it.only("should populate buffer when printQueue is below MIN_QUEUE", async () => {
      mockIsPrinting.get = jest
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      mockPrintQueue.size = jest.fn().mockReturnValue(5); // Below MIN_QUEUE (10)
      mockedGetUniquecodes.mockResolvedValue([{ uniquecode: "new_code" }]);

      await databaseThread.run();

      expect(mockedGetUniquecodes).toHaveBeenCalled();
      expect(mockPrintQueue.push).toHaveBeenCalledWith("new_code");
    });
  });

  describe("populateBuffer", () => {
    it("should return an array of uniquecodes", async () => {
      mockedGetUniquecodes.mockResolvedValue([
        { uniquecode: "code1" },
        { uniquecode: "code2" },
      ]);

      const result = await databaseThread.populateBufer(2);

      expect(result).toEqual(["code1", "code2"]);
      expect(mockedGetUniquecodes).toHaveBeenCalledWith(2);
    });

    it("should return an empty array if getUniquecodes fails", async () => {
      mockedGetUniquecodes.mockResolvedValue([]);

      const result = await databaseThread.populateBufer(2);

      expect(result).toEqual([]);
      expect(mockedGetUniquecodes).toHaveBeenCalledWith(2);
    });
  });
});
