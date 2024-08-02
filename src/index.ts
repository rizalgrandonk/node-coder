import "dotenv/config";
import "./db";
// import "./connections/socket";
import { spawn, Worker as ThreadWorker, Thread } from "threads";
// import type { SocketWorker } from "./socketProcess";
// import path from "path";
// import * as SerialAction from "./actions/serial";
// import type { DatabaseWorker } from "./databaseProcess";
import { SharedPrimitive, SharedQueue } from "./utils/sharedBuffer";

import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import mainRoutes from "./routes/index";
import SerialConnection from "./connections/serial";
import { insertSerialUniquecode } from "./services/codererrorlogs";
import { DatabaseThread } from "./threads/databaseThread";
import { PrinterThread } from "./threads/printerThread";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: "/socket",
  cors: {
    origin: "*",
  },
});

const serialConnection = new SerialConnection({
  portOptions: {
    path: process.env.SERIAL_NAME ?? "/dev/cu.usbmodem1401",
    baudRate: +(process.env.SERIAL_BAUD_RATE ?? 115200),
  },
  parserOptions: {
    delimiter: process.env.SERIAL_DELIMITER ?? "\r\n",
  },
});

serialConnection.connect();

let updateInterval: NodeJS.Timeout | null = null;
const MAX_QUEUE = Number(process.env.MAX_QUEUE ?? 254);

const isPrinting = new SharedPrimitive<boolean>(false);
const printerCounter = new SharedPrimitive<number>(0);
const displayMessage = new SharedPrimitive<string>("");

const printQueue = new SharedQueue(MAX_QUEUE);
const printedQueue = new SharedQueue(MAX_QUEUE * 2);
const DBUpdateQueue = new SharedQueue(MAX_QUEUE * 2);

const startPrintProcess = async () => {
  if (isPrinting.get()) {
    console.log("Print process is already running");
    return;
  }
  isPrinting.set(true);

  console.log("START");
  const timeBefore = performance.now();
  let timeAfterPrinting: number;

  const databaseThread = await spawn<DatabaseThread>(
    new ThreadWorker("./threads/databaseThread")
  );
  const printerThread = await spawn<PrinterThread>(
    new ThreadWorker("./threads/printerThread")
  );

  await databaseThread.init({
    isPrintBuffer: isPrinting.getBuffer(),
    printBuffer: printQueue.getBuffer(),
    printedBuffer: printedQueue.getBuffer(),
    DBUpdateBuffer: DBUpdateQueue.getBuffer(),
  });

  await printerThread.init({
    isPrintBuffer: isPrinting.getBuffer(),
    printBuffer: printQueue.getBuffer(),
    printedBuffer: printedQueue.getBuffer(),
    DBUpdateBuffer: DBUpdateQueue.getBuffer(),
    printCounterBuffer: printerCounter.getBuffer(),
    displayMessageBuffer: displayMessage.getBuffer(),
  });

  const uniquecodes = await databaseThread.populateBufer(MAX_QUEUE);
  if (!uniquecodes) {
    console.log("Failed to get uniquecodes");
    isPrinting.set(false);
    return;
  }

  printQueue.push(...uniquecodes);

  const databaseThreadRun = databaseThread.run().catch((err) => {
    console.log("Error Database Thread", err);
    isPrinting.set(false);
  });

  const printerThreadRun = printerThread.run().catch((err) => {
    console.log("Error Printer Thread", err);
    isPrinting.set(false);
  });

  const serialPLCRun = runSerialPLC();

  updateInterval = setInterval(async () => {
    process.stdout.write("\x1Bc");
    console.log({
      isPrintBuffer: isPrinting.get(),
      printBuffer: printQueue.size(),
      printedBuffer: printedQueue.size(),
      DBUpdateBuffer: DBUpdateQueue.size(),
      printCounterBuffer: printerCounter.get(),
      displayMessageBuffer: displayMessage.get(),
    });
    if (!isPrinting.get()) {
      isPrinting.set(false);
      timeAfterPrinting = performance.now();
      await onCompleteHandler();
    }
  }, 100);

  async function onCompleteHandler() {
    const timeAfter = performance.now();
    const timeDiff = timeAfter - timeBefore;
    const printDiff = timeAfterPrinting - timeBefore;
    console.log(`Printing process complete in ${printDiff} ms`);
    console.log({ printedQueue: printedQueue.getAll() });

    console.log(
      `Finished processing ${printedQueue.size()} uniquecodes in ${timeDiff} ms`
    );

    console.log(`Update delay for ${timeAfter - timeAfterPrinting}`);

    await printerThreadRun;
    await databaseThreadRun;
    await serialPLCRun;
    await Thread.terminate(databaseThread);
    await Thread.terminate(printerThread);

    if (updateInterval) clearInterval(updateInterval);
    io.emit("printComplete", {
      printedCount: printedQueue.size(),
      timeDiff,
    });
  }

  async function runSerialPLC() {
    while (isPrinting.get()) {
      console.log("PLC LOOP");

      try {
        const response = await serialConnection.writeAndResponse("0", {
          responseValidation: (res) => typeof res === "string",
          timeout: 2000,
        });
        if (!response) {
          console.log("Failed request to serial connection");
          return false;
        }
        const result = await insertSerialUniquecode(response, new Date());
        console.log(`Complete processing serial update ${response}`, result);

        return true;
      } catch (error: any) {
        console.log(error?.message ?? "Error Serial Process");
      }
    }
  }
};

io.on("connection", (socket) => {
  console.log("Connected", socket.id);

  socket.on("disconnect", () => {
    console.log("Disconnect", socket.id);
  });

  socket.on("startPrint", () => {
    console.log("Start Print Called");
    startPrintProcess();
  });

  socket.on("stopPrint", () => {
    console.log("Stop Print Called");
    isPrinting.set(false);
  });
});

app.use(express.json());
app.use(mainRoutes);

app.get("/start-print", (req, res) => {
  startPrintProcess();
  return res.status(200).json({ message: "Success" });
});
app.get("/stop-print", (req, res) => {
  isPrinting.set(false);
  return res.status(200).json({ message: "Success" });
});

// app.use(express.static(path.join(__dirname, "../client/dist")));
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/dist/index.html"));
// });

httpServer.listen(7000, () => {
  console.log(`Server running on port: 7000`);
});
