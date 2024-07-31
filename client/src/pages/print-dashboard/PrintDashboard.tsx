import { useState } from "react";
import { useSocket } from "@/context/socket";
import { usePrintData } from "@/context/print";
import TextSocketValue from "@/components/text/TextSocketValue";
import { useNavigate } from "react-router-dom";

const PrintDashboardPage = () => {
  const navigate = useNavigate();
  const socketCtx = useSocket();
  const printDataCtx = usePrintData();
  console.log("socketCtx.isConnected", socketCtx.isConnected);
  console.log("printData", printDataCtx.printData);
  const [maxBufferCount, _] = useState(256);
  const [maxQuantity, __] = useState(1000000);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-900">
      <div className="w-full max-w-lg p-4 bg-gray-900 rounded-lg shadow-lg">
        <div className="text-center bg-red-600 text-2xl font-bold p-4 rounded-lg mb-4">
          Please press "Start Print" button
        </div>
        <div className="bg-white p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>Personnel</div>
            <div>{printDataCtx.printData?.personel}</div>
            <div>Batch</div>
            <div>{printDataCtx.printData?.batchNo}</div>
            <div>Quantity</div>
            <div>
              <TextSocketValue channel="printCount" /> | {maxQuantity} |{" "}
              <TextSocketValue channel="printedCount" />
            </div>
            <div>Barcode</div>
            <div>{printDataCtx.printData?.barcode}</div>
            <div>Product</div>
            <div>{printDataCtx.printData?.productName}</div>
            <div>Printer</div>
            <div>1 | 1,000,012</div>
            <div>Buffer</div>
            <div>
              <TextSocketValue channel="bufferCount" /> | {maxBufferCount}
            </div>
            <div>Scanned</div>
            <div>{printDataCtx.printData?.barcode}</div>
            <div>Trigger Count</div>
            <div>
              <TextSocketValue channel="triggerCount" />
            </div>
            <div>Good Read Count</div>
            <div>
              <TextSocketValue channel="goodReadCount" />
            </div>
            <div>Match Count</div>
            <div>
              <TextSocketValue channel="matchCount" />
            </div>
            <div>Mismatch Count</div>
            <div>
              <TextSocketValue channel="mismatchCount" />
            </div>
            <div>No Read Count</div>
            <div>
              <TextSocketValue channel="noReadCount" />
            </div>
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => {
                socketCtx.context.emit("startPrint");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl"
            >
              Start Print
            </button>
            <button
              onClick={() => {
                socketCtx.context.emit("stopPrint");
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl"
            >
              Stop Print
            </button>
            <button
              onClick={() => {
                printDataCtx.clearPrintData();
                navigate("/form");
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl"
            >
              End Batch
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl">
              Setting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintDashboardPage;
