import express from "express";
import { login, logout, tukarKatalaluan } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", verifyToken, logout);
router.put("/tukar-katalaluan", verifyToken, tukarKatalaluan);

export default router;
