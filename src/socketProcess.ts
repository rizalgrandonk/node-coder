import { expose } from "threads/worker";
import { updateSocketUniquecode } from "./actions/uniquecodes";
import * as SocketAction from "./actions/socket";

const socketProcess = async (uniquecode: string) => {
  try {
    return await SocketAction.socketProcess(uniquecode);
  } catch (error: any) {
    console.log(error?.message ?? "Error Socket Process");
    return false;
  }
};

export type SocketProcess = typeof socketProcess;

expose(socketProcess);
