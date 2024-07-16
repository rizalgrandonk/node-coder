import prisma from "../db";

export const insertSerialUniquecode = async (
  uniquecode: string,
  timestamp: Date
) => {
  const result = await prisma.codererrorlog.create({
    data: {
      batchno: uniquecode,
      errormessage: uniquecode,
      created: timestamp,
    },
  });

  return result;
};
