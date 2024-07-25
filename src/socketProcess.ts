import "dotenv/config";
import "./connections/socket";
import { expose } from "threads/worker";
import { Observable, Subject } from "threads/observable";
import * as SocketAction from "./actions/socket";
import { sleep } from "./utils/helper";
import { SharedQueue } from "./utils/queue";

// let subject = new Subject<string>();

// let uniquecodes: string[] = [];

// const add = (codes: string[]) => {
//   uniquecodes.push(...codes);
// };
// const observe = () => Observable.from(subject);
const run = async (
  print: SharedArrayBuffer,
  printed: SharedArrayBuffer,
  maxStringLength: number
) => {
  const printBuffer = new SharedQueue(print, maxStringLength);
  const printedBuffer = new SharedQueue(printed, maxStringLength);
  while (true) {
    const selected = printBuffer.shift();
    if (selected) {
      const result = await SocketAction.socketProcess(selected);
      if (!result) {
        printBuffer.push(selected);
      } else {
        printedBuffer.push(selected);
      }
    } else {
      await sleep(0);
    }
    // console.log("WORKER LENGTH print", printBuffer.size());
    // console.log("WORKER LENGTH printed", printedBuffer.size());
  }
};

const socketWorker = {
  // add,
  run,
  // observe,
};

export type SocketWorker = typeof socketWorker;

expose(socketWorker);
