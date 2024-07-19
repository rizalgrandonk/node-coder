import "dotenv/config";
import "./connections/socket";
import { expose } from "threads/worker";
import { Observable, Subject } from "threads/observable";
import * as SocketAction from "./actions/socket";
import { sleep } from "./utils/helper";

let subject = new Subject<string>();

let uniquecodes: string[] = [];

const add = (codes: string[]) => {
  uniquecodes.push(...codes);
};
const observe = () => Observable.from(subject);
const run = async () => {
  while (true) {
    if (uniquecodes.length > 0) {
      const selected = uniquecodes[0];
      const result = await SocketAction.socketProcess(selected);
      if (result) {
        uniquecodes.shift();
        subject.next(selected);
      }
    } else {
      await sleep(0);
    }
  }
};

const socketWorker = {
  add,
  run,
  observe,
};

export type SocketWorker = typeof socketWorker;

expose(socketWorker);
