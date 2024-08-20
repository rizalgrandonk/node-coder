import PrintFormPage from "@/pages/print-form/PrintFormPage";
import { screen, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import * as BatchService from "@/services/batchService";
import { usePrintData } from "@/context/print";
// import { useNavigate } from "react-router-dom";

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
// vi.mock("react-hook-form", async () => ({
//   ...(await vi.importActual("react-hook-form")),
//   Controller: () => <></>,
//   useForm: () => ({
//     control: () => ({}),
//     handleSubmit: () => jest.fn(),
//     formState: {},
//   }),
// }));

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
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("should handle Get Uniquecode Count button click", () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );

    const getUniqueCodeCountButtons = screen.getByTestId(
      "availableUniquecodeCount-button"
    );
    userEvent.click(getUniqueCodeCountButtons);
    expect(getUniqueCodeCountButtons).toBeTruthy();
  });

  it("should display error when Input BatchNo with Space", () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );
  });

  it("should display error when Input BatchNo With Symbol Except Dash (-) & Slash (/)", () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );
  });

  it("should display error when Insert BatchNo with Lowercase", () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );
  });

  it("should display error when Insert BatchNo More Than 255 Characters", () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );
  });

  it("should display error when Submit Batch without Input BatchNo", () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );
  });

  it("should display error when Submit Batch without Input Product", () => {
    render(
      <MemoryRouter>
        <PrintFormPage />
      </MemoryRouter>
    );
  });
});
