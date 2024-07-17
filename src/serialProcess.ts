// import { expose } from "threads/worker";
import * as SerialAction from "./actions/serial";
import { parentPort } from "worker_threads";
import SerialConnection from "./connections/serial";

const serialProcess = async (uniquecode: string) => {
  try {
    return await SerialAction.serialProcess(uniquecode);
  } catch (error: any) {
    console.log(error?.message ?? "Error Serial Process");
    return false;
  }
};

export type SerialProcess = typeof serialProcess;

// expose(serialProcess);
// if (parentPort) {
process.on("message", async (message) => {
  console.log({ message });
  if (typeof message !== "string") {
    return;
  }
  if (message === "INIT") {
    await SerialConnection.connect();
    await SerialConnection.waitDataAndDrain();
    process.send && process.send(message);
    return;
  }
  const result = await serialProcess(message);
  // SerialConnection.port.close();
  process.send && process.send(result ? message : null);
});
// }
