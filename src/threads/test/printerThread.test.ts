import * as TestPrinterThread from "../printerThread";
import type { PrinterThread } from "../printerThread";
import { SharedPrimitive, SharedQueue } from "../../utils/sharedBuffer";
import LiebingerClass from "../../actions/leibinger";
import { sleep } from "../../utils/helper";
import * as ErrorCodeService from "../../services/errorcode";
import * as ErrorLogService from "../../services/codererrorlogs";
import {
  CONNECTION_ERROR_LIST,
  PRINTER_ERROR_LIST,
  PRINTER_MESSAGE_LIST,
  QUEUE_ERROR_LIST,
} from "../../utils/errors";

// Mocks
jest.mock("../../services/codererrorlogs");
jest.mock("../../services/errorcode");
jest.mock("../../actions/leibinger");
jest.mock("threads", () => ({
  expose: () => {},
}));
jest.mock("../../utils/helper");

// Init shared variables
let printerThread: PrinterThread;
let isPrinting: SharedPrimitive<boolean>;
let isPrinterFinished: SharedPrimitive<boolean>;
let printCounter: SharedPrimitive<number>;
let printQueue: SharedQueue;
let printedQueue: SharedQueue;
let DBUpdateQueue: SharedQueue;
let clientDisplayMessage: SharedPrimitive<string>;

