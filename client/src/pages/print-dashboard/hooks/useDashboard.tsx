import { PrintData } from "@/context/print";
import { useSocket } from "@/context/socket";
import { useEffect, useState } from "react";

// {
//   "isPrinting": false,
//   "maxPrintQueue": 254,
//   "printQueue": 0,
//   "printedQueue": 0,
//   "printedCount": 0,
//   "targetQuantity": 0,
//   "displayMessage": "",
//   "triggerCount": 0,
//   "goodReadCount": 0,
//   "matchCount": 0,
//   "mismatchCount": 0,
//   "noReadCount": 0
// }

type BarcodeScanCountDisplay = {
  key:
    | "triggerCount"
    | "goodReadCount"
    | "matchCount"
    | "mismatchCount"
    | "noReadCount";
  val: number;
  caption: string;
  color: "default" | "secondary" | "danger" | "warning" | "success";
};

type BufferCountDisplay = {
  key:
    | "printerCounter"
    | "estimateQuantity"
    | "printedQueue"
    | "printQueue"
    | "maxPrintQueue";
  val: number;
  caption: string;
  color: "default" | "secondary" | "danger" | "warning" | "success";
};

export type DashboardSocketData = {
  isPrinting: boolean;
  maxPrintQueue: number;
  printQueue: number;
  printedQueue: number;
  printedCount: number;
  targetQuantity: number;
  displayMessage: string;
  triggerCount: number;
  goodReadCount: number;
  matchCount: number;
  mismatchCount: number;
  noReadCount: number;
  scannedBarcode: string;
};

// const bufferCountDisplay: Record<string, string> = {
//   printerCounter: "Print Counter",
//   estimateQuantity: "Target Quantity",
//   printedQueue: "Buffer Printer",
//   printQueue: "Buffer DB",
//   maxPrintQueue: "Max Buffer DB",
// };
const batchInfoDisplay: Partial<Record<keyof PrintData, string>> = {
  batchNo: "Batch No",
  // personel: "Personel",
  barcode: "Barcode",
  // scannedBarcode: "Scanned Barcode",
  productName: "Product Name",
};

const channel = "printStatus";

