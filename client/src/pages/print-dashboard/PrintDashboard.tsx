import { useEffect, useState } from "react";
import { useSocket } from "@/context/socket";
import { PrintData, usePrintData } from "@/context/print";
import Header from "@/components/header/Header";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "./hooks/useDashboard";
import CounterCard from "./components/CounterCard";
import PrinterMessage from "./components/PrinterMessage";
import {
  PrinterIcon,
  Cog6ToothIcon,
  PlayIcon,
  StopCircleIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { cn } from "@/utils/helper";
import ErrorModal from "./components/ErrorModal";
import { startPrint, stopPrint } from "@/services/printService";
import { stopBatch } from "@/services/batchService";

const PrintDashboardPage = () => {
  const navigate = useNavigate();
  const socketCtx = useSocket();
  const printDataCtx = usePrintData();
  const {
    barcodeScanCountDisplay,
    batchInfoDisplay,
    bufferCountDisplay,
    socketData,
    isPrinting,
    setIsPrinting,
  } = useDashboard();

  const [errorList, setErrorList] = useState<string[]>([]);

  useEffect(() => {
    const channel = "printStatus";
    const receiveError = (val: any) => {
      const displayMessage: string | undefined = val.displayMessage?.trim();
      const isPrinting: boolean | undefined = val.isPrinting;

      if (isPrinting !== undefined) {
        setIsPrinting(isPrinting);
      }

      if (!displayMessage || displayMessage === "") {
        return;
      }
      const [type, message] = displayMessage.split(":");
      if (!type || !message || type !== "error" || message === errorList[0]) {
        return;
      }

      setErrorList([...errorList, message]);
    };

    socketCtx.context.on(channel, receiveError);
    return () => {
      socketCtx.context.off(channel, receiveError);
    };
  }, [socketCtx, errorList]);

  const onButtonStartPrintClick = async () => {
    console.log("Start Print Clicked");
    startPrint();
  };

  const onButtonStopPrintClick = () => {
    stopPrint();
    // socketCtx.context.emit("stopPrint");
  };

  const onButtonStopBatchClick = async (id: number) => {
    console.log("Stop Batch Clicked", id);
    const stopBatchResult = await stopBatch(id);
    console.log("Stop Batch Result", stopBatchResult);
    if (!stopBatchResult.success) {
      return;
    }
    printDataCtx.clearPrintData();
    navigate("/form");
    console.log("batch stopped");
    // socketCtx.context.emit("stopBatch");
  };

  return (
    <>
      <Header />

      <div className="min-h-screen p-3 bg-slate-200 text-gray-900">
        <div
          className={cn(
            "grid gap-3 place-items-center",
            printDataCtx.printData.length > 1 ? "xl:grid-cols-2" : ""
          )}
        >
          {printDataCtx.printData.map((printData, index) => (
            // Render Printer Card
            <div
              key={index}
              className="flex flex-row w-full max-w-5xl p-3 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 divide-x"
            >
              {/* Render Printer Info */}
              <div className="flex flex-col items-center gap-3 pr-2">
                <PrinterIcon className="size-6" />
                <span
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "upright",
                  }}
                  className="tracking-tighter leading-none"
                >
                  1 - {printData.markingPrinterId}
                </span>
              </div>

              {/* Render Printer Message */}
              <div className="flex-grow pl-3">
                <PrinterMessage
                  message={
                    isPrinting
                      ? socketData?.displayMessage &&
                        socketData?.displayMessage !== ""
                        ? socketData?.displayMessage
                        : "success:Print Ready"
                      : `danger:Please press "Start Print" Button`
                  }
                />

                {/* Render Batch Info */}
                <div className="grid grid-cols-2 gap-3 mb-3 p-2 border border-gray-200 rounded-lg shadow-sm">
                  {batchInfoDisplay &&
                    (
                      Object.keys(batchInfoDisplay) as Array<keyof PrintData>
                    ).map((key, index) => {
                      return (
                        <div
                          key={index}
                          className="col-span-2 lg:col-span-1 last:col-span-2 items-center my-1"
                        >
                          <div className="flex flex-row items-center gap-1">
                            <label className="min-w-32 text-sm font-medium text-gray-700">
                              {batchInfoDisplay[key]}
                            </label>
                            <span className="col-span-3 text-sm font-semibold text-gray-900">
                              : {printData?.[key]}
                            </span>
                            {key === "barcode" &&
                              socketData?.scannedBarcode ===
                                printData?.barcode && (
                                <CheckCircleIcon className="size-5 text-green-500" />
                              )}
                            {key === "barcode" &&
                              socketData?.scannedBarcode !==
                                printData?.barcode && (
                                <XCircleIcon className="size-5 text-red-500" />
                              )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Render Buffer and Barcode Scan Count */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 mb-3">
                  {bufferCountDisplay &&
                    bufferCountDisplay.map((item, index) => (
                      <CounterCard
                        key={index}
                        caption={item.caption}
                        color={item.color}
                        value={item.val.toString()}
                      />
                    ))}

                  {barcodeScanCountDisplay &&
                    barcodeScanCountDisplay.map((item, index) => (
                      <CounterCard
                        key={index}
                        caption={item.caption}
                        color={item.color}
                        value={item.val.toString()}
                      />
                    ))}
                </div>

                {/* Render Start Print and Stop Print Button */}
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  {!isPrinting && (
                    <button
                      onClick={onButtonStartPrintClick}
                      className="w-full sm:w-[175px] bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center gap-2 justify-center disabled:bg-gray-300"
                    >
                      <PlayIcon className="size-6" />
                      Start Print
                    </button>
                  )}

                  {isPrinting && (
                    <button
                      onClick={onButtonStopPrintClick}
                      className="w-full sm:w-[175px] bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center gap-2 justify-center disabled:bg-gray-300"
                    >
                      <StopCircleIcon className="size-6" />
                      Stop Print
                    </button>
                  )}

                  <button
                    disabled={isPrinting}
                    onClick={() => {
                      console.log("Clicked", printData);
                      onButtonStopBatchClick(printData.batchId);
                    }}
                    className="w-full sm:w-[175px] bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center gap-2 justify-center disabled:bg-gray-300"
                  >
                    <NoSymbolIcon className="size-6" />
                    End Batch
                  </button>

                  <button
                    onClick={onButtonStopPrintClick}
                    className="w-full sm:w-[175px] bg-gray-500 text-white border border-gray-300 rounded-md p-2 flex items-center gap-2 justify-center disabled:bg-gray-300"
                  >
                    <Cog6ToothIcon className="size-6" />
                    Setting Printer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {errorList.length > 0 && (
        <ErrorModal
          data-testid="error-modal"
          message={errorList[0]}
          title="Printer Error !"
          onClose={() => {
            setErrorList(errorList.slice(1));
          }}
        />
      )}
    </>
  );
};

export default PrintDashboardPage;
