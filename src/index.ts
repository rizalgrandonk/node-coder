import "dotenv/config";
import "./db";
import { spawn, Worker as ThreadWorker, Thread } from "threads";
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

// const serialConnection = new SerialConnection({
//   portOptions: {
//     path: process.env.SERIAL_NAME ?? "/dev/cu.usbmodem1401",
//     baudRate: +(process.env.SERIAL_BAUD_RATE ?? 115200),
//   },
//   parserOptions: {
//     delimiter: process.env.SERIAL_DELIMITER ?? "\r\n",
//   },
// });

// serialConnection.connect();

let updateInterval: NodeJS.Timeout | null = null;
const MAX_QUEUE = Number(process.env.MAX_QUEUE ?? 254);

const isPrinting = new SharedPrimitive<boolean>(false);
const printerCounter = new SharedPrimitive<number>(0);
const displayMessage = new SharedPrimitive<string>("");

const isPrinterFinished = new SharedPrimitive<boolean>(false);

const printQueue = new SharedQueue(MAX_QUEUE);
const printedQueue = new SharedQueue(MAX_QUEUE * 2);
const DBUpdateQueue = new SharedQueue(MAX_QUEUE * 2);

let databaseThread: Awaited<ReturnType<typeof spawn<DatabaseThread>>>;
let printerThread: Awaited<ReturnType<typeof spawn<PrinterThread>>>;

let batchInfo: {
  batchNumber: string;
  barcode: string;
  estimate: number;
} | null = null;

// let printProcess: Promise<void>;

const startBatch = async (info: {
  batchNumber: string;
  barcode: string;
  estimate: number;
}) => {
  batchInfo = info;

  databaseThread = await spawn<DatabaseThread>(
    new ThreadWorker("./threads/databaseThread")
  );
  printerThread = await spawn<PrinterThread>(
    new ThreadWorker("./threads/printerThread")
  );

  await databaseThread.init({
    isPrintBuffer: isPrinting.getBuffer(),
    printerCounterBuffer: printerCounter.getBuffer(),
    printBuffer: printQueue.getBuffer(),
    printedBuffer: printedQueue.getBuffer(),
    DBUpdateBuffer: DBUpdateQueue.getBuffer(),
    isPrinterFinishedBuffer: isPrinterFinished.getBuffer(),
    displayMessageBuffer: displayMessage.getBuffer(),
  });

  await printerThread.init({
    isPrintBuffer: isPrinting.getBuffer(),
    printBuffer: printQueue.getBuffer(),
    printedBuffer: printedQueue.getBuffer(),
    DBUpdateBuffer: DBUpdateQueue.getBuffer(),
    printCounterBuffer: printerCounter.getBuffer(),
    displayMessageBuffer: displayMessage.getBuffer(),
    isPrinterFinishedBuffer: isPrinterFinished.getBuffer(),
  });
};

const startPrintProcess = async () => {
  if (!batchInfo) {
    console.log("Start Batch First");
    return;
  }
  if (isPrinting.get()) {
    console.log("Print process is already running");
    return;
  }
  isPrinting.set(true);
  isPrinterFinished.set(false);

  console.log("START");
  const timeBefore = performance.now();
  let timeAfterPrinting: number;

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

  // const serialPLCRun = runSerialPLC();

  updateInterval = setInterval(async () => {
    // process.stdout.write("\x1Bc");
    // console.log({
    //   isPrinting: isPrinting.get(),
    //   printQueue: printQueue.size(),
    //   printedQueue: printedQueue.size(),
    //   DBUpdateQueue: DBUpdateQueue.size(),
    //   printerCounter: printerCounter.get(),
    //   displayMessage: displayMessage.get(),
    // });

    io.emit("printStatus", {
      // isPrinting: isPrinting.get(),
      printQueue: printQueue.size(),
      printedQueue: printedQueue.size(),
      // DBUpdateQueue: DBUpdateQueue.size(),
      printerCounter: printerCounter.get(),
      printedCount: printerCounter.get() - printedQueue.size(),
      displayMessage: displayMessage.get(),
    });

    if (!isPrinting.get()) {
      isPrinting.set(false);
      timeAfterPrinting = performance.now();
      await onCompleteHandler();
    }
  }, 500);

  async function onCompleteHandler() {
    const timeAfter = performance.now();
    const timeDiff = timeAfter - timeBefore;
    const printDiff = timeAfterPrinting - timeBefore;

    console.log(`Printing process complete in ${printDiff} ms`);
    console.log(`Finished processing in ${timeDiff} ms`);
    console.log(`Update delay for ${timeAfter - timeAfterPrinting}`);

    await printerThreadRun;
    await databaseThreadRun;
    // await serialPLCRun;

    if (updateInterval) clearInterval(updateInterval);
    io.emit("printComplete", {
      printedCount: printedQueue.size(),
      timeDiff,
    });

    // resolve();
  }

  // async function runSerialPLC() {
  //   while (isPrinting.get()) {
  //     console.log("PLC LOOP");

  //     try {
  //       const response = await serialConnection.writeAndResponse("0", {
  //         responseValidation: (res) => typeof res === "string",
  //         timeout: 2000,
  //       });
  //       if (!response) {
  //         console.log("Failed request to serial connection");
  //         return false;
  //       }
  //       const result = await insertSerialUniquecode(response, new Date());
  //       console.log(`Complete processing serial update ${response}`, result);

  //       return true;
  //     } catch (error: any) {
  //       console.log(error?.message ?? "Error Serial Process");
  //     }
  //   }
  // }
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

app.post("/start-batch", (req, res) => {
  const batchNumber = req.body.batchNumber;

  const barcode = req.body.barcode;
  const estimate = req.body.estimate;
  if (
    !batchNumber ||
    !barcode ||
    !estimate ||
    typeof batchNumber !== "string" ||
    typeof barcode !== "string" ||
    typeof estimate !== "number"
  ) {
    return res.status(400).json({
      message: "Failed",
      error: "Invalid Param(s)",
    });
  }

  const batchInfo = { batchNumber, barcode, estimate };
  startBatch(batchInfo);
  return res.status(200).json({ message: batchInfo });
});

app.get("/start-print", (req, res) => {
  startPrintProcess();
  return res.status(200).json({ message: "Success" });
});

app.get("/stop-print", async (req, res) => {
  // TODO : Prevent Stop Print if connection lost
  isPrinting.set(false);

  // await printProcess
  return res.status(200).json({ message: "Success" });
});

app.get("/stop-batch", async (req, res) => {
  isPrinting.set(false);

  // await printProcess

  if (databaseThread) {
    await Thread.terminate(databaseThread);
  }
  if (printerThread) {
    await Thread.terminate(printerThread);
  }

  batchInfo = null;

  return res.status(200).json({ message: "Success" });
});

// app.use(express.static(path.join(__dirname, "../client/dist")));
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/dist/index.html"));
// });

httpServer.listen(7000, () => {
  console.log(`Server running on port: 7000`);
});
