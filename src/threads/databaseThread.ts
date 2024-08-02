import { expose } from "threads";
import {
  getUniquecodes,
  resetBulkBuffered,
  setBulkPrintedStatus,
} from "../services/uniquecodes";
import { chunkArray, sleep } from "../utils/helper";
import { QueueItem, SharedPrimitive, SharedQueue } from "../utils/sharedBuffer";

const MAX_QUEUE = Number(process.env.MAX_QUEUE ?? 254);
const MIN_QUEUE = Number(process.env.MIN_QUEUE ?? 180);
// const GOALS_LENGTH = 10000;

let isPrinting: SharedPrimitive<boolean>;
let printQueue: SharedQueue;
let printedQueue: SharedQueue;
let DBUpdateQueue: SharedQueue;

type InitParams = {
  isPrintBuffer: SharedArrayBuffer;
  printBuffer: SharedArrayBuffer;
  printedBuffer: SharedArrayBuffer;
  DBUpdateBuffer: SharedArrayBuffer;
};
const init = ({
  isPrintBuffer,
  printBuffer,
  printedBuffer,
  DBUpdateBuffer,
}: InitParams) => {
  isPrinting = new SharedPrimitive<boolean>(isPrintBuffer);
  printQueue = new SharedQueue(printBuffer);
  printedQueue = new SharedQueue(printedBuffer);
  DBUpdateQueue = new SharedQueue(DBUpdateBuffer);
};

const run = async () => {
  while (
    isPrinting.get() ||
    DBUpdateQueue.size() > 0 ||
    printQueue.size() > 0 ||
    printedQueue.size() > 0
  ) {
    // console.log("DB LOOP", {
    //   DBUpdateQueue: DBUpdateQueue.size(),
    //   printQueue: printQueue.size(),
    // });
    if (DBUpdateQueue.size() > 0) {
      await updateBuffer(DBUpdateQueue.shiftAll());
    }
    if (!isPrinting.get()) {
      if (printQueue.size() > 0 || printedQueue.size() > 0) {
        await resetBuffer([
          ...printQueue.shiftAll(),
          ...printedQueue.shiftAll(),
        ]);
      }
    }

    const emptySlot = MAX_QUEUE - printQueue.size();

    if (isPrinting.get() && emptySlot > 0 && printQueue.size() <= MIN_QUEUE) {
      const newUniquecodes = await populateBufer(emptySlot);
      if (newUniquecodes) {
        printQueue.push(...newUniquecodes);
      } else {
        console.log("Failed to get new uniquecodes");
      }
    }

    await sleep(100);
  }
};

async function updateBuffer(DBUpdateQueue: QueueItem[]) {
  const chunks = chunkArray(DBUpdateQueue, 500);
  await Promise.all(
    chunks.map((codes) =>
      setBulkPrintedStatus(
        codes.map((code) => code.id),
        new Date()
      )
    )
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
