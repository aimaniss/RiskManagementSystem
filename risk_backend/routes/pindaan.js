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

const getRiskShortLabelFromMatrix = (likelihood, impact, matrix) => {
    const details = getRiskStylingFromMatrix(likelihood, impact, matrix);
    return details.shortLabel;
}
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
    
    // =================================================================
    // ⭐️ DIKEMASKINI: CTE 'RisikoAdaRawatan' dibuang
    // =================================================================
    let query = `WITH 
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
          pm.justifikasi_pindaan_pemantauan,
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

        r.justifikasi_pindaan_penilaian,

        pt.tahun_pemantauan,
        pt.separuh_tahun_pemantauan,
        bt.pelan_tindakan_terkini,
        bt.kakitangan_terkini,

        COALESCE(pt.status_pemantauan, 'Buka') AS status_pemantauan_terkini,
        pt.catatan,

        pt.justifikasi_pindaan_pemantauan AS keberkesanan,

        pt.no_bil_kelulusan,


        CASE WHEN pt.log_id IS NOT NULL THEN pt.skor_kebarangkalian_selepas ELSE NULL END AS skor_kebarangkalian_terkini,
        CASE WHEN pt.log_id IS NOT NULL THEN pt.skor_impak_selepas ELSE NULL END AS skor_impak_terkini

      FROM Risiko r
      -- =================================================================
      -- ⭐️ DIKEMASKINI: 'JOIN RisikoAdaRawatan' dibuang
      -- =================================================================
      LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
      LEFT JOIN PemantauanTerkini pt ON pt.risiko_id = r.risiko_id AND pt.rn = 1
      LEFT JOIN ButiranTerkini bt ON bt.log_id = pt.log_id
    `;
    
    // =================================================================
    // ⭐️ DIKEMASKINI: Logik 'WHERE' diubah
    // =================================================================
    const params = [];
    let whereClause = ["r.skor_risiko IS NOT NULL"]; // Syarat baharu

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      params.push(user.subsidiari_id);
      whereClause.push(`CAST(r.subsidiari AS INTEGER) = $${params.length}`);
    }

    query += ` WHERE ${whereClause.join(" AND ")}`;
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
  // Ambil ID INTEGER dari req.user. Pastikan nama 'pengguna_id' betul
  const { pengguna_id: userIntegerId, nama_peranan } = req.user;
  let { data_sebelum, data_selepas } = perubahan;
  const { penilaian, keberkesanan } = justifikasi;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    let status_permohonan = "Menunggu Kelulusan";
    let pengguna_id_pelulus = null;
    let tarikh_diproses = null;

    data_sebelum = typeof data_sebelum === 'object' && data_sebelum !== null ? data_sebelum : {};
    data_selepas = typeof data_selepas === 'object' && data_selepas !== null ? data_selepas : {};

    // Dapatkan data asal LENGKAP dari DB
    const originalRiskRes = await client.query(
        `SELECT skor_kebarangkalian, skor_impak FROM risiko WHERE risiko_id = $1`,
        [risk_id]
    );
    const originalLogRes = await client.query(
        `SELECT skor_kebarangkalian_selepas, skor_impak_selepas
         FROM logpemantauan
         WHERE risiko_id = $1
         ORDER BY tahun_pemantauan DESC, tarikh_pemantauan DESC
         LIMIT 1`,
        [risk_id]
    );
    const completeOriginalData = {
        skor_kebarangkalian: originalRiskRes.rows[0]?.skor_kebarangkalian ?? null,
        skor_impak: originalRiskRes.rows[0]?.skor_impak ?? null,
        skor_kebarangkalian_selepas: originalLogRes.rows[0]?.skor_kebarangkalian_selepas ?? null,
        skor_impak_selepas: originalLogRes.rows[0]?.skor_impak_selepas ?? null,
    };

    // Bina keadaan akhir LENGKAP
    const completeFinalData = {
        skor_kebarangkalian: data_selepas.skor_kebarangkalian ?? completeOriginalData.skor_kebarangkalian,
        skor_impak: data_selepas.skor_impak ?? completeOriginalData.skor_impak,
        skor_kebarangkalian_selepas: data_selepas.skor_kebarangkalian_selepas ?? completeOriginalData.skor_kebarangkalian_selepas,
        skor_impak_selepas: data_selepas.skor_impak_selepas ?? completeOriginalData.skor_impak_selepas,
    };

    // Kira skor risiko & tambah ke data_sebelum/selepas JIKA perlu
    const RISIKO_FIELDS_INPUT = ["skor_kebarangkalian", "skor_impak"];
    const LOG_FIELDS_INPUT = ["skor_kebarangkalian_selepas", "skor_impak_selepas"];
    let hasPenilaianInputChange = RISIKO_FIELDS_INPUT.some(key => key in data_selepas);
    let hasKeberkesananInputChange = LOG_FIELDS_INPUT.some(key => key in data_selepas);

    if (hasPenilaianInputChange) {
        const beforeScore = getRiskShortLabelFromMatrix(completeOriginalData.skor_kebarangkalian, completeOriginalData.skor_impak, riskMatrixDetails);
        const afterScore = getRiskShortLabelFromMatrix(completeFinalData.skor_kebarangkalian, completeFinalData.skor_impak, riskMatrixDetails);
        if (beforeScore !== afterScore || ('skor_kebarangkalian' in data_selepas) || ('skor_impak' in data_selepas) ) {
             data_sebelum.skor_risiko_penilaian = beforeScore;
             data_selepas.skor_risiko_penilaian = afterScore;
        }
    }
    if (hasKeberkesananInputChange) {
        const beforeScore = getRiskShortLabelFromMatrix(completeOriginalData.skor_kebarangkalian_selepas, completeOriginalData.skor_impak_selepas, riskMatrixDetails);
        const afterScore = getRiskShortLabelFromMatrix(completeFinalData.skor_kebarangkalian_selepas, completeFinalData.skor_impak_selepas, riskMatrixDetails);
         if (beforeScore !== afterScore || ('skor_kebarangkalian_selepas' in data_selepas) || ('skor_impak_selepas' in data_selepas) ) {
             data_sebelum.skor_risiko_keberkesanan = beforeScore;
             data_selepas.skor_risiko_keberkesanan = afterScore;
         }
    }

    // --- Logik Lulus Auto Admin ---
    if (nama_peranan === "Admin") {
      status_permohonan = "Diluluskan";
      pengguna_id_pelulus = userIntegerId; // Simpan ID INTEGER Admin
      tarikh_diproses = new Date();

      let hasRisikoChanges = hasPenilaianInputChange || penilaian;
      let hasLogChanges = hasKeberkesananInputChange || keberkesanan;

      const risikoUpdates = {};
      const logUpdates = {};

      if (hasRisikoChanges) {
          if ('skor_kebarangkalian' in data_selepas) risikoUpdates.skor_kebarangkalian = data_selepas.skor_kebarangkalian;
          if ('skor_impak' in data_selepas) risikoUpdates.skor_impak = data_selepas.skor_impak;
          if ('skor_risiko_penilaian' in data_selepas) {
               risikoUpdates.skor_risiko = data_selepas.skor_risiko_penilaian !== '-' ? data_selepas.skor_risiko_penilaian : null;
          }
      }
      if (penilaian) {
          risikoUpdates.justifikasi_pindaan_penilaian = penilaian;
      }

      if (hasLogChanges) {
          if ('skor_kebarangkalian_selepas' in data_selepas) logUpdates.skor_kebarangkalian_selepas = data_selepas.skor_kebarangkalian_selepas;
          if ('skor_impak_selepas' in data_selepas) logUpdates.skor_impak_selepas = data_selepas.skor_impak_selepas;
          if ('skor_risiko_keberkesanan' in data_selepas) {
               logUpdates.skor_risiko_pemantauan = data_selepas.skor_risiko_keberkesanan !== '-' ? data_selepas.skor_risiko_keberkesanan : null;
          }
      }
      if (keberkesanan) {
          logUpdates.justifikasi_pindaan_pemantauan = keberkesanan;
      }

      // 1. Kemas kini Jadual RISIKO
      if (hasRisikoChanges && Object.keys(risikoUpdates).length > 0) {
        const setClause = Object.keys(risikoUpdates).map((key, index) => `"${key}" = $${index + 1}`).join(", ");
        const values = Object.values(risikoUpdates); values.push(risk_id);
        const updateQuery = `UPDATE "risiko" SET ${setClause} WHERE risiko_id = $${values.length};`;
        await client.query(updateQuery, values);
      }

      // 2. KEMAS KINI REKOD LOGPEMANTAUAN SEDIA ADA
      if (hasLogChanges && Object.keys(logUpdates).length > 0) {
        const latestLogRes = await client.query(
         `SELECT log_id FROM LogPemantauan WHERE risiko_id = $1 ORDER BY tahun_pemantauan DESC, tarikh_pemantauan DESC LIMIT 1`,
         [risk_id]
        );
        if (latestLogRes.rowCount > 0) {
          const log_id_terkini = latestLogRes.rows[0].log_id;
          logUpdates.updated_by_pemantauan = userIntegerId; // ID INTEGER Admin
          logUpdates.update_at_pemantauan = 'NOW()';

          const setClause = Object.keys(logUpdates).map((key, index) => `"${key}" = ${key === 'update_at_pemantauan' ? logUpdates[key] : `$${index + 1}`}`).join(", ");
          const values = Object.values(logUpdates).filter(val => val !== 'NOW()'); values.push(log_id_terkini);
          const updateLogQuery = `UPDATE logpemantauan SET ${setClause} WHERE log_id = $${values.length}`;
          await client.query(updateLogQuery, values);
        } else { console.warn(`Tiada log pemantauan sedia ada untuk risiko ID ${risk_id}. Pindaan keberkesanan tidak dikemaskini.`); }
      }
    } // --- Tamat Lulus Auto Admin ---

    // 3. Simpan rekod permohonan (semua pengguna)
    const insertQuery = `INSERT INTO permohonan_pindaan (
        risiko_id, pengguna_id_pemohon, status_permohonan,
        data_sebelum, data_selepas,
        justifikasi_penilaian, justifikasi_keberkesanan,
        pengguna_id_pelulus, tarikh_diproses, created_at,
        sebab_ditolak
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NULL) RETURNING *;
    `;
    const newPermohonan = await client.query(insertQuery, [
      risk_id, userIntegerId, status_permohonan, // Guna ID INTEGER pemohon
      data_sebelum, data_selepas, // Hantar objek JSON yang telah dikira skor
      penilaian || null, keberkesanan || null,
      pengguna_id_pelulus, tarikh_diproses // pengguna_id_pelulus adalah INTEGER Admin jika auto-lulus
    ]);

    await client.query("COMMIT");
    res.status(201).json({
      message: "Permohonan pindaan berjaya dihantar.",
      data: newPermohonan.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Ralat POST /pindaan/:risk_id:", err);
    if (err.code === '42804') { res.status(500).json({ message: `Gagal memproses permohonan: Ralat jenis data (${err.message}). Semak ID pengguna.` }); }
    else { res.status(500).json({ message: "Gagal memproses permohonan: " + err.message }); }
  } finally {
    client.release();
  }
});

