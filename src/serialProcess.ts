import { expose } from "threads/worker";
import * as SerialAction from "./actions/serial";

const serialProcess = async (uniquecode: string) => {
  try {
    return await SerialAction.serialProcess(uniquecode);
  } catch (error: any) {
    console.log(error?.message ?? "Error Serial Process");
    return false;
  }
};

export type SerialProcess = typeof serialProcess;

expose(serialProcess);
