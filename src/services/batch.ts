import db from "../db";
import { Batch } from "../types/data";

/**
 * Retrieves a batch by batch number and product ID.
 *
 * @param {string} batchNo - The batch number to search for.
 * @param {number} productId - The product ID to filter by.
 * @return {Batch|null} The batch object if found, otherwise null.
 */
export const getBatchByBatchNoAndProductId = async (batchNo: string, productId: number) => {
  const query = `SELECT * FROM batch WHERE batchno = $1 and productid = $2 and isactive = true`;
  const result = await db.query<Batch>(query, [batchNo, productId]);
  if (result.rowCount === 0) return null;
  return result.rows[0];
};

/**
 * Creates a new batch in the database with the provided data.
 *
 * @param {Object} data - An object containing the batch number, quantity, product ID, and user ID.
 * @param {string} data.batchno - The batch number.
 * @param {number} data.qty - The quantity of the batch.
 * @param {number} data.productid - The ID of the product.
 * @param {number} data.userId - The ID of the user creating the batch.
 * @return {Promise<Batch | null>} A Promise that resolves to the newly created batch, or null if the batch was not created.
 */
export const createBatch = async (data: { batchno: string; qty: number; productid: number; userId: number }) => {
  const { batchno, qty, productid, userId } = data;
  const query = `
    INSERT INTO batch
    (batchno, qty, productid, created, updated, isactive, createdby, updatedby)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const result = await db.query<Batch>(query, [batchno, qty, productid, new Date(), new Date(), true, userId, userId]);
  if (result.rowCount === 0) return null;
  return result.rows[0];
};

/**
 * Retrieves a batch by its ID.
 *
 * @param {number} id - The ID of the batch to retrieve.
 * @return {Batch|null} The batch object if found, otherwise null.
 */
export const findById = async (id: number) => {
  const query = `SELECT * FROM batch WHERE id = $1 limit 1`;
  const result = await db.query<Batch>(query, [id]);
  if (result.rowCount === 0) return null;
  return result.rows[0];
};

/**
 * Updates a batch in the database with the provided data.
 *
 * @param {Object} data - An object containing the batch ID, block code count, printed quantity, trigger count, good read count, no read count, match count, mismatch count, updated date, updated by, and user ID.
 * @param {number} data.id - The ID of the batch to update.
 * @param {number} data.blockcodecount - The block code count of the batch.
 * @param {number} data.printedqty - The printed quantity of the batch.
 * @param {number} data.triggercount - The trigger count of the batch.
 * @param {number} data.goodreadcount - The good read count of the batch.
 * @param {number} data.noreadcount - The no read count of the batch.
 * @param {number} data.matchcount - The match count of the batch.
 * @param {number} data.mismatchcount - The mismatch count of the batch.
 * @param {Date} data.updated - The updated date of the batch.
 * @param {number} data.updatedby - The ID of the user who updated the batch.
 * @param {number} data.userId - The ID of the user who owns the batch.
 * @return {Batch|null} The updated batch object if found, otherwise null.
 */
export const updateBatch = async (data: {
  id: number;
  blockcodecount: number;
  printedqty: number;
  triggercount: number;
  goodreadcount: number;
  noreadcount: number;
  matchcount: number;
  mismatchcount: number;
  updated: Date;
  updatedby: number;
  userId: number;
}) => {
  const { id, blockcodecount, printedqty, triggercount, goodreadcount, noreadcount, matchcount, mismatchcount, updated, updatedby } = data;
  const query = `
    UPDATE batch
    SET blockcodecount = $1, printedqty = $2, triggercount = $3, goodreadcount = $4, noreadcount = $5, matchcount = $6, mismatchcount = $7, updated = $8, updatedby = $9
    WHERE id = $10
    RETURNING *
  `;
  const result = await db.query<Batch>(query, [
    blockcodecount,
    printedqty,
    triggercount,
    goodreadcount,
    noreadcount,
    matchcount,
    mismatchcount,
    updated,
    updatedby,
    id,
  ]);
  if (result.rowCount === 0) return null;
  return result.rows[0];
};
