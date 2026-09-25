import express from "express";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import { senaraiPeranan, kosongkanCache } from "../controllers/perananController.js";

const router = express.Router();

router.get("/", verifyToken, authorizeKebenaran("pengguna:urus"), senaraiPeranan);
router.post("/flush-cache", verifyToken, authorizeKebenaran("pengguna:urus"), kosongkanCache);

export default router;
