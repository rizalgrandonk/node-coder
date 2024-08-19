import { render, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import PrintDashboardPage from "../PrintDashboard";
import { useSocket } from "@/context/socket";
import { usePrintData } from "@/context/print";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { DashboardSocketData } from "../hooks/useDashboard";

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

const mockSocketContext = {
  context: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
};

const mockPrintDataContext = {
  printData: {},
  updatePrintData: vi.fn(),
  clearPrintData: vi.fn(),
};

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

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

describe("PrintDashboardPage", () => {
  beforeEach(() => {
    (useSocket as Mock).mockReturnValue(mockSocketContext);
    (usePrintData as Mock).mockReturnValue(mockPrintDataContext);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the `updatePrintData` method is called
   * with the correct data on initial render.
   */
  it("should update print data on initial render", () => {
    render(
      <MemoryRouter>
        <PrintDashboardPage />
      </MemoryRouter>
    );
    expect(mockPrintDataContext.updatePrintData).toHaveBeenCalledWith({
      personel: "AkenSejati",
      productName: "Pembersih Lantai SOS Apple Wonder 700 / 750 ml S.O.S Aroma Apel",
      barcode: "055500130207",
      scannedBarcode: "055500130207",
      batchNo: "BATCH-055500130207-0001",
      printEstimate: 0,
      availableCount: 0,
    });
    /**
     * This test case verifies that the `updatePrintData` method is called
     * with the correct data on initial render. The `updatePrintData` method
     * is used to update the print data in the context.
     */
  });

  /**
   * Test case to verify that the Start Print button click is handled correctly.
   * The button click should emit the "startPrint" event and update the
   * display message.
   */
  it("should handle Start Print button click", async () => {
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

    expect(mockSocketContext.context.emit).toHaveBeenCalledWith("startPrint");
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

    expect(mockSocketContext.context.emit).toHaveBeenCalledWith("stopPrint");
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
  it("should handle Stop Batch button click", () => {
    const { getByText } = render(
      <MemoryRouter>
        <PrintDashboardPage />
      </MemoryRouter>
    );

    const endBatchButton = getByText(/End Batch/i);
    act(() => {
      fireEvent.click(endBatchButton);
    });

    // expect(mockPrintDataContext.clearPrintData).toHaveBeenCalled();
    expect(mockSocketContext.context.emit).toHaveBeenCalledWith("stopBatch");
  });
});
