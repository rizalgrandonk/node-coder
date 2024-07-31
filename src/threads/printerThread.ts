import "dotenv/config";
import { expose } from "threads/worker";
import { Observable, Subject } from "threads/observable";
import { sleep } from "../utils/helper";
import { SharedPrimitive, SharedQueue } from "../utils/sharedBuffer";
import SocketConnection from "../connections/socket";
import LiebingerClass from "../actions/leibinger";

console.log("Printer Thread Spawned");
const printer = new LiebingerClass({
  connectionType: "socket",
  connectionConfig: {
    host: "0.0.0.0",
    port: 515,
  },
});

let printCounter: SharedPrimitive<number>;
let isPrinting: SharedPrimitive<boolean>;
let clientDisplayMessage: SharedPrimitive<string>;
let printQueue: SharedQueue;
let printedQueue: SharedQueue;

type InitParams = {
  isPrintBuffer: SharedArrayBuffer;
  printBuffer: SharedArrayBuffer;
  printedBuffer: SharedArrayBuffer;
  printCounterBuffer: SharedArrayBuffer;
  displayMessageBuffer: SharedArrayBuffer;
};
const init = ({
  isPrintBuffer,
  printCounterBuffer,
  printBuffer,
  printedBuffer,
  displayMessageBuffer,
}: InitParams) => {
  printCounter = new SharedPrimitive<number>(printCounterBuffer);
  isPrinting = new SharedPrimitive<boolean>(isPrintBuffer);
  clientDisplayMessage = new SharedPrimitive<string>(displayMessageBuffer);
  printQueue = new SharedQueue(printBuffer);
  printedQueue = new SharedQueue(printedBuffer);
};

// const run = async () => {
//   // Reset Printer Status for the first time
//   printer.resetCounter();

//   // Check Printer Status
//   const printerStatus = await printer.checkPrinterStatus();
//   if (!printerStatus || !printerStatus.response) {
//     console.log("Failed request to socket connection");
//     printQueue.push(selected);
//     continue;
//   }

//   while (true) {
//     const selected = printQueue.shift();
//     if (!selected) {
//       await sleep(0);
//       continue;
//     }

//     // Check Printer Status
//     const printerStatus = await printer.checkPrinterStatus();
//     if (!printerStatus || !printerStatus.response) {
//       console.log("Failed request to socket connection");
//       printQueue.push(selected);
//       continue;
//     }

//     // Check if response not start with "^0"
//     if (!printerStatus.response.startsWith("^0")) {
//       clientDisplayMessage.set(printerStatus.response);

//       if (printedQueue.size() > 0) {
//         // TODO: Flush Printed Queue
//         // TODO: Update Unique Code SET coderstatus = 'UNE'
//       }
//       // TODO: Send Error Code To PLC
//       continue;
//     }

//     // Check if response length is not more than 5
//     if (printerStatus.response.length < 5) {
//       continue;
//     }

//     // Check if response is printer status response
//     if (printerStatus.response.startsWith("^0=RS")) {
//       // If there is no print action initiated from client
//       if (!isPrinting.get()) {
//         // TODO: Show message stop printing
//         if (printerStatus.machineState === 6) {
//           printer.stopPrint();
//         } else {
//           printer.showDisplay();

//           // Mask the current printer display
//           const currentPrintCounter = printCounter.get() + 1;
//           printCounter.set(currentPrintCounter);
//           printer.appendFifo(currentPrintCounter, "XXXXXXXXXXXXXX");
//         }
//       }

//       // Check if printer in error condition
//       if (printerStatus.errorState != 0) {
//         // TODO: Check if error is skipable error Then Show message print error
//         printer.closeError();
//       }

//       // Check if nozzle is closed. then open it
//       if (printerStatus.nozzleState === 3 || printerStatus.nozzleState === 4) {
//         printer.openNozzle();
//         // TODO: Show message open nozzle
//       }

//       // Check if nozzle is opening
//       if (printerStatus.nozzleState === 5) {
//         // TODO: Show message opening nozzle
//       }

//       // Check if nozzle is opened but printer is closed. then open the printer
//       if (printerStatus.nozzleState === 2 && printerStatus.machineState != 6) {
//         continue;
//       }

//       // Check if response is mailing status response
//       if (printerStatus.response.startsWith("^0=SM")) {
//         continue;
//       }

//       // const selected = printQueue.shift();
//       // if (selected) {
//       //   const response = await printer.checkPrinterStatus();
//       //   if (!response) {
//       //     console.log("Failed request to socket connection");
//       //     printQueue.push(selected);
//       //   } else {
//       //     printedQueue.push(selected);
//       //   }
//       // } else {
//       //   await sleep(0);
//       // }
//     }
//   }
// };

const socketWorker = {
  init,
  // run,
};

export type SocketWorker = typeof socketWorker;

expose(socketWorker);
