import express from "express";
import productRoutes from "./products";
// import SocketConnectionClass from "../connections/socket";
// import SerialConnectionClass, {
//   SerialConnectionParameterType,
// } from "../connections/serial";
import uniquecodeRoutes from "./uniquecodes";
import playgroundRoutes from "./playground";
import testRoutes from "./test";

const mainRoutes = express.Router();
// const serialConfig: SerialConnectionParameterType = {
//   portOptions: {
//     path: process.env.SERIAL_NAME ?? "/dev/cu.usbmodem1401",
//     baudRate: +(process.env.SERIAL_BAUD_RATE ?? 115200),
//     autoOpen: false,
//   },
//   parserOptions: {
//     delimiter: process.env.SERIAL_DELIMITER ?? "\r\n",
//   },
// };
// const SerialConnection = new SerialConnectionClass(serialConfig);
// SerialConnection.connect();

// mainRoutes.get("/send-serial/:message", async (req, res) => {
//   try {
//     const message = req.params.message ?? "TEST";

//     const response = await SerialConnection.writeAndResponse(message, {
//       // responseValidation: (res) => res.includes(message),
//     });
//     return res.status(200).json({
//       message: "Success",
//       response,
//     });
//   } catch (error: any) {
//     const message = error?.message;
//     return res.status(message ? 400 : 500).json({
//       message: "Failed",
//       error: message ?? "Server Error",
//     });
//   }
// });

// mainRoutes.post("/send-tcp", async (req, res) => {
//   try {
//     const message = req.body?.message;
//     if (!message) {
//       return res.status(400).json({
//         message: "Failed",
//         error: "No Message Found",
//       });
//     }
//     if (!SocketConnection.socketClient) {
//       return res.status(400).json({
//         message: "Failed",
//         error: "TCP Port Disconnected",
//       });
//     }
//     const response = await SocketConnection.writeAndResponse(message);
//     return res.status(200).json({
//       message: "Success",
//       response,
//     });
//   } catch (error: any) {
//     const message = error?.message;
//     return res.status(message ? 400 : 500).json({
//       message: "Failed",
//       error: message ?? "Server Error",
//     });
//   }
// });

mainRoutes.use("/products", productRoutes);
mainRoutes.use("/uniquecodes", uniquecodeRoutes);
mainRoutes.use("/playground", playgroundRoutes);
mainRoutes.use("/test", testRoutes);

export default mainRoutes;
