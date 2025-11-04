// =======================================================
// 📁 routes/pemantauan.js
// Modul: Pemantauan Risiko (Log, Sejarah, Senarai Terkini)
// =======================================================

import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// =======================================================
// ⭐️ LOGIK RISK MATRIX (Disalin dari Frontend) ⭐️
// =======================================================
const riskMatrix = {
  1: {1:{label:"R"}, 2:{label:"R"}, 3:{label:"S"}, 4:{label:"S"}, 5:{label:"T"}},
  2: {1:{label:"R"}, 2:{label:"R"}, 3:{label:"S"}, 4:{label:"S"}, 5:{label:"T"}},
  3: {1:{label:"R"}, 2:{label:"S"}, 3:{label:"S"}, 4:{label:"T"}, 5:{label:"T"}},
  4: {1:{label:"S"}, 2:{label:"S"}, 3:{label:"T"}, 4:{label:"T"}, 5:{label:"ST"}},
  5: {1:{label:"S"}, 2:{label:"T"}, 3:{label:"T"}, 4:{label:"ST"}, 5:{label:"ST"}},
};

/**
 * Mengira tahap risiko (ST, T, S, R) berdasarkan skor.
 * @param {number | string} k - Skor Kebarangkalian
 * @param {number | string} i - Skor Impak
 * @returns {string | null} - Mengembalikan label (cth: "ST") atau null
 */
const getRiskLevel = (k, i) => {
  const kk = parseInt(k);
  const ii = parseInt(i);
  // Hanya kira jika kedua-dua skor sah
  if (kk >= 1 && kk <= 5 && ii >= 1 && ii <= 5) {
    return riskMatrix[kk][ii].label;
  }
  return null; // Kembalikan null jika skor tidak sah
};

/* =======================================================
  🟢 GET: Semua Risiko + Pemantauan Terkini (Kekal Sama)
  ENDPOINT: /pemantauan-risiko
======================================================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = req.user;

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
          pm.skor_risiko_pemantauan,
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
          pm.justifikasi_pindaan_pemantauan,
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
        r.justifikasi_pindaan_penilaian,
        
        COALESCE(pt.skor_kebarangkalian_sebelum, r.skor_kebarangkalian) AS skor_kebarangkalian_sebelum,
        COALESCE(pt.skor_impak_sebelum, r.skor_impak) AS skor_impak_sebelum,
        pt.tahun_pemantauan,
        pt.separuh_tahun_pemantauan,
        bt.pelan_tindakan_terkini,
        bt.kakitangan_terkini,
        
        pt.status_pemantauan AS status_pemantauan_terkini,
        pt.catatan,
        pt.no_bil_kelulusan,
        pt.justifikasi_pindaan_pemantauan,
        
        CASE WHEN pt.log_id IS NOT NULL THEN pt.skor_kebarangkalian_selepas ELSE NULL END AS skor_kebarangkalian_terkini,
        CASE WHEN pt.log_id IS NOT NULL THEN pt.skor_impak_selepas ELSE NULL END AS skor_impak_terkini,
        pt.skor_risiko_pemantauan

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
    console.error("❌ Ralat GET /pemantauan-risiko:", err);
    res.status(500).json({ message: "Gagal memuatkan data pemantauan: " + err.message });
  }
});


/* =======================================================
  🟢 GET: Butiran Risiko Berdasarkan Risiko ID (Kekal Sama)
  ENDPOINT: /pemantauan-risiko/:risiko_id/info
======================================================= */
router.get("/:risiko_id/info", verifyToken, async (req, res) => {
  try {
    const { risiko_id } = req.params;
    const risikoIdInt = parseInt(risiko_id, 10);

    const query = `
      SELECT 
        r.risiko_id,
        r.no_rujukan,
        r.risiko,
        r.tahun AS tahun_risiko_asal,
        r.separuh_tahun AS separuh_tahun_risiko_asal,
        r.justifikasi_pindaan_penilaian,
        s.nama_subsidiari
      FROM Risiko r
      LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
      WHERE r.risiko_id = $1;
    `;

    const { rows } = await pool.query(query, [risikoIdInt]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Risiko tidak dijumpai." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Ralat GET /:risiko_id/info:", err);
    res.status(500).json({ message: "Gagal memuatkan maklumat risiko." });
  }
});

