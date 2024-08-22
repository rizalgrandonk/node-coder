import express from "express";
import db from "../db";
import { getAvailableUniquecodes } from "../services/uniquecodes";
const uniquecodeRoutes = express.Router();

uniquecodeRoutes.get("/", async (req, res) => {
  const limit = +(req.query.limit?.toString() ?? 10);
  try {
    // const uniquecodes = await prisma.uniquecode.findMany({
    //   orderBy: {
    //     id: "asc",
    //   },
    //   take: limit,
    //   include: {
    //     product: true,
    //   },
    // });
    return res.status(200).send({});
  } catch (error: any) {
    if (error.message) {
      return res.status(400).send({ message: error.message });
    }
    return res.status(400).send(error);
  }
});

uniquecodeRoutes.get("/available-count", async (req, res) => {
  try {
    const availableUniquecodeCount = await getAvailableUniquecodes();
    return res
      .status(200)
      .send({ data: { count: availableUniquecodeCount }, success: true });
  } catch (error: any) {
    const statusCode = error?.statusCode ?? 500;
    const message = error?.message ?? "Something went wrong";
    return res.status(statusCode).json({ message, success: false });
  }
});

export default uniquecodeRoutes;
