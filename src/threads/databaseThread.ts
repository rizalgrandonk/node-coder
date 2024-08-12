import { expose } from "threads";
import {
  getUniquecodes,
  resetBulkBuffered,
  setBulkPrintedStatus,
} from "../services/uniquecodes";
import { chunkArray, sleep } from "../utils/helper";
import { QueueItem, SharedPrimitive, SharedQueue } from "../utils/sharedBuffer";

const MAX_PRINT_QUEUE = Number(process.env.MAX_PRINT_QUEUE ?? 254);
const MIN_PRINT_QUEUE = Number(process.env.MIN_PRINT_QUEUE ?? 180);
// const GOALS_LENGTH = 10000;

let isPrinting: SharedPrimitive<boolean>;
let isPrinterFinished: SharedPrimitive<boolean>;
let printerCounter: SharedPrimitive<number>;
let printedUpdateCount: SharedPrimitive<number>;
let displayMessage: SharedPrimitive<string>;
let printQueue: SharedQueue;
let printedQueue: SharedQueue;
let DBUpdateQueue: SharedQueue;

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
  isPrinting = new SharedPrimitive<boolean>(isPrintBuffer);
  isPrinterFinished = new SharedPrimitive<boolean>(isPrinterFinishedBuffer);
  printerCounter = new SharedPrimitive<number>(printerCounterBuffer);
  printedUpdateCount = new SharedPrimitive<number>(printedUpdateCountBuffer);
  displayMessage = new SharedPrimitive<string>(displayMessageBuffer);
  printQueue = new SharedQueue(printBuffer);
  printedQueue = new SharedQueue(printedBuffer);
  DBUpdateQueue = new SharedQueue(DBUpdateBuffer);
};

const run = async () => {
  while (
    !isPrinterFinished.get() ||
    DBUpdateQueue.size() > 0 ||
    printQueue.size() > 0 ||
    printedQueue.size() > 0
  ) {
    if (DBUpdateQueue.size() > 0) {
      const DBUpdateItems = DBUpdateQueue.shiftAll();
      await updateBuffer(DBUpdateItems);
      printedUpdateCount.set(printedUpdateCount.get() + DBUpdateItems.length);
    }
    if (isPrinterFinished.get()) {
      if (printQueue.size() > 0 || printedQueue.size() > 0) {
        const printedItems = printedQueue.shiftAll();
        const printItems = printQueue.shiftAll();

        await resetBuffer([...printItems, ...printedItems]);
        // ! TEMPORARY FOR TEST
        // printQueue.shiftAll();
        // printedQueue.shiftAll();

        printerCounter.set(printerCounter.get() - printedItems.length);
      }
    }

    const emptySlot = MAX_PRINT_QUEUE - printQueue.size();

    if (
      isPrinting.get() &&
      emptySlot > 0 &&
      printQueue.size() <= MIN_PRINT_QUEUE
    ) {
      const newUniquecodes = await populateBufer(emptySlot);
      if (newUniquecodes) {
        printQueue.push(...newUniquecodes);
      } else {
        console.log("Failed to get new uniquecodes");
      }
    }

    await sleep(500);
  }
};

async function updateBuffer(DBUpdateQueue: QueueItem[]) {
  const uniquecodeIds = DBUpdateQueue.map((code) => code.id);

  if (uniquecodeIds.length >= 500) {
    return await setBulkPrintedStatus(uniquecodeIds, new Date());
  }

  const chunks = chunkArray(uniquecodeIds, 500);
  return await Promise.all(
    chunks.map((codes) => setBulkPrintedStatus(codes, new Date()))
  );
}

async function resetBuffer(resetQueue: QueueItem[]) {
  const chunks = chunkArray(resetQueue, 500);
  await Promise.all(
    chunks.map((codes) => resetBulkBuffered(codes.map((code) => code.id)))
  );
}

async function populateBufer(limit: number) {
  const newUniquecodes = await getUniquecodes(limit);
  if (newUniquecodes) {
    return newUniquecodes;
  } else {
    console.log("Failed get new uniquecodes");
    return [];
  }
}

export const databaseThread = {
  init,
  run,
  populateBufer,
};

export type DatabaseThread = typeof databaseThread;

expose(databaseThread);