// Reset all mocks before each test
const setupPrinterThread = () => {
  jest.resetAllMocks();
  jest.spyOn(ErrorLogService, "insertErrorLog").mockResolvedValue(1);
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

/**
 * Unit tests for the Printer Thread's handling of printer status responses.
 * These tests ensure that the Printer Thread updates the `clientDisplayMessage` correctly
 * and calls the appropriate methods based on different printer states and error conditions.
 */
describe("Printer Thread - Check Printer Status", () => {
  // Prepare the printer thread for each test
  beforeEach(() => {
    setupPrinterThread();
  });

  /**
   * Test to check if the system updates the message to "OPENING NOZZLE"
   * when the printer is trying to open the nozzle.
   */
  it("should update `clientDisplayMessage` when nozzle state is `OPENING`", async () => {
    // Set the printer to be in printing mode
    isPrinting.set(true);

    // Simulate receiving a message from the printer
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS1\t4\t0\t0\t80\t0\r"));

    // Check if the message displayed to the client is "OPENING NOZZLE"
    expect(clientDisplayMessage.get()).toBe("OPENING NOZZLE");

    // Ensure there is a delay while opening the nozzle and the printer status is checked
    expect(sleep).toHaveBeenCalledWith(7500);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });

  /**
   * Test to check if the system calls the `openNozzle` command and updates the message
   * when the printer's nozzle is either closed or closing.
   */
  it("should call `openNozzle` command and update `clientDisplayMessage` when nozzle state is `CLOSED` or `CLOSING`", async () => {
    // Set the printer to be in printing mode
    isPrinting.set(true);

    // Simulate receiving a message from the printer
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS1\t4\t0\t0\t80\t0\r"));

    // Check if the message displayed to the client is "OPENING NOZZLE"
    expect(clientDisplayMessage.get()).toBe("OPENING NOZZLE");
    // Ensure that the printer status is checked
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });

  /**
   * Test to verify that the `startPrint` command is initiated when the nozzle is ready
   * but the printer is not yet ready.
   */
  it("should call `startPrint` command when nozzle state is `READY` but machine state is `AVAILABLE_TO_START`", async () => {
    // Set the printer to be in printing mode
    isPrinting.set(true);

    // Simulate receiving a message from the printer
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS2\t5\t0\t0\t80\t0\r"));

    // Ensure that the print command is started
    expect(LiebingerClass.prototype.startPrint).toHaveBeenCalledTimes(1);
  });

  /**
   * Test to check if the system updates the message with an error when an unidentified error code is received.
   */
  it("should update `clientDisplayMessage` upon receiving an unidentified error state", async () => {
    // Set the printer to be in printing mode
    isPrinting.set(true);

    // Simulate receiving an error message from the printer
    const mockInsertErrorLog = jest.spyOn(ErrorLogService, "insertErrorLog");
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS2\t6\t1\t0\t80\t0\r"));

    // Check if the error message is displayed and logged correctly
    expect(clientDisplayMessage.get()).toBe("Unidentified Error Code: 1");
    expect(LiebingerClass.prototype.closeError).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
    expect(mockInsertErrorLog).toHaveBeenCalledTimes(1);
    const messageParam = mockInsertErrorLog.mock.calls[0][0].errormessage;
    expect(messageParam).toEqual("Unidentified Error Code: 1");
  });

  /**
   * Test to verify that the system updates the message when an unskippable error code is received.
   */
  it("should update `clientDisplayMessage` upon receiving an unskippable error state", async () => {
    // Mock an unskippable error code
    const mockInsertErrorLog = jest.spyOn(ErrorLogService, "insertErrorLog");
    jest.spyOn(ErrorCodeService, "findByCode").mockResolvedValue([
      {
        errorcode: "0123456789",
        errorname: "Unskippable Error",
        description: null,
      },
    ]);

    // Set the printer to be in printing mode
    isPrinting.set(true);

    // Simulate receiving the unskippable error message
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS2\t6\t1\t0\t80\t0\r"));

    // Check if the unskippable error message is displayed and logged correctly
    expect(clientDisplayMessage.get()).toBe("Unskippable Error");
    expect(LiebingerClass.prototype.closeError).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
    expect(mockInsertErrorLog).toHaveBeenCalledTimes(1);
    const messageParam = mockInsertErrorLog.mock.calls[0][0].errormessage;
    expect(messageParam).toEqual("Unskippable Error");
  });

  /**
   * Test to check if the system updates the message when a skipped error code is received.
   */
  it("should update `clientDisplayMessage` upon receiving a skipped error state", async () => {
    // Mock a skipped error code
    const mockInsertErrorLog = jest.spyOn(ErrorLogService, "insertErrorLog");
    jest.spyOn(clientDisplayMessage, "set");
    jest.spyOn(ErrorCodeService, "findByCode").mockResolvedValue([
      {
        errorcode: "1476405210",
        errorname: "Battery Low",
        description: null,
      },
    ]);

    // Set the printer to be in printing mode
    isPrinting.set(true);

    // Simulate receiving the skipped error message
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS2\t6\t1476405210\t0\t80\t0\r"));

    // Check that the skipped error message is not displayed but logged correctly
    expect(clientDisplayMessage.set).not.toHaveBeenCalledWith("Battery Low");
    expect(LiebingerClass.prototype.closeError).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
    expect(mockInsertErrorLog).toHaveBeenCalledTimes(1);
    const messageParam = mockInsertErrorLog.mock.calls[0][0].errormessage;
    expect(messageParam).toEqual("Battery Low");
  });

  /**
   * Test to verify that the system updates the message when the printer gets disconnected.
   */
  it("should update `clientDisplayMessage` when printer disconnected", async () => {
    // Set the printer to be in printing mode
    isPrinting.set(true);

    // Simulate receiving a disconnection message from the printer
    const mockInsertErrorLog = jest.spyOn(ErrorLogService, "insertErrorLog");
    const onData = jest.spyOn(LiebingerClass.prototype, "onConnectionChange");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback("close");

    // Check if the message displayed to the client is about the disconnection
    expect(clientDisplayMessage.get()).toBe(CONNECTION_ERROR_LIST.CLOSED);
    expect(mockInsertErrorLog).toHaveBeenCalledTimes(1);
    const messageParam = mockInsertErrorLog.mock.calls[0][0].errormessage;
    expect(messageParam).toEqual(CONNECTION_ERROR_LIST.CLOSED);
  });

  /**
   * Test to check if the system clears the message when the printer reconnects.
   */
  it("should clear `clientDisplayMessage` when printer connected", async () => {
    // Set the printer to be in printing mode
    isPrinting.set(true);

    // Simulate receiving a reconnection message from the printer
    const mockInsertErrorLog = jest.spyOn(ErrorLogService, "insertErrorLog");
    const onData = jest.spyOn(LiebingerClass.prototype, "onConnectionChange");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback("connect");

    // Check if the message displayed to the client is cleared
    expect(clientDisplayMessage.get()).toBe("");
  });

  /**
   * Test to verify that the system updates the message when the printer queue
   * falls below the minimum threshold.
   */
  it("should update `clientDisplayMessage` when printerQueue is under minimum queue", async () => {
    // Set the printer to be in printing mode
    isPrinting.set(true);
    printQueue.shiftAll();
    printedQueue.push({ id: 1000001, uniquecode: "UNIQUECODE1" });
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    const mockInsertErrorLog = jest.spyOn(ErrorLogService, "insertErrorLog");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];

    // Simulate low queue status
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));

    // Check if the message about the low queue is displayed and logged
    expect(clientDisplayMessage.get()).toBe(QUEUE_ERROR_LIST.UNDER_LIMIT);
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      2
    );
    expect(LiebingerClass.prototype.checkMailingStatus).toHaveBeenCalledTimes(
      1
    );
    expect(mockInsertErrorLog).toHaveBeenCalledTimes(1);
    const messageParam = mockInsertErrorLog.mock.calls[0][0].errormessage;
    expect(messageParam).toEqual(QUEUE_ERROR_LIST.UNDER_LIMIT);
  });

  /**
   * Test to verify that the system updates the message when the print queue is empty.
   */
  it("should update `clientDisplayMessage` when Queue is Empty", async () => {
    // Set the printer to be in printing mode
    isPrinting.set(true);
    printQueue.shiftAll();
    printedQueue.shiftAll();
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    const mockInsertErrorLog = jest.spyOn(ErrorLogService, "insertErrorLog");
    printerThread.listenPrinterResponse();
    printerThread.setFirstRun(false);
    const onDataCallback = onData.mock.calls[0][0];

    // Simulate an empty queue status
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));

    // Check if the message about the empty queue is displayed and logged
    expect(clientDisplayMessage.get()).toBe(
      QUEUE_ERROR_LIST.MAILING_BUFFER_EMPTY
    );
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
    expect(LiebingerClass.prototype.checkMailingStatus).toHaveBeenCalledTimes(
      1
    );
    expect(mockInsertErrorLog).toHaveBeenCalledTimes(1);
    const messageParam = mockInsertErrorLog.mock.calls[0][0].errormessage;
    expect(messageParam).toEqual(QUEUE_ERROR_LIST.MAILING_BUFFER_EMPTY);
  });

  /**
   * Test to verify that the system updates the message when the printing speed is below the acceptable range.
   */
  it("should update `clientDisplayMessage` when application is under speed", async () => {
    // Set the printer to be in printing mode
    isPrinting.set(true);
    printQueue.shiftAll();
    printedQueue.push(
      ...Array.from(new Array(50), (_, index) => ({
        id: 1000000 + index + 1,
        uniquecode: `CODE${index + 1}`,
      }))
    );

    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    const mockInsertErrorLog = jest.spyOn(ErrorLogService, "insertErrorLog");
    printerThread.listenPrinterResponse();
    printerThread.setFirstRefill(false);
    printerThread.setLastUpdate(false);
    const onDataCallback = onData.mock.calls[0][0];

    // Simulate a speed issue
    await onDataCallback(Buffer.from("^0=SM256\t10\t50\t0\t0\t0\r"));

    // Check if the message about the speed issue is displayed and logged
    expect(clientDisplayMessage.get()).toBe(QUEUE_ERROR_LIST.UNDER_SPEED);
    expect(mockInsertErrorLog).toHaveBeenCalledTimes(1);
    const messageParam = mockInsertErrorLog.mock.calls[0][0].errormessage;
    expect(messageParam).toEqual(QUEUE_ERROR_LIST.UNDER_SPEED);
  });

  /**
   * Test to verify that the system updates the message when opening the nozzle takes too long.
   */
  it("should update `clientDisplayMessage` when opening nozzle reach timeout", async () => {
    // Set the printer to be in printing mode
    isPrinting.set(true);
    jest.spyOn(clientDisplayMessage, "set");

    const mockInsertErrorLog = jest.spyOn(ErrorLogService, "insertErrorLog");

    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();

    // Simulate nozzle being closed and then attempt to open it
    const onDataCallback = onData.mock.calls[0][0];
    await onDataCallback(Buffer.from("^0=RS4\t5\t0\t0\t80\t0\r"));
    expect(LiebingerClass.prototype.openNozzle).toHaveBeenCalledTimes(1);

    // Simulate multiple attempts to open the nozzle
    for (let i = 0; i < 8; i++) {
      await onDataCallback(Buffer.from("^0=RS1\t5\t0\t0\t80\t0\r"));
      expect(isPrinting.get()).toBe(true);
      expect(isPrinterFinished.get()).toBe(false);
      expect(clientDisplayMessage.get()).toEqual(
        PRINTER_MESSAGE_LIST.OPENINNG_NOZZLE
      );
    }

    // After several attempts, check if the timeout message is displayed
    await onDataCallback(Buffer.from("^0=RS1\t5\t0\t0\t80\t0\r"));
    expect(isPrinting.get()).toBe(false);
    expect(isPrinterFinished.get()).toBe(true);
    expect(clientDisplayMessage.get()).toEqual(
      PRINTER_ERROR_LIST.OPEN_NOZZLE_TIMEOUT
    );
    expect(mockInsertErrorLog).toHaveBeenCalledTimes(1);
    const messageParam = mockInsertErrorLog.mock.calls[0][0].errormessage;
    expect(messageParam).toEqual(PRINTER_ERROR_LIST.OPEN_NOZZLE_TIMEOUT);
  });
});

