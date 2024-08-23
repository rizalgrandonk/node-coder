import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalLookupProduct from "../components/ModalLookupProduct";
import * as ProductService from "@/services/productService";
import { sleep } from "@/utils/helper";

describe("ModalLookupProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(ProductService, "getByBarcode").mockImplementation(async () => {
      return {
        success: true,
        data: { id: 1, name: "TEST", upc: "Barcode" },
      } as any;
    });
  });

  it("should render all element of ModalLookupProduct", async () => {
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();

    render(
      <ModalLookupProduct
        showModal={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    const modalTitle = screen.getByText("SCAN PRODUCT");
    const barcodeInput = screen.getByLabelText("BARCODE");
    const closeButton = screen.getByRole("button", { name: /Close/i });
    const submitButton = screen.getByTestId("submitModalLookupProduct-button");

    expect(modalTitle).toBeInTheDocument();
    expect(barcodeInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
    expect(closeButton).toBeInTheDocument();

    await userEvent.click(closeButton);
    expect(mockOnClose).toBeCalled();

    await userEvent.click(submitButton);
    expect(mockOnSubmit).toBeCalled();
  });

  it("should successfully submit Product when submit button clicked", async () => {
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();

    render(
      <ModalLookupProduct
        showModal={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const barcodeInput = screen.getByLabelText("BARCODE");
    const modalLookupSubmitButton = screen.getByTestId(
      "submitModalLookupProduct-button"
    );

    await userEvent.type(barcodeInput, "100");
    await userEvent.click(modalLookupSubmitButton);

    expect(mockOnSubmit).toBeCalledWith({
      id: 1,
      name: "TEST",
      upc: "Barcode",
    });
  });

  it("should display Full Page Loading when fetching Product Data", async () => {
    vi.spyOn(ProductService, "getByBarcode").mockImplementation(async () => {
      await sleep(100);
      return {
        success: true,
        data: { id: 1, name: "TEST", upc: "Barcode" },
      } as any;
    });
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();

    render(
      <ModalLookupProduct
        showModal={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const barcodeInput = screen.getByLabelText("BARCODE");
    const modalLookupSubmitButton = screen.getByTestId(
      "submitModalLookupProduct-button"
    );

    await userEvent.type(barcodeInput, "100");
    await userEvent.click(modalLookupSubmitButton);

    const fullPageLoading = screen.getByTestId("full-page-loading");
    expect(fullPageLoading).toBeInTheDocument();

    await waitFor(() => expect(fullPageLoading).not.toBeInTheDocument());

    expect(mockOnSubmit).toBeCalledWith({
      id: 1,
      name: "TEST",
      upc: "Barcode",
    });
  });

  it("should display Alert Banner when failed fetching Product Data", async () => {
    vi.spyOn(ProductService, "getByBarcode").mockImplementation(async () => {
      return {
        success: false,
        message: "Product Not Found",
      } as any;
    });

    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();

    render(
      <ModalLookupProduct
        showModal={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const barcodeInput = screen.getByLabelText("BARCODE");
    const modalLookupSubmitButton = screen.getByTestId(
      "submitModalLookupProduct-button"
    );

    await userEvent.type(barcodeInput, "100");
    await userEvent.click(modalLookupSubmitButton);

    const alertErrorBanner = screen.getByTestId("alert");
    expect(alertErrorBanner).toBeInTheDocument();
    expect(alertErrorBanner).toHaveTextContent("Product Not Found");

    // Close Banner
    const alertErrorBannerCloseButton =
      screen.getByTestId("alert-close-button");

    await userEvent.click(alertErrorBannerCloseButton);

    expect(alertErrorBanner).not.toBeInTheDocument();
  });
});
