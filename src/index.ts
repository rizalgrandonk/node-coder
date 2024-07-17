import "dotenv/config";
import "./db";
import "./connections";
import { getUniquecodes } from "./actions/uniquecodes";
import { spawn, Worker as ThreadWorker, Pool, Thread } from "threads";
import type { SocketProcess } from "./socketProcess";
import SerialConnection from "./connections/serial";
import EventEmitter from "events";
import { serialProcess } from "./actions/serial";
import { sleep } from "./utils/sleep";
import { SerialProcess } from "./serialProcess";
import SocketConnection from "./connections/socket";

import express from "express";
import mainRoutes from "./routes";
import path from "path";
import { Worker } from "worker_threads";
import { fork } from "child_process";

const serialWorker = fork(path.resolve(__dirname, "./serialProcess"));

const UniquecodeEvent = new EventEmitter();

const startUniquecodeTransaction = async () => {
  // await SerialConnection.connect();
  // await SerialConnection.waitDataAndDrain();
  await new Promise((resolve) => {
    serialWorker.on("message", (message) => {
      console.log(message);
      if (message !== "INIT") {
        return;
      }
      resolve(message);
    });
    serialWorker.on("error", (err) => {
      console.log(err);
      resolve(false);
    });

    serialWorker.send("INIT");
  });

  const dateBefore = new Date();

  const resultUniquecodes = await getUniquecodes(3);
  if (!resultUniquecodes) {
    console.log("Failed to get uniquecodes");
    return;
  }

  const uniquecodes = resultUniquecodes.map((result) => result.uniquecode);
  const serialBuffer = [...uniquecodes];
  const socketBuffer = [...uniquecodes];

  socketHandler(socketBuffer).catch(console.error);

  serialHandler(serialBuffer).catch(console.error);

  UniquecodeEvent.on("serialcomplete", () => {
    const dateAfter = new Date();
    const timeDiff = dateAfter.getTime() - dateBefore.getTime();
    console.log(`Serial process complete in ${timeDiff} ms`);

    if (serialBuffer.length <= 0 && socketBuffer.length <= 0) {
      console.log(
        `Finished processing ${uniquecodes.length} uniquecodes in ${timeDiff} ms`
      );
      process.exit(0);
    }
  });

  UniquecodeEvent.on("socketcomplete", () => {
    const dateAfter = new Date();
    const timeDiff = dateAfter.getTime() - dateBefore.getTime();
    console.log(`Socket process complete in ${timeDiff} ms`);

    if (serialBuffer.length <= 0 && socketBuffer.length <= 0) {
      console.log(
        `Finished processing ${uniquecodes.length} uniquecodes in ${timeDiff} ms`
      );
      process.exit(0);
    }
  });
};

async function serialHandler(uniquecodes: string[]) {
  // const serialWorker = await spawn<SerialProcess>(
  //   new ThreadWorker("./serialProcess")
  // );

  while (uniquecodes.length > 0) {
    const selected = uniquecodes[0];
    // const result = await serialProcess(selected);
    // const result = await serialWorker(selected);

    const result = await new Promise((resolve) => {
      serialWorker.on("message", (message) => {
        console.log(message);
        if (message !== selected) {
          return;
        }
        resolve(true);
      });
      serialWorker.on("error", (err) => {
        console.log(err);
        resolve(false);
      });

      serialWorker.send(selected);
    });

    console.log("Result Serial", { result, selected });
    if (result) {
      uniquecodes.shift();
    }
  }

  serialWorker.kill();

  UniquecodeEvent.emit("serialcomplete");
}
async function socketHandler(uniquecodes: string[]) {
  const socketWorker = await spawn<SocketProcess>(
    new ThreadWorker("./socketProcess")
  );
  while (uniquecodes.length > 0) {
    const selected = uniquecodes[0];
    const result = await socketWorker(selected);

    console.log("Result Socket", { result, selected });
    if (result) {
      uniquecodes.shift();
    }
  }

  await Thread.terminate(socketWorker);

  UniquecodeEvent.emit("socketcomplete");
}

startUniquecodeTransaction();

// const app = express();
// const port = 8585;

// app.use(mainRoutes);

// app.listen(port, () => {
//   console.log(`Server is Fire at http://localhost:${port}`);
// });
