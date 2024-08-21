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
  scannedBarcode: "",
};

describe("useDashboard Hook", () => {
  beforeEach(() => {
    (useSocket as Mock).mockReturnValue(mockSocketContext);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the hook initializes with default values.
   *
   * This test case renders the hook and checks if the hook initializes the
   * bufferCountDisplay, barcodeScanCountDisplay, socketData, and batchInfoDisplay
   * properties with default values.
   */
  it("should initialize with default values", () => {
    // Render the hook in a isolated environment
    const { result } = renderHook(() => useDashboard());

    // Check that the bufferCountDisplay array is initialized with default values
    // The bufferCountDisplay array contains information about the buffer counts
    expect(result.current.bufferCountDisplay).toEqual([
      {
        // Unique key for the buffer count display item
        key: "printerCounter",
        // Value of the buffer count
        val: 0,
        // Caption for the buffer count display item
        caption: "Print Counter",
        // Color for the buffer count display item
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
      {
        key: "printQueue",
        val: 0,
        caption: "Buffer DB",
        color: "default",
      },
      {
        key: "maxPrintQueue",
        val: 0,
        caption: "Max Buffer DB",
        color: "default",
      },
    ]);

    // Check that the barcodeScanCountDisplay array is initialized with default values
    // The barcodeScanCountDisplay array contains information about the barcode scan counts
    expect(result.current.barcodeScanCountDisplay).toEqual([
      {
        // Unique key for the barcode scan count display item
        key: "triggerCount",
        // Caption for the barcode scan count display item
        caption: "Trigger Count",
        // Value of the barcode scan count
        val: 0,
        // Color for the barcode scan count display item
        color: "default",
      },
      {
        key: "goodReadCount",
        caption: "Good Read Count",
        val: 0,
        color: "default",
      },
      {
        key: "matchCount",
        caption: "Match Count",
        val: 0,
        color: "default",
      },
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

    // Check that the socketData is undefined
    // The socketData property contains information about the socket data
    expect(result.current.socketData).toBeUndefined();

    // Check that the batchInfoDisplay object is initialized with default values
    // The batchInfoDisplay object contains information about the batch
    expect(result.current.batchInfoDisplay).toEqual({
      batchNo: "Batch No",
      // personel: "Personel",
      barcode: "Barcode",
      // scannedBarcode: "Scanned Barcode",
      productName: "Product Name",
    });
  });

  /**
   * Test case to verify that the hook sets up and tears down socket event listeners correctly.
   *
   * This test case renders the hook and checks if the hook sets up a listener for the "printStatus" event.
   * It then unmounts the hook and verifies that the hook stops listening to the "printStatus" event.
   */
  it("should set up and tear down socket event listeners", () => {
    // Render the hook
    const { unmount } = renderHook(() => useDashboard());

    // Expect the hook to listen to the "printStatus" event
    // The expect.any(Function) is used to assert that any function is passed as the callback
    expect(mockSocketContext.context.on).toHaveBeenCalledWith("printStatus", expect.any(Function));

    // Unmount the hook
    unmount();

    // Expect the hook to stop listening to the "printStatus" event
    expect(mockSocketContext.context.off).toHaveBeenCalledWith("printStatus");
  });

  /**
   * Test case for updating bufferCountDisplay and barcodeScanCountDisplay when receiving socket data.
   */
  it("should update bufferCountDisplay and barcodeScanCountDisplay when receiving socket data", () => {
    // Mock data for testing
    const mockData = {
      isPrinting: true, // is printer currently printing
      maxPrintQueue: 254, // maximum print queue size
      printQueue: 5, // current print queue size
      printedQueue: 10, // current printed queue size
      printedCount: 20, // current print counter
      targetQuantity: 100, // target quantity for printing
      displayMessage: "", // message to be displayed on the dashboard
      triggerCount: 100, // total count of triggers
      goodReadCount: 80, // count of good reads
      matchCount: 74, // count of matches
      mismatchCount: 6, // count of mismatches
      noReadCount: 10, // count of no reads
      scannedBarcode: "", // scanned barcode
    };

    // Function to be called when receiving socket data
    let socketCallback: (val: DashboardSocketData) => void;
    // Mock implementation for setting up socket event listener
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    // Render the useDashboard hook
    const { result } = renderHook(() => useDashboard());

    // Simulate receiving socket data
    act(() => {
      socketCallback(mockData);
    });

    // Check if bufferCountDisplay is updated correctly
    expect(result.current.bufferCountDisplay).toEqual([
      {
        key: "printerCounter", // key for the bufferCountDisplay array
        val: 20, // value for the bufferCountDisplay array
        caption: "Print Counter", // caption for the bufferCountDisplay array
        color: "default", // color for the bufferCountDisplay array
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

    // Check if barcodeScanCountDisplay is updated correctly
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
        color: "success", // color for the goodReadCount
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

    // Check if socketData is updated correctly
    expect(result.current.socketData).toEqual(mockData);
  });

  /**
   * Test case to verify that the Good Read Count color is updated to green when the Good Read Count is greater than or equal to 75% of the Trigger Count.
   */
  it("should update barcodeScanCountDisplay Good Read Count color to green if  Good Read Count >= 75% Trigger Count", () => {
    // Mock the socket data
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      goodReadCount: 80,
    };

    // Mock the socket callback
    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    // Render the hook
    const { result } = renderHook(() => useDashboard());

    // Call the socket callback with the mock data
    act(() => {
      socketCallback(mockData);
    });

    // Assert that the Good Read Count color is updated to green
    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "goodReadCount",
      caption: "Good Read Count",
      val: 80,
      color: "success",
    });
  });

  /**
   * Test case to verify that the Good Read Count color is updated to yellow when the Good Read Count is between 60% and 75% of the Trigger Count.
   */
  it("should update barcodeScanCountDisplay Good Read Count color to yellow if  60% Trigger Count <= Good Read Count < 75% Trigger Count", () => {
    // Mock the socket data
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      goodReadCount: 68,
    };

    // Mock the socket callback
    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    // Render the hook
    const { result } = renderHook(() => useDashboard());

    // Call the socket callback with the mock data
    act(() => {
      socketCallback(mockData);
    });

    // Assert that the Good Read Count color is updated to yellow
    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "goodReadCount",
      caption: "Good Read Count",
      val: 68,
      color: "warning",
    });
  });

  /**
   * Test case to verify that the Good Read Count color is updated to red when the Good Read Count is less than 60% of the Trigger Count.
   */
  it("should update barcodeScanCountDisplay Good Read Count color to red if  Good Read Count < 60% Trigger Count", () => {
    // Mock the socket data
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      goodReadCount: 52,
    };

    // Mock the socket callback
    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    // Render the hook
    const { result } = renderHook(() => useDashboard());

    // Call the socket callback with the mock data
    act(() => {
      socketCallback(mockData);
    });

    // Assert that the Good Read Count color is updated to red
    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "goodReadCount",
      caption: "Good Read Count",
      val: 52,
      color: "danger", // Expected color
    });
  });

  /**
   * Test case to verify that the Match Count color is updated to green when the Match Count is greater than or equal to 75% of the Trigger Count.
   */
  it("should update barcodeScanCountDisplay Match Count color to green if  Match Count >= 75% Trigger Count", () => {
    // Mock the socket data
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      matchCount: 80,
    };

    // Mock the socket callback
    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    // Render the hook
    const { result } = renderHook(() => useDashboard());

    // Call the socket callback with the mock data
    act(() => {
      socketCallback(mockData);
    });

    // Assert that the Match Count color is updated to green
    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "matchCount",
      caption: "Match Count",
      val: 80,
      color: "success", // Expected color
    });
  });

  /**
   * Test case to verify that the Match Count color is updated to yellow when the Match Count is between 60% and 75% of the Trigger Count.
   */
  it("should update barcodeScanCountDisplay Match Count color to yellow if  60% Trigger Count <= Match Count < 75% Trigger Count", () => {
    // Mock the socket data
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      matchCount: 68,
    };

    // Mock the socket callback
    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    // Render the hook
    const { result } = renderHook(() => useDashboard());

    // Call the socket callback with the mock data
    act(() => {
      socketCallback(mockData);
    });

    // Assert that the Match Count color is updated to yellow
    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "matchCount",
      caption: "Match Count",
      val: 68,
      color: "warning", // Expected color
    });
  });

  /**
   * Test case to verify that the Match Count color is updated to red when the Match Count is less than 60% of the Trigger Count.
   */
  it("should update barcodeScanCountDisplay Match Count color to red if  Match Count < 60% Trigger Count", () => {
    // Mock the socket data
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      matchCount: 52, // Match Count less than 60% of Trigger Count
    };

    // Mock the socket callback
    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    // Render the hook
    const { result } = renderHook(() => useDashboard());

    // Call the socket callback with the mock data
    act(() => {
      socketCallback(mockData);
    });

    // Assert that the Match Count color is updated to red
    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "matchCount",
      caption: "Match Count",
      val: 52,
      color: "danger", // Expected color
    });
  });

  /**
   * Test case to verify that the Mismatch Count color is updated to green when the Mismatch Count is equal to 0.
   */
  it("should update barcodeScanCountDisplay Mismatch Count color to green if  Mismatch Count == 0", () => {
    // Mock the socket data
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      mismatchCount: 0, // Mismatch Count is 0
    };

    // Mock the socket callback
    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    // Render the hook
    const { result } = renderHook(() => useDashboard());

    // Call the socket callback with the mock data
    act(() => {
      socketCallback(mockData);
    });

    // Assert that the Mismatch Count color is updated to green
    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "mismatchCount",
      caption: "Mismatch Count",
      val: 0,
      color: "success", // Expected color
    });
  });

  /**
   * Test case to verify that the Mismatch Count color is updated to yellow when the Mismatch Count is greater than 0.
   */
  it("should update barcodeScanCountDisplay Mismatch Count color to yellow if  Mismatch Count > 0", () => {
    // Mock the socket data
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      mismatchCount: 5, // Mismatch Count is greater than 0
    };

    // Mock the socket callback
    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    // Render the hook
    const { result } = renderHook(() => useDashboard());

    // Call the socket callback with the mock data
    act(() => {
      socketCallback(mockData);
    });

    // Assert that the Mismatch Count color is updated to yellow
    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "mismatchCount",
      caption: "Mismatch Count",
      val: 5,
      color: "warning", // Expected color
    });
  });

  /**
   * Test case to verify that the No Read Count color is updated to green when the No Read Count is equal to 0.
   */
  it("should update barcodeScanCountDisplay No Read Count color to green if  No Read Count == 0", () => {
    // Mock the socket data
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      noReadCount: 0, // No Read Count is 0
    };

    // Mock the socket callback
    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    // Render the hook
    const { result } = renderHook(() => useDashboard());

    // Call the socket callback with the mock data
    act(() => {
      socketCallback(mockData);
    });

    // Assert that the No Read Count color is updated to green
    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "noReadCount",
      caption: "No Read Count",
      val: 0,
      color: "success", // Expected color
    });
  });

  /**
   * Test case to verify that the No Read Count color is updated to yellow when the No Read Count is greater than 0.
   */
  it("should update barcodeScanCountDisplay No Read Count color to yellow if  No Read Count > 0", () => {
    // Mock the socket data
    const mockData = {
      ...defaultSocketData,
      triggerCount: 100,
      noReadCount: 5, // No Read Count is greater than 0
    };

    // Mock the socket callback
    let socketCallback: (val: DashboardSocketData) => void;
    (mockSocketContext.context.on as Mock).mockImplementation((_, cb) => {
      socketCallback = cb;
    });

    // Render the hook
    const { result } = renderHook(() => useDashboard());

    // Call the socket callback with the mock data
    act(() => {
      socketCallback(mockData);
    });

    // Assert that the No Read Count color is updated to yellow
    expect(result.current.barcodeScanCountDisplay).toContainEqual({
      key: "noReadCount",
      caption: "No Read Count",
      val: 5,
      color: "warning", // Expected color
    });
  });
});
