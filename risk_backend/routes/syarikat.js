import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { senaraiSyarikat } from "../controllers/syarikatController.js";

const router = express.Router();

router.get("/", verifyToken, senaraiSyarikat);

export default router;