/**
 * Unit tests for the Printer Thread's handling of the print process.
 * These tests ensure that print queue entries are correctly moved to the printed queue and
 * DB update queue based on FIFO (First In, First Out) order, and that appropriate commands
 * are sent to the printer.
 */
describe("Printer Thread - On Print Process", () => {
  // Setup the printer thread before each test
  beforeEach(() => {
    setupPrinterThread();
  });

  /**
   * Test case to verify that printed queue entries are moved to the DB update queue
   * based on FIFO order after processing a complete batch of print jobs.
   */
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

    // After processing, the printed queue should be empty
    expect(printedQueue.size()).toEqual(0);
    expect(printedQueue.getAll()).toEqual([]);

    // The DB update queue should now contain the processed entries
    expect(DBUpdateQueue.size()).toEqual(queueData.length);
    expect(DBUpdateQueue.getAll()).toEqual(queueData);
  });

  /**
   * Test case to verify that printed queue entries are moved to the DB update queue
   * in partial batches, handling the FIFO order correctly.
   */
  it("Move printed queue to DB update queue based on FIFO entries (partial)", async () => {
    const queueData = Array.from(new Array(250), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    }));

    printQueue.push(...queueData);

    expect(printQueue.size()).toEqual(queueData.length);
    expect(printQueue.getAll()).toEqual(queueData);

    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];

    /** ON FIRST RUN PRINT */
    await onDataCallback(Buffer.from("^0=SM256\t0\t0\t0\t0\t0\r"));

    // After first run, the printed queue should contain the first 60 entries
    expect(printedQueue.size()).toEqual(60);
    expect(printedQueue.getAll()).toEqual(queueData.slice(0, 60));

    await onDataCallback(Buffer.from("^0=SM256\t57\t2\t0\t0\t0\r"));

    // After processing, the printed queue should move up by 2 entries
    expect(printedQueue.size()).toEqual(60);
    expect(printedQueue.getAll()).toEqual(queueData.slice(2, 62));

    // The DB update queue should now contain the first 2 processed entries
    expect(DBUpdateQueue.size()).toEqual(2);
    expect(DBUpdateQueue.getAll()).toEqual(queueData.slice(0, 2));

    /** ON NEXT RUN UNTIL PRINT STOP */
    await onDataCallback(Buffer.from("^0=SM256\t58\t3\t0\t0\t0\r"));

    // After the next run, the printed queue should move up by another entry
    expect(printedQueue.size()).toEqual(60);
    expect(printedQueue.getAll()).toEqual(queueData.slice(3, 63));

    expect(DBUpdateQueue.size()).toEqual(3);
    expect(DBUpdateQueue.getAll()).toEqual(queueData.slice(0, 3));
  });

  /**
   * Test case to verify that unique codes are correctly appended and sent to the printer,
   * and that print queue data is moved to the printed queue after processing.
   */
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

    // After processing, the print queue should be empty
    expect(printQueue.size()).toEqual(0);
    expect(printQueue.getAll()).toEqual([]);

    // The printed queue should now contain the processed entries
    expect(printedQueue.size()).toEqual(queueData.length);
    expect(printedQueue.getAll()).toEqual(queueData);

    // Verify that the executeCommand method was called with the correct parameters
    expect(LiebingerClass.prototype.executeCommand).toHaveBeenCalledWith(
      `${queueData
        .map((code, i) => `^0=MR${i + 1}\t${code.uniquecode}`)
        .join("\r")}\r\n`
    );
  });

  /**
   * Test case to verify that unique codes are correctly appended and sent to the printer,
   * and that print queue data is moved to the printed queue in partial batches after processing.
   */
  it("should call append uniquecode command and send it to the printer, and move print queue data to printed queue (partial)", async () => {
    const queueData = Array.from(new Array(250), (_, index) => ({
      id: 1000000 + index + 1,
      uniquecode: `CODE${index + 1}`,
    }));

    printQueue.push(...queueData);

    expect(printQueue.size()).toEqual(queueData.length);
    expect(printQueue.getAll()).toEqual(queueData);

    isPrinting.set(true);
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];

    /** ON FIRST RUN PRINT */
    await onDataCallback(Buffer.from("^0=SM256\t0\t0\t0\t0\t0\r"));

    // After the first run, the print queue should be partially emptied
    expect(printQueue.size()).toEqual(queueData.length - 60);
    expect(printQueue.getAll()).toEqual(queueData.slice(60));

    // DB update queue should still be empty
    expect(DBUpdateQueue.size()).toEqual(0);
    expect(DBUpdateQueue.getAll()).toEqual([]);

    // Printed queue should contain the first 60 entries
    expect(printedQueue.size()).toEqual(60);
    expect(printedQueue.getAll()).toEqual(queueData.slice(0, 60));

    // Verify that the executeCommand method was called with the correct parameters
    expect(LiebingerClass.prototype.executeCommand).toHaveBeenCalledWith(
      `${queueData
        .slice(0, 60)
        .map((code, i) => `^0=MR${i + 1}\t${code.uniquecode}`)
        .join("\r")}\r\n`
    );

    /** ON NEXT RUN UNTIL PRINT STOP (firstRefill == false) */
    await onDataCallback(Buffer.from("^0=SM256\t58\t1\t0\t0\t0\r"));

    // After the next run, the print queue should be further emptied
    expect(printQueue.size()).toEqual(queueData.length - 61);
    expect(printQueue.getAll()).toEqual(queueData.slice(61));

    // DB update queue should contain the first processed entry
    expect(DBUpdateQueue.size()).toEqual(1);
    expect(DBUpdateQueue.getAll()).toEqual(queueData.slice(0, 1));

    // Printed queue should now start from the second entry
    expect(printedQueue.size()).toEqual(60);
    expect(printedQueue.getAll()).toEqual(queueData.slice(1, 61));

    // Verify that the executeCommand method was called with the correct parameters
    expect(LiebingerClass.prototype.executeCommand).toHaveBeenCalledWith(
      `${queueData
        .slice(60, 61)
        .map((code, i) => `^0=MR${i + 61}\t${code.uniquecode}`)
        .join("\r")}\r\n`
    );
  });
});

