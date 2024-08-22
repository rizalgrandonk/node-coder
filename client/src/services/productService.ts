import fetchRequest from "@/utils/fetch";
import type { Product } from "@/types/product";

export const getByBarcode = async (barcode: string) => {
  const path = `/products/${barcode}`;
  const method = "GET";
  const response = await fetchRequest<Product>(path, {
    method,
  });
  return response;
};
