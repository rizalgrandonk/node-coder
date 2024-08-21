import { createContext, ReactNode, useContext, useEffect, useState } from "react";

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

export const PrintDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [printData, setPrintData] = useState<PrintData[]>([]);

  useEffect(() => {
    const localData = localStorage.getItem("printData");
    if (localData) {
      setPrintData(JSON.parse(localData));
    }
  }, []);

  const updatePrintData = (updatedData: PrintData[]) => {
    setPrintData(updatedData);
    localStorage.setItem("printData", JSON.stringify(updatedData));
  };

  const clearPrintData = () => {
    setPrintData([]);
    localStorage.removeItem("printData");
  };

  const hasFilledForm = printData.length > 0;

  return <PrintContext.Provider value={{ printData, updatePrintData, clearPrintData, hasFilledForm }}>{children}</PrintContext.Provider>;
};
