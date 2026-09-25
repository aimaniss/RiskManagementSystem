import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import { senaraiLaporan, dataPenuhLaporan } from "../controllers/laporanController.js";

const router = express.Router();

router.get("/", verifyToken, authorizeKebenaran("laporan:jana"), senaraiLaporan);
router.get(
  "/:risiko_id/data-penuh",
  verifyToken,
  authorizeKebenaran("laporan:jana"),
  dataPenuhLaporan
);

export default router;
