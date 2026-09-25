import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import { hadSyarikat } from "../middleware/aksesSyarikat.js";
import { senaraiLaporan, dataPenuhLaporan } from "../controllers/laporanController.js";

const router = express.Router();

router.get("/", verifyToken, authorizeKebenaran("laporan:jana"), senaraiLaporan);
router.get(
  "/:risiko_id/data-penuh",
  verifyToken,
  authorizeKebenaran("laporan:jana"),
  hadSyarikat(["risiko", (req) => req.params.risiko_id]),
  dataPenuhLaporan
);

export default router;
