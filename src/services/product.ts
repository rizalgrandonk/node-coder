import db from "../db";
import { Product } from "../types/data";

export const getProductById = async (productId: number) => {
  const query = `SELECT * FROM product WHERE id = $1 and isactive = true`;
  const result = await db.query<Product>(query, [productId]);
  if (result.rowCount === 0) return null;
  return result.rows[0];
};
