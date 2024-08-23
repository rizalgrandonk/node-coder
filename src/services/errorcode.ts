import db from "../db";

type ErrorCode = {
  errorcode: string;
  errorname: string;
  description: string | null;
};

/**
 * Retrieves error codes from the database by a specific error code.
 *
 * @param {string} code - The error code to search for.
 * @return {ErrorCode[]} An array of error codes matching the search criteria.
 */
export const findByCode = async (code: string): Promise<ErrorCode[]> => {
  const result = await db.query(`SELECT * FROM errorcode WHERE errorcode = $1`, [code]);
  return result.rows;
};

/**
 * Returns a list of skipable error codes.
 *
 * @return {Array} A list of objects containing error codes, names, and descriptions.
 */
export const skipableError = () => {
  return [
    {
      errorcode: "151045945",
      errorname: "JETvisio Trigger Error. Double Trigger on JETvisio",
      description: null,
    },
    {
      errorcode: "151045953",
      errorname: "JETvisio Trigger Error. Double Trigger on JETvisio",
      description: null,
    },
    {
      errorcode: "1476405210",
      errorname: "Battery Low",
      description: null,
    },
  ];
};
