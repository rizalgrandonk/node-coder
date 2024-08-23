import PrintFormPage from "@/pages/print-form/PrintFormPage";
import { screen, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import * as BatchService from "@/services/batchService";
import * as ProductService from "@/services/productService";
import * as UniquecodeService from "@/services/uniquecodeService";
import { usePrintData } from "@/context/print";

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

vi.mock("@/utils/helper");

vi.mock("@/context/print", () => ({
  usePrintData: vi.fn(),
}));

const mockPrintDataContext = {
  printData: [],
  updatePrintData: vi.fn(),
  clearPrintData: vi.fn(),
};

describe("PrintFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (usePrintData as Mock).mockReturnValue(mockPrintDataContext);
    vi.spyOn(BatchService, "startBatch").mockResolvedValue({
      success: true,
      data: { id: 1 },
    } as any);
    vi.spyOn(BatchService, "stopBatch").mockResolvedValue({
      success: true,
      data: { id: 1 },
    } as any);
    vi.spyOn(ProductService, "getByBarcode").mockResolvedValue({
      success: true,
      data: { id: 1, name: "TEST", upc: "Barcode" },
    } as any);
    vi.spyOn(UniquecodeService, "getAvailableUniquecodes").mockResolvedValue({
      success: true,
      data: { count: 105826 },
    } as any);
  });

  it("should handle Start Batch button click", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const startBatchButtons = screen.getByTestId("startBatch-button");
    const scanProductButtons = screen.getByTestId("productName-0-button");
    const batchNoInput = screen.getByTestId("batchNo-0-input");
    const estimateQuantityInput = screen.getByTestId("printEstimate-0-input");

    await userEvent.type(batchNoInput, "BATCH-1");
    await userEvent.type(estimateQuantityInput, "100");

    await userEvent.click(scanProductButtons); // click open product modal lookup (scan)

    const barcodeInput = screen.getByLabelText("BARCODE");
    const modalLookupSubmitButton = screen.getByTestId(
      "submitModalLookupProduct-button"
    );

    expect(barcodeInput).toBeInTheDocument();

    await userEvent.type(barcodeInput, "100");

    await userEvent.click(modalLookupSubmitButton);

    expect(barcodeInput).not.toBeInTheDocument();

    await userEvent.click(startBatchButtons);

    expect(BatchService.startBatch).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalled();
  });

  it("should handle Get Uniquecode Count button click", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const getUniqueCodeCountButtons = screen.getByTestId(
      "availableUniquecodeCount-button"
    );

    const availableUniquecodeInput = screen.getByTestId(
      "availableUniquecodeCount-input"
    );

    await userEvent.click(getUniqueCodeCountButtons);

    expect(UniquecodeService.getAvailableUniquecodes).toHaveBeenCalled();

    expect(availableUniquecodeInput).toHaveValue("105826");
  });

  it("should display error banner when an error occured while Get Available Uniquecode Count", async () => {
    vi.spyOn(UniquecodeService, "getAvailableUniquecodes").mockResolvedValue({
      success: false,
      message: "Failed getting available uniquecode count",
    } as any);

    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const getUniqueCodeCountButtons = screen.getByTestId(
      "availableUniquecodeCount-button"
    );

    const availableUniquecodeInput = screen.getByTestId(
      "availableUniquecodeCount-input"
    );

    await userEvent.click(getUniqueCodeCountButtons);

    expect(UniquecodeService.getAvailableUniquecodes).toHaveBeenCalled();

    expect(availableUniquecodeInput).toHaveValue("0");

    const alertErrorBanner = screen.getByTestId("alert");
    expect(alertErrorBanner).toBeInTheDocument();
    expect(alertErrorBanner).toHaveTextContent(
      "Failed getting available uniquecode count"
    );

    // Close Banner
    const alertErrorBannerCloseButton =
      screen.getByTestId("alert-close-button");

    await userEvent.click(alertErrorBannerCloseButton);

    expect(alertErrorBanner).not.toBeInTheDocument();
  });

  it("should display error when Input BatchNo with Space", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const batchNoInput = screen.getByTestId("batchNo-0-input");
    const startBatchButtons = screen.getByTestId("startBatch-button");
    await userEvent.type(batchNoInput, "BATCH 1");
    await userEvent.click(startBatchButtons);

    const batchNoInputErrorMessage = screen.getByTestId(
      "batchNo-0-inputErrorMessage"
    );
    expect(batchNoInputErrorMessage.textContent).toEqual(
      "Only uppercase alphanumeric characters, dashes (-), and slashes (/) are allowed."
    );
  });

  it("should display error when Input BatchNo With Symbol Except Dash (-) & Slash (/)", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const batchNoInput = screen.getByTestId("batchNo-0-input");
    const startBatchButtons = screen.getByTestId("startBatch-button");
    await userEvent.type(batchNoInput, "BATCH#1");
    await userEvent.click(startBatchButtons);

    const batchNoInputErrorMessage = screen.getByTestId(
      "batchNo-0-inputErrorMessage"
    );
    expect(batchNoInputErrorMessage.textContent).toEqual(
      "Only uppercase alphanumeric characters, dashes (-), and slashes (/) are allowed."
    );
  });

  it("should transform Text To Uppercase when Insert BatchNo with Lowercase", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const batchNoInput = screen.getByTestId("batchNo-0-input");
    const startBatchButtons = screen.getByTestId("startBatch-button");
    await userEvent.type(batchNoInput, "batch-1");
    await userEvent.click(startBatchButtons);

    expect(batchNoInput).toHaveDisplayValue("BATCH-1");
  });

  it("should display error when Insert BatchNo More Than 255 Characters", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const batchNoInput = screen.getByTestId("batchNo-0-input");
    const startBatchButtons = screen.getByTestId("startBatch-button");
    await userEvent.type(
      batchNoInput,
      "asiughwiujfjksnwiougwgnsnsnfsfnnalsnohrwgrwgiowklsfslkfmoidfadfmalfowgwiglkwfwkfggjrklgmsflgdfgnhugtwkdflsfmpsdogkwrgjsjgksglsdkgoaghaoswdfgoshgasgnoaghnowglskgmnoasghaowhgoasgklsadgosdgisodghwgsjglskgmapwgkwopgjgirgpodsjgapgjapdgjasdgmaigsdofvidookofksdsp"
    );
    await userEvent.click(startBatchButtons);

    const batchNoInputErrorMessage = screen.getByTestId(
      "batchNo-0-inputErrorMessage"
    );
    expect(batchNoInputErrorMessage.textContent).toEqual(
      "String must contain at most 255 character(s)"
    );
  });

  it("should display error when Insert Estimate Quantity with alphanumeric", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const printEstimateInput = screen.getByTestId("printEstimate-0-input");
    const startBatchButtons = screen.getByTestId("startBatch-button");
    await userEvent.type(printEstimateInput, "asiughwiujf");
    await userEvent.click(startBatchButtons);

    const printEstimateInputErrorMessage = screen.getByTestId(
      "printEstimate-0-inputErrorMessage"
    );
    expect(printEstimateInputErrorMessage.textContent).toEqual(
      "Estimate Quantity is Required and should be numeric value without symbol"
    );
  });

  it("should display error when Insert Estimate Quantity with symbol", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const printEstimateInput = screen.getByTestId("printEstimate-0-input");
    const startBatchButtons = screen.getByTestId("startBatch-button");
    await userEvent.type(printEstimateInput, "+-?:%^");
    await userEvent.click(startBatchButtons);

    const printEstimateInputErrorMessage = screen.getByTestId(
      "printEstimate-0-inputErrorMessage"
    );
    expect(printEstimateInputErrorMessage.textContent).toEqual(
      "Estimate Quantity is Required and should be numeric value without symbol"
    );
  });

  it("should display error when Submit Batch without Input BatchNo", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const batchNoInput = screen.getByTestId("batchNo-0-input");
    const startBatchButtons = screen.getByTestId("startBatch-button");
    await userEvent.clear(batchNoInput);
    await userEvent.click(startBatchButtons);

    const batchNoInputErrorMessage = screen.getByTestId(
      "batchNo-0-inputErrorMessage"
    );
    expect(batchNoInputErrorMessage.textContent).toEqual(
      "Batch Number is Required"
    );
  });

  it("should display error when Submit Batch without Input Product", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const startBatchButtons = screen.getByTestId("startBatch-button");
    await userEvent.click(startBatchButtons);

    const productInputErrorMessage = screen.getByTestId(
      "productName-0-inputErrorMessage"
    );
    expect(productInputErrorMessage.textContent).toEqual("Product is Required");
  });

  it("should display error when Submit Batch without Input Estimate Quantity", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const printEstimateInput = screen.getByTestId("printEstimate-0-input");
    const startBatchButtons = screen.getByTestId("startBatch-button");
    await userEvent.clear(printEstimateInput);
    await userEvent.click(startBatchButtons);

    const printEstimateInputErrorMessage = screen.getByTestId(
      "printEstimate-0-inputErrorMessage"
    );
    expect(printEstimateInputErrorMessage.textContent).toEqual(
      "Estimate Quantity is Required and should be numeric value without symbol"
    );
  });

  it("should display error when Estimate Quantity More Than Available Quantity", async () => {
    vi.spyOn(BatchService, "startBatch").mockResolvedValue({
      success: false,
      message: "Estimate Quantity Shouldn't higher than Available Quantity",
    });
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const startBatchButtons = screen.getByTestId("startBatch-button");
    const scanProductButtons = screen.getByTestId("productName-0-button");
    const batchNoInput = screen.getByTestId("batchNo-0-input");
    const estimateQuantityInput = screen.getByTestId("printEstimate-0-input");

    await userEvent.type(batchNoInput, "BATCH-1");
    await userEvent.type(estimateQuantityInput, "100");

    await userEvent.click(scanProductButtons);

    const barcodeInput = screen.getByLabelText("BARCODE");
    const modalLookupSubmitButton = screen.getByTestId(
      "submitModalLookupProduct-button"
    );

    await userEvent.type(barcodeInput, "100");

    await userEvent.click(modalLookupSubmitButton);
    await userEvent.click(startBatchButtons);

    expect(BatchService.startBatch).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    const errorAlert = screen.getByTestId("alert-text");
    expect(errorAlert.textContent).toEqual(
      "Estimate Quantity Shouldn't higher than Available Quantity"
    );
  });
});