/**
 * -------------------------------------------------------
 * 📊 GET: Dapatkan Statistik Permohonan Pindaan
 * ENDPOINT: /api/pindaan/stats
 * -------------------------------------------------------
 */
router.get("/stats", verifyToken, authorizeRoles("Admin"), async (req, res) => {
    try {
        const query = `
            SELECT
                COUNT(*) FILTER (WHERE status_permohonan = 'Menunggu Kelulusan') AS menunggu,
                COUNT(*) FILTER (WHERE status_permohonan = 'Diluluskan') AS diluluskan,
                COUNT(*) FILTER (WHERE status_permohonan = 'Ditolak') AS ditolak
            FROM
                permohonan_pindaan;
        `;
        
        const { rows } = await pool.query(query);
        
        // Rows[0] akan mengandungi: { menunggu: '5', diluluskan: '10', ditolak: '2' }
        // Nilai dikembalikan sebagai string, jadi kita tukarkannya kepada integer
        const stats = {
            menunggu: parseInt(rows[0].menunggu) || 0,
            diluluskan: parseInt(rows[0].diluluskan) || 0,
            ditolak: parseInt(rows[0].ditolak) || 0,
        };

        // Respons JSON akan sepadan dengan yang dicari oleh frontend: 
        // { menunggu: 5, diluluskan: 10, ditolak: 2 }
        res.json(stats); 

    } catch (err) {
        console.error("❌ Ralat GET /pindaan/stats:", err);
        // Sila pastikan anda mengembalikan format ralat yang boleh ditangani jika perlu
        res.status(500).json({ message: "Gagal memuatkan statistik pindaan." });
    }
});

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------

