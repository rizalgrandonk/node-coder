import express from "express";
import prisma from "../db";

const productRoutes = express.Router();

productRoutes.post("/", async (req, res) => {
  try {
    const product = await prisma.product.create({
      data: {
        name: req.body.name,
        codekey: req.body.codekey,
      },
    });
    return res.status(200).send(product);
  } catch (error: any) {
    if (error.message) {
      return res.status(400).send({ message: error.message });
    }
    return res.status(400).send(error);
  }
});

export default productRoutes;
