import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { senaraiTahun } from "../controllers/tahunController.js";

const router = express.Router();

router.get("/", verifyToken, senaraiTahun);

export default router;
