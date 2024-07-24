import "dotenv/config";
import "./connections/serial";
// import { expose } from "threads/worker";
import * as SerialAction from "./actions/serial";
import { expose } from "./utils/childProcess";

let codes: string[] = [];

const add = (code: string | string[]) => {
  if (Array.isArray(code)) {
    codes.push(...code);
  } else {
    codes.push(code);
  }
};

const run = async () => {
  try {
    // if (uniquecode === "INIT") {
    //   await SerialConnection.waitSendData({ timeout: 1500 });
    //   return true;
    // }
    while (true) {
      if (codes.length > 0) {
        const selected = codes[0];
        const result = await SerialAction.serialProcess(selected);
        result &&
          process.send &&
          process.send({ channel: "run", data: selected });
        // if (result) {
        //   codes.shift();
        // }
      } else {
      }
      // process.send && process.send({ type: "NEXT", data: codes[0] });
    }
    // return "OK";
  } catch (error: any) {
    console.log(error?.message ?? "Error Serial Process");
    return false;
  }
};

const worker = { run, add };

export type SerialWorker = typeof worker;
expose(worker);

// process.on("message", async (message: { type: string; data?: any }) => {
//   console.log("Message serialProcess", { message });
//   if (typeof message.type !== "string") {
//     return;
//   }

//   if (message.type === "ADD" && Array.isArray(message.data)) {
//     codes.push(...message.data);
//     console.log({ codes });
//     process.send && process.send({ type: "RESULT", data: true });
//   }
//   if (message.type === "RUN") {
//     serialWorker();
//   }
// });
