import { Observable, Subject } from "threads/observable";
// import { getUniquecodes, updateSocketUniquecodes } from "./actions/uniquecodes";
import { getUniquecodes, setBulkPrintedStatus } from "./services/uniquecodes";
// import prisma from "./db";
import { chunkArray } from "./utils/helper";
import { expose } from "threads";

// const subject = new Subject<string>();
// const observe = () => Observable.from(subject);
// const MAX_QUEUE = 250;
// const GOALS_LENGTH = 10000;
// const printedBuffer: string[] = [];

async function updateBuffer(printedBuffer: string[]) {
  const chunks = chunkArray(printedBuffer, 500);
  await Promise.all(
    chunks.map((codes) => setBulkPrintedStatus(codes, new Date()))
  );

  // updatedBufer.push(...toUpdate);

  // console.log("UPDATE LOOP", {
  //   socketBuffer: socketBuffer.length,
  //   printedBuffer: printedBuffer.length,
  //   // updatedBufer: updatedBufer.length,
  //   // toUpdate: toUpdate.length,
  // });

  // if (printedBuffer.length >= GOALS_LENGTH) {
  //   console.log("COMPLETE");
  //   // await onCompleteHandler();
  //   subject.next(selected);
  // }
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

const databaseWorker = {
  updateBuffer,
  populateBufer,
};

export type DatabaseWorker = typeof databaseWorker;

expose(databaseWorker);