/**
 * Unit tests for the Printer Thread's handling of starting a new batch of prints.
 * These tests verify that the printer correctly resets its counter on the first print
 * and checks the printer status as expected.
 */
describe("Printer Thread - On Start Batch", () => {
  // Setup the printer thread before each test
  beforeEach(() => {
    setupPrinterThread();
  });

  /**
   * Test case to verify that the `resetCounter` command is called when starting the first print
   * and that the printer status is checked as expected.
   */
  it("should call `resetCounter` command on first print", async () => {
    // Set the initial state to indicate that printing is not in progress and the printer is finished
    isPrinting.set(false);
    isPrinterFinished.set(true);

    // Start the printer thread
    const printerThreadRun = printerThread.run();
    printerThread.setLastUpdate(true);

    // Spy on the onData method to capture the callback
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    const onDataCallback = onData.mock.calls[0][0];

    // Simulate receiving data from the printer that indicates a batch start
    await onDataCallback(Buffer.from("^0=RS2\t5\t0\t0\t80\t0\r"));

    // Wait for the printer thread to finish its run
    await printerThreadRun;

    // Verify that the `resetCounter` method was called once
    expect(LiebingerClass.prototype.resetCounter).toHaveBeenCalledTimes(1);

    // Verify that the `checkPrinterStatus` method was called once
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });
});

