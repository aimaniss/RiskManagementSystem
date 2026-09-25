import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import {
  tambahRisiko,
  senaraiRisiko,
  senaraiTahunRisiko,
  dapatkanRawatanRisiko,
  kemaskiniRawatanRisiko,
  kemaskiniLogPemantauanRisiko,
  kemaskiniRisiko,
  padamRisiko,
  semakNoRujukan,
  semakPenduaRisiko,
  luluskanRisiko,
  tolakRisiko,
} from "../controllers/risikoController.js";

const router = express.Router();

router.post("/", verifyToken, authorizeKebenaran("risiko:daftar"), tambahRisiko);
router.get("/", verifyToken, authorizeKebenaran("risiko:lihat"), senaraiRisiko);
router.get("/tahun", verifyToken, senaraiTahunRisiko);
router.get("/:risiko_id/rawatan", verifyToken, dapatkanRawatanRisiko);
router.put(
  "/:risiko_id/rawatan",
  verifyToken,
  authorizeKebenaran("rawatan:urus"),
  kemaskiniRawatanRisiko
);
router.put(
  "/:risiko_id/pemantauan/log/:log_id",
  verifyToken,
  authorizeKebenaran("pemantauan:urus"),
  kemaskiniLogPemantauanRisiko
);
router.put("/:risiko_id", verifyToken, authorizeKebenaran("risiko:daftar"), kemaskiniRisiko);
router.delete("/:risiko_id", verifyToken, authorizeKebenaran("risiko:padam"), padamRisiko);
router.get("/check-no-rujukan/:noRujukan", verifyToken, semakNoRujukan);
router.get("/check-duplicate", verifyToken, semakPenduaRisiko);
router.put("/:risiko_id/approve", verifyToken, authorizeKebenaran("risiko:lulus"), luluskanRisiko);
router.put("/:risiko_id/reject", verifyToken, authorizeKebenaran("risiko:lulus"), tolakRisiko);

export default router;
