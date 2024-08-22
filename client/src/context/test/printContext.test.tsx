import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PrintDataProvider, usePrintData, PrintData } from "../print";
import { useSocket } from "../socket";
import { useNavigate } from "react-router-dom";

vi.mock("../socket");
vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
}));

describe("PrintDataProvider", () => {
  let mockSocketContext: any;
  let mockNavigate: any;

  beforeEach(() => {
    mockSocketContext = {
      context: {
        on: vi.fn(),
        off: vi.fn(),
      },
    };
    (useSocket as Mock).mockReturnValue(mockSocketContext);
    mockNavigate = vi.fn();
    (useNavigate as Mock).mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should initialize with empty printData", () => {
    const { result } = renderHook(() => usePrintData(), {
      wrapper: ({ children }) => (
        <PrintDataProvider>{children}</PrintDataProvider>
      ),
    });

    expect(result.current.printData).toEqual([]);
    expect(result.current.hasFilledForm).toBe(false);
  });

  it("should update printData and localStorage", () => {
    const { result } = renderHook(() => usePrintData(), {
      wrapper: ({ children }) => (
        <PrintDataProvider>{children}</PrintDataProvider>
      ),
    });

    const mockPrintData: PrintData[] = [
      {
        productId: 1,
        productName: "Test Product",
        batchId: 101,
        batchNo: "Batch101",
        barcode: "123456789",
        quantity: 10,
        printerLineId: 1,
        markingPrinterId: 1,
      },
    ];

    act(() => {
      result.current.updatePrintData(mockPrintData);
    });

    expect(result.current.printData).toEqual(mockPrintData);
    expect(localStorage.getItem("printData")).toEqual(
      JSON.stringify(mockPrintData)
    );
  });

  it("should clear printData and localStorage", () => {
    const { result } = renderHook(() => usePrintData(), {
      wrapper: ({ children }) => (
        <PrintDataProvider>{children}</PrintDataProvider>
      ),
    });

    act(() => {
      result.current.clearPrintData();
    });

    expect(result.current.printData).toEqual([]);
    expect(localStorage.getItem("printData")).toBeNull();
  });

  it("should load printData from localStorage on mount", () => {
    const mockPrintData: PrintData[] = [
      {
        productId: 1,
        productName: "Test Product",
        batchId: 101,
        batchNo: "Batch101",
        barcode: "123456789",
        quantity: 10,
        printerLineId: 1,
        markingPrinterId: 1,
      },
    ];

    localStorage.setItem("printData", JSON.stringify(mockPrintData));

    const { result } = renderHook(() => usePrintData(), {
      wrapper: ({ children }) => (
        <PrintDataProvider>{children}</PrintDataProvider>
      ),
    });

    expect(result.current.printData).toEqual(mockPrintData);
  });

  it("should handle batchInfo socket event and update printData", () => {
    const { result } = renderHook(() => usePrintData(), {
      wrapper: ({ children }) => (
        <PrintDataProvider>{children}</PrintDataProvider>
      ),
    });

    const mockBatchInfo = {
      productid: 2,
      product: { upc: "987654321", name: "New Product" },
      id: 202,
      batchno: "Batch202",
      printerlineid: 2,
      qty: 20,
    };

    act(() => {
      mockSocketContext.context.on.mock.calls[0][1](mockBatchInfo);
    });

    expect(result.current.printData).toEqual([
      {
        productId: 2,
        barcode: "987654321",
        productName: "New Product",
        batchId: 202,
        batchNo: "Batch202",
        printerLineId: 2,
        markingPrinterId: 0,
        quantity: 20,
      },
    ]);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("should navigate to form when batchInfo is null", () => {
    const { result } = renderHook(() => usePrintData(), {
      wrapper: ({ children }) => (
        <PrintDataProvider>{children}</PrintDataProvider>
      ),
    });

    act(() => {
      mockSocketContext.context.on.mock.calls[0][1](null);
    });

    expect(result.current.printData).toEqual([]);
    expect(mockNavigate).toHaveBeenCalledWith("/form");
  });
});
