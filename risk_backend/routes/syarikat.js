import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import {
  senaraiSyarikat,
  tambahSyarikat,
  kemaskiniSyarikat,
  tukarStatusSyarikat,
} from "../controllers/syarikatController.js";

const router = express.Router();

// GET /api/syarikat — aktif sahaja; ?semua=true termasuk tidak aktif
router.get("/", verifyToken, senaraiSyarikat);

// Tetapan Sistem (Admin sahaja)
router.post("/", verifyToken, authorizeKebenaran("tetapan:urus"), tambahSyarikat);
router.put("/:id", verifyToken, authorizeKebenaran("tetapan:urus"), kemaskiniSyarikat);
router.patch("/:id/status", verifyToken, authorizeKebenaran("tetapan:urus"), tukarStatusSyarikat);

export default router;
