import "dotenv/config";
import "./db";
import * as SerialConnection from "./connections/serial";
import { spawn, Worker as ThreadWorker, Thread } from "threads";
import type { SocketWorker } from "./socketProcess";
import path from "path";
import * as SerialAction from "./actions/serial";
import type { DatabaseWorker } from "./databaseProcess";
import { SharedQueue } from "./utils/queue";
// import express from 'express'

// type PrinterType = "SERIAL" | "SOCKET";

const startPrintProcess = async () => {
  // const PRINTER_TYPE: PrinterType = process.env.PRINTER_TYPE
  //   ? (process.env.PRINTER_TYPE as PrinterType)
  //   : "SERIAL";
  const MAX_QUEUE = 250;
  const GOALS_LENGTH = 10000;

  console.log("START");
  const timeBefore = performance.now();
  let timeAfterPrinting: number;

  SerialConnection.connect();

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

  console.log("Raw Data", uniquecodes);
  const printBuffer = new SharedQueue(MAX_QUEUE + 1, 10);
  printBuffer.push(...uniquecodes);
  const printedBuffer = new SharedQueue(GOALS_LENGTH * 2, 10);
  console.log("printBuffer.size()", printBuffer.size());
  console.log("printBuffer.getAllItems()", printBuffer.getAll());

  // await socketWorker.add(printBuffer);

  // socketWorker.observe().subscribe((code: string) => {
  //   const codeIndex = printBuffer.indexOf(code);
  //   if (codeIndex < 0) {
  //     return;
  //   }
  //   printedBuffer.push(code);
  //   printBuffer.splice(codeIndex, 1);

  //   if (printedBuffer.length >= GOALS_LENGTH) {
  //     timeAfterPrinting = performance.now();

  //     updateBuffer();
  //   }
  // });

  socketWorker
    .run(printBuffer.getBuffer(), printedBuffer.getBuffer(), 10)
    .catch((err) => {
      console.log("Error Socket Run", err);
    });
  runSerialPLC();

  setInterval(populateBufer, 100);
  // setInterval(() => {
  //   console.log("MAIN LENGTH Print", printBuffer.size());
  //   console.log("MAIN LENGTH Printed", printedBuffer.size());

  // }, 100);

  async function updateBuffer() {
    await databaseWorker.updateBuffer(printedBuffer.getAll());

    if (printedBuffer.size() >= GOALS_LENGTH) {
      console.log("COMPLETE");
      await onCompleteHandler();
    }
  }

  async function populateBufer() {
    if (printedBuffer.size() >= GOALS_LENGTH) {
      timeAfterPrinting = performance.now();

      updateBuffer();
    }

    const fromGoals = GOALS_LENGTH - printedBuffer.size();
    const emptySlot = MAX_QUEUE - printBuffer.size();

    const toQueueCount = Math.min(emptySlot, fromGoals);

    if (MAX_QUEUE < GOALS_LENGTH && toQueueCount > 0) {
      const newUniquecodes = await databaseWorker.populateBufer(toQueueCount);
      if (newUniquecodes) {
        printBuffer.push(...newUniquecodes);
        // await socketWorker.add(newUniquecodes);
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
    console.log({ printBuffer: printBuffer.size() });

    console.log(
      `Finished processing ${printedBuffer.size()} uniquecodes in ${timeDiff} ms`
    );

    console.log(`Update delay for ${timeAffter - timeAfterPrinting}`);
    await Thread.terminate(socketWorker);
    process.exit(0);
  }

  async function runSerialPLC() {
    try {
      while (true) {
        const result = await SerialAction.serialProcess("0");
      }
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return false;
    }
  }
};

startPrintProcess();

// const app = express();
// const port = 8585;

// // app.use(mainRoutes);

// app.listen(port, () => {
//   console.log(`Server is Fire at http://localhost:${port}`);
// });
