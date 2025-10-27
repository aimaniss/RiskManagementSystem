// =======================================================
// 📁 routes/pindaan.js
// Modul: Permohonan Pindaan Skor Risiko (BARU)
// =======================================================

import express from "express";
import pool from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * -------------------------------------------------------
 * ➕ POST: Hantar Permohonan Pindaan Baru
 * ENDPOINT: /api/pindaan/:risk_id
 * -------------------------------------------------------
 * Ini adalah endpoint yang akan dipanggil oleh 'PindaanFormModal'
 * apabila 'onPindaanSubmitted' dicetuskan.
 */
router.post("/:risk_id", verifyToken, async (req, res) => {
  const { risk_id } = req.params;
  const { justifikasi, perubahan } = req.body;
  // Dapatkan data pengguna dari token (berdasarkan user.js)
  const { pengguna_id, nama_peranan } = req.user; 

  const { data_sebelum, data_selepas } = perubahan;
  const { penilaian, keberkesanan } = justifikasi;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let status_permohonan = "Pending";
    let pengguna_id_pelulus = null;
    let tarikh_diproses = null;

    // === Logik Lulus Terus jika Admin ===
    if (nama_peranan === "Admin") {
      status_permohonan = "Approved";
      pengguna_id_pelulus = pengguna_id;
      tarikh_diproses = new Date();

      // === (PENTING) Kemaskini Jadual 'risiko' Utama ===
      const fieldsToUpdate = Object.keys(data_selepas);
      
      if (fieldsToUpdate.length > 0) {
        // Cth: "skor_kebarangkalian" = $1, "skor_impak" = $2
        const setClause = fieldsToUpdate
          // Guna "" untuk nama lajur jika ia sensitif (cth: _semasa)
          .map((key, index) => `"${key}" = $${index + 1}`) 
          .join(", ");
        
        const values = fieldsToUpdate.map(key => data_selepas[key]);
        values.push(risk_id);
        
        // Merujuk jadual "risiko" (huruf kecil)
        const updateQuery = `UPDATE "risiko" SET ${setClause} WHERE risiko_id = $${values.length}`;
        
        await client.query(updateQuery, values);
      }
    }

    // === Langkah 1: Simpan rekod permohonan pindaan ===
    const insertQuery = `
      INSERT INTO permohonan_pindaan (
        risk_id, pengguna_id_pemohon, status_permohonan, 
        data_sebelum, data_selepas, 
        justifikasi_penilaian, justifikasi_keberkesanan,
        pengguna_id_pelulus, tarikh_diproses, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *;
    `;
    
    const newPermohonan = await client.query(insertQuery, [
      risk_id,
      pengguna_id, // ID pemohon dari token
      status_permohonan,
      data_sebelum,
      data_selepas,
      penilaian, 
      keberkesanan,
      pengguna_id_pelulus,
      tarikh_diproses
    ]);

    await client.query("COMMIT");
    
    res.status(201).json({
      message: "Permohonan pindaan berjaya dihantar.",
      data: newPermohonan.rows[0],
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Ralat POST /pindaan/:risk_id:", err);
    res.status(500).json({ message: "Gagal memproses permohonan: " + err.message });
  } finally {
    client.release();
  }
});


/**
 * -------------------------------------------------------
 * 🟢 GET: Dapatkan Senarai Permohonan (Untuk Admin)
 * ENDPOINT: /api/pindaan
 * -------------------------------------------------------
 * Untuk halaman kelulusan Admin.
 */
router.get("/", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  try {
    const query = `
      SELECT 
        p.*, 
        r.no_rujukan, 
        r.risiko,
        u.nama_penuh AS nama_pemohon 
      FROM permohonan_pindaan p
      JOIN "risiko" r ON p.risk_id = r.risiko_id
      JOIN pengguna u ON p.pengguna_id_pemohon = u.pengguna_id
      WHERE p.status_permohonan = 'Pending'
      ORDER BY p.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error("❌ Ralat GET /pindaan:", err);
    res.status(500).json({ message: "Gagal memuatkan senarai permohonan." });
  }
});


/**
 * -------------------------------------------------------
 * 🔵 PUT: Luluskan Permohonan (Oleh Admin)
 * ENDPOINT: /api/pindaan/:pindaan_id/approve
 * -------------------------------------------------------
 */
router.put("/:pindaan_id/approve", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  const { pindaan_id } = req.params;
  const { pengguna_id } = req.user; // Ini adalah Admin yang meluluskan

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Dapatkan permohonan
    const permohonanRes = await client.query(
      "SELECT * FROM permohonan_pindaan WHERE pindaan_id = $1 AND status_permohonan = 'Pending'",
      [pindaan_id]
    );

    if (permohonanRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Permohonan tidak dijumpai atau telah diproses." });
    }

    const permohonan = permohonanRes.rows[0];
    const { risk_id, data_selepas } = permohonan;

    // 2. Kemaskini jadual 'risiko' utama
    const fieldsToUpdate = Object.keys(data_selepas);
    if (fieldsToUpdate.length > 0) {
      const setClause = fieldsToUpdate
        .map((key, index) => `"${key}" = $${index + 1}`)
        .join(", ");
      const values = fieldsToUpdate.map(key => data_selepas[key]);
      values.push(risk_id);
      
      const updateQuery = `UPDATE "risiko" SET ${setClause} WHERE risiko_id = $${values.length}`;
      await client.query(updateQuery, values);
    }

    // 3. Kemaskini status permohonan
    const updatePermohonanQuery = `
      UPDATE permohonan_pindaan 
      SET 
        status_permohonan = 'Approved',
        pengguna_id_pelulus = $1,
        tarikh_diproses = NOW()
      WHERE pindaan_id = $2
      RETURNING *;
    `;
    const updatedPermohonan = await client.query(updatePermohonanQuery, [pengguna_id, pindaan_id]);

    await client.query("COMMIT");
    res.json({
      message: "Permohonan berjaya diluluskan.",
      data: updatedPermohonan.rows[0]
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Ralat PUT /pindaan/:pindaan_id/approve:", err);
    res.status(500).json({ message: "Gagal meluluskan permohonan: " + err.message });
  } finally {
    client.release();
  }
});


/**
 * -------------------------------------------------------
 * 🔴 PUT: Tolak Permohonan (Oleh Admin)
 * ENDPOINT: /api/pindaan/:pindaan_id/reject
 * -------------------------------------------------------
 */
router.put("/:pindaan_id/reject", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  const { pindaan_id } = req.params;
  const { pengguna_id } = req.user;

  try {
    const updateQuery = `
      UPDATE permohonan_pindaan 
      SET 
        status_permohonan = 'Rejected',
        pengguna_id_pelulus = $1,
        tarikh_diproses = NOW()
      WHERE pindaan_id = $2 AND status_permohonan = 'Pending'
      RETURNING *;
    `;
    const { rows } = await pool.query(updateQuery, [pengguna_id, pindaan_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Permohonan tidak dijumpai atau telah diproses." });
    }

    res.json({
      message: "Permohonan telah ditolak.",
      data: rows[0]
    });

  } catch (err) {
    console.error("❌ Ralat PUT /pindaan/:pindaan_id/reject:", err);
    res.status(500).json({ message: "Gagal menolak permohonan: " + err.message });
  }
});


export default router;