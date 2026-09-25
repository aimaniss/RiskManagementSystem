import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import { senaraiPeranan } from "../controllers/perananController.js";

const router = express.Router();

router.get("/", verifyToken, authorizeKebenaran("pengguna:urus"), senaraiPeranan);

export default router;