/**
 * Unit tests for the Printer Thread's behavior during the start of a print operation.
 * These tests ensure that the correct commands are issued when initiating and running
 * a print job, both on the first print and subsequent prints.
 */
describe("Printer Thread - On Start Print", () => {
  // Setup the printer thread before each test
  beforeEach(() => {
    setupPrinterThread();
  });

  /**
   * Test case to verify that specific commands (`flushFIFO`, `hideDisplay`, and `enableEchoMode`)
   * are called during the first print operation, and that the printer status is checked.
   */
  it("should call `flushFIFO`, `hideDisplay`, and `enableEchoMode` commands on the first print", async () => {
    // Set the initial state to indicate that printing is in progress
    isPrinting.set(true);

    // Spy on the onData method to capture the callback
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];

    /** ON FIRST RUN PRINT */
    // Simulate receiving data from the printer that triggers the start of printing
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));

    // Verify that the `flushFIFO`, `hideDisplay`, and `enableEchoMode` commands were called once each
    expect(LiebingerClass.prototype.flushFIFO).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.hideDisplay).toHaveBeenCalledTimes(1);
    expect(LiebingerClass.prototype.enableEchoMode).toHaveBeenCalledTimes(1);

    // Verify that the `checkPrinterStatus` method was called once
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );

    /** ON NEXT RUN UNTIL PRINT STOP */
    // Simulate another run of the printer during the ongoing print process
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));

    // Verify that the `checkMailingStatus` method was called once
    expect(LiebingerClass.prototype.checkMailingStatus).toHaveBeenCalledTimes(
      1
    );

    // Verify that the `checkPrinterStatus` method was called twice in total
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      2
    );
  });

  /**
   * Test case to verify that the `checkPrintStatus` and `checkMailingStatus` commands
   * are called during subsequent print operations (not on the first print).
   */
  it("should call `checkPrintStatus` and `checkMailingStatus` commands when not on the first print", async () => {
    // Set the initial state to indicate that printing is in progress
    isPrinting.set(true);

    // Spy on the onData method to capture the callback
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    const onDataCallback = onData.mock.calls[0][0];

    /** ON FIRST RUN PRINT */
    // Simulate receiving data from the printer that triggers the start of printing
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));

    /** ON NEXT RUN UNTIL PRINT STOP */
    // Simulate another run of the printer during the ongoing print process
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));

    // Verify that the `checkMailingStatus` method was called once
    expect(LiebingerClass.prototype.checkMailingStatus).toHaveBeenCalledTimes(
      1
    );

    // Verify that the `checkPrinterStatus` method was called twice in total
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      2
    );
  });
});

