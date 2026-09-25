import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import { hadSyarikat } from "../middleware/aksesSyarikat.js";
import {
  tambahRisiko,
  senaraiRisiko,
  dapatkanRisiko,
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

// Staff & Ketua Subsidiari hanya untuk risiko syarikat sendiri
const risikoParam = hadSyarikat(["risiko", (req) => req.params.risiko_id]);

router.post("/", verifyToken, authorizeKebenaran("risiko:daftar"), tambahRisiko);
router.get("/", verifyToken, authorizeKebenaran("risiko:lihat"), senaraiRisiko);
router.get("/tahun", verifyToken, senaraiTahunRisiko);
router.get("/:risiko_id/rawatan", verifyToken, risikoParam, dapatkanRawatanRisiko);
router.put(
  "/:risiko_id/rawatan",
  verifyToken,
  authorizeKebenaran("rawatan:urus"),
  risikoParam,
  kemaskiniRawatanRisiko
);
router.put(
  "/:risiko_id/pemantauan/log/:log_id",
  verifyToken,
  authorizeKebenaran("pemantauan:urus"),
  hadSyarikat(["risiko", (req) => req.params.risiko_id], ["log", (req) => req.params.log_id]),
  kemaskiniLogPemantauanRisiko
);
router.put(
  "/:risiko_id",
  verifyToken,
  authorizeKebenaran("risiko:daftar"),
  risikoParam,
  kemaskiniRisiko
);
router.delete(
  "/:risiko_id",
  verifyToken,
  authorizeKebenaran("risiko:padam"),
  risikoParam,
  padamRisiko
);
router.get("/check-no-rujukan/:noRujukan", verifyToken, semakNoRujukan);
router.get("/check-duplicate", verifyToken, semakPenduaRisiko);
router.put("/:risiko_id/approve", verifyToken, authorizeKebenaran("risiko:lulus"), luluskanRisiko);
router.put("/:risiko_id/reject", verifyToken, authorizeKebenaran("risiko:lulus"), tolakRisiko);
// Didaftar terakhir supaya laluan statik (/tahun, /check-duplicate) tidak ditangkap
router.get(
  "/:risiko_id",
  verifyToken,
  authorizeKebenaran("risiko:lihat"),
  risikoParam,
  dapatkanRisiko
);

export default router;
