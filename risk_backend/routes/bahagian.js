// routes/bahagianRoute.js — Rujukan Bahagian/Unit
import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/bahagian — senarai semua bahagian
router.get("/", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM bahagian ORDER BY nama_bahagian ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bahagian — tambah bahagian baharu
router.post("/", verifyToken, async (req, res) => {
  try {
    const { nama_bahagian } = req.body;

    if (!nama_bahagian || nama_bahagian.trim() === "") {
      return res.status(400).json({ error: "Nama bahagian diperlukan." });
    }

    const nama = nama_bahagian.trim();

    // Semak duplikasi
    const existing = await pool.query(
      "SELECT * FROM bahagian WHERE LOWER(nama_bahagian) = LOWER($1)",
      [nama]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Bahagian ini sudah wujud." });
    }

    const { rows } = await pool.query(
      "INSERT INTO bahagian (nama_bahagian) VALUES ($1) RETURNING *",
      [nama]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
