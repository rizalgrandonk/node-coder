import "dotenv/config";
// import "./connections/socket";
import { expose } from "threads/worker";
import { Observable, Subject } from "threads/observable";
// import * as SocketAction from "./actions/socket";
import { sleep } from "./utils/helper";
import { SharedPrimitive, SharedQueue } from "./utils/sharedBuffer";
// import SocketConnection from "./connections/socket";
import LiebingerClass from "./actions/leibinger";

console.log("Socket Worker started");
const printer = new LiebingerClass({
  connectionType: "socket",
  connectionConfig: {
    host: "0.0.0.0",
    port: 515,
  },
});

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
    console.log("SOCKET PROCESS LOOP");
    console.log("isPrinting.get()", isPrinting.get());
    console.log("printQueue.size()", printQueue.size());
    console.log("printedQueue.size()", printedQueue.size());

    const selected = printQueue.shift();
    if (selected) {
      const response = await printer.checkPrinterStatus();
      if (!response) {
        console.log("Failed request to socket connection");
        printQueue.push(selected);
      } else {
        printedQueue.push(selected);
      }
    } else {
      await sleep(0);
    }

    if (!isPrinting.get()) {
      return;
    }
  }
};

const socketWorker = {
  init,
  run,
};

export type SocketWorker = typeof socketWorker;

expose(socketWorker);
