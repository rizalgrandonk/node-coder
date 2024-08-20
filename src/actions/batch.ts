import { z } from "zod";
import { createBatch, getBatchByBatchNoAndProductId } from "../services/batch";
import { createUserActivity } from "../services/useractivity";
import { getProductById } from "../services/product";
import { getAvailableUniquecodes } from "../services/uniquecodes";
import { ApiError } from "../utils/apiError";

const startBatchSchema = z.object({
  batchs: z
    .object({
      batchNo: z.string().min(1),
      barcode: z.string().min(1),
      printEstimate: z.number().gt(0),
      productId: z.number(),
    })
    .array()
    .min(1),
});

export const startBatch = async (
  body: any,
  data: { userId: number; requestIP?: string; userAgent?: string }
) => {
  const { userId, requestIP, userAgent } = data;

  const validate = startBatchSchema.safeParse(body);

  if (!validate.success) {
    const error = validate.error.errors[0];
    throw new ApiError(400, error.message);
  }

  // ? Only handle single batch for now
  const { barcode, batchNo, printEstimate, productId } =
    validate.data.batchs[0];

  const batch = await findOrCreateBatch({
    batchNo,
    barcode,
    printEstimate,
    productId,
    userId,
  });

  // ? Save record printer action
  await createUserActivity({
    actiontype: "START BATCH",
    userid: userId,
    ip: requestIP,
    browser: userAgent,
  });

  return batch;
};

const findOrCreateBatch = async (data: {
  batchNo: string;
  barcode: string;
  printEstimate: number;
  productId: number;
  userId: number;
}) => {
  const { barcode, batchNo, printEstimate, productId, userId } = data;

  // ? Check existing batch and return it if exist
  const existingBatch = await getBatchByBatchNoAndProductId(batchNo, productId);
  if (!!existingBatch) {
    return existingBatch;
  }

  // ? Check if product existed
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(400, "Product not found");
  }

  // ? Get available quantity
  const availableQuantity = await getAvailableUniquecodes();
  if (!availableQuantity) {
    throw new ApiError(400, "Failed to get available quantity");
  }
  // ? throw error if estimate is higher than available quantity
  if (availableQuantity < printEstimate) {
    throw new ApiError(
      400,
      `Estimate Quantity Shouldn't higher than Available Quantity(${availableQuantity})`
    );
  }

  // ? Create new batch
  const newBatch = await createBatch({
    batchno: batchNo,
    productid: productId,
    qty: printEstimate,
    userId,
  });

  if (!newBatch) {
    throw new ApiError(400, "Failed to create batch");
  }

  return newBatch;
};
