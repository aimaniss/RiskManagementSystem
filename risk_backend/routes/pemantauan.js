import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import { hadSyarikat } from "../middleware/aksesSyarikat.js";
import {
  senaraiPemantauan,
  infoRisikoPemantauan,
  sejarahPemantauan,
  semakPenduaLog,
  tahapRujukan,
  sejarahPemantauanBaru,
  tambahLogPemantauan,
  padamLogPemantauan,
  kemaskiniLogPemantauan,
} from "../controllers/pemantauanController.js";

const router = express.Router();

// Staff & Ketua Subsidiari hanya untuk risiko syarikat sendiri
const risikoParam = hadSyarikat(["risiko", (req) => req.params.risiko_id]);

router.get("/", verifyToken, authorizeKebenaran("risiko:lihat"), senaraiPemantauan);
router.get("/:risiko_id/info", verifyToken, risikoParam, infoRisikoPemantauan);
router.get("/:risiko_id/sejarah", verifyToken, risikoParam, sejarahPemantauan);
router.get(
  "/check-duplicate",
  verifyToken,
  hadSyarikat(["risiko", (req) => req.query.risiko_id]),
  semakPenduaLog
);
router.get("/:risiko_id/tahap-rujukan", verifyToken, risikoParam, tahapRujukan);
router.get("/:risiko_id/sejarah-baru", verifyToken, risikoParam, sejarahPemantauanBaru);
router.post(
  "/log",
  verifyToken,
  authorizeKebenaran("pemantauan:urus"),
  hadSyarikat(["risiko", (req) => req.body?.risiko_id]),
  tambahLogPemantauan
);
router.delete(
  "/log/:log_id",
  verifyToken,
  authorizeKebenaran("pemantauan:urus"),
  hadSyarikat(["log", (req) => req.params.log_id]),
  padamLogPemantauan
);
router.put(
  "/log/:log_id",
  verifyToken,
  authorizeKebenaran("pemantauan:urus"),
  hadSyarikat(["log", (req) => req.params.log_id], ["risiko", (req) => req.body?.risiko_id]),
  kemaskiniLogPemantauan
);

export default router;
