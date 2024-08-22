import { useState } from "react";
import * as ProductService from "@/services/productService";
// import { sleep } from "@/utils/helper";
export const usePrintFormModal = () => {
  const [showProductModal, setShowProductModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getProductByBarcode = async (barcode: string) => {
    console.log("getProductByBarcode", barcode);
    setIsLoading(true);
    // await sleep(1000);

    const response = await ProductService.getByBarcode(barcode);
    console.log(response);
    if (!response.success) {
      setError(response.message ?? "Failed to get product data");
      setIsLoading(false);
      return null;
    }

    setError(null);
    setIsLoading(false);
    return response.data;
  };

  const clearError = () => {
    setError(null);
  };

  return {
    showProductModal,
    setShowProductModal,
    getProductByBarcode,
    isLoading,
    error,
    clearError,
  };
};
