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

type DashboardSocketData = {
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
};

const bufferCountDisplay: Record<string, string> = {
  printerCounter: "Print Counter",
  estimateQuantity: "Target Quantity",
  printedQueue: "Buffer Printer",
  printQueue: "Buffer DB",
  maxPrintQueue: "Max Buffer DB",
};

const batchInfoDisplay: Partial<Record<keyof PrintData, string>> = {
  batchNo: "Batch No",
  personel: "Personel",
  barcode: "Barcode",
  scannedBarcode: "Scanned Barcode",
  productName: "Product Name",
};

const channel = "printStatus";
type BarcodeScanCountDisplay = {
  key: "triggerCount" | "goodReadCount" | "matchCount" | "mismatchCount" | "noReadCount";
  val: number;
  caption: string;
  color: "default" | "secondary" | "danger" | "warning" | "success";
};
export const useDashboard = () => {
  const socketCtx = useSocket();
  const [barcodeScanCountDisplay, setBarcodeScanCountDisplay] = useState<BarcodeScanCountDisplay[]>([
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

  const setColorBarcodeScanCountDisplay = (data: DashboardSocketData) => {
    const { triggerCount, goodReadCount, matchCount, mismatchCount, noReadCount } = data;
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
            : (triggerCount * 75) / 100 < goodReadCount
            ? "success"
            : (triggerCount * 75) / 100 > goodReadCount && (triggerCount * 60) / 100 <= goodReadCount
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
            : (triggerCount * 75) / 100 < matchCount
            ? "success"
            : (triggerCount * 75) / 100 > matchCount && (triggerCount * 60) / 100 <= matchCount
            ? "warning"
            : "danger",
      },
      {
        key: "mismatchCount",
        caption: "Mismatch Count",
        val: mismatchCount,
        color: triggerCount === 0 ? "secondary" : mismatchCount === 0 ? "success" : "warning",
      },
      {
        key: "noReadCount",
        caption: "No Read Count",
        val: noReadCount,
        color: triggerCount === 0 ? "secondary" : noReadCount === 0 ? "success" : "warning",
      },
    ];
    setBarcodeScanCountDisplay(barcodeScanCountDisplayData);
  };

  useEffect(() => {
    socketCtx.context.on(channel, (val) => {
      console.log("RECEIVED PRINT STATUS SOCKET DATA", val);
      setSocketData(val);
      setColorBarcodeScanCountDisplay(val);
    });
    return () => {
      socketCtx.context.off(channel);
    };
  }, [socketCtx]);

  useEffect(() => {});
  return { bufferCountDisplay, barcodeScanCountDisplay, batchInfoDisplay, socketData };
};
