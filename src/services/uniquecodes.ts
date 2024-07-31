import db from "../db";

export const getUniquecodes = async (limit: number = 250) => {
  const buffered = new Date();
  const printerlineid = 9999;
  const markingprinterid = 9999;
  const productid = 1000005;
  const batchid = 328;

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
    RETURNING *;
  `;

  const result = await db.query(query, [
    limit,
    buffered,
    printerlineid,
    markingprinterid,
    productid,
    batchid,
  ]);

  if (!result) {
    return undefined;
  }

  return result.rows;
};

export const setBulkPrintedStatus = async (
  uniquecodes: string[],
  timestamp: Date
) => {
  const coderstatus = "COK";
  const query = `
    UPDATE uniquecode
    SET coderstatus=$1, printed=$2
    WHERE uniquecode = ANY($3::text[])
  `;

  const result = await db.query(query, [coderstatus, timestamp, uniquecodes]);

  return result.rowCount;
};
