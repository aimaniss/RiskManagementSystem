import express from "express";
import pool from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM peranan ORDER BY peranan_id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
