import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";

const router = express.Router();

// ------------------- POST: Tambah Risiko (KEKAL SAMA) -------------------
router.post("/", verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  const user = req.user; 
  const {
    noRujukan, tahun, separuhTahun, subsidiari,
    kategori, bahagian, risiko,
    skorKebarangkalian, skorImpak, skorRisiko,
    statusRisiko, punca, kesan
  } = req.body;

  try {
    const allowedRoles = ["Admin", "Executive", "Staff", "Ketua Subsidiari"];
    if (!allowedRoles.includes(user.nama_peranan)) {
      client.release(); 
      return res.status(403).json({ error: "No permission to add risiko" });
    }

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      if (parseInt(subsidiari) !== user.subsidiari_id) {
        client.release(); 
        return res.status(403).json({ error: "No permission for other subsidiari" });
      }
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO risiko
      (no_rujukan, tahun, separuh_tahun, subsidiari, kategori, bahagian, risiko, 
        skor_kebarangkalian, skor_impak, skor_risiko, status_risiko)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING risiko_id`,
      [noRujukan, tahun, separuhTahun, subsidiari, kategori, bahagian, risiko,
        skorKebarangkalian, skorImpak, skorRisiko, statusRisiko]
    );

    const risikoId = result.rows[0].risiko_id;

    if (Array.isArray(punca)) {
      for (let p of punca) {
        if (p) await client.query(
          `INSERT INTO punca_risiko (risiko_id, punca) VALUES ($1,$2)`,
          [risikoId, p]
        );
      }
    }

    if (Array.isArray(kesan)) {
      for (let k of kesan) {
        if (k) await client.query(
          `INSERT INTO kesan_risiko (risiko_id, kesan) VALUES ($1,$2)`,
          [risikoId, k]
        );
      }
    }

    await client.query(
        `INSERT INTO LogPemantauan 
             (risiko_id, tahun_pemantauan, separuh_tahun_pemantauan, status_pemantauan)
          VALUES ($1, $2, $3, $4)`,
        [risikoId, tahun, separuhTahun, 'Buka']
    );

    await client.query('COMMIT');

    try {
      const logRingkasan = `Menambah risiko baru: ${noRujukan}.`;
      const logPerincian = `${user.nama_penuh} (ID Staf: ${user.staff_id}) telah menambah risiko baru dengan No. Rujukan: ${noRujukan}.`;
      await catatAktiviti(
        user.pengguna_id, 
        "Tambah Risiko", 
        logRingkasan, 
        logPerincian
      );
    } catch (logErr) {
      console.error("Gagal mencatat log selepas TAMBAH risiko:", logErr);
    }

    res.status(201).json({ 
        message: "Risiko dan log pemantauan berjaya didaftarkan", 
        risiko_id: risikoId 
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Ralat POST /risiko:", err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ------------------- GET: Semua Risiko (KEKAL SAMA) -------------------
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = req.user;
    let query = `
      WITH PemantauanTerkini AS (
        SELECT
          pm.log_id,
          pm.risiko_id,
          pm.tarikh_pemantauan,
          pm.tahun_pemantauan,
          pm.separuh_tahun_pemantauan,
          pm.skor_kebarangkalian_selepas,
          pm.skor_impak_selepas,
          pm.skor_risiko_pemantauan,
          pm.status_pemantauan,
          pm.catatan,
          pm.keberkesanan,
          pm.no_bil_kelulusan,
          pm.justifikasi_pindaan_pemantauan,
          pm.kekerapan_pemantauan,
          ROW_NUMBER() OVER (
            PARTITION BY pm.risiko_id 
            ORDER BY pm.tahun_pemantauan DESC, pm.tarikh_pemantauan DESC
          ) AS rn
        FROM LogPemantauan pm
      ),
      
      ButiranTerkini AS (
        SELECT 
          pt.log_id,
          STRING_AGG(DISTINCT pt.butiran_aktiviti, '; ') AS pemantauan_pelan_tindakan,
          STRING_AGG(DISTINCT kp.butiran_kakitangan, '; ') AS pemantauan_kakitangan
        FROM PelanTindakanPemantauan pt
        LEFT JOIN KakitanganPemantauan kp ON kp.log_id = pt.log_id
        GROUP BY pt.log_id
      ),
      
      RawatanAgregat AS (
        SELECT
          rr.risiko_id,
          STRING_AGG(DISTINCT ptr.pelan_tindakan, '; ') AS pelan_tindakan,
          rr.jenis_kawalan,
          rr.tempoh_siap AS tempoh_jangkaan_siap_tindakan,
          STRING_AGG(DISTINCT kr.nama_kakitangan, '; ') AS kakitangan_bertanggungjawab
        FROM rawatan_risiko rr
        LEFT JOIN pelan_tindakan_rawatan ptr ON ptr.rawatan_id = rr.rawatan_id
        LEFT JOIN kakitangan_rawatan kr ON kr.rawatan_id = rr.rawatan_id
        GROUP BY rr.risiko_id, rr.jenis_kawalan, rr.tempoh_siap
      )

      SELECT 
        r.risiko_id AS id,
        r.no_rujukan,
        r.tahun, 
        r.separuh_tahun,
        s.nama_subsidiari AS subsidiari,
        r.subsidiari AS subsidiari_id,
        r.bahagian,
        r.kategori,
        r.risiko,
        r.skor_kebarangkalian,
        r.skor_impak,
        r.skor_risiko, 
        r.status_risiko,
        r.justifikasi_pindaan_penilaian AS pindaan_penilaian,
        raw.pelan_tindakan,
        raw.jenis_kawalan,
        raw.tempoh_jangkaan_siap_tindakan,
        raw.kakitangan_bertanggungjawab,
        CASE 
          WHEN pt.tahun_pemantauan IS NOT NULL THEN pt.tahun_pemantauan || ' - ' || pt.separuh_tahun_pemantauan
          ELSE NULL
        END AS pemantauan_tahun_separuh,
        bt.pemantauan_pelan_tindakan,
        pt.kekerapan_pemantauan AS pemantauan_kekerapan,
        bt.pemantauan_kakitangan,
        pt.skor_kebarangkalian_selepas AS semasa_skor_kebarangkalian,
        pt.skor_impak_selepas AS semasa_skor_impak,
        pt.skor_risiko_pemantauan,
        pt.keberkesanan,
        pt.status_pemantauan,
        pt.justifikasi_pindaan_pemantauan AS pindaan_keberkesanan,
        pt.catatan,
        ARRAY(SELECT punca FROM punca_risiko WHERE risiko_id=r.risiko_id) AS punca,
        ARRAY(SELECT kesan FROM kesan_risiko WHERE risiko_id=r.risiko_id) AS kesan

      FROM risiko r
      LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
      LEFT JOIN RawatanAgregat raw ON raw.risiko_id = r.risiko_id
      LEFT JOIN PemantauanTerkini pt ON pt.risiko_id = r.risiko_id AND pt.rn = 1
      LEFT JOIN ButiranTerkini bt ON bt.log_id = pt.log_id
    `;

    const params = [];
    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      query += ` WHERE r.subsidiari::integer = $1`;
      params.push(user.subsidiari_id);
    }

    query += " ORDER BY r.tahun DESC, r.risiko_id DESC";

    const { rows } = await pool.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error("Ralat GET /risiko:", err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------- GET: Tahun Unik (KEKAL SAMA) -------------------
router.get("/tahun", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT DISTINCT tahun FROM risiko ORDER BY tahun DESC`);
    res.json(rows.map(r => r.tahun));
  } catch (err) {
    console.error("Ralat GET /risiko/tahun:", err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ PEMBETULAN: PUT endpoint kini update PUNCA dan KESAN
// ------------------- PUT: Update Risiko (DIPERBAIKI) -------------------
router.put("/:risiko_id", verifyToken, async (req, res) => {
  const client = await pool.connect();
  const risikoId = req.params.risiko_id;
  const user = req.user;
  const {
    noRujukan, tahun, separuhTahun, subsidiari,
    kategori, bahagian, risiko,
    skorKebarangkalian, skorImpak, skorRisiko,
    statusRisiko,
    punca,  // ✅ TAMBAH: Extract punca array
    kesan   // ✅ TAMBAH: Extract kesan array
  } = req.body;

  try {
    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      if (parseInt(subsidiari) !== user.subsidiari_id) {
        client.release();
        return res.status(403).json({ error: "No permission to update other subsidiari" });
      }
    }

    await client.query('BEGIN');

    // 1. Dapatkan no_rujukan asal
    const { rows: originalRows } = await client.query(
      "SELECT no_rujukan FROM risiko WHERE risiko_id = $1",
      [risikoId]
    );
    if (originalRows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: "Risiko tidak dijumpai." });
    }
    const noRujukanAsal = originalRows[0].no_rujukan;

    // 2. Update jadual risiko
    await client.query(
      `UPDATE risiko SET
        no_rujukan=$1, tahun=$2, separuh_tahun=$3, subsidiari=$4, kategori=$5, bahagian=$6,
        risiko=$7, skor_kebarangkalian=$8, skor_impak=$9, skor_risiko=$10,
        status_risiko=$11
        WHERE risiko_id=$12`,
      [noRujukan, tahun, separuhTahun, subsidiari, kategori, bahagian,
        risiko, skorKebarangkalian, skorImpak, skorRisiko, statusRisiko, risikoId]
    );

    // ✅ 3. UPDATE PUNCA_RISIKO (DELETE & INSERT)
    if (Array.isArray(punca)) {
      // Delete existing punca
      await client.query('DELETE FROM punca_risiko WHERE risiko_id = $1', [risikoId]);
      
      // Insert new punca
      for (let p of punca) {
        if (p && p.trim() !== "") {
          await client.query(
            'INSERT INTO punca_risiko (risiko_id, punca) VALUES ($1, $2)',
            [risikoId, p.trim()]
          );
        }
      }
    }

    // ✅ 4. UPDATE KESAN_RISIKO (DELETE & INSERT)
    if (Array.isArray(kesan)) {
      // Delete existing kesan
      await client.query('DELETE FROM kesan_risiko WHERE risiko_id = $1', [risikoId]);
      
      // Insert new kesan
      for (let k of kesan) {
        if (k && k.trim() !== "") {
          await client.query(
            'INSERT INTO kesan_risiko (risiko_id, kesan) VALUES ($1, $2)',
            [risikoId, k.trim()]
          );
        }
      }
    }

    await client.query('COMMIT');

    // 5. Catat Log Aktiviti
    try {
      const logRingkasan = `Mengemaskini risiko: ${noRujukanAsal}.`;
      let logPerincian = `${user.nama_penuh} (ID Staf: ${user.staff_id}) telah mengemaskini risiko (No. Rujukan Asal: ${noRujukanAsal}).`;
      if (noRujukanAsal !== noRujukan) {
        logPerincian += ` No. Rujukan telah ditukar kepada ${noRujukan}.`;
      }
      await catatAktiviti(
        user.pengguna_id,
        "Kemaskini Risiko",
        logRingkasan,
        logPerincian
      );
    } catch (logErr) {
      console.error("Gagal mencatat log selepas KEMASKINI risiko:", logErr);
    }

    res.json({ message: "Risiko berjaya dikemaskini" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Ralat PUT /risiko/:risiko_id:", err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ------------------- DELETE: Risiko (KEKAL SAMA) -------------------
router.delete("/:risiko_id", verifyToken, async (req, res) => {
  const risikoId = parseInt(req.params.risiko_id, 10); 
  const user = req.user;
  const client = await pool.connect(); 

  if (isNaN(risikoId)) {
    client.release();
    return res.status(400).json({ error: "risiko_id tidak sah, mesti integer." });
  }

  try {
    if (user.nama_peranan !== "Admin") {
      await client.release();
      return res.status(403).json({ error: "Hanya Admin dibenarkan untuk memadam data ini." });
    }
    
    const { rows } = await client.query(
      `SELECT no_rujukan FROM risiko WHERE risiko_id = $1`, 
      [risikoId]
    );
    
    if (!rows[0]) {
      await client.release(); 
      return res.status(404).json({ error: "Risiko tidak ditemui" });
    }
    const noRujukanUntukLog = rows[0].no_rujukan;

    await client.query('BEGIN');

    const rawatanIdsRes = await client.query('SELECT rawatan_id FROM rawatan_risiko WHERE risiko_id = $1', [risikoId]);
    const rawatanIds = rawatanIdsRes.rows.map(r => r.rawatan_id);

    const logIdsRes = await client.query('SELECT log_id FROM LogPemantauan WHERE risiko_id = $1', [risikoId]);
    const logIds = logIdsRes.rows.map(l => l.log_id);

    if (rawatanIds.length > 0) {
      await client.query('DELETE FROM pelan_tindakan_rawatan WHERE rawatan_id = ANY($1::integer[])', [rawatanIds]);
      await client.query('DELETE FROM kakitangan_rawatan WHERE rawatan_id = ANY($1::integer[])', [rawatanIds]);
    }
    if (logIds.length > 0) {
      await client.query('DELETE FROM PelanTindakanPemantauan WHERE log_id = ANY($1::uuid[])', [logIds]);
      await client.query('DELETE FROM KakitanganPemantauan WHERE log_id = ANY($1::uuid[])', [logIds]);
    }

    await client.query('DELETE FROM rawatan_risiko WHERE risiko_id = $1', [risikoId]);
    await client.query('DELETE FROM LogPemantauan WHERE risiko_id = $1', [risikoId]);
    await client.query('DELETE FROM punca_risiko WHERE risiko_id = $1', [risikoId]);
    await client.query('DELETE FROM kesan_risiko WHERE risiko_id = $1', [risikoId]);

    await client.query("DELETE FROM risiko WHERE risiko_id = $1", [risikoId]);

    await client.query('COMMIT');

    try {
      const logRingkasan = `Memadam risiko: ${noRujukanUntukLog}.`;
      const logPerincian = `${user.nama_penuh} (ID Staf: ${user.staff_id}) telah memadam risiko dengan No. Rujukan: ${noRujukanUntukLog}.`;
      await catatAktiviti(
        user.pengguna_id,
        "Padam Risiko",
        logRingkasan,
        logPerincian
      );
    } catch (logErr) {
      console.error("Gagal mencatat log selepas PADAM risiko:", logErr);
    }

    res.json({ message: "Risiko dan semua data berkaitan berjaya dipadam" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Ralat DELETE /risiko/:risiko_id:", err); 
    res.status(500).json({ message: "Transaksi gagal: " + err.message });
  } finally {
    client.release();
  }
});

// ------------------- GET: Check No Rujukan (KEKAL SAMA) -------------------
router.get("/check-no-rujukan/:noRujukan", verifyToken, async (req, res) => {
  try {
    const { noRujukan } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM risiko WHERE no_rujukan=$1`,
      [noRujukan]
    );

    if (rows.length > 0) {
      return res.json({ exists: true, data: rows[0] });
    } else {
      return res.json({ exists: false });
    }
  } catch (err) {
    console.error("Ralat GET /risiko/check-no-rujukan:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;