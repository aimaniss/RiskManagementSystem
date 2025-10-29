// =======================================================
// 📁 routes/pindaan.js
// Modul: Permohonan Pindaan DAN Data Risiko Untuk Pindaan
// =======================================================

import express from "express";
import pool from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- (MULA) FUNGSI HELPER UNTUK KIRA SKOR ---
const riskMatrixDetails = {
    1: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    2: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    3: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    4: {1:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 2:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 3:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 4:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 5:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}},
    5: {1:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 2:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 3:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 4:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}, 5:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}},
};

const getRiskStylingFromMatrix = (likelihood, impact, matrix) => {
    const k_val = parseInt(likelihood, 10);
    const i_val = parseInt(impact, 10);
    if (!isNaN(k_val) && !isNaN(i_val) &&
        k_val >= 1 && k_val <= 5 && i_val >= 1 && i_val <= 5 &&
        matrix[k_val] && matrix[k_val][i_val])
    {
        return matrix[k_val][i_val];
    }
    return { label: "Tiada", shortLabel: "-", color: "#f1f5f9", textColor: "#334155" };
};
// --- (TAMAT) FUNGSI HELPER UNTUK KIRA SKOR ---

/**
 * -------------------------------------------------------
 * 📊 GET: Dapatkan Senarai Risiko Sedia Ada untuk Tujuan Permohonan Pindaan
 * ENDPOINT: /api/pindaan/risks-for-amendment
 * -------------------------------------------------------
 */
router.get("/risks-for-amendment", verifyToken, async (req, res) => {
  try {
    const user = req.user; 
    let query = `WITH RisikoAdaRawatan AS (
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
          pm.justifikasi_pindaan_pemantauan, -- <- PERLU ADA DI SINI
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
        
        r.skor_kebarangkalian AS skor_kebarangkalian_sebelum,
        r.skor_impak AS skor_impak_sebelum,
        
        -- ▼ PERUBAHAN 1: Ambil justifikasi penilaian dari jadual Risiko ▼
        r.justifikasi_pindaan_penilaian,

        pt.tahun_pemantauan,
        pt.separuh_tahun_pemantauan,
        bt.pelan_tindakan_terkini,
        bt.kakitangan_terkini,
        
        COALESCE(pt.status_pemantauan, 'Buka') AS status_pemantauan_terkini, 
        pt.catatan,

        -- ▼ PERUBAHAN 2: Ambil justifikasi pemantauan & namakan ia 'keberkesanan' ▼
        pt.justifikasi_pindaan_pemantauan AS keberkesanan,

        pt.no_bil_kelulusan,
       
        
        CASE WHEN pt.log_id IS NOT NULL THEN pt.skor_kebarangkalian_selepas ELSE NULL END AS skor_kebarangkalian_terkini,
        CASE WHEN pt.log_id IS NOT NULL THEN pt.skor_impak_selepas ELSE NULL END AS skor_impak_terkini

      FROM Risiko r
      JOIN RisikoAdaRawatan raw ON raw.risiko_id = r.risiko_id 
      LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
      LEFT JOIN PemantauanTerkini pt ON pt.risiko_id = r.risiko_id AND pt.rn = 1
      LEFT JOIN ButiranTerkini bt ON bt.log_id = pt.log_id
    `;
    const params = [];
    // Menapis risiko berdasarkan subsidiari pengguna jika Staff atau Ketua Subsidiari
    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      query += ` WHERE CAST(r.subsidiari AS INTEGER) = $1`;
      params.push(user.subsidiari_id);
    }

    query += ` ORDER BY r.tahun DESC, r.separuh_tahun DESC, r.no_rujukan ASC;`;

    const { rows } = await pool.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error("❌ Ralat GET /pindaan/risks-for-amendment:", err);
    res.status(500).json({ message: "Gagal memuatkan data risiko untuk pindaan: " + err.message });
  }
});


// ----------------------------------------------------------------------

