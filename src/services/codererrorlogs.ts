import db from "../db";

type CodeErrorLogType = {
  errormessage: string;
  errorTimestamp: Date;
  batchno: string;
  sendconfirmed: Date;
  batchid: number;
  markingprinterid: number;
};

export const insertSerialUniquecode = async (params: CodeErrorLogType) => {
  const {
    markingprinterid = 9999,
    batchid = 328,
    batchno = "BATCH-1",
    sendconfirmed = new Date(),
    errormessage,
    errorTimestamp,
  } = params;

  const created = new Date();

  const query = `
    INSERT INTO codererrorlog
    (errormessage, errorTimestamp, batchno, sendconfirmed, batchid, markingprinterid, created)
    VALUES (
      $1, $2, $3, $4, $5, $6, $7)
  `;

  const result = await db.query(query, [
    errormessage,
    errorTimestamp,
    batchno,
    sendconfirmed,
    batchid,
    markingprinterid,
    created,
  ]);

  return result.rowCount;
};
