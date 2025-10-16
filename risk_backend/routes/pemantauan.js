// =======================================================
// 📁 routes/pemantauan.js
// Modul: Pemantauan Risiko (Log, Sejarah, Senarai Terkini)
// =======================================================

import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =======================================================
   🟢 GET: Semua Risiko + Pemantauan Terkini
   ENDPOINT: /pemantauan-risiko
======================================================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = req.user;

    let query = `
      WITH PemantauanTerkini AS (
        SELECT
          pm.log_id, pm.risiko_id, pm.tarikh_pemantauan, pm.tahun_pemantauan, pm.separuh_tahun_pemantauan,
          pm.skor_kebarangkalian_selepas, pm.skor_impak_selepas, pm.status_pemantauan, pm.catatan,
          pm.keberkesanan, pm.no_bil_kelulusan,
          ROW_NUMBER() OVER (
            PARTITION BY pm.risiko_id 
            ORDER BY pm.tahun_pemantauan DESC, pm.tarikh_pemantauan DESC
          ) as rn
        FROM LogPemantauan pm
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
        pt.tahun_pemantauan,
        pt.separuh_tahun_pemantauan,
        bt.pelan_tindakan_terkini,
        bt.kakitangan_terkini,
        COALESCE(pt.status_pemantauan, 'Tiada Pemantauan') AS status_pemantauan_terkini, 
        pt.catatan,
        pt.no_bil_kelulusan,
        COALESCE(pt.skor_kebarangkalian_selepas, r.skor_kebarangkalian) AS skor_kebarangkalian_terkini,
        COALESCE(pt.skor_impak_selepas, r.skor_impak) AS skor_impak_terkini
      FROM Risiko r
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
   🟢 GET: Butiran Risiko Berdasarkan Risiko ID
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
   🟢 GET: Sejarah Log untuk satu Risiko
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
        lp.keberkesanan,
        lp.status_pemantauan,
        lp.catatan,
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
   🟡 GET: Semak Kewujudan Tahun & Separuh Tahun
   + Pastikan tahun pemantauan > tahun risiko
   + Jika tahun sama, separuh pemantauan > separuh risiko
   + Tahun/separuh sama atau lebih awal ❌ tidak dibenarkan
   ENDPOINT: /pemantauan-risiko/check-duplicate
   Query: ?risiko_id=1&tahun=2025&separuh=1
======================================================= */
router.get("/check-duplicate", verifyToken, async (req, res) => {
  try {
    const { risiko_id, tahun, separuh } = req.query;

    if (!risiko_id || !tahun || !separuh) {
      return res.status(400).json({ message: "Parameter tidak lengkap." });
    }

    // 🔹 1. Dapatkan tahun & separuh_tahun risiko asal
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

    // 🔹 2. Semak jika tahun atau separuh tahun sama / lebih awal
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

    // 🔹 3. Semak duplikasi (tahun & separuh tahun sama dengan log sedia ada)
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

    // 🔹 4. Balas hasil
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
   ➕ POST: Tambah Log Pemantauan Baru
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
      no_bil_kelulusan,
      kekerapan_pemantauan,
      pelan_tindakan_list,
      kakitangan_list
    } = req.body;

    if (!risiko_id || !tahun_pemantauan || !status_pemantauan) {
      return res.status(400).json({ message: "Sila isi semua medan wajib (risiko, tahun, status)." });
    }

    const risikoIdInt = parseInt(risiko_id, 10);
    await client.query("BEGIN");

    const logInsertQuery = `
      INSERT INTO LogPemantauan (
        risiko_id, tahun_pemantauan, separuh_tahun_pemantauan,
        skor_kebarangkalian_selepas, skor_impak_selepas, keberkesanan,
        status_pemantauan, catatan, no_bil_kelulusan, kekerapan_pemantauan
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *;
    `;

    const logResult = await client.query(logInsertQuery, [
      risikoIdInt, tahun_pemantauan, separuh_tahun_pemantauan,
      skor_kebarangkalian_selepas, skor_impak_selepas, keberkesanan,
      status_pemantauan, catatan, no_bil_kelulusan, kekerapan_pemantauan
    ]);

    const newLog = logResult.rows[0];
    const new_log_id = newLog.log_id;

    // Pelan Tindakan
    if (pelan_tindakan_list?.length) {
      for (const item of pelan_tindakan_list) {
        await client.query(
          `INSERT INTO PelanTindakanPemantauan (log_id, butiran_aktiviti) VALUES ($1, $2)`,
          [new_log_id, item.butiran_aktiviti]
        );
      }
    }

    // Kakitangan
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
   ❌ DELETE: Padam Log Pemantauan Berdasarkan log_id
   ENDPOINT: /pemantauan-risiko/log/:log_id
======================================================= */
router.delete("/log/:log_id", verifyToken, async (req, res) => {
  try {
    const { log_id } = req.params;

    // Semak kewujudan log
    const check = await pool.query("SELECT log_id FROM LogPemantauan WHERE log_id = $1", [log_id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ message: "Rekod pemantauan tidak dijumpai." });
    }

    // Hapus (cascade delete akan padam pelan tindakan & kakitangan)
    await pool.query("DELETE FROM LogPemantauan WHERE log_id = $1", [log_id]);

    res.json({ message: "Log pemantauan berjaya dipadam." });
  } catch (err) {
    console.error("❌ Ralat DELETE /log/:log_id:", err);
    res.status(500).json({ message: "Gagal memadam log pemantauan: " + err.message });
  }
});

export default router;