/* =======================================================
  🟢 GET: Sejarah Log untuk satu Risiko (Kekal Sama)
  ENDPOINT: /pemantauan-risiko/:risiko_id/sejarah
======================================================= */
router.get("/:risiko_id/sejarah", verifyToken, async (req, res) => {
  try {
    const { risiko_id } = req.params;
    const risikoIdInt = parseInt(risiko_id, 10);

    const logQuery = `
      SELECT 
        lp.log_id,
        lp.tahun_pemantauan,
        lp.separuh_tahun_pemantauan,
        lp.skor_kebarangkalian_selepas,
        lp.skor_impak_selepas,
        lp.skor_risiko_pemantauan,
        lp.keberkesanan,
        lp.status_pemantauan,
        lp.catatan,
        lp.justifikasi_pindaan_pemantauan,
        lp.no_bil_kelulusan,
        lp.kekerapan_pemantauan, 
        lp.tarikh_pemantauan,
        lp.tarikh_kemaskini,
        (SELECT ARRAY_AGG(pt.butiran_aktiviti) FROM PelanTindakanPemantauan pt WHERE pt.log_id = lp.log_id) AS pelan_tindakan_log,
        (SELECT ARRAY_AGG(kp.butiran_kakitangan) FROM KakitanganPemantauan kp WHERE kp.log_id = lp.log_id) AS kakitangan_log
      FROM LogPemantauan lp
      WHERE lp.risiko_id = $1
      ORDER BY lp.tahun_pemantauan DESC, lp.tarikh_pemantauan DESC;
    `;

    const { rows } = await pool.query(logQuery, [risikoIdInt]);
    res.json(rows);
  } catch (err) {
    console.error("❌ Ralat GET /:risiko_id/sejarah:", err);
    res.status(500).json({ message: "Gagal memuatkan sejarah pemantauan." });
  }
});


/* =======================================================
  🟡 GET: Semak Kewujudan Tahun & Separuh Tahun (Kekal Sama)
  ENDPOINT: /pemantauan-risiko/check-duplicate
======================================================= */
router.get("/check-duplicate", verifyToken, async (req, res) => {
  try {
    const { risiko_id, tahun, separuh } = req.query;

    if (!risiko_id || !tahun || !separuh) {
      return res.status(400).json({ message: "Parameter tidak lengkap." });
    }

    const risikoQuery = `
      SELECT tahun, separuh_tahun 
      FROM risiko 
      WHERE risiko_id = $1
    `;
    const risikoResult = await pool.query(risikoQuery, [risiko_id]);

    if (risikoResult.rows.length === 0) {
      return res.status(404).json({ message: "Risiko tidak dijumpai." });
    }

    const risikoTahun = parseInt(risikoResult.rows[0].tahun, 10);
    const risikoSeparuh = parseInt(risikoResult.rows[0].separuh_tahun, 10);
    const tahunPemantauan = parseInt(tahun, 10);
    const separuhPemantauan = parseInt(separuh, 10);

    if (
      tahunPemantauan < risikoTahun ||
      (tahunPemantauan === risikoTahun && separuhPemantauan <= risikoSeparuh)
    ) {
      return res.json({
        duplicate: false,
        invalid: true,
        message:
          "Tahun atau separuh tahun pemantauan tidak boleh sama atau lebih awal daripada risiko asal.",
      });
    }

    const checkQuery = `
      SELECT COUNT(*) AS count 
      FROM LogPemantauan 
      WHERE risiko_id = $1 
      AND tahun_pemantauan = $2 
      AND separuh_tahun_pemantauan = $3
    `;
    const { rows } = await pool.query(checkQuery, [
      risiko_id,
      tahunPemantauan,
      separuhPemantauan,
    ]);
    const duplicate = parseInt(rows[0].count, 10) > 0;

    if (duplicate) {
      return res.json({
        duplicate: true,
        invalid: false,
        message:
          "Log pemantauan untuk tahun & separuh tahun ini telah wujud.",
      });
    }

    res.json({
      duplicate: false,
      invalid: false,
      message: "Pemantauan sah untuk ditambah.",
    });
  } catch (err) {
    console.error("❌ Ralat GET /check-duplicate:", err);
    res
      .status(500)
      .json({ message: "Gagal menyemak data duplicate: " + err.message });
  }
});

