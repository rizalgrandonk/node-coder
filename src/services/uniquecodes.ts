import db from "../db";
import { UniqueCode } from "../types/data";

/**
 * Retrieves a limited number of unique codes from the database that are not yet buffered, printed, or coded.
 *
 * @param {Object} data - An object containing the following properties:
 *   @param {number} limit - The maximum number of unique codes to retrieve. Defaults to 254.
 *   @param {number} productid - The ID of the product associated with the unique codes.
 *   @param {number} batchid - The ID of the batch associated with the unique codes.
 *   @param {number} [markingprinterid] - The ID of the marking printer associated with the unique codes. Defaults to 9999.
 *   @param {number} [printerlineid] - The ID of the printer line associated with the unique codes. Defaults to 9999.
 * @return {Promise<UniqueCode[] | undefined>} An array of unique codes sorted by id in ascending order, or undefined if no unique codes were retrieved.
 */
export const getUniquecodes = async (data: { limit: number; productid: number; batchid: number; markingprinterid?: number; printerlineid?: number }) => {
  const { limit = 254, productid, batchid, printerlineid = 9999, markingprinterid = 9999 } = data;
  const buffered = new Date();
  // const productid = 1000005;
  // const batchid = 328;

  const query = `
    WITH sub AS (
      SELECT *
      FROM "uniquecode"
      WHERE "buffered" IS NULL
        AND "printed" IS NULL
        AND "coderstatus" IS NULL
        AND pg_try_advisory_xact_lock("id")
      ORDER BY "id"
      LIMIT $1
      FOR UPDATE
    )
    UPDATE "uniquecode" m
    SET 
      "buffered" = $2,
      "printerlineid" = $3,
      "markingprinterid" = $4,
      "productid" = $5,
      "batchid" = $6
    FROM sub
    WHERE m."id" = sub."id"
    RETURNING m."id", m."uniquecode";
  `;

  const result = await db.query<UniqueCode>(query, [limit, buffered, printerlineid, markingprinterid, productid, batchid]);

  if (!result) {
    return undefined;
  }

  // return result.rows;

  // return sorted data by id asc
  return result.rows.sort((a, b) => a.id - b.id);
};

/**
 * Resets the status of multiple unique codes in bulk.
 *
 * @param {number[]} uniquecodeIds - An array of unique code IDs to reset.
 * @return {number} The number of rows affected by the update.
 */
export const resetBulkBuffered = async (uniquecodeIds: number[]) => {
  const query = `
    UPDATE uniquecode
    SET printed=null, productid=null, 
    batchid=null, buffered=null, 
    sendconfirmed=null, coderstatus=null, 
    printerlineid=null, markingprinterid=null
    WHERE id=ANY($1::integer[])
  `;

  const result = await db.query(query, [uniquecodeIds]);

  return result.rowCount;
};

/**
 * Updates the printed status of multiple unique codes in bulk.
 *
 * @param {number[]} uniquecodeIds - An array of unique code IDs to update.
 * @param {Date} timestamp - The timestamp to set as the printed date.
 * @return {number} The number of rows updated.
 */
export const setBulkPrintedStatus = async (uniquecodeIds: number[], timestamp: Date) => {
  const coderstatus = "COK";
  const query = `
    UPDATE uniquecode
    SET coderstatus=$1, printed=$2
    WHERE id = ANY($3::integer[])
  `;

  const result = await db.query(query, [coderstatus, timestamp, uniquecodeIds]);

  return result.rowCount;
};

/**
 * Updates the UNE status of multiple unique codes in bulk.
 *
 * @param {number[]} uniquecodeIds - An array of unique code IDs to update.
 * @param {Date} timestamp - The timestamp to set as the printed date.
 * @return {number} The number of rows updated.
 */
export const setBulkUNEStatus = async (uniquecodeIds: number[], timestamp: Date) => {
  const coderstatus = "UNE";
  const query = `
    UPDATE uniquecode
    SET coderstatus=$1, printed=$2
    WHERE id = ANY($3::integer[])
  `;

  const result = await db.query(query, [coderstatus, timestamp, uniquecodeIds]);

  return result.rowCount;
};

/**
 * Retrieves the count of available unique codes in the database.
 *
 * @return {number} The number of available unique codes.
 */
export const getAvailableUniquecodes = async () => {
  const query = `SELECT COUNT(*) as count FROM uniquecode 
  WHERE "buffered" IS NULL
  AND "printed" IS NULL
  AND "coderstatus" IS NULL
  AND isactive = true`;
  const result = await db.query<{ count: number }>(query);
  return result.rows?.[0]?.count;
};
