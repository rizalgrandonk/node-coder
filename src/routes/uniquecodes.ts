import express from "express";
import prisma from "../db";

const uniquecodeRoutes = express.Router();

uniquecodeRoutes.get("/", async (req, res) => {
  const limit = +(req.query.limit?.toString() ?? 10);
  try {
    const uniquecodes = await prisma.uniquecode.findMany({
      orderBy: {
        id: "asc",
      },
      take: limit,
      include: {
        product: true,
      },
    });
    return res.status(200).send(uniquecodes);
  } catch (error: any) {
    if (error.message) {
      return res.status(400).send({ message: error.message });
    }
    return res.status(400).send(error);
  }
});

export default uniquecodeRoutes;