export const useDashboard = () => {
  const socketCtx = useSocket();
  const [bufferCountDisplay, setBufferCountDisplay] = useState<
    BufferCountDisplay[]
  >([
    {
      key: "printerCounter",
      val: 0,
      caption: "Print Counter",
      color: "default",
    },
    {
      key: "estimateQuantity",
      val: 0,
      caption: "Target Quantity",
      color: "default",
    },
    {
      key: "printedQueue",
      val: 0,
      caption: "Buffer Printer",
      color: "default",
    },
    {
      key: "printQueue",
      val: 0,
      caption: "Buffer DB",
      color: "default",
    },
    {
      key: "maxPrintQueue",
      val: 0,
      caption: "Max Buffer DB",
      color: "default",
    },
  ]);
  const [barcodeScanCountDisplay, setBarcodeScanCountDisplay] = useState<
    BarcodeScanCountDisplay[]
  >([
    {
      key: "triggerCount",
      caption: "Trigger Count",
      val: 0,
      color: "default",
    },
    {
      key: "goodReadCount",
      caption: "Good Read Count",
      val: 0,
      color: "default",
    },
    {
      key: "matchCount",
      caption: "Match Count",
      val: 0,
      color: "default",
    },
    {
      key: "mismatchCount",
      caption: "Mismatch Count",
      val: 0,
      color: "default",
    },
    {
      key: "noReadCount",
      caption: "No Read Count",
      val: 0,
      color: "default",
    },
  ]);
  const [socketData, setSocketData] = useState<DashboardSocketData>();
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  /**
   * This function updates the bufferCountDisplay state based on the values
   * provided in the DashboardSocketData object.
   */
  const setColorBufferCountDisplay = (data: DashboardSocketData) => {
    // Destructure the required properties from the DashboardSocketData object
    const {
      printedCount,
      targetQuantity,
      printedQueue,
      printQueue,
      maxPrintQueue,
    } = data;

    // Update the bufferCountDisplay state with the provided values
    setBufferCountDisplay([
      {
        // Key for the bufferCountDisplay array
        key: "printerCounter",
        // Value for the bufferCountDisplay array
        val: printedCount,
        // Caption for the bufferCountDisplay array
        caption: "Print Counter",
        // Color for the bufferCountDisplay array
        color: "default",
      },
      {
        // Key for the bufferCountDisplay array
        key: "estimateQuantity",
        // Value for the bufferCountDisplay array
        val: targetQuantity,
        // Caption for the bufferCountDisplay array
        caption: "Target Quantity",
        // Color for the bufferCountDisplay array
        color: "default",
      },
      {
        // Key for the bufferCountDisplay array
        key: "printedQueue",
        // Value for the bufferCountDisplay array
        val: printedQueue,
        // Caption for the bufferCountDisplay array
        caption: "Buffer Printer",
        // Color for the bufferCountDisplay array
        color: "default",
      },
      {
        // Key for the bufferCountDisplay array
        key: "printQueue",
        // Value for the bufferCountDisplay array
        val: printQueue,
        // Caption for the bufferCountDisplay array
        caption: "Buffer DB",
        // Color for the bufferCountDisplay array
        color: "default",
      },
      {
        // Key for the bufferCountDisplay array
        key: "maxPrintQueue",
        // Value for the bufferCountDisplay array
        val: maxPrintQueue,
        // Caption for the bufferCountDisplay array
        caption: "Max Buffer DB",
        // Color for the bufferCountDisplay array
        color: "default",
      },
    ]);
  };

  /**
   * This function takes in a DashboardSocketData object and updates the state
   * of the barcodeScanCountDisplay array.
   *
   * The function calculates the color of each item in the array based on the
   * values of the triggerCount, goodReadCount, matchCount, mismatchCount, and
   * noReadCount properties of the DashboardSocketData object.
   *
   * The color is determined as follows:
   * - If the triggerCount is 0, the color is set to "secondary".
   * - If the goodReadCount is greater than or equal to 75% of the triggerCount,
   *   the color is set to "success".
   * - If the goodReadCount is between 60% and 75% of the triggerCount, the
   *   color is set to "warning".
   * - If the goodReadCount is less than 60% of the triggerCount, the color is
   *   set to "danger".
   * - If the mismatchCount is 0, the color is set to "success".
   * - If the mismatchCount is greater than 0, the color is set to "warning".
   * - If the noReadCount is 0, the color is set to "success".
   * - If the noReadCount is greater than 0, the color is set to "warning".
   */
  const setColorBarcodeScanCountDisplay = (data: DashboardSocketData) => {
    const {
      triggerCount,
      goodReadCount,
      matchCount,
      mismatchCount,
      noReadCount,
    } = data;
    const barcodeScanCountDisplayData: BarcodeScanCountDisplay[] = [
      {
        key: "triggerCount",
        caption: "Trigger Count",
        val: triggerCount,
        color: "default",
      },
      {
        key: "goodReadCount",
        caption: "Good Read Count",
        val: goodReadCount,
        color:
          triggerCount === 0
            ? "secondary"
            : (triggerCount * 75) / 100 <= goodReadCount
            ? "success"
            : (triggerCount * 75) / 100 > goodReadCount &&
              (triggerCount * 60) / 100 <= goodReadCount
            ? "warning"
            : "danger",
      },
      {
        key: "matchCount",
        caption: "Match Count",
        val: matchCount,
        color:
          triggerCount === 0
            ? "secondary"
            : (triggerCount * 75) / 100 <= matchCount
            ? "success"
            : (triggerCount * 75) / 100 > matchCount &&
              (triggerCount * 60) / 100 <= matchCount
            ? "warning"
            : "danger",
      },
      {
        key: "mismatchCount",
        caption: "Mismatch Count",
        val: mismatchCount,
        color:
          triggerCount === 0
            ? "secondary"
            : mismatchCount === 0
            ? "success"
            : "warning",
      },
      {
        key: "noReadCount",
        caption: "No Read Count",
        val: noReadCount,
        color:
          triggerCount === 0
            ? "secondary"
            : noReadCount === 0
            ? "success"
            : "warning",
      },
    ];
    setBarcodeScanCountDisplay(barcodeScanCountDisplayData);
  };

  /**
   * This useEffect hook sets up a listener for the "printStatus" socket event.
   * When the event is received, it updates the state with the received data.
   * It also calls the helper functions to update the color of the barcodeScanCountDisplay and bufferCountDisplay.
   * Lastly, it updates the isPrinting state based on the received data.
   *
   * The hook cleans up the listener when the component unmounts.
   */
  useEffect(() => {
    // Set up a listener for the "printStatus" socket event
    socketCtx.context.on(channel, (val: DashboardSocketData) => {
      // Log the received data
      console.log("RECEIVED PRINT STATUS SOCKET DATA", val);

      // Update the state with the received data
      setSocketData(val);

      // Update the color of the barcodeScanCountDisplay and bufferCountDisplay
      setColorBarcodeScanCountDisplay(val);
      setColorBufferCountDisplay(val);

      // Update the isPrinting state based on the received data
      setIsPrinting(val.isPrinting);
    });

    // Clean up the listener when the component unmounts
    return () => {
      socketCtx.context.off(channel);
    };
  }, [socketCtx]);

  return {
    bufferCountDisplay,
    barcodeScanCountDisplay,
    batchInfoDisplay,
    socketData,
    isPrinting,

    setIsPrinting,
  };
};
