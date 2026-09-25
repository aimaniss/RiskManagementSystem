import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import { dapatkanDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", verifyToken, authorizeKebenaran("dashboard:lihat"), dapatkanDashboard);

export default router;
