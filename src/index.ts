import "dotenv/config";
import "./db";
import * as SerialConnection from "./connections/serial";
import { getUniquecodes } from "./actions/uniquecodes";

import { spawn, Worker as ThreadWorker, Thread } from "threads";
import type { SocketWorker } from "./socketProcess";
// import type { SerialWorker } from "./serialProcess";
import path from "path";
// import ChildWorker from "./utils/childProcess";
// import prisma from "./db";
import { chunkArray, sleep } from "./utils/helper";
import { Observable } from "threads/observable";
import * as SerialAction from "./actions/serial";
import type { DatabaseWorker } from "./databaseProcess";

type PrinterType = "SERIAL" | "SOCKET";

(async () => {
  const PRINTER_TYPE: PrinterType = process.env.PRINTER_TYPE
    ? (process.env.PRINTER_TYPE as PrinterType)
    : "SERIAL";
  const MAX_QUEUE = 5;
  const GOALS_LENGTH = 30;

  console.log("START");
  const timeBefore = performance.now();
  let timeAfterPrinting: number;

  // const serialWorker = fork(path.resolve(__dirname, "./serialProcess"));
  // const serialWorker = new ChildWorker<SerialWorker>(
  //   path.resolve(__dirname, "./serialProcess")
  // );
  // const serialWorker = await spawn<SerialWorker>(
  //   new ThreadWorker("./serialProcess")
  // );
  // const serialWorker = new Worker(path.resolve(__dirname, "./serialProcess"));

  const databaseWorker = await spawn<DatabaseWorker>(
    new ThreadWorker("./databaseProcess")
  );

  const socketWorker = await spawn<SocketWorker>(
    new ThreadWorker("./socketProcess")
  );
  // const resultUniquecodes = await getUniquecodes(MAX_QUEUE);
  const uniquecodes = await databaseWorker.populateBufer(MAX_QUEUE);
  if (!uniquecodes) {
    console.log("Failed to get uniquecodes");
    return;
  }
  let printBuffer = [...uniquecodes];
  let printedBuffer: string[] = [];

  if (PRINTER_TYPE === "SOCKET") {
    await socketWorker.add(printBuffer);

    socketWorker.observe().subscribe((code: string) => {
      const codeIndex = printBuffer.indexOf(code);
      if (codeIndex < 0) {
        return;
      }
      printedBuffer.push(code);
      printBuffer.splice(codeIndex, 1);

      if (printedBuffer.length >= GOALS_LENGTH) {
        timeAfterPrinting = performance.now();

        updateBuffer();
      }
    });

    socketWorker.run();
  } else {
    SerialConnection.connect();
    runSerialProcess();
  }

  setInterval(populateBufer, 100);

  async function updateBuffer() {
    await databaseWorker.updateBuffer(printedBuffer);

    if (printedBuffer.length >= GOALS_LENGTH) {
      console.log("COMPLETE");
      await onCompleteHandler();
    }
  }

  async function populateBufer() {
    const fromGoals = GOALS_LENGTH - printedBuffer.length;
    const emptySlot = MAX_QUEUE - printBuffer.length;

    const toQueueCount = Math.min(emptySlot, fromGoals);

    if (MAX_QUEUE < GOALS_LENGTH && toQueueCount > 0) {
      const newUniquecodes = await databaseWorker.populateBufer(toQueueCount);
      if (newUniquecodes) {
        printBuffer.push(...newUniquecodes);
        if (PRINTER_TYPE === "SOCKET") {
          await socketWorker.add(newUniquecodes);
        }
      } else {
        console.log("Failed get new uniquecodes");
      }
    }
  }

  async function onCompleteHandler() {
    const timeAffter = performance.now();
    const timeDiff = timeAffter - timeBefore;
    const printDiff = timeAfterPrinting - timeBefore;
    console.log(`Printing process complete in ${printDiff} ms`);
    console.log({ printBuffer: printBuffer.length });

    // if (socketBuffer.length <= 0) {
    console.log(
      `Finished processing ${printedBuffer.length} uniquecodes in ${timeDiff} ms`
    );

    console.log(`Update delay for ${timeAffter - timeAfterPrinting}`);
    await Thread.terminate(socketWorker);
    // serialWorker.terminate();
    // await Thread.terminate(serialWorker);
    // serialWorker.kill();
    process.exit(0);
    // }
  }

  async function runSerialProcess() {
    try {
      // if (uniquecode === "INIT") {
      //   await SerialConnection.waitSendData({ timeout: 1500 });
      //   return true;
      // }
      while (true) {
        if (printBuffer.length > 0) {
          const selected = printBuffer[0];
          const result = await SerialAction.serialPrinterProcess(selected);
          if (result) {
            printedBuffer.push(selected);
            printBuffer.shift();
          }
        } else {
          await sleep(0);
        }
        if (printedBuffer.length >= GOALS_LENGTH) {
          timeAfterPrinting = performance.now();

          updateBuffer();
        }
      }
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return false;
    }
  }
})();

// const app = express();
// const port = 8585;

// app.use(mainRoutes);

// app.listen(port, () => {
//   console.log(`Server is Fire at http://localhost:${port}`);
// });
