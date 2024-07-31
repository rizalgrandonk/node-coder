import express from "express";
import prisma from "../db";
import * as SocketActions from "../actions/socket";

const playgroundRoutes = express.Router();

// playgroundRoutes.get("/check-printer-status", async (req, res) => {
//   try {
//     const result = await SocketActions.checkPrinterStatus();
//     return res.status(200).send(result);
//   } catch (error: any) {
//     if (error.message) {
//       return res.status(400).send({ message: error.message });
//     }
//     return res.status(400).send(error);
//   }
// });

// playgroundRoutes.get("/check-mailing-status", async (req, res) => {
//   try {
//     const result = await SocketActions.checkMailingStatus();
//     return res.status(200).send(result);
//   } catch (error: any) {
//     if (error.message) {
//       return res.status(400).send({ message: error.message });
//     }
//     return res.status(400).send(error);
//   }
// });

// playgroundRoutes.get("/set-printer-ready", async (req, res) => {
//   try {
//     const result = await SocketActions.setPrintReady();
//     return res.status(200).send(result);
//   } catch (error: any) {
//     if (error.message) {
//       return res.status(400).send({ message: error.message });
//     }
//     return res.status(400).send(error);
//   }
// });

// playgroundRoutes.get("/open-nozzle", async (req, res) => {
//   try {
//     const result = await SocketActions.openNozzle();
//     return res.status(200).send(result);
//   } catch (error: any) {
//     if (error.message) {
//       return res.status(400).send({ message: error.message });
//     }
//     return res.status(400).send(error);
//   }
// });

export default playgroundRoutes;
