import db from "../db";
import { Product } from "../types/data";

/**
 * Retrieves a product by its ID.
 *
 * @param {number} productId - The ID of the product to retrieve.
 * @return {Product|null} The product object if found, otherwise null.
 */
export const getProductById = async (productId: number) => {
  const query = `SELECT * FROM product WHERE id = $1 and isactive = true`;
  const result = await db.query<Product>(query, [productId]);
  if (result.rowCount === 0) return null;
  return result.rows[0];
};

/**
 * Retrieves a product from the database by its barcode.
 *
 * @param {string} barcode - The barcode of the product.
 * @return {Promise<Product | null>} A Promise that resolves to the product object if found, or null if not found.
 */
export const getProductByBarcode = async (barcode: string) => {
  const query = `SELECT * FROM product WHERE upc = $1 and isactive = true`;
  const result = await db.query<Product>(query, [barcode]);
  if (result.rowCount === 0) return null;
  return result.rows[0];
};
