// routes/tahun.js
import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT DISTINCT tahun FROM risiko WHERE is_deleted = false ORDER BY tahun DESC"
    );
    res.json(rows.map(r => r.tahun));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ralat pelayan. Sila cuba sebentar lagi." });
  }
});

export default router;
