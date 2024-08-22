import express from "express";
import db from "../db";
import { getProductByBarcode } from "../services/product";
import { sleep } from "../utils/helper";

const productRoutes = express.Router();

productRoutes.post("/", async (req, res) => {
  try {
    // const product = await prisma.product.create({
    //   data: {
    //     name: req.body.name,
    //     codekey: req.body.codekey,
    //   },
    // });
    return res.status(200).json({});
  } catch (error: any) {
    if (error.message) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(400).json(error);
  }
});

productRoutes.get("/:barcode", async (req, res) => {
  try {
    const product = await getProductByBarcode(req.params.barcode);
    await sleep(10000);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    const statusCode = error?.statusCode ?? 500;
    const message = error?.message ?? "Something went wrong";
    return res.status(statusCode).json({ message, success: false });
  }
});

export default productRoutes;
