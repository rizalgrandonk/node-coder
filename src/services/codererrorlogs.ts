import db from "../db";

export const insertSerialUniquecode = async (
  uniquecode: string,
  timestamp: Date
) => {
  const query = `
    INSERT INTO codererrorlog
    (batchno, created, errormessage) 
    VALUES ($1, $2, $3)
  `;

  const result = await db.query(query, [uniquecode, timestamp, uniquecode]);

  return result.rowCount;
};
