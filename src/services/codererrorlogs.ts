import db from "../db";

type CodeErrorLogType = {
  batchno: string;
  batchid: number;
  markingprinterid: number;
  errormessage: string;
  errorTimestamp?: Date;
  sendconfirmed?: Date;
  created?: Date;
};

/**
 * Inserts an error log into the database.
 *
 * @param {CodeErrorLogType} params - The error log details to be inserted.
 * @return {number} The number of rows affected by the insert operation.
 */
export const insertErrorLog = async (params: CodeErrorLogType) => {
  const {
    markingprinterid = 9999,
    batchid = 328,
    batchno = "BATCH-1",
    sendconfirmed = new Date(),
    errormessage: error,
    errorTimestamp,
    created = new Date(),
  } = params;

  const errorSplit = error.split(":");
  const errormessage = errorSplit.length === 0 ? errorSplit[0] : errorSplit[1];
  const query = `
    INSERT INTO codererrorlog
    (errormessage, errorTimestamp, batchno, sendconfirmed, batchid, markingprinterid, created)
    VALUES (
      $1, $2, $3, $4, $5, $6, $7)
  `;

  const result = await db.query(query, [errormessage, errorTimestamp, batchno, sendconfirmed, batchid, markingprinterid, created]);

  return result.rowCount;
};
