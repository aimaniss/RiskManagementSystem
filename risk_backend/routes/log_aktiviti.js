// =======================================================
// 📁 routes/log_aktiviti.js
// Modul: Log Aktiviti Pengguna
// =======================================================
import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// =======================================================
// 🟢 GET /api/log-aktiviti - DENGAN PENAPISAN DINAMIK
// =======================================================
router.get("/", verifyToken, async (req, res) => {
  const {
    tarikhMula,
    tarikhAkhir,
    peranan,
    subsidiari,
    aktiviti_teks, // Dari frontend
  } = req.query;

  const queryParams = [];
  const whereClauses = [];
  let paramIndex = 1;

  // 1️⃣ Penapisan Tarikh Mula
  if (tarikhMula) {
    whereClauses.push(`la.tarikh_masa >= $${paramIndex++}`);
    queryParams.push(tarikhMula);
  }

  // 2️⃣ Penapisan Tarikh Akhir (+1 hari)
  if (tarikhAkhir) {
    const endDay = new Date(tarikhAkhir);
    endDay.setDate(endDay.getDate() + 1);
    whereClauses.push(`la.tarikh_masa < $${paramIndex++}`);
    queryParams.push(endDay.toISOString());
  }

  // 3️⃣ Penapisan Peranan
  if (peranan) {
    whereClauses.push(`r.nama_peranan = $${paramIndex++}`);
    queryParams.push(peranan);
  }

  // 4️⃣ Penapisan Subsidiari
  if (subsidiari) {
    whereClauses.push(`s.nama_subsidiari = $${paramIndex++}`);
    queryParams.push(subsidiari);
  }

  // 5️⃣ Penapisan Teks Aktiviti (LIKE)
  if (aktiviti_teks) {
    whereClauses.push(`la.aktiviti ILIKE $${paramIndex++}`);
    queryParams.push(`%${aktiviti_teks}%`);
  }

  // =======================================================
  // 🔹 Query Utama SQL
  // =======================================================
  let sqlQuery = `
    SELECT
      la.id AS log_id,
      p.pengguna_id AS user_id,
      p.nama_penuh AS nama_pengguna,
      r.nama_peranan AS peranan_pengguna,
      s.nama_subsidiari AS subsidiari,
      la.aktiviti,
      la.perincian,
      la.tarikh_masa
    FROM log_aktiviti la
    JOIN pengguna p ON la.pengguna_id = p.pengguna_id
    JOIN peranan r ON p.peranan_id = r.peranan_id
    JOIN subsidiari s ON p.subsidiari_id = s.subsidiari_id
  `;

  if (whereClauses.length > 0) {
    sqlQuery += ` WHERE ${whereClauses.join(" AND ")}`;
  }

  sqlQuery += ` ORDER BY la.tarikh_masa DESC;`;

  try {
    const { rows } = await pool.query(sqlQuery, queryParams);
    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Ralat semasa mengambil log aktiviti:", err);
    res.status(500).json({ error: "Gagal mengambil data log dari server." });
  }
});

export default router;
