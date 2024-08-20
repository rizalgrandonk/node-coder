import db from "../db";
import { Batch } from "../types/data";

export const getBatchByBatchNoAndProductId = async (
  batchNo: string,
  productId: number
) => {
  const query = `SELECT * FROM batch WHERE batchno = $1 and productid = $2 and isactive = true`;
  const result = await db.query<Batch>(query, [batchNo, productId]);
  if (result.rowCount === 0) return null;
  return result.rows[0];
};

export const createBatch = async (data: {
  batchno: string;
  qty: number;
  productid: number;
  userId: number;
}) => {
  const { batchno, qty, productid, userId } = data;
  const query = `
    INSERT INTO batch
    (batchno, qty, productid, created, updated, isactive, createdby, updatedby)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const result = await db.query<Batch>(query, [
    batchno,
    qty,
    productid,
    new Date(),
    new Date(),
    true,
    userId,
    userId,
  ]);
  if (result.rowCount === 0) return null;
  return result.rows[0];
};
