import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import {
  senaraiLogAktiviti,
  senaraiJenisAktiviti,
  eksportLogAktiviti,
} from "../controllers/logAktivitiController.js";

const router = express.Router();

// Jejak audit: baca & eksport sahaja (tiada padam)
router.get("/", verifyToken, authorizeKebenaran("log:baca"), senaraiLogAktiviti);
router.get("/jenis", verifyToken, authorizeKebenaran("log:baca"), senaraiJenisAktiviti);
router.get("/eksport", verifyToken, authorizeKebenaran("log:baca"), eksportLogAktiviti);

export default router;
