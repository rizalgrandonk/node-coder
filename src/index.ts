import "dotenv/config";
import "./db";
import { spawn, Worker as ThreadWorker, Thread } from "threads";
import { SharedPrimitive, SharedQueue } from "./utils/sharedBuffer";
import { createServer } from "http";
import { Server } from "socket.io";
import express, { Request as ExpressRequest } from "express";
import mainRoutes from "./routes/index";
// import SerialConnection from "./connections/serial";
import { DatabaseThread } from "./threads/databaseThread";
import { PrinterThread } from "./threads/printerThread";
import * as ActionBatch from "./actions/batch";
import path from "path";
import { Batch, Product } from "./types/data";
import { z } from "zod";
import { zodErrorMap } from "./utils/zod";
import cors from "cors";
import { parseIP } from "./utils/helper";
import { createUserActivity } from "./services/useractivity";
import { updateBatch } from "./services/batch";
import { endBatch } from "./actions/batch";

type Request = ExpressRequest & { requestIP?: string; userAgent?: string };

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: "/socket",
  cors: {
    origin: "*",
  },
});

z.setErrorMap(zodErrorMap);

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
const printedUpdateCount = new SharedPrimitive<number>(0);

const isPrinterFinished = new SharedPrimitive<boolean>(false);

const printQueue = new SharedQueue(MAX_QUEUE);
const printedQueue = new SharedQueue(MAX_QUEUE * 2);
const DBUpdateQueue = new SharedQueue(MAX_QUEUE * 2);

let databaseThread: Awaited<ReturnType<typeof spawn<DatabaseThread>>>;
let printerThread: Awaited<ReturnType<typeof spawn<PrinterThread>>>;

let batchInfo: (Batch & { product: Product; markingPrinterId: number }) | null =
  null;

let printProcessPromise: Promise<void> | null;

const startBatch = async (
  info: Batch & { product: Product; markingPrinterId: number }
) => {
  batchInfo = info;

  printedUpdateCount.set(0);

  databaseThread = await spawn<DatabaseThread>(
    new ThreadWorker("./threads/databaseThread")
  );
  printerThread = await spawn<PrinterThread>(
    new ThreadWorker("./threads/printerThread")
  );

  await databaseThread.init({
    isPrintBuffer: isPrinting.getBuffer(),
    printerCounterBuffer: printerCounter.getBuffer(),
    printedUpdateCountBuffer: printedUpdateCount.getBuffer(),
    printBuffer: printQueue.getBuffer(),
    printedBuffer: printedQueue.getBuffer(),
    DBUpdateBuffer: DBUpdateQueue.getBuffer(),
    isPrinterFinishedBuffer: isPrinterFinished.getBuffer(),
    displayMessageBuffer: displayMessage.getBuffer(),
    batchInfo,
  });

  await printerThread.init({
    isPrintBuffer: isPrinting.getBuffer(),
    printBuffer: printQueue.getBuffer(),
    printedBuffer: printedQueue.getBuffer(),
    DBUpdateBuffer: DBUpdateQueue.getBuffer(),
    printCounterBuffer: printerCounter.getBuffer(),
    displayMessageBuffer: displayMessage.getBuffer(),
    isPrinterFinishedBuffer: isPrinterFinished.getBuffer(),
    batchInfo,
  });

  io.emit("batchInfo", batchInfo);
};

