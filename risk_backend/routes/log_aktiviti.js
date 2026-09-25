import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import {
  senaraiLogAktiviti,
  padamLogAktiviti,
  padamLogAktivitiPukal,
} from "../controllers/logAktivitiController.js";

const router = express.Router();

router.get("/", verifyToken, authorizeKebenaran("log:baca"), senaraiLogAktiviti);
router.delete("/:id", verifyToken, authorizeKebenaran("log:padam"), padamLogAktiviti);
router.delete("/", verifyToken, authorizeKebenaran("log:padam"), padamLogAktivitiPukal);

export default router;
