import "dotenv/config";
import "./connections/serial";
// import { expose } from "threads/worker";
import * as SerialAction from "./actions/serial";
import SerialConnection from "./connections/serial";
import { expose } from "./utils/childProcess";

const serialWorker = async (message: string) => {
  try {
    // if (uniquecode === "INIT") {
    //   await SerialConnection.waitSendData({ timeout: 1500 });
    //   return true;
    // }

    while (true) {
      await SerialAction.serialProcess(message);
    }
  } catch (error: any) {
    console.log(error?.message ?? "Error Serial Process");
    return false;
  }
};

export type SerialWorker = typeof serialWorker;

expose(serialWorker);
