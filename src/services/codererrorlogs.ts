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

export const insertErrorLog = async (params: CodeErrorLogType) => {
  const {
    markingprinterid = 9999,
    batchid = 328,
    batchno = "BATCH-1",
    sendconfirmed = new Date(),
    errormessage,
    errorTimestamp,
    created = new Date(),
  } = params;

  const query = `
    INSERT INTO codererrorlog
    (errormessage, errorTimestamp, batchno, sendconfirmed, batchid, markingprinterid, created)
    VALUES (
      $1, $2, $3, $4, $5, $6, $7)
  `;

  console.log("insertErrorLog", { query });
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
