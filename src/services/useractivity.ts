import db from "../db";

/**
 * Creates a new user activity record in the database.
 *
 * @param {object} data - An object containing the user activity data.
 * @param {string} data.actiontype - The type of action performed by the user.
 * @param {number} data.userid - The ID of the user who performed the action.
 * @param {Date} [data.timestamp] - The timestamp of the action (defaults to the current date and time).
 * @param {string} [data.ip] - The IP address of the user (defaults to null).
 * @param {string} [data.browser] - The browser used by the user (defaults to null).
 * @param {number} [data.markingprinterid] - The ID of the marking printer (defaults to 9999).
 * @return {object|null} The newly created user activity record, or null if the record was not created.
 */
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
