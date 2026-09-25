import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import {
  senaraiRisikoUntukPindaan,
  mohonPindaan,
  statistikPindaan,
  senaraiPindaan,
  luluskanPindaan,
  tolakPindaan,
} from "../controllers/pindaanController.js";

const router = express.Router();

router.get(
  "/risks-for-amendment",
  verifyToken,
  authorizeKebenaran("pindaan:urus"),
  senaraiRisikoUntukPindaan
);
router.post("/:risk_id", verifyToken, authorizeKebenaran("pindaan:urus"), mohonPindaan);
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
