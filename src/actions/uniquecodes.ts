import type { uniquecode } from "@prisma/client";
import prisma from "../db";

export const getUniquecodes = async (limit: number = 250) => {
  const buffered = new Date();
  const printerlineid = 9999;
  const markingprinterid = 9999;
  const productid = 1000005;
  const batchid = 328;

  const result = await prisma.$queryRaw`
    WITH sub AS (
      SELECT *
      FROM "uniquecode"
      WHERE "buffered" IS NULL
        AND "printed" IS NULL
        AND "coderstatus" IS NULL
        AND pg_try_advisory_xact_lock("id")
      ORDER BY "id"
      LIMIT ${limit}
      FOR UPDATE
    )
    UPDATE "uniquecode" m
    SET 
      "buffered" = ${buffered},
      "printerlineid" = ${printerlineid},
      "markingprinterid" = ${markingprinterid},
      "productid" = ${productid},
      "batchid" = ${batchid}
    FROM sub
    WHERE m."id" = sub."id"
    RETURNING *;
  `;

  if (!result) {
    return undefined;
  }

  return result as uniquecode[];
};

export const updateSerialUniquecode = async (
  uniquecode: string,
  timestamp: Date
) => {
  const result = await prisma.$executeRaw`
    UPDATE uniquecode
    SET coderstatus='COK', sendconfirmed=${timestamp}
    WHERE uniquecode=${uniquecode}
  `;

  return result;
};

export const updateSocketUniquecodes = async (
  uniquecodes: string[],
  timestamp: Date
) => {
  const result = await prisma.uniquecode.updateMany({
    where: {
      uniquecode: {
        in: uniquecodes,
      },
    },
    data: {
      coderstatus: "COK",
      printed: timestamp,
    },
  });

  console.log({ result });
  return result;
};