/* =======================================================
  🟢 GET: Tahap Risiko Rujukan (Kekal Sama)
  ENDPOINT: /pemantauan-risiko/:risiko_id/tahap-rujukan
======================================================= */
router.get("/:risiko_id/tahap-rujukan", verifyToken, async (req, res) => {
  try {
    const { risiko_id } = req.params;

    const riskMatrixLocal = {
      1: {1:{label:"R"}, 2:{label:"R"}, 3:{label:"S"}, 4:{label:"S"}, 5:{label:"T"}},
      2: {1:{label:"R"}, 2:{label:"R"}, 3:{label:"S"}, 4:{label:"S"}, 5:{label:"T"}},
      3: {1:{label:"R"}, 2:{label:"S"}, 3:{label:"S"}, 4:{label:"T"}, 5:{label:"T"}},
      4: {1:{label:"S"}, 2:{label:"S"}, 3:{label:"T"}, 4:{label:"T"}, 5:{label:"ST"}},
      5: {1:{label:"S"}, 2:{label:"T"}, 3:{label:"T"}, 4:{label:"ST"}, 5:{label:"ST"}},
    };

    const getRiskLevelLocal = (k, i) => {
      const kk = Math.min(Math.max(parseInt(k || 1), 1), 5);
      const ii = Math.min(Math.max(parseInt(i || 1), 1), 5);
      return (riskMatrixLocal[kk] && riskMatrixLocal[kk][ii]) 
        ? riskMatrixLocal[kk][ii] 
        : { label: "Tiada" };
    };

    const { tahun, separuh } = req.query;

    let logQuery = `
      SELECT skor_kebarangkalian_selepas AS k, skor_impak_selepas AS i
      FROM logpemantauan
      WHERE risiko_id = $1
    `;
    const params = [risiko_id];

    if (tahun && separuh) {
      logQuery += `
        AND (
          tahun_pemantauan < $2
          OR (tahun_pemantauan = $2 AND separuh_tahun_pemantauan < $3)
        )
        ORDER BY tahun_pemantauan DESC, separuh_tahun_pemantauan DESC, tarikh_pemantauan DESC
        LIMIT 1
      `;
      params.push(parseInt(tahun, 10), parseInt(separuh, 10));
    } else {
      logQuery += `
        ORDER BY tahun_pemantauan DESC, tarikh_pemantauan DESC
        LIMIT 1
      `;
    }

    const logRes = await pool.query(logQuery, params);

    let k = 1, i = 1, sumber = "risiko";

    if (logRes.rows.length > 0 && logRes.rows[0].k && logRes.rows[0].i) {
      k = logRes.rows[0].k;
      i = logRes.rows[0].i;
      sumber = "log";
    } else {
      const risikoRes = await pool.query(
        `SELECT skor_kebarangkalian AS k, skor_impak AS i
         FROM risiko
         WHERE risiko_id = $1`,
        [risiko_id]
      );

      if (risikoRes.rows.length === 0) {
        return res.status(404).json({ message: "Risiko tidak dijumpai" });
      }

      k = risikoRes.rows[0].k;
      i = risikoRes.rows[0].i;
      sumber = "risiko";
    }

    const tahap = getRiskLevelLocal(k, i);

    res.json({
      risiko_id,
      sumber,
      skor_kebarangkalian: k,
      skor_impak: i,
      tahap_risiko_rujukan: tahap.label,
    });

  } catch (err) {
    console.error("❌ Ralat GET /:risiko_id/tahap-rujukan:", err);
    res.status(500).json({ message: err.message });
  }
});


