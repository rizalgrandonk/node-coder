import { expose } from "threads/worker";
import { Observable, Subject } from "threads/observable";
import { updateSocketUniquecode } from "./actions/uniquecodes";
import * as SocketAction from "./actions/socket";
import { sleep } from "./utils/sleep";

let uniquecodes: string[] = [];
let subject = new Subject<{ selected: string; result: boolean }>();

const socketProcess = async (uniquecode: string) => {
  try {
    return await SocketAction.socketProcess(uniquecode);
  } catch (error: any) {
    console.log(error?.message ?? "Error Socket Process");
    return false;
  }
};

const socketWorker = {
  add: (values: string[]) => {
    uniquecodes.push(...values);
  },
  run: async () => {
    while (uniquecodes.length > 0) {
      const selected = uniquecodes[0];
      const result = await socketProcess(selected);
      if (result) {
        subject.next({ selected, result });
        uniquecodes.shift();
      }
    }

    subject.complete();
    subject = new Subject();
  },
  observe: () => Observable.from(subject),
};

export type SocketWorker = typeof socketWorker;

expose(socketWorker);
