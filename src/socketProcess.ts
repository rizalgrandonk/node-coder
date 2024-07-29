import "dotenv/config";
import "./connections/socket";
import { expose } from "threads/worker";
import { Observable, Subject } from "threads/observable";
import * as SocketAction from "./actions/socket";
import { sleep } from "./utils/helper";
import { SharedQueue } from "./utils/queue";

const run = async (
  printBuffer: SharedArrayBuffer,
  printedBuffer: SharedArrayBuffer
) => {
  const printQueue = new SharedQueue(printBuffer);
  const printedQueue = new SharedQueue(printedBuffer);
  while (true) {
    const selected = printQueue.shift();
    if (selected) {
      const result = await SocketAction.socketProcess(selected);
      if (!result) {
        printQueue.push(selected);
      } else {
        printedQueue.push(selected);
      }
    } else {
      await sleep(0);
    }
  }
};

const socketWorker = {
  run,
};

export type SocketWorker = typeof socketWorker;

expose(socketWorker);
