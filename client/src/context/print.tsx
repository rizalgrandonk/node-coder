import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSocket } from "./socket";
import { useNavigate } from "react-router-dom";
import { Batch } from "@/types/batch";
import { Product } from "@/types/product";

export type PrintData = {
  productId: number;
  productName: string;
  batchId: number;
  batchNo: string;
  barcode: string;
  quantity: number;
  printerLineId: number;
  markingPrinterId: number;
};

type PrintContextType = {
  printData: PrintData[];
  updatePrintData: (data: PrintData[]) => void;
  clearPrintData: () => void;
  hasFilledForm: boolean;
};

const PrintContext = createContext<PrintContextType>({
  printData: [],
  updatePrintData: () => {},
  clearPrintData: () => {},
  hasFilledForm: false,
});

export const usePrintData = () => useContext(PrintContext);

export const PrintDataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [printData, setPrintData] = useState<PrintData[]>([]);
  const socketCtx = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    const localData = localStorage.getItem("printData");
    if (localData) {
      setPrintData(JSON.parse(localData));
    }
  }, []);

  useEffect(() => {
    const batchInfoListener = (val: (Batch & { product: Product }) | null) => {
      // Log the received data
      console.log("RECEIVED BATCH INFO SOCKET DATA", val);

      if (!val) {
        navigate("/form");
        return;
      }

      // Update the printData state
      setPrintData([
        {
          productId: val.productid,
          barcode: val.product.upc ?? "",
          productName: val.product.name,
          batchId: val.id,
          batchNo: val.batchno ?? "",
          printerLineId: val.printerlineid,
          markingPrinterId: 0,
          quantity: val.qty,
        },
      ]);

      navigate("/dashboard");
    };

    socketCtx.context.on("batchInfo", batchInfoListener);

    // Clean up the listener when the component unmounts
    return () => {
      socketCtx.context.off("batchInfo", batchInfoListener);
    };
  }, [socketCtx]);

  const updatePrintData = (updatedData: PrintData[]) => {
    setPrintData(updatedData);
    localStorage.setItem("printData", JSON.stringify(updatedData));
  };

  const clearPrintData = () => {
    setPrintData([]);
    localStorage.removeItem("printData");
  };

  const hasFilledForm = printData.length > 0;

  return (
    <PrintContext.Provider
      value={{ printData, updatePrintData, clearPrintData, hasFilledForm }}
    >
      {children}
    </PrintContext.Provider>
  );
};
