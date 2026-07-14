import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";

const router = express.Router();

// ===============================================================
// HELPER FUNCTION: Risk Matrix
// ===============================================================
const riskMatrix = {
  1: {1:{label:"R"}, 2:{label:"R"}, 3:{label:"S"}, 4:{label:"S"}, 5:{label:"T"}},
  2: {1:{label:"R"}, 2:{label:"R"}, 3:{label:"S"}, 4:{label:"S"}, 5:{label:"T"}},
  3: {1:{label:"R"}, 2:{label:"S"}, 3:{label:"S"}, 4:{label:"T"}, 5:{label:"T"}},
  4: {1:{label:"S"}, 2:{label:"S"}, 3:{label:"T"}, 4:{label:"T"}, 5:{label:"ST"}},
  5: {1:{label:"S"}, 2:{label:"T"}, 3:{label:"T"}, 4:{label:"ST"}, 5:{label:"ST"}},
};

const getRiskLevel = (k, i) => {
  const kk = parseInt(k);
  const ii = parseInt(i);
  if (kk >= 1 && kk <= 5 && ii >= 1 && ii <= 5) {
    return riskMatrix[kk][ii].label;
  }
  return null;
};

// ------------------- POST: Tambah Risiko -------------------
router.post("/", verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  const user = req.user; 
  const {
    noRujukan, tahun, separuhTahun, syarikatId,
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
      if (parseInt(syarikatId) !== user.syarikat_id) {
        client.release(); 
        return res.status(403).json({ error: "No permission for other subsidiari" });
      }
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO risiko
      (no_rujukan, tahun, separuh_tahun, syarikat_id, kategori, bahagian, risiko, 
        skor_kebarangkalian, skor_impak, skor_risiko, status_risiko)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING risiko_id`,
      [noRujukan, tahun, separuhTahun, syarikatId, kategori, bahagian, risiko,
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

// ------------------- GET: Semua Risiko -------------------
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
          rr.rawatan_id,
          STRING_AGG(DISTINCT ptr.pelan_tindakan, '; ') AS pelan_tindakan,
          rr.jenis_kawalan,
          rr.tempoh_siap AS tempoh_jangkaan_siap_tindakan,
          STRING_AGG(DISTINCT kr.nama_kakitangan, '; ') AS kakitangan_bertanggungjawab
        FROM rawatan_risiko rr
        LEFT JOIN pelan_tindakan_rawatan ptr ON ptr.rawatan_id = rr.rawatan_id
        LEFT JOIN kakitangan_rawatan kr ON kr.rawatan_id = rr.rawatan_id
        GROUP BY rr.risiko_id, rr.rawatan_id, rr.jenis_kawalan, rr.tempoh_siap
      )

      SELECT 
        r.risiko_id AS id,
        r.no_rujukan,
        r.tahun, 
        r.separuh_tahun,
        s.nama_syarikat AS syarikat,
        s.singkatan AS singkatan_syarikat,
        r.syarikat_id AS syarikat_id,
        r.bahagian,
        r.kategori,
        r.risiko,
        r.skor_kebarangkalian,
        r.skor_impak,
        r.skor_risiko, 
        r.status_risiko,
        r.justifikasi_pindaan_penilaian AS pindaan_penilaian,
        raw.rawatan_id,
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
      LEFT JOIN syarikat s ON s.syarikat_id = CAST(r.syarikat_id AS INTEGER)
      LEFT JOIN RawatanAgregat raw ON raw.risiko_id = r.risiko_id
      LEFT JOIN PemantauanTerkini pt ON pt.risiko_id = r.risiko_id AND pt.rn = 1
      LEFT JOIN ButiranTerkini bt ON bt.log_id = pt.log_id
    `;

    const params = [];
    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      query += ` WHERE r.syarikat_id::integer = $1`;
      params.push(user.syarikat_id);
    }

    query += " ORDER BY r.tahun DESC, r.risiko_id DESC";

    const { rows } = await pool.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error("Ralat GET /risiko:", err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------- GET: Tahun Unik -------------------
router.get("/tahun", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT DISTINCT tahun FROM risiko ORDER BY tahun DESC`);
    res.json(rows.map(r => r.tahun));
  } catch (err) {
    console.error("Ralat GET /risiko/tahun:", err);
    res.status(500).json({ message: err.message });
  }
});

// ===============================================================
// ✅ GET Rawatan Data by Risiko ID
// ===============================================================
router.get("/:risiko_id/rawatan", verifyToken, async (req, res) => {
  try {
    const { risiko_id } = req.params;
    console.log("📍 GET /risiko/:risiko_id/rawatan called with:", risiko_id);

    const rawatanQuery = `
      SELECT 
        rr.rawatan_id,
        rr.risiko_id,
        rr.jenis_kawalan,
        rr.tempoh_siap as tempoh_jangkaan_siap
      FROM rawatan_risiko rr
      WHERE rr.risiko_id = $1
      LIMIT 1
    `;
    
    const { rows: rawatanRows } = await pool.query(rawatanQuery, [risiko_id]);
    
    if (rawatanRows.length === 0) {
      console.log("⚠️ Rawatan tidak dijumpai untuk risiko_id:", risiko_id);
      return res.status(404).json({ 
        message: "Rawatan tidak dijumpai untuk risiko ini" 
      });
    }

    const rawatan = rawatanRows[0];

    const planQuery = `
      SELECT pelan_tindakan 
      FROM pelan_tindakan_rawatan 
      WHERE rawatan_id = $1
    `;
    const { rows: planRows } = await pool.query(planQuery, [rawatan.rawatan_id]);
    rawatan.plan_tindakan = planRows.map(r => r.pelan_tindakan);

    const kakitanganQuery = `
      SELECT nama_kakitangan 
      FROM kakitangan_rawatan 
      WHERE rawatan_id = $1
    `;
    const { rows: kakitanganRows } = await pool.query(kakitanganQuery, [rawatan.rawatan_id]);
    rawatan.kakitangan_bertanggungjawab = kakitanganRows.map(r => r.nama_kakitangan);

    console.log("✅ Rawatan data fetched successfully:", rawatan);
    res.json(rawatan);

  } catch (err) {
    console.error("❌ Ralat GET /risiko/:risiko_id/rawatan:", err);
    res.status(500).json({ message: err.message });
  }
});

// ===============================================================
// ✅ PUT Update Rawatan by Risiko ID
// ===============================================================
router.put("/:risiko_id/rawatan", verifyToken, async (req, res) => {
  const client = await pool.connect();
  const user = req.user;
  const { risiko_id } = req.params;
  const { plan_tindakan, jenis_kawalan, tempoh_jangkaan_siap, kakitangan_bertanggungjawab } = req.body;

  try {
    console.log("📍 PUT /risiko/:risiko_id/rawatan called");

    await client.query("BEGIN");

    const checkQuery = `
      SELECT rr.rawatan_id, r.no_rujukan 
      FROM rawatan_risiko rr
      JOIN risiko r ON r.risiko_id = rr.risiko_id 
      WHERE rr.risiko_id = $1
    `;
    const { rows: checkRows } = await client.query(checkQuery, [risiko_id]);
    
    if (checkRows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "Rekod rawatan tidak ditemui." });
    }
    
    const rawatan_id = checkRows[0].rawatan_id;
    const noRujukanUntukLog = checkRows[0].no_rujukan;

    await client.query(`DELETE FROM pelan_tindakan_rawatan WHERE rawatan_id = $1`, [rawatan_id]);
    await client.query(`DELETE FROM kakitangan_rawatan WHERE rawatan_id = $1`, [rawatan_id]);

    if (Array.isArray(plan_tindakan)) {
      for (const pelan of plan_tindakan) {
        if (pelan && pelan.trim() !== "") {
          await client.query(
            `INSERT INTO pelan_tindakan_rawatan (rawatan_id, pelan_tindakan) VALUES ($1, $2)`,
            [rawatan_id, pelan.trim()]
          );
        }
      }
    }

    if (Array.isArray(kakitangan_bertanggungjawab)) {
      for (const kakitangan of kakitangan_bertanggungjawab) {
        if (kakitangan && kakitangan.trim() !== "") {
          await client.query(
            `INSERT INTO kakitangan_rawatan (rawatan_id, nama_kakitangan) VALUES ($1, $2)`,
            [rawatan_id, kakitangan.trim()]
          );
        }
      }
    }

    const updateResult = await client.query(
      `UPDATE rawatan_risiko
       SET jenis_kawalan = $1, tempoh_siap = $2, updated_at = CURRENT_TIMESTAMP
       WHERE rawatan_id = $3
       RETURNING rawatan_id`,
      [jenis_kawalan, tempoh_jangkaan_siap || null, rawatan_id]
    );
    
    if (updateResult.rowCount === 0) {
       await client.query("ROLLBACK");
       client.release();
       return res.status(404).json({ message: "Rekod rawatan tidak ditemui untuk dikemaskini." });
    }

    await client.query("COMMIT");

    try {
      const logRingkasan = `Mengemaskini rawatan untuk risiko: ${noRujukanUntukLog}.`;
      const logPerincian = `${user.nama_penuh} (ID Staf: ${user.staff_id}) telah mengemaskini rawatan untuk risiko No. Rujukan: ${noRujukanUntukLog}.`;
      await catatAktiviti(user.pengguna_id, "Kemaskini Rawatan", logRingkasan, logPerincian);
    } catch (logErr) {
      console.error("Gagal mencatat log:", logErr);
    }

    console.log("✅ Rawatan updated successfully");
    res.json({ message: "Rawatan risiko berjaya dikemaskini" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Ralat PUT /risiko/:risiko_id/rawatan:", err);
    res.status(500).json({ message: "Gagal mengemaskini rawatan: " + err.message });
  } finally {
    client.release();
  }
});

// ===============================================================
// ✅ PUT Update Log Pemantauan by Risiko ID
// ===============================================================
router.put("/:risiko_id/pemantauan/log/:log_id", verifyToken, async (req, res) => {
  const client = await pool.connect();
  const { risiko_id, log_id } = req.params;
  const user = req.user;

  try {
    const {
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
      pelan_tindakan_log,
      kakitangan_log,
      pelan_tindakan_list,
      kakitangan_list,
    } = req.body;

    console.log("📍 PUT /risiko/:risiko_id/pemantauan/log/:log_id called");

    if (!tahun_pemantauan || !status_pemantauan) {
      client.release();
      return res.status(400).json({ 
        message: "Medan wajib tidak lengkap" 
      });
    }

    await client.query("BEGIN");

    const checkQuery = `SELECT log_id FROM LogPemantauan WHERE log_id = $1 AND risiko_id = $2`;
    const checkResult = await client.query(checkQuery, [log_id, risiko_id]);
    
    if (checkResult.rowCount === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "Log pemantauan tidak dijumpai." });
    }

    const skor_risiko_pemantauan = getRiskLevel(skor_kebarangkalian_selepas, skor_impak_selepas);

    const finalPelanList = pelan_tindakan_log || pelan_tindakan_list || [];
    const finalKakitanganList = kakitangan_log || kakitangan_list || [];

    const logUpdateQuery = `
      UPDATE LogPemantauan
      SET 
        tahun_pemantauan = $1,
        separuh_tahun_pemantauan = $2,
        skor_kebarangkalian_selepas = $3,
        skor_impak_selepas = $4,
        keberkesanan = $5,
        status_pemantauan = $6,
        catatan = $7,
        no_bil_kelulusan = $8,
        kekerapan_pemantauan = $9,
        justifikasi_pindaan_pemantauan = $10,
        skor_risiko_pemantauan = $11,
        tarikh_kemaskini = CURRENT_TIMESTAMP
      WHERE log_id = $12
    `;

    const logResult = await client.query(logUpdateQuery, [
      tahun_pemantauan,
      separuh_tahun_pemantauan,
      skor_kebarangkalian_selepas,
      skor_impak_selepas,
      keberkesanan,
      status_pemantauan,
      catatan,
      no_bil_kelulusan,
      kekerapan_pemantauan,
      justifikasi_pindaan_pemantauan,
      skor_risiko_pemantauan,
      log_id,
    ]);
    
    if (logResult.rowCount === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "Gagal mengemaskini log." });
    }

    await client.query("DELETE FROM PelanTindakanPemantauan WHERE log_id = $1", [log_id]);
    await client.query("DELETE FROM KakitanganPemantauan WHERE log_id = $1", [log_id]);

    if (Array.isArray(finalPelanList) && finalPelanList.length > 0) {
      for (const item of finalPelanList) {
        const butiran = (typeof item === "string") ? item.trim() : (item?.butiran_aktiviti || "").trim();
        if (butiran && butiran !== "") {
          await client.query(
            `INSERT INTO PelanTindakanPemantauan (log_id, butiran_aktiviti) VALUES ($1, $2)`,
            [log_id, butiran]
          );
        }
      }
    }

    if (Array.isArray(finalKakitanganList) && finalKakitanganList.length > 0) {
      for (const item of finalKakitanganList) {
        const butiran = (typeof item === "string") ? item.trim() : (item?.butiran_kakitangan || "").trim();
        if (butiran && butiran !== "") {
          await client.query(
            `INSERT INTO KakitanganPemantauan (log_id, butiran_kakitangan) VALUES ($1, $2)`,
            [log_id, butiran]
          );
        }
      }
    }

    await client.query("COMMIT");

    try {
      const logRingkasan = `Mengemaskini log pemantauan untuk risiko ID: ${risiko_id}`;
      const logPerincian = `${user.nama_penuh} (ID Staf: ${user.staff_id}) telah mengemaskini log pemantauan.`;
      await catatAktiviti(user.pengguna_id, "Kemaskini Pemantauan", logRingkasan, logPerincian);
    } catch (logErr) {
      console.error("Gagal mencatat log aktiviti:", logErr);
    }

    console.log("✅ Log pemantauan updated successfully");
    res.json({ message: "Log pemantauan berjaya dikemaskini" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Ralat PUT /risiko/:risiko_id/pemantauan/log/:log_id:", err);
    res.status(500).json({
      message: "Gagal mengemaskini log pemantauan",
      error: err.message
    });
  } finally {
    client.release();
  }
});

// ------------------- PUT: Update Risiko -------------------
router.put("/:risiko_id", verifyToken, async (req, res) => {
  const client = await pool.connect();
  const risikoId = req.params.risiko_id;
  const user = req.user;
  const {
    noRujukan, tahun, separuhTahun, syarikatId,
    kategori, bahagian, risiko,
    skorKebarangkalian, skorImpak, skorRisiko,
    statusRisiko, punca, kesan
  } = req.body;

  try {
    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      if (parseInt(syarikatId) !== user.syarikat_id) {
        client.release();
        return res.status(403).json({ error: "No permission to update other subsidiari" });
      }
    }

    await client.query('BEGIN');

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

    await client.query(
      `UPDATE risiko SET
        no_rujukan=$1, tahun=$2, separuh_tahun=$3, syarikat_id=$4, kategori=$5, bahagian=$6,
        risiko=$7, skor_kebarangkalian=$8, skor_impak=$9, skor_risiko=$10,
        status_risiko=$11
        WHERE risiko_id=$12`,
      [noRujukan, tahun, separuhTahun, syarikatId, kategori, bahagian,
        risiko, skorKebarangkalian, skorImpak, skorRisiko, statusRisiko, risikoId]
    );

    if (Array.isArray(punca)) {
      await client.query('DELETE FROM punca_risiko WHERE risiko_id = $1', [risikoId]);
      for (let p of punca) {
        if (p && p.trim() !== "") {
          await client.query(
            'INSERT INTO punca_risiko (risiko_id, punca) VALUES ($1, $2)',
            [risikoId, p.trim()]
          );
        }
      }
    }

    if (Array.isArray(kesan)) {
      await client.query('DELETE FROM kesan_risiko WHERE risiko_id = $1', [risikoId]);
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

    try {
      const logRingkasan = `Mengemaskini risiko: ${noRujukanAsal}.`;
      let logPerincian = `${user.nama_penuh} (ID Staf: ${user.staff_id}) telah mengemaskini risiko (No. Rujukan Asal: ${noRujukanAsal}).`;
      if (noRujukanAsal !== noRujukan) {
        logPerincian += ` No. Rujukan telah ditukar kepada ${noRujukan}.`;
      }
      await catatAktiviti(user.pengguna_id, "Kemaskini Risiko", logRingkasan, logPerincian);
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

// ------------------- DELETE: Risiko -------------------
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
      await catatAktiviti(user.pengguna_id, "Padam Risiko", logRingkasan, logPerincian);
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

// ------------------- GET: Check No Rujukan -------------------
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