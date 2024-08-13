import { expose } from "threads";
import {
  getUniquecodes,
  resetBulkBuffered,
  setBulkPrintedStatus,
} from "../services/uniquecodes";
import { chunkArray, sleep } from "../utils/helper";
import { QueueItem, SharedPrimitive, SharedQueue } from "../utils/sharedBuffer";

// Constants to define the maximum and minimum number of items in the print queue.
const MAX_PRINT_QUEUE = Number(process.env.MAX_PRINT_QUEUE ?? 254);
const MIN_PRINT_QUEUE = Number(process.env.MIN_PRINT_QUEUE ?? 180);

// Shared variables for managing the printing process and communication between threads.
let isPrinting: SharedPrimitive<boolean>;
let isPrinterFinished: SharedPrimitive<boolean>;
let printerCounter: SharedPrimitive<number>;
let printedUpdateCount: SharedPrimitive<number>;
let displayMessage: SharedPrimitive<string>;
let printQueue: SharedQueue;
let printedQueue: SharedQueue;
let DBUpdateQueue: SharedQueue;

// Type definition for the parameters needed to initialize the shared buffers.
type InitParams = {
  isPrintBuffer: SharedArrayBuffer;
  isPrinterFinishedBuffer: SharedArrayBuffer;
  printerCounterBuffer: SharedArrayBuffer;
  printedUpdateCountBuffer: SharedArrayBuffer;
  printBuffer: SharedArrayBuffer;
  printedBuffer: SharedArrayBuffer;
  DBUpdateBuffer: SharedArrayBuffer;
  displayMessageBuffer: SharedArrayBuffer;
};

// Initialize shared variables with the provided buffers.
const init = ({
  isPrintBuffer,
  isPrinterFinishedBuffer,
  printBuffer,
  printedBuffer,
  DBUpdateBuffer,
  printerCounterBuffer,
  displayMessageBuffer,
  printedUpdateCountBuffer,
}: InitParams) => {
  isPrinting = new SharedPrimitive<boolean>(isPrintBuffer); // Tracks if printing is ongoing.
  isPrinterFinished = new SharedPrimitive<boolean>(isPrinterFinishedBuffer); // Indicates if the printer has finished its task.
  printerCounter = new SharedPrimitive<number>(printerCounterBuffer); // Counts the number of items in the printer.
  printedUpdateCount = new SharedPrimitive<number>(printedUpdateCountBuffer); // Counts the number of items that have been updated in the database.
  displayMessage = new SharedPrimitive<string>(displayMessageBuffer); // Stores messages to be displayed.
  printQueue = new SharedQueue(printBuffer); // Queue for items waiting to be printed.
  printedQueue = new SharedQueue(printedBuffer); // Queue for items that have been printed.
  DBUpdateQueue = new SharedQueue(DBUpdateBuffer); // Queue for database update tasks.
};

// Main function that manages the printing process and updates the queues.
const run = async () => {
  while (
    !isPrinterFinished.get() || // Continue running if the printer hasn't finished.
    DBUpdateQueue.size() > 0 || // Continue if there are pending database updates.
    printQueue.size() > 0 || // Continue if there are items waiting to be printed.
    printedQueue.size() > 0 // Continue if there are printed items to process.
  ) {
    // Handle database updates if there are any pending.
    if (DBUpdateQueue.size() > 0) {
      const DBUpdateItems = DBUpdateQueue.shiftAll(); // Get all items from the database update queue.
      await updateBuffer(DBUpdateItems); // Process the database updates.
      printedUpdateCount.set(printedUpdateCount.get() + DBUpdateItems.length); // Update the count of printed items.
    }

    // Handle printing if the printer is finished.
    if (isPrinterFinished.get()) {
      if (printQueue.size() > 0 || printedQueue.size() > 0) {
        const printedItems = printedQueue.shiftAll(); // Get all items from the printed queue.
        const printItems = printQueue.shiftAll(); // Get all items from the print queue.

        await resetBuffer([...printItems, ...printedItems]); // Reset the buffer for the printed items.
        printerCounter.set(printerCounter.get() - printedItems.length); // Update the printer counter.
      }
    }

    // Determine the number of available slots in the print queue.
    const emptySlot = MAX_PRINT_QUEUE - printQueue.size();

    // Add new items to the print queue if conditions are met.
    if (
      isPrinting.get() && // Only if printing is ongoing.
      emptySlot > 0 && // Only if there are empty slots in the print queue.
      printQueue.size() <= MIN_PRINT_QUEUE // Only if the print queue is below the minimum threshold.
    ) {
      const newUniquecodes = await populateBufer(emptySlot); // Fetch new unique codes.
      if (newUniquecodes) {
        printQueue.push(...newUniquecodes); // Add the new unique codes to the print queue.
      } else {
        console.log("Failed to get new uniquecodes"); // Log failure if unable to fetch new unique codes.
      }
    }

    await sleep(500); // Wait for 500 milliseconds before the next iteration.
  }
};

// Update the database with printed status in bulk.
async function updateBuffer(DBUpdateQueue: QueueItem[]) {
  const uniquecodeIds = DBUpdateQueue.map((code) => code.id); // Extract IDs from the update queue.

  if (uniquecodeIds.length >= 500) {
    return await setBulkPrintedStatus(uniquecodeIds, new Date()); // Process large batches in bulk.
  }

  const chunks = chunkArray(uniquecodeIds, 500); // Split IDs into smaller chunks.
  return await Promise.all(
    chunks.map((codes) => setBulkPrintedStatus(codes, new Date())) // Process each chunk in parallel.
  );
}

// Reset the buffer for items in the reset queue in bulk.
async function resetBuffer(resetQueue: QueueItem[]) {
  const chunks = chunkArray(resetQueue, 500); // Split reset queue into chunks.
  await Promise.all(
    chunks.map((codes) => resetBulkBuffered(codes.map((code) => code.id))) // Reset each chunk in parallel.
  );
}

// Fetch new unique codes to add to the print queue.
async function populateBufer(limit: number) {
  const newUniquecodes = await getUniquecodes(limit); // Retrieve new unique codes.
  if (newUniquecodes) {
    return newUniquecodes; // Return the fetched unique codes.
  } else {
    console.log("Failed to get new uniquecodes"); // Log failure if unable to fetch unique codes.
    return []; // Return an empty array if no codes were fetched.
  }
}

// Export the thread functions and type.
export const databaseThread = {
  init,
  run,
  populateBufer,
};

export type DatabaseThread = typeof databaseThread;

// Expose the thread functions to be used in other parts of the application.
expose(databaseThread);
