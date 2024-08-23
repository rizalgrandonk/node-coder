import express from "express";
import db from "../db";
import { getAvailableUniquecodes } from "../services/uniquecodes";
const uniquecodeRoutes = express.Router();

/**
 * Get the available count of uniquecodes in the database.
 * @route GET /uniquecodes/available-count
 * @returns {object} - A JSON object containing the available count of uniquecodes.
 */
uniquecodeRoutes.get("/available-count", async (req, res) => {
  try {
    const availableUniquecodeCount = await getAvailableUniquecodes();
    return res.status(200).send({ data: { count: availableUniquecodeCount }, success: true });
  } catch (error: any) {
    const statusCode = error?.statusCode ?? 500;
    const message = error?.message ?? "Something went wrong";
    return res.status(statusCode).json({ message, success: false });
  }
});

export default uniquecodeRoutes;
