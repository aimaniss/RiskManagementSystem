// routes/subsidiariRoute.js
import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const userRole = req.user.nama_peranan;  // ambil nama peranan dari JWT
    const userSubsidiari = req.user.subsidiari_id;

    let query = "SELECT * FROM subsidiari";
    let params = [];

    if (userRole === "Staff" || userRole === "Ketua Subsidiari") {
      query += " WHERE subsidiari_id = $1";
      params.push(userSubsidiari);
    }

    query += " ORDER BY subsidiari_id";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
