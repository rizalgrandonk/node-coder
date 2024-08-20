import { startBatch } from "../batch";
import {
  createBatch,
  getBatchByBatchNoAndProductId,
} from "../../services/batch";
import { createUserActivity } from "../../services/useractivity";
import { getProductById } from "../../services/product";
import { getAvailableUniquecodes } from "../../services/uniquecodes";
import { ApiError } from "../../utils/apiError";
import { z } from "zod";
import { zodErrorMap } from "../../utils/zod";

// Mock the external services
jest.mock("../../services/batch", () => ({
  createBatch: jest.fn(),
  getBatchByBatchNoAndProductId: jest.fn(),
}));

jest.mock("../../services/useractivity", () => ({
  createUserActivity: jest.fn(),
}));

jest.mock("../../services/product", () => ({
  getProductById: jest.fn(),
}));

jest.mock("../../services/uniquecodes", () => ({
  getAvailableUniquecodes: jest.fn(),
}));

z.setErrorMap(zodErrorMap);

describe("Start Batch", () => {
  const userId = 1;
  const validBatch = {
    batchNo: "12345",
    barcode: "67890",
    printEstimate: 10,
    productId: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw a validation error if input is invalid", async () => {
    const invalidBatch = { ...validBatch, batchNo: "" };

    await expect(
      startBatch({ batchs: [invalidBatch] }, { userId })
    ).rejects.toThrow(ApiError);
    await expect(
      startBatch({ batchs: [invalidBatch] }, { userId })
    ).rejects.toThrow("Invalid Parameter (batchs.0.batchNo)");
  });

  it("should return existing batch if it already exists and create user activity", async () => {
    const existingBatch = { id: 1 };
    (getBatchByBatchNoAndProductId as jest.Mock).mockResolvedValue(
      existingBatch
    );

    const result = await startBatch(
      { batchs: [validBatch] },
      { userId, requestIP: "127.0.0.1", userAgent: "Chrome" }
    );

    expect(result).toBe(existingBatch);
    expect(getBatchByBatchNoAndProductId).toHaveBeenCalledWith("12345", 2);
    expect(createBatch).not.toHaveBeenCalled();
    expect(createUserActivity).toHaveBeenCalledWith({
      actiontype: "START BATCH",
      userid: userId,
      ip: "127.0.0.1",
      browser: "Chrome",
    });
  });

  it("should throw an error if product is not found", async () => {
    (getBatchByBatchNoAndProductId as jest.Mock).mockResolvedValue(null);
    (getProductById as jest.Mock).mockResolvedValue(null);

    await expect(
      startBatch({ batchs: [validBatch] }, { userId })
    ).rejects.toThrow("Product not found");
  });

  it("should throw an error if available quantity is less than estimate", async () => {
    (getBatchByBatchNoAndProductId as jest.Mock).mockResolvedValue(null);
    (getProductById as jest.Mock).mockResolvedValue({ id: 2 });
    (getAvailableUniquecodes as jest.Mock).mockResolvedValue(5);

    await expect(
      startBatch({ batchs: [validBatch] }, { userId })
    ).rejects.toThrow(
      "Estimate Quantity Shouldn't higher than Available Quantity(5)"
    );
  });

  it("should create a new batch if conditions are met and create user activity", async () => {
    const newBatch = { id: 1 };
    (getBatchByBatchNoAndProductId as jest.Mock).mockResolvedValue(null);
    (getProductById as jest.Mock).mockResolvedValue({ id: 2 });
    (getAvailableUniquecodes as jest.Mock).mockResolvedValue(10);
    (createBatch as jest.Mock).mockResolvedValue(newBatch);

    const result = await startBatch(
      { batchs: [validBatch] },
      { userId, requestIP: "127.0.0.1", userAgent: "Chrome" }
    );

    expect(result).toBe(newBatch);
    expect(createBatch).toHaveBeenCalledWith({
      batchno: "12345",
      productid: 2,
      qty: 10,
      userId,
    });
    expect(createUserActivity).toHaveBeenCalledWith({
      actiontype: "START BATCH",
      userid: userId,
      ip: "127.0.0.1",
      browser: "Chrome",
    });
  });

  it("should throw an error if batch creation fails", async () => {
    (getBatchByBatchNoAndProductId as jest.Mock).mockResolvedValue(null);
    (getProductById as jest.Mock).mockResolvedValue({ id: 2 });
    (getAvailableUniquecodes as jest.Mock).mockResolvedValue(10);
    (createBatch as jest.Mock).mockResolvedValue(null);

    await expect(
      startBatch({ batchs: [validBatch] }, { userId })
    ).rejects.toThrow("Failed to create batch");
  });
});