const runProcess = async () => {
  return await new Promise<void>(async (resolve) => {
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

      // const productCounter = await printerThread.getCounter();

      // io.emit("printStatus", {
      //   // isPrinting: isPrinting.get(),
      //   printQueue: printQueue.size(),
      //   printedQueue: printedQueue.size(),
      //   // DBUpdateQueue: DBUpdateQueue.size(),
      //   // printerCounter: printerCounter.get(),
      //   // printedCount: printerCounter.get() - printedQueue.size(),
      //   productCounter,
      //   printedCount: printedUpdateCount.get(),
      //   displayMessage: displayMessage.get(),
      // });
      const printedConter = printedUpdateCount.get();

      io.emit("printStatus", {
        isPrinting: isPrinting.get(),
        maxPrintQueue: MAX_QUEUE,
        printQueue: printQueue.size(),
        printedQueue: printedQueue.size(),
        printedCount: printedConter,
        targetQuantity: batchInfo ? batchInfo.qty : 0,
        displayMessage: displayMessage.get(),
        triggerCount: printedConter,
        goodReadCount: printedConter,
        matchCount: printedConter,
        mismatchCount: 0,
        noReadCount: 0,
        scannedBarcode: "055500130207",
      });

      if (!isPrinting.get()) {
        isPrinting.set(false);
        timeAfterPrinting = performance.now();

        if (updateInterval) clearInterval(updateInterval);
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

      io.emit("printComplete", {
        printedCount: printedQueue.size(),
        timeDiff,
      });

      const printedConter = printedUpdateCount.get();
      io.emit("printStatus", {
        isPrinting: isPrinting.get(),
        maxPrintQueue: MAX_QUEUE,
        printQueue: printQueue.size(),
        printedQueue: printedQueue.size(),
        printedCount: printedConter,
        targetQuantity: batchInfo ? batchInfo.qty : 0,
        displayMessage: displayMessage.get(),
        triggerCount: printedConter,
        goodReadCount: printedConter,
        matchCount: printedConter,
        mismatchCount: 0,
        noReadCount: 0,
      });

      resolve();
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
  });
};

const startPrintProcess = () => {
  if (printProcessPromise !== null) {
    return;
  }
  printProcessPromise = runProcess();
};

io.on("connection", (socket) => {
  console.log("Connected", socket.id);

  socket.emit("batchInfo", batchInfo);

  socket.on("disconnect", () => {
    console.log("Disconnect", socket.id);
  });
});

app.use(express.json());
app.use(cors());
app.use(async (req: Request, res, next) => {
  const ipString =
    req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? req.ip;
  const userAgent = req.headers["user-agent"];
  const ip = parseIP(ipString?.toString());

  req.requestIP = ip;
  req.userAgent = userAgent;

  next();
});

app.use(mainRoutes);

app.post("/batch/start", async (req: Request, res) => {
  try {
    console.log("/batch/start", req.body);

    const userId = 1000000; // ! ONLY FOR TESTING
    // const markingPrinterId = req.body.batchs;
    const batch = await ActionBatch.startBatch(req.body, {
      userId,
      requestIP: req.requestIP,
      userAgent: req.userAgent,
    });

    startBatch(batch);

    return res
      .status(200)
      .json({ data: batch, message: "Success", success: true });
  } catch (error: any) {
    console.log("Error start batch", error);
    const statusCode = error?.statusCode ?? 500;
    const message = error?.message ?? "Something went wrong";
    return res.status(statusCode).json({ message, success: false });
  }
});

app.post("/print/start", async (req: Request, res) => {
  console.log("PRINT START INITIATED");

  const userId = 1000000; // ! ONLY FOR TESTING

  await createUserActivity({
    actiontype: "START PRINT",
    userid: userId,
    ip: req.requestIP,
    browser: req.userAgent,
  });

  startPrintProcess();
  return res.status(200).json({ success: true, message: "Success" });
});

app.post("/print/stop", async (req: Request, res) => {
  console.log("PRINT STOP INITIATED", req.body);

  const userId = 1000000; // ! ONLY FOR TESTING

  await createUserActivity({
    actiontype: "STOP PRINT",
    userid: userId,
    ip: req.requestIP,
    browser: req.userAgent,
  });

  isPrinting.set(false);

  await printProcessPromise;
  printProcessPromise = null;
  return res.status(200).json({ success: true, message: "Success" });
});

app.post("/batch/stop", async (req: Request, res) => {
  try {
    console.log("BATCH STOP INITIATED", req.body);

    const userId = 1000000; // ! ONLY FOR TESTING
    const data = req.body.batchs;

    const batchs = {
      batchs: data.map((batchId: number) => ({
        id: batchId,
        userId: userId,
        blockcodecount: 1,
        printedqty: printedUpdateCount.get(),
        triggercount: printedUpdateCount.get(),
        goodreadcount: printedUpdateCount.get(),
        noreadcount: 0,
        matchcount: printedUpdateCount.get(),
        mismatchcount: 0,
        updated: new Date(),
        updatedby: userId,
      })),
    };
    console.log("batchs", batchs);

    await endBatch(batchs);

    await createUserActivity({
      actiontype: "STOP BATCH",
      userid: userId,
      ip: req.requestIP,
      browser: req.userAgent,
    });

    isPrinting.set(false);

    if (databaseThread) {
      await Thread.terminate(databaseThread);
    }
    if (printerThread) {
      await Thread.terminate(printerThread);
    }

    batchInfo = null;

    io.emit("batchInfo", null);

    return res.status(200).json({ success: true, message: "Success" });
  } catch (error: any) {
    console.log("Error stop batch", error);
    const statusCode = error?.statusCode ?? 500;
    const message = error?.message ?? "Something went wrong";
    return res.status(statusCode).json({ message, success: false });
  }
});

app.get("/test-socket", (req: Request, res) => {
  // const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log({
    requestIP: req.requestIP,
    userAgent: req.userAgent,
  });

  res.send(`IP Address: ${req.requestIP}, Browser: ${req.userAgent}`);
  // const data = req.body;
  // console.log("EMITTED", data);
  // io.emit("printStatus", data);
  // return res.status(200).json({ message: "Success" });
});

app.use(express.static(path.join(__dirname, "../client/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

httpServer.listen(7000, () => {
  console.log(`Server running on port: 7000`);
});

/**
 * Build Comand with client
 * npm --prefix ./client run build && tsc
 *
 */
