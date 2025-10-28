// ======================================================= 
// 📁 routes/pindaan.js
// Modul: Permohonan Pindaan DAN Data Risiko Untuk Pindaan
// =======================================================

import express from "express";
import pool from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * -------------------------------------------------------
 * 🟢 GET: Senarai Risiko + Pemantauan Terkini (Untuk Modal Pindaan)
 * ENDPOINT: /api/pindaan/risks-for-amendment
 * -------------------------------------------------------
 * Query ini diambil dari pemantauan.js dan disesuaikan.
 * Digunakan oleh MohonPindaanModal.js.
 */
router.get("/risks-for-amendment", verifyToken, async (req, res) => {
  try {
    const user = req.user; // Dapatkan data pengguna dari token (nama_peranan, subsidiari_id)

    // Query SQL kompleks (sama seperti dalam pemantauan.js GET /)
    let query = `
      WITH RisikoAdaRawatan AS (
        SELECT DISTINCT risiko_id
        FROM rawatan_risiko
      ),
      PemantauanTerkini AS (
        SELECT
          pm.log_id,
          pm.risiko_id,
          pm.tarikh_pemantauan,
          pm.tahun_pemantauan,
          pm.separuh_tahun_pemantauan,
          pm.skor_kebarangkalian_selepas,
          pm.skor_impak_selepas,
          COALESCE(
            LAG(pm.skor_kebarangkalian_selepas) OVER (PARTITION BY pm.risiko_id ORDER BY pm.tahun_pemantauan, pm.separuh_tahun_pemantauan, pm.tarikh_pemantauan),
            r.skor_kebarangkalian
          ) AS skor_kebarangkalian_sebelum,
          COALESCE(
            LAG(pm.skor_impak_selepas) OVER (PARTITION BY pm.risiko_id ORDER BY pm.tahun_pemantauan, pm.separuh_tahun_pemantauan, pm.tarikh_pemantauan),
            r.skor_impak
          ) AS skor_impak_sebelum,
          pm.status_pemantauan,
          pm.catatan,
          pm.keberkesanan,
          pm.no_bil_kelulusan,
          ROW_NUMBER() OVER (
            PARTITION BY pm.risiko_id 
            ORDER BY pm.tahun_pemantauan DESC, pm.tarikh_pemantauan DESC
          ) AS rn
        FROM LogPemantauan pm
        JOIN Risiko r ON pm.risiko_id = r.risiko_id
      ),
      ButiranTerkini AS (
        SELECT 
          pt.log_id,
          ARRAY_AGG(DISTINCT pt.butiran_aktiviti) AS pelan_tindakan_terkini,
          ARRAY_AGG(DISTINCT kp.butiran_kakitangan) AS kakitangan_terkini
        FROM PelanTindakanPemantauan pt
        LEFT JOIN KakitanganPemantauan kp ON kp.log_id = pt.log_id
        GROUP BY pt.log_id
      )
      SELECT 
        r.risiko_id AS id,
        r.no_rujukan,
        r.tahun, 
        r.separuh_tahun,
        s.nama_subsidiari,
        r.kategori AS kategori_risiko,
        r.risiko AS risiko,
        
        -- DIUBAH: Sentiasa ambil skor asal sebagai "Skor Risiko Sebelum" dari jadual Risiko
        r.skor_kebarangkalian AS skor_kebarangkalian_sebelum,
        r.skor_impak AS skor_impak_sebelum,

        -- Bahagian Log Pemantauan Terkini
        pt.tahun_pemantauan,
        pt.separuh_tahun_pemantauan,
        bt.pelan_tindakan_terkini,
        bt.kakitangan_terkini,
        
        
        COALESCE(pt.status_pemantauan, 'Buka') AS status_pemantauan_terkini, 
        pt.catatan,
        pt.no_bil_kelulusan,
        
        -- DIUBAH: Hanya tunjukkan skor 'selepas' (terkini) JIKA ada rekod pemantauan. Jika tidak, pulangkan NULL.
        CASE WHEN pt.log_id IS NOT NULL THEN pt.skor_kebarangkalian_selepas ELSE NULL END AS skor_kebarangkalian_terkini,
        CASE WHEN pt.log_id IS NOT NULL THEN pt.skor_impak_selepas ELSE NULL END AS skor_impak_terkini

      FROM Risiko r
      JOIN RisikoAdaRawatan raw ON raw.risiko_id = r.risiko_id   
      LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
      LEFT JOIN PemantauanTerkini pt ON pt.risiko_id = r.risiko_id AND pt.rn = 1
      LEFT JOIN ButiranTerkini bt ON bt.log_id = pt.log_id
    `;

    const params = [];
    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      query += ` WHERE CAST(r.subsidiari AS INTEGER) = $1`;
      params.push(user.subsidiari_id);
    }

    query += ` ORDER BY r.tahun DESC, r.separuh_tahun DESC, r.no_rujukan ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error("❌ Ralat GET /pindaan/risks-for-amendment:", err);
    res.status(500).json({ message: "Gagal memuatkan data risiko untuk pindaan: " + err.message });
  }
});


/**
 * -------------------------------------------------------
 * ➕ POST: Hantar Permohonan Pindaan Baru
 * ENDPOINT: /api/pindaan/:risk_id
 * -------------------------------------------------------
 */
router.post("/:risk_id", verifyToken, async (req, res) => {
  const { risk_id } = req.params;
  const { justifikasi, perubahan } = req.body;
  const { pengguna_id, nama_peranan } = req.user;
  const { data_sebelum, data_selepas } = perubahan;
  const { penilaian, keberkesanan } = justifikasi;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    let status_permohonan = "Pending";
    let pengguna_id_pelulus = null;
    let tarikh_diproses = null;

    if (nama_peranan === "Admin") {
      status_permohonan = "Approved";
      pengguna_id_pelulus = pengguna_id;
      tarikh_diproses = new Date();

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
    }

    const insertQuery = `
      INSERT INTO permohonan_pindaan (
        risk_id, pengguna_id_pemohon, status_permohonan,
        data_sebelum, data_selepas,
        justifikasi_penilaian, justifikasi_keberkesanan,
        pengguna_id_pelulus, tarikh_diproses, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *;
    `;
    const newPermohonan = await client.query(insertQuery, [
      risk_id, pengguna_id, status_permohonan, data_sebelum, data_selepas,
      penilaian, keberkesanan, pengguna_id_pelulus, tarikh_diproses
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
 */
router.get("/", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  try {
    const query = `
      SELECT p.*, r.no_rujukan, r.risiko, u.nama_penuh AS nama_pemohon
      FROM permohonan_pindaan p
      JOIN "risiko" r ON p.risk_id = r.risiko_id
      JOIN pengguna u ON p.pengguna_id_pemohon = u.pengguna_id
      WHERE p.status_permohonan = 'Pending' ORDER BY p.created_at DESC;
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
  const { pengguna_id } = req.user;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const permohonanRes = await client.query(
      "SELECT * FROM permohonan_pindaan WHERE pindaan_id = $1 AND status_permohonan = 'Pending'", [pindaan_id]
    );
    if (permohonanRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Permohonan tidak dijumpai atau telah diproses." });
    }
    const permohonan = permohonanRes.rows[0];
    const { risk_id, data_selepas } = permohonan;
    const fieldsToUpdate = Object.keys(data_selepas);
    if (fieldsToUpdate.length > 0) {
      const setClause = fieldsToUpdate.map((key, index) => `"${key}" = $${index + 1}`).join(", ");
      const values = fieldsToUpdate.map(key => data_selepas[key]);
      values.push(risk_id);
      const updateQuery = `UPDATE "risiko" SET ${setClause} WHERE risiko_id = $${values.length}`;
      await client.query(updateQuery, values);
    }
    const updatePermohonanQuery = `
      UPDATE permohonan_pindaan SET status_permohonan = 'Approved', pengguna_id_pelulus = $1, tarikh_diproses = NOW()
      WHERE pindaan_id = $2 RETURNING *;
    `;
    const updatedPermohonan = await client.query(updatePermohonanQuery, [pengguna_id, pindaan_id]);
    await client.query("COMMIT");
    res.json({ message: "Permohonan berjaya diluluskan.", data: updatedPermohonan.rows[0] });
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
      UPDATE permohonan_pindaan SET status_permohonan = 'Rejected', pengguna_id_pelulus = $1, tarikh_diproses = NOW()
      WHERE pindaan_id = $2 AND status_permohonan = 'Pending' RETURNING *;
    `;
    const { rows } = await pool.query(updateQuery, [pengguna_id, pindaan_id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Permohonan tidak dijumpai atau telah diproses." });
    }
    res.json({ message: "Permohonan telah ditolak.", data: rows[0] });
  } catch (err) {
    console.error("❌ Ralat PUT /pindaan/:pindaan_id/reject:", err);
    res.status(500).json({ message: "Gagal menolak permohonan: " + err.message });
  }
});

export default router;
