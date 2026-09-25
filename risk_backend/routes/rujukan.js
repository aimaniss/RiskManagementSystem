// routes/rujukan.js — Senarai rujukan boleh urus (kategori risiko, dsb.)
import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import {
  senaraiJenisRujukan,
  senaraiRujukan,
  tambahRujukan,
  kemaskiniRujukan,
  tukarStatusRujukan,
} from "../controllers/rujukanController.js";

const router = express.Router();

// GET /api/rujukan?jenis=kategori_risiko — aktif sahaja; ?semua=true termasuk tidak aktif
router.get("/", verifyToken, senaraiRujukan);
router.get("/jenis", verifyToken, authorizeKebenaran("tetapan:urus"), senaraiJenisRujukan);

// Tetapan Sistem (Admin sahaja)
router.post("/", verifyToken, authorizeKebenaran("tetapan:urus"), tambahRujukan);
router.put("/:id", verifyToken, authorizeKebenaran("tetapan:urus"), kemaskiniRujukan);
router.patch("/:id/status", verifyToken, authorizeKebenaran("tetapan:urus"), tukarStatusRujukan);

export default router;
