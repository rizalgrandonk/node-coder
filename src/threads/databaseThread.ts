import { expose } from "threads";
import { getUniquecodes, setBulkPrintedStatus } from "../services/uniquecodes";
import { chunkArray, sleep } from "../utils/helper";
import { SharedPrimitive, SharedQueue } from "../utils/sharedBuffer";

const MAX_QUEUE = 250;
const MIN_QUEUE = 10;
// const GOALS_LENGTH = 10000;

let isPrinting: SharedPrimitive<boolean>;
let printQueue: SharedQueue;
let printedQueue: SharedQueue;

type InitParams = {
  isPrintBuffer: SharedArrayBuffer;
  printBuffer: SharedArrayBuffer;
  printedBuffer: SharedArrayBuffer;
};
const init = ({ isPrintBuffer, printBuffer, printedBuffer }: InitParams) => {
  isPrinting = new SharedPrimitive<boolean>(isPrintBuffer);
  printQueue = new SharedQueue(printBuffer);
  printedQueue = new SharedQueue(printedBuffer);
};

const run = async () => {
  while (true) {
    console.log("DB THREAD LOOP");
    console.log("isPrinting.get()", isPrinting.get());
    console.log("printQueue.size()", printQueue.size());
    console.log("printedQueue.size()", printedQueue.size());

    if (printedQueue.size() > 0) {
      await updateBuffer(printedQueue.shiftAll());
    }
    if (!isPrinting.get()) {
      return;
    }

    // const fromGoals = GOALS_LENGTH - printedQueue.size();
    const emptySlot = MAX_QUEUE - printQueue.size();

    // const toQueueCount = Math.min(emptySlot, fromGoals);

    if (emptySlot > 0 && printQueue.size() <= MIN_QUEUE) {
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

async function updateBuffer(printedBuffer: string[]) {
  const chunks = chunkArray(printedBuffer, 500);
  await Promise.all(
    chunks.map((codes) => setBulkPrintedStatus(codes, new Date()))
  );
}

async function populateBufer(limit: number) {
  const newUniquecodes = (await getUniquecodes(limit))?.map(
    (record) => record.uniquecode
  );
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
