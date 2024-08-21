import db from "../db";

export const createUserActivity = async (data: {
  actiontype: string;
  timestamp?: Date;
  ip?: string;
  browser?: string;
  markingprinterid?: number;
  userid: number;
}) => {
  const { actiontype, userid, timestamp = new Date(), ip = null, browser = null, markingprinterid = 9999 } = data;
  const query = `
    INSERT INTO useractivity
    (actiontype, userid, created, ip, browser, markingprinterid)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await db.query(query, [actiontype, userid, timestamp, ip, browser, markingprinterid]);
  if (result.rowCount === 0) return null;
  return result.rows[0];
};
