import express from "express";
import { getProductByBarcode } from "../services/product";

const productRoutes = express.Router();

/**
 * Get product by barcode
 * @param {string} req.params.barcode
 * @returns {object} product
 */
productRoutes.get("/:barcode", async (req, res) => {
  try {
    const product = await getProductByBarcode(req.params.barcode);
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
