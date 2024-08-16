import { useEffect, useState } from "react";
import { useSocket } from "@/context/socket";
import { PrintData, usePrintData } from "@/context/print";
import TextSocketValue from "@/components/text/TextSocketValue";
import Header from "@/components/header/Header";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "./hooks/useDashboard";
import { CounterCard } from "./components/CounterCard";
import { PrinterMessage } from "./components/PrinterMessage";

const PrintDashboardPage = () => {
  const navigate = useNavigate();
  const socketCtx = useSocket();
  const printDataCtx = usePrintData();
  const { barcodeScanCountDisplay, batchInfoDisplay, bufferCountDisplay, socketData } = useDashboard();
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const connectedPrinter = ["1000012", "1000013", "10000014", "1000015"];

  useEffect(() => {
    printDataCtx.updatePrintData({
      personel: "AkenSejati",
      productName: "Pembersih Lantai SOS Apple Wonder 700 / 750 ml S.O.S Aroma Apel",
      barcode: "055500130207",
      scannedBarcode: "055500130207",
      batchNo: "BATCH-055500130207-0001",
      printEstimate: 0,
      availableCount: 0,
    });
  }, []);

  const onButtonStartPrintClick = () => {
    setIsPrinting(true);
    socketCtx.context.emit("startPrint");
  };

  const onButtonStopPrintClick = () => {
    setIsPrinting(false);
    socketCtx.context.emit("stopPrint");
  };

  return (
    <>
      <Header />
      <div
        className={`grid ${
          connectedPrinter.length > 1 ? "md:grid-cols-1 xl:grid-cols-2" : ""
        } items-center justify-center min-h-screen gap-6 p-6 bg-slate-200 text-gray-900 lg:flex-row lg:gap-8`}
      >
        {connectedPrinter.map((markingPrinterId, index) => (
          <div
            key={index}
            className="col-span-1 w-full p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
          >
            <div className="bg-white p-6 rounded-lg">
              <div className="flex justify-between mb-2">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z"
                    />
                  </svg>
                  <span className="ml-2">Line 1 | Printer {markingPrinterId}</span>
                </div>
                <button onClick={onButtonStopPrintClick} className=" text-gray-800 border border-gray-300 rounded-md p-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  Setting Printer
                </button>
              </div>

              <PrinterMessage message={socketData?.displayMessage ?? isPrinting ? "success:Print Ready" : `danger:Please press "Start Print" Button`} />

              <div className="grid grid-cols-2 gap-6 mb-6 p-4 border border-gray-200 rounded-lg shadow-sm">
                {batchInfoDisplay &&
                  (Object.keys(batchInfoDisplay) as Array<keyof PrintData>).map((key, index) => {
                    return (
                      <div key={index} className="col-span-1 last:col-span-2 items-center my-1">
                        <div className="flex flex-row items-center">
                          <label className="min-w-32 text-sm font-medium text-gray-700">{batchInfoDisplay[key]}</label>
                          <span className="col-span-3 text-sm font-semibold text-gray-900">: {printDataCtx.printData?.[key]}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="grid grid-cols-5 gap-4 mb-6">
                {bufferCountDisplay &&
                  Object.keys(bufferCountDisplay).map((key) => (
                    <div key={key} className="col-span-1 p-3 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                      <span className="flex justify-start font-light text-xs text-gray-600">{bufferCountDisplay[key]}</span>
                      <div className="flex justify-end font-semibold text-lg text-gray-900">
                        <TextSocketValue channel={key} />
                      </div>
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-5 gap-4 mb-6">
                {barcodeScanCountDisplay &&
                  barcodeScanCountDisplay.map((item, index) => <CounterCard key={index} caption={item.caption} color={item.color} val={item.val.toString()} />)}
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                {!isPrinting && (
                  <button
                    onClick={onButtonStartPrintClick}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                      />
                    </svg>
                    Start Print
                  </button>
                )}

                {isPrinting && (
                  <button
                    onClick={onButtonStopPrintClick}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 0 1 9 14.437V9.564Z"
                      />
                    </svg>
                    Stop Print
                  </button>
                )}

                <button
                  onClick={() => {
                    printDataCtx.clearPrintData();
                    navigate("/form");
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                  End Batch
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default PrintDashboardPage;
