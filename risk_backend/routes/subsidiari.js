import express from "express";
import pool from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET all subsidiaries
router.get("/", verifyToken, authorizeRoles("Admin", "Executive"), async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM subsidiari ORDER BY subsidiari_id`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
