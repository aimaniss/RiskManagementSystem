// routes/bahagian.js — Rujukan Bahagian/Unit
import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import { senaraiBahagian, tambahBahagian } from "../controllers/bahagianController.js";

const router = express.Router();

// GET /api/bahagian — semua pengguna berdaftar
router.get("/", verifyToken, senaraiBahagian);

// POST /api/bahagian — tambah bahagian baharu (kebenaran rujukan:urus)
router.post("/", verifyToken, authorizeKebenaran("rujukan:urus"), tambahBahagian);

export default router;
