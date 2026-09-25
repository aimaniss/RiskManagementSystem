import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  senaraiNotifikasi,
  kiraBelumBaca,
  tandaDibaca,
  tandaSemuaDibaca,
  padamNotifikasi,
} from "../controllers/notifikasiController.js";

const router = express.Router();

router.get("/", verifyToken, senaraiNotifikasi);
router.get("/unread-count", verifyToken, kiraBelumBaca);
router.put("/:notifikasi_id/baca", verifyToken, tandaDibaca);
router.put("/baca-semua", verifyToken, tandaSemuaDibaca);
router.delete("/:notifikasi_id", verifyToken, padamNotifikasi);

export default router;
