import "dotenv/config";
import "./db";
import { getUniquecodes } from "./actions/uniquecodes";
import EventEmitter from "events";

import { spawn, Worker as ThreadWorker, Thread } from "threads";
import type { SocketProcess } from "./socketProcess";
import { fork } from "child_process";
import path from "path";

const serialWorker = fork(path.resolve(__dirname, "./serialProcess"));

const UniquecodeEvent = new EventEmitter();

const startUniquecodeTransaction = async () => {
  // await SerialConnection.waitDrain();
  // await SerialConnection.waitSendData();
  // await new Promise((resolve) => {
  //   serialWorker.on("message", (message) => {
  //     console.log(message);
  //     if (message !== "INIT") {
  //       return;
  //     }
  //     resolve(message);
  //   });
  //   serialWorker.on("error", (err) => {
  //     console.log(err);
  //     resolve(false);
  //   });

  //   serialWorker.send("INIT");
  // });

  console.log("START");
  const dateBefore = new Date();

  const resultUniquecodes = await getUniquecodes(20);
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
    console.log({ serialBuffer, socketBuffer });

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
    console.log({ serialBuffer, socketBuffer });

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
      serialWorker.send(selected);

      const messageHandler = (message: string | null) => {
        serialWorker.off("message", messageHandler);
        serialWorker.off("error", errorHandler);
        resolve(message === selected);
      };
      const errorHandler = (err: Error) => {
        console.log(err);
        serialWorker.off("error", errorHandler);
        serialWorker.off("message", messageHandler);
        resolve(false);
      };
      serialWorker.on("message", messageHandler);
      serialWorker.on("error", errorHandler);
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
  const socketProcess = await spawn<SocketProcess>(
    new ThreadWorker("./socketProcess")
  );

  while (uniquecodes.length > 0) {
    const selected = uniquecodes[0];
    const result = await socketProcess(selected);
    console.log({ result });

    if (result) {
      uniquecodes.shift();
    }
  }

  await Thread.terminate(socketProcess);

  UniquecodeEvent.emit("socketcomplete");
}

startUniquecodeTransaction();

// const app = express();
// const port = 8585;

// app.use(mainRoutes);

// app.listen(port, () => {
//   console.log(`Server is Fire at http://localhost:${port}`);
// });