/**
 * -------------------------------------------------------
 * ➕ POST: Hantar Permohonan Pindaan Baru (Lulus-Auto jika Admin)
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
    let status_permohonan = "Menunggu Kelulusan"; 
    let pengguna_id_pelulus = null;
    let tarikh_diproses = null;

    // Jika Admin, luluskan secara automatik dan kemas kini data risiko
    if (nama_peranan === "Admin") {
      status_permohonan = "Diluluskan"; 
      pengguna_id_pelulus = pengguna_id;
      tarikh_diproses = new Date();

      const RISIKO_FIELDS = ["skor_kebarangkalian", "skor_impak", "justifikasi_pindaan_penilaian"];
      const LOG_FIELDS = ["skor_kebarangkalian_selepas", "skor_impak_selepas"];
      
      const risikoUpdates = {};
      const logUpdates = {};
      let hasRisikoChanges = false;
      let hasLogChanges = false;

      for (const key in data_selepas) {
        if (RISIKO_FIELDS.includes(key)) {
          risikoUpdates[key] = data_selepas[key];
          hasRisikoChanges = true;
        } else if (LOG_FIELDS.includes(key)) {
          logUpdates[key] = data_selepas[key];
          hasLogChanges = true;
        }
      }

      if (penilaian) {
          risikoUpdates["justifikasi_pindaan_penilaian"] = penilaian;
          hasRisikoChanges = true;
      }

      // 1. Kemas kini Jadual RISIKO (Termasuk kiraan 'skor_risiko')
      if (hasRisikoChanges) {
        const riskRes = await client.query("SELECT skor_kebarangkalian, skor_impak FROM risiko WHERE risiko_id = $1", [risk_id]);
        if (riskRes.rowCount === 0) throw new Error("Risiko tidak dijumpai.");
        const currentScores = riskRes.rows[0];

        const k_final = risikoUpdates.skor_kebarangkalian ?? currentScores.skor_kebarangkalian;
        const i_final = risikoUpdates.skor_impak ?? currentScores.skor_impak;

        const riskLevelDetails = getRiskStylingFromMatrix(k_final, i_final, riskMatrixDetails);
        
        risikoUpdates.skor_risiko = riskLevelDetails.shortLabel; 

        const setClause = Object.keys(risikoUpdates)
          .map((key, index) => `"${key}" = $${index + 1}`)
          .join(", ");
        const values = Object.values(risikoUpdates);
        values.push(risk_id);
        const updateQuery = `UPDATE "risiko" SET ${setClause} WHERE risiko_id = $${values.length};`;
        await client.query(updateQuery, values);
      }

      // 2. INSERT REKOD BARU ke Jadual LOGPEMANTAUAN (Logik INSERT)
      if (hasLogChanges) {
        
        // A. Dapatkan data tahun/separuh tahun dari risiko
        const riskRes = await client.query("SELECT tahun, separuh_tahun FROM risiko WHERE risiko_id = $1", [risk_id]);
        if (riskRes.rowCount === 0) throw new Error("Risiko tidak dijumpai.");
        const { tahun, separuh_tahun } = riskRes.rows[0];

        // B. Kira skor risiko baru
        const k_selepas = logUpdates.skor_kebarangkalian_selepas;
        const i_selepas = logUpdates.skor_impak_selepas;
        const riskLevelDetails = getRiskStylingFromMatrix(k_selepas, i_selepas, riskMatrixDetails);
        const skor_risiko_level = riskLevelDetails.shortLabel;

        // C. Bina query INSERT
        const insertLogQuery = `INSERT INTO logpemantauan (
            risiko_id, tarikh_pemantauan, tahun_pemantauan, separuh_tahun_pemantauan,
            skor_kebarangkalian_selepas, skor_impak_selepas,
            skor_risiko_pemantauan,
            status_pemantauan, justifikasi_pindaan_pemantauan,
            created_at_pemantauan, created_by_pemantauan 
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10) RETURNING log_id;
        `;
        
        // D. Laksanakan query INSERT
        const logResult = await client.query(insertLogQuery, [
            risk_id,
            new Date(),
            tahun, 
            separuh_tahun,
            k_selepas || null,
            i_selepas || null,
            skor_risiko_level,
            'Selesai', // Pindaan diluluskan
            keberkesanan,
            pengguna_id // Admin yang meluluskan auto
        ]);
        
        const log_id_baru = logResult.rows[0].log_id;
        
        // ▼ PERUBAHAN 3: Kod ini dinyahaktifkan (dijadikan komen) ▼
        /*
        // E. INSERT rekod baru ke PelanTindakanPemantauan (tanpa created_at)
        await client.query(
          `INSERT INTO PelanTindakanPemantauan (log_id, butiran_aktiviti) VALUES ($1, $2)`,
          [log_id_baru, 'Pindaan Penilaian/Keberkesanan Diluluskan oleh Admin']
        );
        */
      }
    }

    // 3. Simpan rekod permohonan (semua pengguna)
    const insertQuery = `INSERT INTO permohonan_pindaan (
        risiko_id, pengguna_id_pemohon, status_permohonan,
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


// ----------------------------------------------------------------------

/**
 * -------------------------------------------------------
 * 🔍 GET: Dapatkan Senarai Permohonan Pindaan (Peranan-based Visibility)
 * ENDPOINT: /api/pindaan/
 * -------------------------------------------------------
 */
router.get("/", verifyToken, authorizeRoles("Admin", "Executive"), async (req, res) => {
  try {
    const { status, subsidiari_id } = req.query;
    const user = req.user; 
    
    let query = `SELECT 
        p.*, 
        r.no_rujukan, 
        r.risiko, 
        u.nama_penuh AS nama_pemohon,
        s.nama_subsidiari 
      FROM permohonan_pindaan p
      JOIN "risiko" r ON p.risiko_id = r.risiko_id
      JOIN pengguna u ON p.pengguna_id_pemohon = u.pengguna_id
        LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
      WHERE 1=1
    `; 
    const params = [];
    let paramIndex = 1;

    // --- 🌟 LOGIK PENAPISAN BERDASARKAN PERANAN 🌟 ---
    if (user.nama_peranan === "Executive") {
      // Executive: Hanya lihat permohonan yang dia mohon
      query += ` AND p.pengguna_id_pemohon = $${paramIndex++}`;
      params.push(user.pengguna_id); 
    } 
    
    // --- PENAPISAN LAIN ---
    
    // Penapisan Status
    if (status && status !== "Semua") {
      query += ` AND p.status_permohonan = $${paramIndex++}`;
      params.push(status); // Cth: 'Menunggu Kelulusan', 'Diluluskan', 'Ditolak'
    }

    // Penapisan Subsidiari (Hanya relevan untuk Admin)
    if (user.nama_peranan === "Admin" && subsidiari_id && subsidiari_id !== "Semua") {
      query += ` AND CAST(r.subsidiari AS INTEGER) = $${paramIndex++}`;
      params.push(subsidiari_id);
    }
    
    query += ` ORDER BY p.created_at DESC;`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Ralat GET /pindaan:", err);
    if (err.code === '42601') {
      return res.status(500).json({ message: "Ralat Sintaks SQL (42601) di BE. Sila semak semula pertanyaan SQL." });
    }
    res.status(500).json({ message: "Gagal memuatkan senarai permohonan." });
  }
});


// ----------------------------------------------------------------------

/**
 * -------------------------------------------------------
 * 🔵 PUT: Luluskan Permohonan (Oleh Admin)
 * ENDPOINT: /api/pindaan/:pindaan_id/approve
 * -------------------------------------------------------
 */
router.put("/:pindaan_id/approve", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  const { pindaan_id } = req.params;
  const { komen_pelulus } = req.body; 
  // 'pengguna_id' di sini ialah ID Admin yang meluluskan
  const { pengguna_id } = req.user; 
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const permohonanRes = await client.query(
      "SELECT * FROM permohonan_pindaan WHERE pindaan_id = $1 AND status_permohonan = 'Menunggu Kelulusan'", [pindaan_id] 
    );
    if (permohonanRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Permohonan tidak dijumpai atau telah diproses." });
    }
    
    const permohonan = permohonanRes.rows[0];
    // 'pengguna_id_pemohon' ialah ID pengguna asal yang memohon
    const { risiko_id, data_selepas, justifikasi_penilaian, justifikasi_keberkesanan, pengguna_id_pemohon } = permohonan;

    const RISIKO_FIELDS = ["skor_kebarangkalian", "skor_impak", "justifikasi_pindaan_penilaian"];
    const LOG_FIELDS = ["skor_kebarangkalian_selepas", "skor_impak_selepas"];
    
    const risikoUpdates = {};
    const logUpdates = {};
    let hasRisikoChanges = false;
    let hasLogChanges = false;

    for (const key in data_selepas) {
      if (RISIKO_FIELDS.includes(key)) {
        risikoUpdates[key] = data_selepas[key];
        hasRisikoChanges = true;
      } else if (LOG_FIELDS.includes(key)) {
        logUpdates[key] = data_selepas[key];
        hasLogChanges = true;
      }
    }

    if (justifikasi_penilaian) {
        risikoUpdates["justifikasi_pindaan_penilaian"] = justifikasi_penilaian;
        hasRisikoChanges = true;
    }

    // 1. Kemas kini Jadual RISIKO (Termasuk kiraan 'skor_risiko')
    if (hasRisikoChanges) {
        const riskRes = await client.query("SELECT skor_kebarangkalian, skor_impak FROM risiko WHERE risiko_id = $1", [risiko_id]);
        if (riskRes.rowCount === 0) throw new Error("Risiko tidak dijumpai.");
        const currentScores = riskRes.rows[0];

        const k_final = risikoUpdates.skor_kebarangkalian ?? currentScores.skor_kebarangkalian;
        const i_final = risikoUpdates.skor_impak ?? currentScores.skor_impak;

        const riskLevelDetails = getRiskStylingFromMatrix(k_final, i_final, riskMatrixDetails);
        
        risikoUpdates.skor_risiko = riskLevelDetails.shortLabel;

        const setClause = Object.keys(risikoUpdates)
          .map((key, index) => `"${key}" = $${index + 1}`)
          .join(", ");
        const values = Object.values(risikoUpdates);
        values.push(risiko_id);
        const updateQuery = `UPDATE "risiko" SET ${setClause} WHERE risiko_id = $${values.length};`;
        await client.query(updateQuery, values);
    }

    // ===================================================================
    // 2. INSERT REKOD BARU ke Jadual LOGPEMANTAUAN (Logik INSERT)
    // ===================================================================
    if (hasLogChanges) {
      
      // A. Dapatkan data tahun/separuh tahun dari risiko
      const riskRes = await client.query("SELECT tahun, separuh_tahun FROM risiko WHERE risiko_id = $1", [risiko_id]);
      if (riskRes.rowCount === 0) throw new Error("Risiko tidak dijumpai.");
      const { tahun, separuh_tahun } = riskRes.rows[0];

      // B. Kira skor risiko baru
      const k_selepas = logUpdates.skor_kebarangkalian_selepas;
      const i_selepas = logUpdates.skor_impak_selepas;
      const riskLevelDetails = getRiskStylingFromMatrix(k_selepas, i_selepas, riskMatrixDetails);
      const skor_risiko_level = riskLevelDetails.shortLabel;

      // C. Bina query INSERT
      const insertLogQuery = `INSERT INTO logpemantauan (
          risiko_id, tarikh_pemantauan, tahun_pemantauan, separuh_tahun_pemantauan,
          skor_kebarangkalian_selepas, skor_impak_selepas,
          skor_risiko_pemantauan,
          status_pemantauan, justifikasi_pindaan_pemantauan,
          created_at_pemantauan, created_by_pemantauan 
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10) RETURNING log_id;
      `;
      
      // D. Laksanakan query INSERT
      const logResult = await client.query(insertLogQuery, [
          risiko_id,
          new Date(),
          tahun, 
          separuh_tahun,
          k_selepas || null,
          i_selepas || null,
          skor_risiko_level,
          'Selesai', // Pindaan diluluskan
          justifikasi_keberkesanan,
          pengguna_id_pemohon // ID pengguna asal yang memohon
      ]);
      
      const log_id_baru = logResult.rows[0].log_id;
      
      // ▼ PERUBAHAN 4: Kod ini dinyahaktifkan (dijadikan komen) ▼
      /*
      // E. INSERT rekod baru ke PelanTindakanPemantauan (tanpa created_at)
      await client.query(
        `INSERT INTO PelanTindakanPemantauan (log_id, butiran_aktiviti) VALUES ($1, $2)`,
        [log_id_baru, 'Pindaan Penilaian/Keberkesanan Diluluskan oleh Admin']
      );
      */
    }
    // --- (TAMAT) Logik Kemas Kini Risiko dan LogPemantauan ---

    // 3. Kemas kini status permohonan itu sendiri
    const updatePermohonanQuery = `UPDATE permohonan_pindaan SET status_permohonan = 'Diluluskan', pengguna_id_pelulus = $1, tarikh_diproses = NOW(), komen_pelulus = $3
      WHERE pindaan_id = $2 RETURNING *;
    `; 
    // 'pengguna_id' di sini ialah ID Admin yang meluluskan
    const updatedPermohonan = await client.query(updatePermohonanQuery, [pengguna_id, pindaan_id, komen_pelulus || null]);
    
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
  const { komen_pelulus } = req.body; 
  const { pengguna_id } = req.user;
  try {
    const updateQuery = `UPDATE permohonan_pindaan SET status_permohonan = 'Ditolak', pengguna_id_pelulus = $1, tarikh_diproses = NOW(), komen_pelulus = $3
      WHERE pindaan_id = $2 AND status_permohonan = 'Menunggu Kelulusan' RETURNING *;
    `; 
    const { rows } = await pool.query(updateQuery, [pengguna_id, pindaan_id, komen_pelulus || null]);
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