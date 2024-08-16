import { renderHook, act } from "@testing-library/react";
// import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { useDashboard, DashboardSocketData } from "../hooks/useDashboard";
import { useSocket } from "@/context/socket";

// Mocking the useSocket hook
vi.mock("@/context/socket", () => ({
  useSocket: vi.fn(),
}));

const mockSocketContext = {
  context: {
    on: vi.fn(),
    off: vi.fn(),
  },
};

const defaultSocketData: DashboardSocketData = {
  isPrinting: true,
  maxPrintQueue: 0,
  printQueue: 0,
  printedQueue: 0,
  printedCount: 0,
  targetQuantity: 0,
  displayMessage: "",
  triggerCount: 0,
  goodReadCount: 0,
  matchCount: 0,
  mismatchCount: 0,
  noReadCount: 0,
};

describe("useDashboard Hook", () => {
  beforeEach(() => {
    (useSocket as Mock).mockReturnValue(mockSocketContext);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useDashboard());

    expect(result.current.bufferCountDisplay).toEqual([
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
      { key: "printQueue", val: 0, caption: "Buffer DB", color: "default" },
      {
        key: "maxPrintQueue",
        val: 0,
        caption: "Max Buffer DB",
        color: "default",
      },
    ]);

    expect(result.current.barcodeScanCountDisplay).toEqual([
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
      { key: "matchCount", caption: "Match Count", val: 0, color: "default" },
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

    expect(result.current.socketData).toBeUndefined();
    expect(result.current.batchInfoDisplay).toEqual({
      batchNo: "Batch No",
      // personel: "Personel",
      barcode: "Barcode",
      // scannedBarcode: "Scanned Barcode",
      productName: "Product Name",
    });
  });

  it("should set up and tear down socket event listeners", () => {
    const { unmount } = renderHook(() => useDashboard());

    expect(mockSocketContext.context.on).toHaveBeenCalledWith(
      "printStatus",
      expect.any(Function)
    );

    unmount();

    expect(mockSocketContext.context.off).toHaveBeenCalledWith("printStatus");
  });

  it("should update bufferCountDisplay and barcodeScanCountDisplay when receiving socket data", () => {
    const mockData = {
      isPrinting: true,
      maxPrintQueue: 254,
      printQueue: 5,
      printedQueue: 10,
      printedCount: 20,
      targetQuantity: 100,
      displayMessage: "",
      triggerCount: 100,
      goodReadCount: 80,
      matchCount: 74,
      mismatchCount: 6,
      noReadCount: 10,
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { result } = renderHook(() => useDashboard());

    act(() => {
      socketCallback(mockData);
    });

    expect(result.current.bufferCountDisplay).toEqual([
      {
        key: "printerCounter",
        val: 20,
        caption: "Print Counter",
        color: "default",
      },
      {
        key: "estimateQuantity",
        val: 100,
        caption: "Target Quantity",
        color: "default",
      },
      {
        key: "printedQueue",
        val: 10,
        caption: "Buffer Printer",
        color: "default",
      },
      { key: "printQueue", val: 5, caption: "Buffer DB", color: "default" },
      {
        key: "maxPrintQueue",
        val: 254,
        caption: "Max Buffer DB",
        color: "default",
      },
    ]);

    expect(result.current.barcodeScanCountDisplay).toEqual([
      {
        key: "triggerCount",
        caption: "Trigger Count",
        val: 100,
        color: "default",
      },
      {
        key: "goodReadCount",
        caption: "Good Read Count",
        val: 80,
        color: "success",
      },
      { key: "matchCount", caption: "Match Count", val: 74, color: "warning" },
      {
        key: "mismatchCount",
        caption: "Mismatch Count",
        val: 6,
        color: "warning",
      },
      {
        key: "noReadCount",
        caption: "No Read Count",
        val: 10,
        color: "warning",
      },
    ]);

    expect(result.current.socketData).toEqual(mockData);
  });

  it("should update barcodeScanCountDisplay Good Read Count color to green if  Good Read Count >= 75% Trigger Count", () => {
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      goodReadCount: 80,
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { result } = renderHook(() => useDashboard());

    act(() => {
      socketCallback(mockData);
    });

    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "goodReadCount",
      caption: "Good Read Count",
      val: 80,
      color: "success",
    });
  });

  it("should update barcodeScanCountDisplay Good Read Count color to yellow if  60% Trigger Count <= Good Read Count < 75% Trigger Count", () => {
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      goodReadCount: 68,
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { result } = renderHook(() => useDashboard());

    act(() => {
      socketCallback(mockData);
    });

    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "goodReadCount",
      caption: "Good Read Count",
      val: 68,
      color: "warning",
    });
  });

  it("should update barcodeScanCountDisplay Good Read Count color to red if  Good Read Count < 60% Trigger Count", () => {
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      goodReadCount: 52,
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { result } = renderHook(() => useDashboard());

    act(() => {
      socketCallback(mockData);
    });

    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "goodReadCount",
      caption: "Good Read Count",
      val: 52,
      color: "danger",
    });
  });

  it("should update barcodeScanCountDisplay Match Count color to green if  Match Count >= 75% Trigger Count", () => {
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      matchCount: 80,
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { result } = renderHook(() => useDashboard());

    act(() => {
      socketCallback(mockData);
    });

    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "matchCount",
      caption: "Match Count",
      val: 80,
      color: "success",
    });
  });

  it("should update barcodeScanCountDisplay Match Count color to yellow if  60% Trigger Count <= Match Count < 75% Trigger Count", () => {
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      matchCount: 68,
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { result } = renderHook(() => useDashboard());

    act(() => {
      socketCallback(mockData);
    });

    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "matchCount",
      caption: "Match Count",
      val: 68,
      color: "warning",
    });
  });

  it("should update barcodeScanCountDisplay Match Count color to red if  Match Count < 60% Trigger Count", () => {
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      matchCount: 52,
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { result } = renderHook(() => useDashboard());

    act(() => {
      socketCallback(mockData);
    });

    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "matchCount",
      caption: "Match Count",
      val: 52,
      color: "danger",
    });
  });

  it("should update barcodeScanCountDisplay Mismatch Count color to green if  Mismatch Count == 0", () => {
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      mismatchCount: 0,
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { result } = renderHook(() => useDashboard());

    act(() => {
      socketCallback(mockData);
    });

    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "mismatchCount",
      caption: "Mismatch Count",
      val: 0,
      color: "success",
    });
  });

  it("should update barcodeScanCountDisplay Mismatch Count color to yellow if  Mismatch Count > 0", () => {
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      mismatchCount: 5,
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { result } = renderHook(() => useDashboard());

    act(() => {
      socketCallback(mockData);
    });

    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "mismatchCount",
      caption: "Mismatch Count",
      val: 5,
      color: "warning",
    });
  });

  it("should update barcodeScanCountDisplay No Read Count color to green if  No Read Count == 0", () => {
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      noReadCount: 0,
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { result } = renderHook(() => useDashboard());

    act(() => {
      socketCallback(mockData);
    });

    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "noReadCount",
      caption: "No Read Count",
      val: 0,
      color: "success",
    });
  });

  it("should update barcodeScanCountDisplay No Read Count color to yellow if  No Read Count > 0", () => {
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      noReadCount: 5,
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { result } = renderHook(() => useDashboard());

    act(() => {
      socketCallback(mockData);
    });

    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "noReadCount",
      caption: "No Read Count",
      val: 5,
      color: "warning",
    });
  });
});