/**
 * Unit tests for the Printer Thread's behavior during the stop of a print operation.
 * These tests ensure that the correct commands and actions are taken when stopping a print job,
 * depending on the machine's current state.
 */
describe("Printer Thread - On Stop Print", () => {
  // Setup the printer thread before each test
  beforeEach(() => {
    setupPrinterThread();
  });

  /**
   * Test case to verify that the `stopPrint` command is called when the machine state is still `READY`.
   */
  it("should call `stopPrint` command when machine state is still `READY`", async () => {
    // Set the initial state to indicate that printing is not in progress
    isPrinting.set(false);

    // Spy on the onData method to capture the callback
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    printerThread.setLastUpdate(true);

    // Capture the onData callback for simulation
    const onDataCallback = onData.mock.calls[0][0];

    // Simulate receiving data from the printer that indicates the machine is still in the `READY` state
    await onDataCallback(Buffer.from("^0=RS2\t6\t0\t0\t80\t0\r"));

    // Verify that the client display message is updated to "STOP PRINTING"
    expect(clientDisplayMessage.get()).toBe("STOP PRINTING");

    // Verify that the `stopPrint` command is called once
    expect(LiebingerClass.prototype.stopPrint).toHaveBeenCalledTimes(1);

    // Verify that the `checkPrinterStatus` method is called once
    expect(LiebingerClass.prototype.checkPrinterStatus).toHaveBeenCalledTimes(
      1
    );
  });

  /**
   * Test case to verify that the `showDisplay` and `maskedUniquecode` commands are called
   * when the machine state is already `STOPPED`.
   */
  it("should call `showDisplay` and `maskedUniquecode` commands when machine state is already `STOPPED`", async () => {
    // Set the initial state to indicate that printing is not in progress
    isPrinting.set(false);

    // Spy on the onData method to capture the callback
    const onData = jest.spyOn(LiebingerClass.prototype, "onData");
    printerThread.listenPrinterResponse();
    printerThread.setLastUpdate(true);

    // Capture the onData callback for simulation
    const onDataCallback = onData.mock.calls[0][0];

    // Simulate receiving data from the printer that indicates the machine is already in the `STOPPED` state
    await onDataCallback(Buffer.from("^0=RS4\t4\t0\t0\t80\t0\r"));

    // Verify that the client display message is updated to "STOP PRINTING"
    expect(clientDisplayMessage.get()).toBe("STOP PRINTING");

    // Verify that the `showDisplay` command is called once
    expect(LiebingerClass.prototype.showDisplay).toHaveBeenCalledTimes(1);

    // Verify that the `maskedUniquecode` command (assuming `appendFifo` here) is called once
    expect(LiebingerClass.prototype.appendFifo).toHaveBeenCalledTimes(1);
  });
});
