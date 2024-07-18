import "dotenv/config";
import "./connections/socket";
import { expose } from "threads/worker";
import * as SocketAction from "./actions/socket";

const socketWorker = async (uniquecode: string) => {
  try {
    return await SocketAction.socketProcess(uniquecode);
  } catch (error: any) {
    console.log(error?.message ?? "Error Socket Process");
    return false;
  }
};

export type SocketWorker = typeof socketWorker;

expose(socketWorker);
