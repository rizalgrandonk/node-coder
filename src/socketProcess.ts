import "dotenv/config";
// import "./connections/socket";
import { expose } from "threads/worker";
import { Observable, Subject } from "threads/observable";
// import * as SocketAction from "./actions/socket";
import { sleep } from "./utils/helper";
import { SharedQueue } from "./utils/sharedBuffer";
import SocketConnection from "./connections/socket";

console.log("Socket Worker started");
const socketConnection = new SocketConnection({
  host: "0.0.0.0",
  port: 515,
});
socketConnection.connect();

const run = async (
  printBuffer: SharedArrayBuffer,
  printedBuffer: SharedArrayBuffer
) => {
  const printQueue = new SharedQueue(printBuffer);
  const printedQueue = new SharedQueue(printedBuffer);
  while (true) {
    const selected = printQueue.shift();
    if (selected) {
      const response = await socketConnection.writeAndResponse(selected, {
        responseValidation: (res) => res.includes(selected),
      });
      if (!response) {
        console.log("Failed request to socket connection");
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
