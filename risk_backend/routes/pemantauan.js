import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
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

router.get("/", verifyToken, authorizeKebenaran("risiko:lihat"), senaraiPemantauan);
router.get("/:risiko_id/info", verifyToken, infoRisikoPemantauan);
router.get("/:risiko_id/sejarah", verifyToken, sejarahPemantauan);
router.get("/check-duplicate", verifyToken, semakPenduaLog);
router.get("/:risiko_id/tahap-rujukan", verifyToken, tahapRujukan);
router.get("/:risiko_id/sejarah-baru", verifyToken, sejarahPemantauanBaru);
router.post("/log", verifyToken, authorizeKebenaran("pemantauan:urus"), tambahLogPemantauan);
router.delete(
  "/log/:log_id",
  verifyToken,
  authorizeKebenaran("pemantauan:urus"),
  padamLogPemantauan
);
router.put(
  "/log/:log_id",
  verifyToken,
  authorizeKebenaran("pemantauan:urus"),
  kemaskiniLogPemantauan
);

export default router;
