import PrintFormPage from "@/pages/print-form/PrintFormPage";
import { screen, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import * as BatchService from "@/services/batchService";
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
    vi.spyOn(BatchService, "startBatch").mockResolvedValue({ success: true });
    vi.spyOn(BatchService, "stopBatch").mockResolvedValue({ success: true });
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

    await userEvent.click(scanProductButtons);
    await userEvent.click(startBatchButtons);

    expect(BatchService.startBatch).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalled();
  });

  it("should handle Get Uniquecode Count button click", () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const getUniqueCodeCountButtons = screen.getByTestId("availableUniquecodeCount-button");
    userEvent.click(getUniqueCodeCountButtons);
    expect(getUniqueCodeCountButtons).toBeTruthy();
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

    const batchNoInputErrorMessage = screen.getByTestId("batchNo-0-inputErrorMessage");
    expect(batchNoInputErrorMessage.textContent).toEqual("Only uppercase alphanumeric characters, dashes (-), and slashes (/) are allowed.");
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

    const batchNoInputErrorMessage = screen.getByTestId("batchNo-0-inputErrorMessage");
    expect(batchNoInputErrorMessage.textContent).toEqual("Only uppercase alphanumeric characters, dashes (-), and slashes (/) are allowed.");
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

    const batchNoInputErrorMessage = screen.getByTestId("batchNo-0-inputErrorMessage");
    expect(batchNoInputErrorMessage.textContent).toEqual("String must contain at most 255 character(s)");
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

    const batchNoInputErrorMessage = screen.getByTestId("batchNo-0-inputErrorMessage");
    expect(batchNoInputErrorMessage.textContent).toEqual("Batch Number is Required");
  });

  it("should display error when Submit Batch without Input Product", async () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const startBatchButtons = screen.getByTestId("startBatch-button");
    await userEvent.click(startBatchButtons);

    const productInputErrorMessage = screen.getByTestId("productName-0-inputErrorMessage");
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

    const printEstimateInputErrorMessage = screen.getByTestId("printEstimate-0-inputErrorMessage");
    expect(printEstimateInputErrorMessage.textContent).toEqual("Estimate Quantity is Required and should be numeric and not containing symbol");
  });

  it("should display error when Estimate Quantity More Than Available Quantity", async () => {
    vi.spyOn(BatchService, "startBatch").mockResolvedValue({ success: false, message: "Estimate Quantity Shouldn't higher than Available Quantity" });
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
    await userEvent.click(startBatchButtons);

    expect(BatchService.startBatch).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    const errorAlert = screen.getByTestId("alert-text");
    expect(errorAlert.textContent).toEqual("Estimate Quantity Shouldn't higher than Available Quantity");
  });
});