/* =======================================================
  🟢 GET: Sejarah Log (sejarah-baru) (Kekal Sama)
  ENDPOINT: /pemantauan-risiko/:risiko_id/sejarah-baru
======================================================= */
router.get("/:risiko_id/sejarah-baru", verifyToken, async (req, res) => {
  try {
    const { risiko_id } = req.params;
    const risikoIdInt = parseInt(risiko_id, 10);

    const risikoQuery = `SELECT skor_kebarangkalian AS k_asal, skor_impak AS i_asal FROM Risiko WHERE risiko_id = $1`;
    const risikoResult = await pool.query(risikoQuery, [risikoIdInt]); 

    if (risikoResult.rows.length === 0) {
      return res.status(404).json({ message: "Risiko tidak dijumpai." });
    }

    const { k_asal, i_asal } = risikoResult.rows[0];

    const logQuery = `
      SELECT 
        lp.log_id, lp.tahun_pemantauan, lp.separuh_tahun_pemantauan, 
        lp.skor_kebarangkalian_selepas, lp.skor_impak_selepas, 
        lp.skor_risiko_pemantauan,
        lp.keberkesanan, lp.status_pemantauan, lp.catatan, 
        lp.justifikasi_pindaan_pemantauan,
        lp.no_bil_kelulusan, lp.kekerapan_pemantauan, 
        lp.tarikh_pemantauan, lp.tarikh_kemaskini, 
        (SELECT ARRAY_AGG(pt.butiran_aktiviti) FROM PelanTindakanPemantauan pt WHERE pt.log_id = lp.log_id) AS pelan_tindakan_log, 
        (SELECT ARRAY_AGG(kp.butiran_kakitangan) FROM KakitanganPemantauan kp WHERE kp.log_id = lp.log_id) AS kakitangan_log 
      FROM LogPemantauan lp 
      WHERE lp.risiko_id = $1 
      ORDER BY lp.tahun_pemantauan ASC, lp.separuh_tahun_pemantauan ASC, lp.tarikh_pemantauan ASC
    `;
    
    const { rows: logRows } = await pool.query(logQuery, [risikoIdInt]);

    let skorSebelumK = k_asal;
    let skorSebelumI = i_asal;
    
    const sejarahLog = logRows.map(log => {
      const skorSelepasK = log.skor_kebarangkalian_selepas;
      const skorSelepasI = log.skor_impak_selepas;

      const logSejarah = {
        ...log,
        skor_kebarangkalian_sebelum: skorSebelumK,
        skor_impak_sebelum: skorSebelumI,
      };

      if (skorSelepasK !== null && skorSelepasI !== null) {
        skorSebelumK = skorSelepasK;
        skorSebelumI = skorSelepasI;
      }
      
      return logSejarah;
    });

    const sejarahLogTerbalik = sejarahLog.reverse();
    res.json(sejarahLogTerbalik);

  } catch (err) {
    console.error("❌ Ralat GET /:risiko_id/sejarah-baru:", err);
    res.status(500).json({ message: "Gagal memuatkan sejarah pemantauan." });
  }
});


