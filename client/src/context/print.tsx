import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type PrintData = {
  personel: string;
  productName: string;
  barcode: string;
  batchNo: string;
  printEstimate: number;
  availableCount: number;
};
type PrintContextType = {
  printData?: PrintData;
  updatePrintData: (data: PrintData) => void;
  clearPrintData: () => void;
  hasFilledForm: boolean;
};

const PrintContext = createContext<PrintContextType>({
  printData: undefined,
  updatePrintData: () => undefined,
  clearPrintData: () => undefined,
  hasFilledForm: false,
});

export const usePrintData = () => useContext(PrintContext);

export const PrintDataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [printData, setPrintData] = useState<PrintData | undefined>(undefined);

  useEffect(() => {
    const localData = localStorage.getItem("printData");
    if (!localData) {
      return;
    }
    setPrintData(JSON.parse(localData));
  }, []);

  const updatePrintData = (data: PrintData) => {
    console.log("update print data");
    setPrintData(data);
    localStorage.setItem("printData", JSON.stringify(data));
    return data;
  };
  const clearPrintData = () => {
    setPrintData(undefined);
    localStorage.removeItem("printData");
  };
  const hasFilledForm = !!printData;

  return (
    <PrintContext.Provider
      value={{ printData, updatePrintData, clearPrintData, hasFilledForm }}
    >
      {children}
    </PrintContext.Provider>
  );
};
