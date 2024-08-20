import { Batch } from "@/types/batch";
import fetchRequest from "@/utils/fetch";

type CreateBatchRequest = {
  batchs: {
    batchNo: string;
    barcode: string;
    printEstimate: number;
    productId: number;
  }[];
};

export const startBatch = async (data: CreateBatchRequest) => {
  const path = "/batch/start";
  const method = "POST";
  const response = await fetchRequest<Batch>(path, {
    method,
    body: JSON.stringify(data),
  });
  return response;
};

export const stopBatch = async () => {
  const path = "/batch/stop";
  const method = "POST";
  const response = await fetchRequest<Batch>(path, {
    method,
  });
  return response;
};
