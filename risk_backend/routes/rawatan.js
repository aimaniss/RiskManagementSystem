import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import { hadSyarikat } from "../middleware/aksesSyarikat.js";
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

// Staff & Ketua Subsidiari hanya untuk risiko syarikat sendiri
const risikoParam = hadSyarikat(["risiko", (req) => req.params.risiko_id]);
const rawatanParam = hadSyarikat(["rawatan", (req) => req.params.rawatan_id]);

router.get("/", verifyToken, senaraiRawatan);
router.get("/with-status", verifyToken, senaraiRawatanDenganStatus);
router.put(
  "/penilaian/:risiko_id",
  verifyToken,
  authorizeKebenaran("risiko:nilai", "rawatan:urus"),
  risikoParam,
  simpanPenilaian
);
router.post(
  "/",
  verifyToken,
  authorizeKebenaran("rawatan:urus"),
  hadSyarikat(["risiko", (req) => req.body?.risiko_id]),
  tambahRawatan
);
router.put(
  "/:rawatan_id",
  verifyToken,
  authorizeKebenaran("rawatan:urus"),
  rawatanParam,
  kemaskiniRawatan
);
router.delete(
  "/:rawatan_id",
  verifyToken,
  authorizeKebenaran("rawatan:urus"),
  rawatanParam,
  padamRawatan
);
router.get("/:risiko_id", verifyToken, risikoParam, rawatanIkutRisiko);

export default router;
