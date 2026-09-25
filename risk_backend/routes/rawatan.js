import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import {
  senaraiRawatan,
  senaraiRawatanDenganStatus,
  simpanPenilaian,
  tambahRawatan,
  kemaskiniRawatan,
  padamRawatan,
  rawatanIkutRisiko,
} from "../controllers/rawatanController.js";

const router = express.Router();

router.get("/", verifyToken, senaraiRawatan);
router.get("/with-status", verifyToken, senaraiRawatanDenganStatus);
router.put(
  "/penilaian/:risiko_id",
  verifyToken,
  authorizeKebenaran("risiko:nilai", "rawatan:urus"),
  simpanPenilaian
);
router.post("/", verifyToken, authorizeKebenaran("rawatan:urus"), tambahRawatan);
router.put("/:rawatan_id", verifyToken, authorizeKebenaran("rawatan:urus"), kemaskiniRawatan);
router.delete("/:rawatan_id", verifyToken, authorizeKebenaran("rawatan:urus"), padamRawatan);
router.get("/:risiko_id", verifyToken, rawatanIkutRisiko);

export default router;
