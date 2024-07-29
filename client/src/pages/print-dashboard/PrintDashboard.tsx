import { useState } from "react";
import { SocketProvider, useSocket } from "@/context/socket";
import TextSocketValue from "@/components/text/TextSocketValue";

const PrintDashboardPage = () => {
  const socketCtx = useSocket();
  console.log("socketCtx.isConnected", socketCtx.isConnected);
  const [maxBufferCount, _] = useState(256);
  const [maxQuantity, __] = useState(1000000);
  return (
    <SocketProvider>
      <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-900">
        <div className="w-full max-w-lg p-4 bg-gray-900 rounded-lg shadow-lg">
          <div className="text-center bg-red-600 text-2xl font-bold p-4 rounded-lg mb-4">
            Please press "Start Print" button
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>Personnel</div>
              <div>11111111_TrialNIK</div>
              <div>Batch</div>
              <div>ts</div>
              <div>Quantity</div>
              <div>
                <TextSocketValue channel="printCount" /> | {maxQuantity} |{" "}
                <TextSocketValue channel="printedCount" />
              </div>
              <div>Barcode</div>
              <div>8999099920691</div>
              <div>Product</div>
              <div>SGM E1+ MADU 900G</div>
              <div>Printer</div>
              <div>1 | 1,000,012</div>
              <div>Buffer</div>
              <div>
                <TextSocketValue channel="bufferCount" /> | {maxBufferCount}
              </div>
              <div>Scanned</div>
              <div>8999099920691</div>
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
              <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl">
                End Batch
              </button>
              <button className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl">
                Setting
              </button>
            </div>
          </div>
        </div>
      </div>
    </SocketProvider>
  );
};

export default PrintDashboardPage;