/**
 * -------------------------------------------------------
 * 🔍 GET: Dapatkan Senarai Permohonan Pindaan (Termasuk Data Pemantauan Terkini)
 * ENDPOINT: /api/pindaan/
 * -------------------------------------------------------
 */
router.get("/", verifyToken, authorizeRoles("Admin", "Executive"), async (req, res) => {
  try {
    const { status, subsidiari_id } = req.query;
    const user = req.user;

    let query = `
      WITH LogTerkini AS (
        SELECT
          lp.risiko_id,
          lp.tahun_pemantauan,
          lp.separuh_tahun_pemantauan,
          ROW_NUMBER() OVER (PARTITION BY lp.risiko_id ORDER BY lp.tahun_pemantauan DESC, lp.tarikh_pemantauan DESC) as rn
        FROM logpemantauan lp
      )
      SELECT
        p.*,
        r.no_rujukan,
        r.risiko,
        r.tahun AS tahun_daftar,
        r.separuh_tahun AS separuh_tahun_daftar,
        u.nama_penuh AS nama_pemohon,
        s.nama_subsidiari,
        lt.tahun_pemantauan,
        lt.separuh_tahun_pemantauan
      FROM permohonan_pindaan p
      JOIN "risiko" r ON p.risiko_id = r.risiko_id
      JOIN pengguna u ON p.pengguna_id_pemohon = u.pengguna_id -- Pastikan pengguna_id_pemohon adalah INTEGER
      LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
      LEFT JOIN LogTerkini lt ON p.risiko_id = lt.risiko_id AND lt.rn = 1
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    /* (Executive kini boleh lihat semua) */

    if (status && status !== "Semua") {
      query += ` AND p.status_permohonan = $${paramIndex++}`;
      params.push(status);
    }

    if (user.nama_peranan === "Admin" && subsidiari_id && subsidiari_id !== "Semua") {
      query += ` AND CAST(r.subsidiari AS INTEGER) = $${paramIndex++}`;
      params.push(subsidiari_id);
    }

    query += ` ORDER BY p.created_at DESC;`;

    const { rows } = await pool.query(query, params);

    const results = rows.map(row => ({
        ...row,
        tahun: row.tahun_daftar,
        separuh_tahun: row.separuh_tahun_daftar,
    }));

    res.json(results);

  } catch (err) {
    console.error("❌ Ralat GET /pindaan:", err);
    if (err.code === '42601') { return res.status(500).json({ message: "Ralat Sintaks SQL (42601) di BE." }); }
    else if (err.code === '42P01') { return res.status(500).json({ message: `Ralat Pangkalan Data (42P01): ${err.message}.` }); }
    else if (err.code === '42703') { return res.status(500).json({ message: `Ralat Pangkalan Data (42703): Lajur tidak dikenali - ${err.message}.` });}
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
  // Ambil ID INTEGER Admin dari req.user
  const { pengguna_id: adminIntegerId } = req.user;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const permohonanRes = await client.query(
      "SELECT * FROM permohonan_pindaan WHERE pindaan_id = $1 AND status_permohonan = 'Menunggu Kelulusan'", [pindaan_id]
    );
    if (permohonanRes.rowCount === 0) { /* ... error handling ... */
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Permohonan tidak dijumpai atau telah diproses." });
    }

    const permohonan = permohonanRes.rows[0];
    const { risiko_id, data_selepas, justifikasi_penilaian, justifikasi_keberkesanan, pengguna_id_pemohon } = permohonan;

    let hasRisikoChanges = ['skor_kebarangkalian', 'skor_impak'].some(key => key in data_selepas) || justifikasi_penilaian;
    let hasLogChanges = ['skor_kebarangkalian_selepas', 'skor_impak_selepas'].some(key => key in data_selepas) || justifikasi_keberkesanan;

    // 1. Kemas kini Jadual RISIKO
    if (hasRisikoChanges) { /* ... Kod UPDATE Risiko kekal sama ... */
        const risikoUpdates = {};
        if ('skor_kebarangkalian' in data_selepas) risikoUpdates.skor_kebarangkalian = data_selepas.skor_kebarangkalian;
        if ('skor_impak' in data_selepas) risikoUpdates.skor_impak = data_selepas.skor_impak;
        if ('skor_risiko_penilaian' in data_selepas) { const calculatedRiskScore = data_selepas.skor_risiko_penilaian; risikoUpdates.skor_risiko = calculatedRiskScore !== '-' ? calculatedRiskScore : null; }
        if (justifikasi_penilaian) risikoUpdates.justifikasi_pindaan_penilaian = justifikasi_penilaian;
        if (Object.keys(risikoUpdates).length > 0) {
             const setClause = Object.keys(risikoUpdates).map((key, index) => `"${key}" = $${index + 1}`).join(", ");
             const values = Object.values(risikoUpdates); values.push(risiko_id);
             const updateQuery = `UPDATE "risiko" SET ${setClause} WHERE risiko_id = $${values.length};`;
             await client.query(updateQuery, values);
        } else { console.log(`Tiada medan risiko spesifik untuk dikemaskini bagi risiko ID ${risiko_id} semasa kelulusan.`); }
    }

    // 2. KEMAS KINI REKOD LOGPEMANTAUAN SEDIA ADA
    if (hasLogChanges) {
        const latestLogRes = await client.query(
         `SELECT log_id FROM LogPemantauan WHERE risiko_id = $1 ORDER BY tahun_pemantauan DESC, tarikh_pemantauan DESC LIMIT 1`,
         [risiko_id]
        );

        if (latestLogRes.rowCount > 0) {
            const log_id_terkini = latestLogRes.rows[0].log_id;
            const logUpdates = {};

            if ('skor_kebarangkalian_selepas' in data_selepas) logUpdates.skor_kebarangkalian_selepas = data_selepas.skor_kebarangkalian_selepas;
            if ('skor_impak_selepas' in data_selepas) logUpdates.skor_impak_selepas = data_selepas.skor_impak_selepas;
            if ('skor_risiko_keberkesanan' in data_selepas) { const calculatedRiskScoreLog = data_selepas.skor_risiko_keberkesanan; logUpdates.skor_risiko_pemantauan = calculatedRiskScoreLog !== '-' ? calculatedRiskScoreLog : null; }
            if (justifikasi_keberkesanan) logUpdates.justifikasi_pindaan_pemantauan = justifikasi_keberkesanan;

            // Guna ID INTEGER Admin untuk updated_by_pemantauan
            logUpdates.updated_by_pemantauan = adminIntegerId;
            logUpdates.update_at_pemantauan = 'NOW()';

            const fieldsToUpdate = Object.keys(logUpdates).filter(k => k !== 'update_at_pemantauan' && k !== 'updated_by_pemantauan');

            if (fieldsToUpdate.length > 0) {
                 const setClause = Object.keys(logUpdates)
                   .map((key, index) => `"${key}" = ${key === 'update_at_pemantauan' ? logUpdates[key] : `$${index + 1}`}`)
                   .join(", ");

                const values = Object.values(logUpdates).filter(val => val !== 'NOW()');
                values.push(log_id_terkini);

                const updateLogQuery = `UPDATE logpemantauan SET ${setClause} WHERE log_id = $${values.length}`;
                await client.query(updateLogQuery, values);
            } else {
                 console.log(`Tiada medan log spesifik untuk dikemaskini bagi log ID ${log_id_terkini} semasa kelulusan.`);
            }
        } else {
             console.warn(`Tiada log pemantauan sedia ada untuk risiko ID ${risiko_id}. Pindaan keberkesanan tidak dikemaskini semasa kelulusan.`);
        }
    }

    // 3. Kemas kini status permohonan itu sendiri (tanpa komen_pelulus)
    const updatePermohonanQuery = `UPDATE permohonan_pindaan SET
        status_permohonan = 'Diluluskan',
        pengguna_id_pelulus = $1, -- Guna ID INTEGER Admin
        tarikh_diproses = NOW()
      WHERE pindaan_id = $2 RETURNING *;
    `;
    const updatedPermohonan = await client.query(updatePermohonanQuery, [adminIntegerId, pindaan_id]); // Guna ID INTEGER Admin

    await client.query("COMMIT");
    res.json({ message: "Permohonan berjaya diluluskan.", data: updatedPermohonan.rows[0] });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Ralat PUT /pindaan/:pindaan_id/approve:", err);
     if (err.code === '42804') { res.status(500).json({ message: `Gagal meluluskan permohonan: Ralat jenis data (${err.message}). Semak ID pengguna.` }); }
     else { res.status(500).json({ message: "Gagal meluluskan permohonan: " + err.message }); }
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
  // Ambil ID INTEGER Admin dari req.user
  const { pengguna_id: adminIntegerId } = req.user;
  try {
    // Guna 'sebab_ditolak' dan ID INTEGER Admin
    const updateQuery = `UPDATE permohonan_pindaan SET
        status_permohonan = 'Ditolak',
        pengguna_id_pelulus = $1, -- Simpan ID INTEGER Admin
        tarikh_diproses = NOW(),
        sebab_ditolak = $3
      WHERE pindaan_id = $2 AND status_permohonan = 'Menunggu Kelulusan' RETURNING *;
    `;
    const { rows } = await pool.query(updateQuery, [adminIntegerId, pindaan_id, komen_pelulus || null]); // Guna ID INTEGER Admin
    if (rows.length === 0) {
      return res.status(404).json({ message: "Permohonan tidak dijumpai atau telah diproses." });
    }
    res.json({ message: "Permohonan telah ditolak.", data: rows[0] });
  } catch (err) {
    console.error("❌ Ralat PUT /pindaan/:pindaan_id/reject:", err);
     if (err.code === '42804') { res.status(500).json({ message: `Gagal menolak permohonan: Ralat jenis data (${err.message}). Semak ID pengguna.` }); }
     else { res.status(500).json({ message: "Gagal menolak permohonan: " + err.message }); }
  }
});

export default router;