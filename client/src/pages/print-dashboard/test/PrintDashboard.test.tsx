import { render, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import PrintDashboardPage from "../PrintDashboard";
import { useSocket } from "@/context/socket";
import { usePrintData } from "@/context/print";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { DashboardSocketData } from "../hooks/useDashboard";
import { startPrint, stopPrint } from "@/services/printService";
import { stopBatch } from "@/services/batchService";

// Mock useNavigate
const mockNavigate = vi.fn().mockImplementation((to) => {
  console.log("MOCK CALLS", to);
});
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual ?? {}),
    useNavigate: () => mockNavigate,
  };
});

// Mock useSocket and usePrintData hooks
vi.mock("@/context/socket", () => ({
  useSocket: vi.fn(),
}));

vi.mock("@/context/print", () => ({
  usePrintData: vi.fn(),
}));

vi.mock("./hooks/useDashboard", () => ({
  useDashboard: vi.fn(() => ({
    barcodeScanCountDisplay: [],
    batchInfoDisplay: {},
    bufferCountDisplay: [],
    socketData: {},
  })),
}));

vi.mock("@/services/printService", () => ({
  startPrint: vi.fn(),
  stopPrint: vi.fn(),
}));
vi.mock("@/services/batchService", () => ({
  stopBatch: vi.fn(),
}));

const mockSocketContext = {
  context: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
};

const mockPrintDataContext = {
  printData: [
    {
      personel: "AkenSejati",
      productName:
        "Pembersih Lantai SOS Apple Wonder 700 / 750 ml S.O.S Aroma Apel",
      barcode: "055500130207",
      scannedBarcode: "055500130207",
      batchNo: "BATCH-055500130207-0001",
      printEstimate: 0,
      availableCount: 0,
    },
  ],
  updatePrintData: vi.fn(),
  clearPrintData: vi.fn(),
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
  scannedBarcode: "",
};

describe("PrintDashboardPage", () => {
  beforeEach(() => {
    (useSocket as Mock).mockReturnValue(mockSocketContext);
    (usePrintData as Mock).mockReturnValue(mockPrintDataContext);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the Start Print button click is handled correctly.
   * The button click should emit the "startPrint" event and update the
   * display message.
   */
  it("should handle Start Print button click", async () => {
    (startPrint as Mock).mockResolvedValue({
      success: true,
      message: "Print started",
    });

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { getAllByRole } = render(
      <MemoryRouter>
        <PrintDashboardPage />
      </MemoryRouter>
    );

    const startButton = getAllByRole("button", {
      name: /Start Print/i,
    })[0];

    await userEvent.click(startButton);

    act(() => {
      socketCallback({
        ...defaultSocketData,
        isPrinting: true,
      });
    });

    expect(startPrint).toHaveBeenCalledTimes(1);
    expect(
      getAllByRole("button", {
        name: /Stop Print/i,
      })[0]
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the Stop Print button click is handled correctly.
   * The button click should emit the "stopPrint" event and update the
   * display message.
   */
  it("should handle Stop Print button click", async () => {
    (startPrint as Mock).mockResolvedValue({
      success: true,
      message: "Print started",
    });
    (stopPrint as Mock).mockResolvedValue({
      success: true,
      message: "Print stopped",
    });

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });
    const { getAllByRole } = render(
      <MemoryRouter>
        <PrintDashboardPage />
      </MemoryRouter>
    );

    const startButton = getAllByRole("button", {
      name: /Start Print/i,
    })[0];

    await userEvent.click(startButton);

    act(() => {
      socketCallback({
        ...defaultSocketData,
        isPrinting: true,
      });
    });

    const stopButton = getAllByRole("button", {
      name: /Stop Print/i,
    })[0];

    await userEvent.click(stopButton);

    act(() => {
      socketCallback({
        ...defaultSocketData,
        isPrinting: false,
      });
    });

    expect(stopPrint).toHaveBeenCalledTimes(1);
    expect(
      getAllByRole("button", {
        name: /Start Print/i,
      })[0]
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the error modal is displayed when the errorList
   * is not empty and can be closed.
   */
  it("should show error modal when errorList is not empty and can close error", async () => {
    const mockData = {
      ...defaultSocketData,
      displayMessage: "error:Nozzle Timeout",
    };

    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    const { getByText, getByRole, queryByText } = render(
      <MemoryRouter>
        <PrintDashboardPage />
      </MemoryRouter>
    );

    act(() => {
      socketCallback(mockData);
    });

    expect(getByText(/Nozzle Timeout/i)).toBeInTheDocument();

    const closeModalBtn = getByRole("button", {
      name: /Close/i,
    });

    await userEvent.click(closeModalBtn);

    expect(queryByText(/Nozzle Timeout/i)).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the Stop Batch button click is handled correctly.
   * The button click should emit the "stopBatch" event.
   */
  it("should handle Stop Batch button click", async () => {
    (stopBatch as Mock).mockResolvedValue({
      success: true,
      message: "Batch stopped",
    });

    const { getByText } = render(
      <MemoryRouter initialEntries={["/"]}>
        <PrintDashboardPage />
      </MemoryRouter>
    );

    const endBatchButton = getByText(/End Batch/i);

    await userEvent.click(endBatchButton);

    expect(stopBatch).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
