import express from "express";
import productRoutes from "./products";
import uniquecodeRoutes from "./uniquecodes";

const mainRoutes = express.Router();

mainRoutes.use("/products", productRoutes);
mainRoutes.use("/uniquecodes", uniquecodeRoutes);

export default mainRoutes;