/* =======================================================
  ➕ POST: Tambah Log Pemantauan Baru (Kekal Sama)
  ENDPOINT: /pemantauan-risiko/log
======================================================= */
router.post("/log", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      risiko_id,
      tahun_pemantauan,
      separuh_tahun_pemantauan,
      skor_kebarangkalian_selepas,
      skor_impak_selepas,
      keberkesanan,
      status_pemantauan,
      catatan,
      justifikasi_pindaan_pemantauan,
      no_bil_kelulusan,
      kekerapan_pemantauan,
      pelan_tindakan_list,
      kakitangan_list
    } = req.body;

    if (!risiko_id || !tahun_pemantauan || !status_pemantauan) {
      return res.status(400).json({ message: "Sila isi semua medan wajib (risiko, tahun, status)." });
    }

    const skor_risiko_pemantauan = getRiskLevel(skor_kebarangkalian_selepas, skor_impak_selepas);

    const risikoIdInt = parseInt(risiko_id, 10);
    await client.query("BEGIN");

    const logInsertQuery = `
      INSERT INTO LogPemantauan (
        risiko_id, tahun_pemantauan, separuh_tahun_pemantauan,
        skor_kebarangkalian_selepas, skor_impak_selepas, keberkesanan,
        status_pemantauan, catatan, no_bil_kelulusan, kekerapan_pemantauan,
        justifikasi_pindaan_pemantauan, skor_risiko_pemantauan
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, $11, $12)
      RETURNING *;
    `;

    const logResult = await client.query(logInsertQuery, [
      risikoIdInt, tahun_pemantauan, separuh_tahun_pemantauan,
      skor_kebarangkalian_selepas, skor_impak_selepas, keberkesanan,
      status_pemantauan, catatan, no_bil_kelulusan, kekerapan_pemantauan,
      justifikasi_pindaan_pemantauan, // $11
      skor_risiko_pemantauan // $12
    ]);

    const newLog = logResult.rows[0];
    const new_log_id = newLog.log_id;

    if (pelan_tindakan_list?.length) {
      for (const item of pelan_tindakan_list) {
        await client.query(
          `INSERT INTO PelanTindakanPemantauan (log_id, butiran_aktiviti) VALUES ($1, $2)`,
          [new_log_id, item.butiran_aktiviti]
        );
      }
    }

    if (kakitangan_list?.length) {
      for (const item of kakitangan_list) {
        await client.query(
          `INSERT INTO KakitanganPemantauan (log_id, butiran_kakitangan) VALUES ($1, $2)`,
          [new_log_id, item.butiran_kakitangan]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({
      message: "Log Pemantauan berjaya ditambah.",
      data: newLog
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Ralat POST /pemantauan-risiko/log:", err);
    res.status(500).json({ message: "Gagal menambah log pemantauan: " + err.message });
  } finally {
    client.release();
  }
});

/* =======================================================
  ❌ DELETE: Padam Log Pemantauan (⭐️ DIKEMASKINI ⭐️)
  ENDPOINT: /pemantauan-risiko/log/:log_id
======================================================= */
router.delete("/log/:log_id", verifyToken, async (req, res) => {
  // ⭐️ BARU: Guna 'client' untuk transaksi
  const client = await pool.connect(); 
  const { log_id } = req.params;

  try {
    const check = await client.query("SELECT log_id FROM LogPemantauan WHERE log_id = $1", [log_id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ message: "Rekod pemantauan tidak dijumpai." });
    }

    // ⭐️ BARU: Mula transaksi
    await client.query("BEGIN");

    // ⭐️ BARU: 1. Padam 'children' dahulu
    await client.query("DELETE FROM PelanTindakanPemantauan WHERE log_id = $1", [log_id]);
    await client.query("DELETE FROM KakitanganPemantauan WHERE log_id = $1", [log_id]);
    
    // ⭐️ BARU: 2. Padam 'parent'
    await client.query("DELETE FROM LogPemantauan WHERE log_id = $1", [log_id]);

    // ⭐️ BARU: Tamat transaksi
    await client.query("COMMIT");

    res.json({ message: "Log pemantauan berjaya dipadam." });

  } catch (err) {
    // ⭐️ BARU: Rollback jika gagal
    await client.query("ROLLBACK");
    console.error("❌ Ralat DELETE /log/:log_id:", err);
    res.status(500).json({ message: "Gagal memadam log pemantauan: " + err.message });
  } finally {
    // ⭐️ BARU: Lepaskan client
    client.release();
  }
});


/* =======================================================
  PUT: Kemaskini Log Pemantauan (Kekal Sama)
  ENDPOINT: /pemantauan-risiko/log/:log_id
======================================================= */
router.put("/log/:log_id", verifyToken, async (req, res) => {
  const client = await pool.connect();
  const { log_id } = req.params;

  const {
    risiko_id,
    tahun_pemantauan,
    separuh_tahun_pemantauan,
    skor_kebarangkalian_selepas,
    skor_impak_selepas,
    keberkesanan,
    status_pemantauan,
    catatan,
    justifikasi_pindaan_pemantauan,
    no_bil_kelulusan,
    kekerapan_pemantauan,
    pelan_tindakan_list,
    kakitangan_list,
    pelan_tindakan_log,
    kakitangan_log,
  } = req.body;

  const skor_risiko_pemantauan = getRiskLevel(skor_kebarangkalian_selepas, skor_impak_selepas);

  const finalPelanList = (pelan_tindakan_list?.length ? pelan_tindakan_list : pelan_tindakan_log) || [];
  const finalKakitanganList = (kakitangan_list?.length ? kakitangan_list : kakitangan_log) || [];

  if (!log_id || !risiko_id) {
    return res.status(400).json({ message: "Log ID dan Risiko ID diperlukan" });
  }

  try {
    console.log("📩 PUT /log/:log_id diterima:", { log_id, risiko_id });
    await client.query("BEGIN");

    const logUpdateQuery = `
      UPDATE LogPemantauan
      SET 
        risiko_id = $1,
        tahun_pemantauan = $2,
        separuh_tahun_pemantauan = $3,
        skor_kebarangkalian_selepas = $4,
        skor_impak_selepas = $5,
        keberkesanan = $6,
        status_pemantauan = $7,
        catatan = $8,
        no_bil_kelulusan = $9,
        kekerapan_pemantauan = $10,
        justifikasi_pindaan_pemantauan = $11, 
        skor_risiko_pemantauan = $12,
        tarikh_kemaskini = NOW()
      WHERE log_id = $13;
    `;

    const logValues = [
      risiko_id,
      tahun_pemantauan,
      separuh_tahun_pemantauan,
      skor_kebarangkalian_selepas,
      skor_impak_selepas,
      keberkesanan,
      status_pemantauan,
      catatan,
      no_bil_kelulusan,
      kekerapan_pemantauan,
      justifikasi_pindaan_pemantauan, // $11
      skor_risiko_pemantauan, // $12
      log_id, // $13
    ];

    const logResult = await client.query(logUpdateQuery, logValues);
    if (logResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Log tidak dijumpai" });
    }

    await client.query("DELETE FROM PelanTindakanPemantauan WHERE log_id = $1", [log_id]);
    await client.query("DELETE FROM KakitanganPemantauan WHERE log_id = $1", [log_id]);
    
    if (Array.isArray(finalPelanList) && finalPelanList.length > 0) {
      for (const item of finalPelanList) {
        const butiran = (typeof item === "string")
          ? item.trim()
          : (item?.butiran_aktiviti || "").trim();
        if (!butiran) continue; 
        await client.query(
          `INSERT INTO PelanTindakanPemantauan (log_id, butiran_aktiviti)
           VALUES ($1, $2)`,
          [log_id, butiran]
        );
      }
    }
    if (Array.isArray(finalKakitanganList) && finalKakitanganList.length > 0) {
      for (const item of finalKakitanganList) {
        const butiran = (typeof item === "string")
          ? item.trim()
          : (item?.butiran_kakitangan || "").trim();
        if (!butiran) continue;
        await client.query(
          `INSERT INTO KakitanganPemantauan (log_id, butiran_kakitangan)
           VALUES ($1, $2)`,
          [log_id, butiran]
        );
      }
    }
    
    await client.query("COMMIT");

    res.json({
      message: "✅ Log berjaya dikemaskini",
      data: logResult.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Ralat PUT log:", err);
    res.status(500).json({
      message: "Ralat server semasa mengemaskini log.",
      error: err.message,
    });
  } finally {
    client.release();
  }
});

export default router;