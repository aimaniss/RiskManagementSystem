// routes/bahagian.js — Rujukan Bahagian/Unit
import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import {
  senaraiBahagian,
  tambahBahagian,
  kemaskiniBahagian,
  tukarStatusBahagian,
} from "../controllers/bahagianController.js";

const router = express.Router();

// GET /api/bahagian — semua pengguna berdaftar
router.get("/", verifyToken, senaraiBahagian);

// POST /api/bahagian — tambah bahagian baharu (kebenaran rujukan:urus)
router.post("/", verifyToken, authorizeKebenaran("rujukan:urus"), tambahBahagian);

// Tetapan Sistem (Admin sahaja): tukar nama (dikaskad ke risiko) & aktif/nyahaktif
router.put("/:id", verifyToken, authorizeKebenaran("tetapan:urus"), kemaskiniBahagian);
router.patch("/:id/status", verifyToken, authorizeKebenaran("tetapan:urus"), tukarStatusBahagian);

export default router;
