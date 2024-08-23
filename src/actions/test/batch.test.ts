import { startBatch, endBatch } from "../batch";
import {
  createBatch,
  findById,
  getBatchByBatchNoAndProductId,
  updateBatch,
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
  updateBatch: jest.fn(),
  findById: jest.fn(),
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

const userId = 1;
describe("Start Batch", () => {
  const validBatch = {
    batchNo: "12345",
    barcode: "67890",
    printEstimate: 10,
    productId: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getAvailableUniquecodes as jest.Mock).mockResolvedValue(1000);
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
    (getProductById as jest.Mock).mockResolvedValue({ id: 10 });

    const result = await startBatch(
      { batchs: [validBatch] },
      { userId, requestIP: "127.0.0.1", userAgent: "Chrome" }
    );

    expect(result).toEqual({ ...existingBatch, product: { id: 10 } });
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

    expect(result).toEqual({ ...newBatch, product: { id: 2 } });
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

describe("Stop Batch", () => {
  // Define a valid batch object for use in tests
  const validBatch = {
    id: 2055,
    userId: 1000000,
    blockcodecount: 1,
    printedqty: 0,
    triggercount: 0,
    goodreadcount: 0,
    noreadcount: 0,
    matchcount: 0,
    mismatchcount: 10,
    updated: new Date("2024-08-21T10:30:12.639Z"),
    updatedby: 1000000,
    isactive: true,
  };

  beforeEach(() => {
    // Clear all mocks before each test to prevent state leakage between tests
    jest.clearAllMocks();

    // Mock the updateBatch function to always resolve with a valid batch object
    (updateBatch as jest.Mock).mockResolvedValue(validBatch);

    // Mock the findById function to always resolve with a valid batch object
    (findById as jest.Mock).mockResolvedValue(validBatch);
  });

  it("should update batch successfully", async () => {
    // Call endBatch with a valid batch and expect it to return the same batch
    const result = await endBatch({ batchs: [validBatch] });
    expect(result).toEqual(validBatch);
  });

  it("should throw a validation error if required fields are missing", async () => {
    // Create an invalid batch object with a missing 'id' field
    const invalidBatch = { ...validBatch, id: undefined };
    await expect(endBatch({ batchs: [invalidBatch] })).rejects.toThrow(
      ApiError
    );
    await expect(endBatch({ batchs: [invalidBatch] })).rejects.toThrow(
      "Empty Mandatory Parameter (batchs.0.id)"
    );
  });

  it("should throw an error if batch is not found", async () => {
    // Mock the findById function to return undefined, simulating a "not found" scenario
    (findById as jest.Mock).mockResolvedValue(undefined);

    // Call endBatch with a valid batch and expect it to throw an ApiError with a specific message
    await expect(endBatch({ batchs: [validBatch] })).rejects.toThrow(ApiError);
    await expect(endBatch({ batchs: [validBatch] })).rejects.toThrow(
      "Batch not found"
    );
  });

  it("should throw an error if batch is not active", async () => {
    (findById as jest.Mock).mockResolvedValue({
      ...validBatch,
      isactive: false,
    });
    await expect(endBatch({ batchs: [validBatch] })).rejects.toThrow(ApiError);
    await expect(endBatch({ batchs: [validBatch] })).rejects.toThrow(
      "Batch is not active"
    );
  });

  it("should throw an error if update batch fails", async () => {
    // Mock the updateBatch function to return undefined, simulating a failure to update
    (updateBatch as jest.Mock).mockResolvedValue(undefined);

    // Call endBatch with a valid batch and expect it to throw an ApiError with a specific message
    await expect(endBatch({ batchs: [validBatch] })).rejects.toThrow(ApiError);
    await expect(endBatch({ batchs: [validBatch] })).rejects.toThrow(
      "Failed to update batch"
    );
  });
});
