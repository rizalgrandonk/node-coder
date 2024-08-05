import db from "../db";

type ErrorCode = {
  errorcode: string;
  errorname: string;
  description: string | null;
};

export const findByCode = async (code: string): Promise<ErrorCode[]> => {
  const result = await db.query(
    `SELECT * FROM errorcode WHERE errorcode = $1`,
    [code]
  );
  return result.rows;
};

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
