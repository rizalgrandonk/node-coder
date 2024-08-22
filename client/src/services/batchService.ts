import { Batch } from "@/types/batch";
import fetchRequest from "@/utils/fetch";

type StartBatchRequest = {
  batchs: {
    batchNo: string;
    barcode: string;
    printEstimate: number;
    productId: number;
    productName: string;
  }[];
};

export const startBatch = async (data: StartBatchRequest) => {
  const path = "/batch/start";
  const method = "POST";
  const response = await fetchRequest<Batch>(path, {
    method,
    body: JSON.stringify(data),
  });
  return response;
};

export const stopBatch = async (ids: number) => {
  const path = "/batch/stop";
  const method = "POST";
  const response = await fetchRequest<Batch>(path, {
    method,
    body: JSON.stringify({ batchs: [ids] }),
  });
  return response;
};
