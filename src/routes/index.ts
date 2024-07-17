import express from "express";
import productRoutes from "./products";
import SocketConnection from "../connections/socket";
import SerialConnection from "../connections/serial";
import uniquecodeRoutes from "./uniquecodes";

const mainRoutes = express.Router();

mainRoutes.get("/send-serial/:message", async (req, res) => {
  try {
    const message = req.params.message ?? "TEST";
    const response = await SerialConnection.writeAndResponse(message, {
      responseValidation: (res) => res.includes(message),
    });
    return res.status(200).json({
      message: "Success",
      response,
    });
  } catch (error: any) {
    const message = error?.message;
    return res.status(message ? 400 : 500).json({
      message: "Failed",
      error: message ?? "Server Error",
    });
  }
});

mainRoutes.get("/send-tcp/:message", async (req, res) => {
  try {
    const message = req.params.message ?? "TEST";
    if (!SocketConnection.socketClient) {
      return res.status(400).json({
        message: "Failed",
        error: "Serial Port Disconnected",
      });
    }
    const response = await SocketConnection.writeAndResponse(message, {
      responseValidation: (res) => res.includes(message),
    });
    return res.status(200).json({
      message: "Success",
      response,
    });
  } catch (error: any) {
    const message = error?.message;
    return res.status(message ? 400 : 500).json({
      message: "Failed",
      error: message ?? "Server Error",
    });
  }
});

mainRoutes.use("/products", productRoutes);
mainRoutes.use("/uniquecodes", uniquecodeRoutes);

export default mainRoutes;
