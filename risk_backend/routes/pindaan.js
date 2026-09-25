import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import { hadSyarikat } from "../middleware/aksesSyarikat.js";
import {
  senaraiRisikoUntukPindaan,
  mohonPindaan,
  statistikPindaan,
  senaraiPindaan,
  luluskanPindaan,
  tolakPindaan,
  sejarahPindaanRisiko,
} from "../controllers/pindaanController.js";

const router = express.Router();

router.get(
  "/risks-for-amendment",
  verifyToken,
  authorizeKebenaran("pindaan:urus"),
  senaraiRisikoUntukPindaan
);
// Staff & Ketua Subsidiari hanya boleh memohon pindaan untuk risiko syarikat sendiri
router.post(
  "/:risk_id",
  verifyToken,
  authorizeKebenaran("pindaan:urus"),
  hadSyarikat(["risiko", (req) => req.params.risk_id]),
  mohonPindaan
);
// Sejarah pindaan satu risiko (paparan butiran); ikut skop syarikat
router.get(
  "/risiko/:risk_id",
  verifyToken,
  authorizeKebenaran("risiko:lihat"),
  hadSyarikat(["risiko", (req) => req.params.risk_id]),
  sejarahPindaanRisiko
);
router.get("/stats", verifyToken, authorizeKebenaran("pindaan:lulus"), statistikPindaan);
router.get("/", verifyToken, authorizeKebenaran("pindaan:lihat"), senaraiPindaan);
router.put(
  "/:pindaan_id/approve",
  verifyToken,
  authorizeKebenaran("pindaan:lulus"),
  luluskanPindaan
);
router.put("/:pindaan_id/reject", verifyToken, authorizeKebenaran("pindaan:lulus"), tolakPindaan);

export default router;
