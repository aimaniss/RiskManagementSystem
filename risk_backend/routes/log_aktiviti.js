// =======================================================
// 📁 routes/log_aktiviti.js
// =======================================================
import express from "express";
import pool from "../config/db.js";
// ⭐️ DIUBAH: 'catatAktiviti' tidak lagi diimport kerana tidak digunakan
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";
// import { catatAktiviti } from "../utils/catatAktiviti.js"; // <- DIBUANG

const router = express.Router();

// =======================================================
// 🟢 GET /api/log_aktiviti - (Kekal Sama)
// =======================================================
router.get("/", verifyToken, async (req, res) => {
  const {
    tarikhMula,
    tarikhAkhir,
    peranan,
    subsidiari,
    aktiviti_teks,
  } = req.query;

  const queryParams = [];
  const whereClauses = [];
  let paramIndex = 1;

  // ... (Logik filter anda kekal sama) ...
  if (tarikhMula) {
    whereClauses.push(`la.tarikh_masa >= $${paramIndex++}`);
    queryParams.push(tarikhMula);
  }
  if (tarikhAkhir) {
    const endDay = new Date(tarikhAkhir);
    endDay.setDate(endDay.getDate() + 1);
    whereClauses.push(`la.tarikh_masa < $${paramIndex++}`);
    queryParams.push(endDay.toISOString());
  }
  if (peranan) {
    whereClauses.push(`r.nama_peranan = $${paramIndex++}`);
    queryParams.push(peranan);
  }
  if (subsidiari) {
    whereClauses.push(`s.nama_subsidiari = $${paramIndex++}`);
    queryParams.push(subsidiari);
  }
  if (aktiviti_teks) {
    whereClauses.push(`la.aktiviti ILIKE $${paramIndex++}`);
    queryParams.push(`%${aktiviti_teks}%`);
  }

  // Query (Kekal Sama - pastikan 'ringkasan' ada)
  let sqlQuery = `
    SELECT
      la.id AS log_id,
      p.pengguna_id AS user_id,
      p.staff_id,
      p.nama_penuh AS nama_pengguna,
      r.nama_peranan AS peranan_pengguna,
      s.nama_subsidiari AS subsidiari,
      la.aktiviti,
      la.ringkasan,
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

// =======================================================
// 🔴 DELETE /api/log_aktiviti/:id - (⭐️ DIKEMASKINI ⭐️)
// =======================================================
// Hanya 'Admin' boleh memadam log
router.delete("/:id", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  const { id } = req.params; 

  try {
    
    const { rowCount } = await pool.query(
      "DELETE FROM log_aktiviti WHERE id = $1",
      [id]
    );

    // 2. Semak jika log wujud
    if (rowCount === 0) {
      return res.status(404).json({ error: "Log tidak dijumpai." });
    }

  

    res.status(200).json({ message: "Log berjaya dipadam." });

  } catch (err) {
    
    if (err.code === '23503') { 
        console.error("❌ Ralat FK semasa memadam log:", err.detail);
        return res.status(400).json({ error: "Log ini tidak boleh dipadam kerana ia mempunyai rekod berkaitan." });
    }
    console.error("❌ Ralat semasa memadam log:", err);
    res.status(500).json({ error: "Gagal memadam log dari server." });
  }
});


// =======================================================
// 🔴 DELETE /api/log_aktiviti/ (⭐️ ROUTE BARU - Padam Julat Tarikh ⭐️)
// =======================================================
router.delete("/", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  // Ambil dari 'query parameters'
  const { tarikhMula, tarikhAkhir } = req.query;

  if (!tarikhMula || !tarikhAkhir) {
    return res.status(400).json({ error: "Tarikh mula dan tarikh akhir diperlukan." });
  }

  try {
    // Sediakan tarikh akhir (+1 hari)
    const endDay = new Date(tarikhAkhir);
    endDay.setDate(endDay.getDate() + 1);
    
    const { rowCount } = await pool.query(
      "DELETE FROM log_aktiviti WHERE tarikh_masa >= $1 AND tarikh_masa < $2",
      [tarikhMula, endDay.toISOString()]
    );

    res.status(200).json({ message: `Padam berjaya. ${rowCount} rekod log telah dipadam.` });

  } catch (err) {
    console.error("❌ Ralat semasa memadam log mengikut julat:", err);
    res.status(500).json({ error: "Gagal memadam log dari server." });
  }
});


export default router;