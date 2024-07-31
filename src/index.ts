import "dotenv/config";
import "./db";
// import "./connections/socket";
import { spawn, Worker as ThreadWorker, Thread } from "threads";
import type { SocketWorker } from "./socketProcess";
import path from "path";
// import * as SerialAction from "./actions/serial";
import type { DatabaseWorker } from "./databaseProcess";
import { SharedQueue } from "./utils/sharedBuffer";

import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import mainRoutes from "./routes/index";
import SerialConnection from "./connections/serial";
import { insertSerialUniquecode } from "./services/codererrorlogs";

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

let isPrinting = false;
let updateInterval: NodeJS.Timeout | null = null;

const startPrintProcess = async () => {
  if (isPrinting) {
    console.log("Print process is already running");
    return;
  }
  isPrinting = true;

  const MAX_QUEUE = 250;
  const GOALS_LENGTH = 10000;

  console.log("START");
  const timeBefore = performance.now();
  let timeAfterPrinting: number;

  const databaseWorker = await spawn<DatabaseWorker>(
    new ThreadWorker("./databaseProcess")
  );

  const socketWorker = await spawn<SocketWorker>(
    new ThreadWorker("./socketProcess")
  );

  const uniquecodes = await databaseWorker.populateBufer(MAX_QUEUE);
  if (!uniquecodes) {
    console.log("Failed to get uniquecodes");
    isPrinting = false;
    return;
  }

  console.log("Raw Data", uniquecodes);
  const printQueue = new SharedQueue(MAX_QUEUE);
  printQueue.push(...uniquecodes);

  const printedQueue = new SharedQueue(GOALS_LENGTH * 2);
  console.log("printQueue.size()", printQueue.size());
  console.log("printQueue.getAllItems()", printQueue.getAll());

  socketWorker
    .run(printQueue.getBuffer(), printedQueue.getBuffer())
    .catch((err) => {
      console.log("Error Socket Run", err);
      isPrinting = false;
    });

  runSerialPLC();

  updateInterval = setInterval(populateBuffer, 100);

  async function updateBuffer() {
    await databaseWorker.updateBuffer(printedQueue.getAll());

    if (printedQueue.size() >= GOALS_LENGTH) {
      console.log("COMPLETE");
      await onCompleteHandler();
    }
  }

  async function populateBuffer() {
    if (!isPrinting || printedQueue.size() >= GOALS_LENGTH) {
      timeAfterPrinting = performance.now();
      updateBuffer();
    }

    const fromGoals = GOALS_LENGTH - printedQueue.size();
    const emptySlot = MAX_QUEUE - printQueue.size();

    const toQueueCount = Math.min(emptySlot, fromGoals);

    if (MAX_QUEUE < GOALS_LENGTH && toQueueCount > 0) {
      const newUniquecodes = await databaseWorker.populateBufer(toQueueCount);
      if (newUniquecodes) {
        printQueue.push(...newUniquecodes);
      } else {
        console.log("Failed to get new uniquecodes");
      }
    }

    io.emit("bufferCount", printQueue.size());
    io.emit("printedCount", printedQueue.size());

    if (!isPrinting) {
      await onCompleteHandler();
    }
  }

  async function onCompleteHandler() {
    const timeAfter = performance.now();
    const timeDiff = timeAfter - timeBefore;
    const printDiff = timeAfterPrinting - timeBefore;
    console.log(`Printing process complete in ${printDiff} ms`);
    console.log({ printQueue: printQueue.size() });

    console.log(
      `Finished processing ${printedQueue.size()} uniquecodes in ${timeDiff} ms`
    );

    console.log(`Update delay for ${timeAfter - timeAfterPrinting}`);
    await Thread.terminate(socketWorker);

    if (updateInterval) clearInterval(updateInterval);
    isPrinting = false;
    io.emit("printComplete", {
      printedCount: printedQueue.size(),
      timeDiff,
    });
  }

  async function runSerialPLC() {
    while (isPrinting) {
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
        isPrinting = false;
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
    isPrinting = false;
  });
});

app.use(express.json());
app.use(mainRoutes);

app.get("/start-print", (req, res) => {
  startPrintProcess();
  return res.status(200).json({ message: "Success" });
});

// app.use(express.static(path.join(__dirname, "../client/dist")));
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/dist/index.html"));
// });

httpServer.listen(7000, () => {
  console.log(`Server running on port: 7000`);
});
