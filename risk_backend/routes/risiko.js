import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ------------------- POST: Tambah Risiko (DIKEMAS KINI DENGAN TRANSAKSI & LOG) -------------------
router.post("/", verifyToken, async (req, res) => {
  // ⭐️ BARU: Dapatkan 'client' dari 'pool' untuk transaksi
  const client = await pool.connect();

  try {
    const user = req.user;
    const {
      noRujukan, tahun, separuhTahun, subsidiari,
      kategori, bahagian, risiko,
      skorKebarangkalian, skorImpak, skorRisiko,
      statusRisiko, punca, kesan
    } = req.body;

    const allowedRoles = ["Admin", "Executive", "Staff", "Ketua Subsidiari"];
    if (!allowedRoles.includes(user.nama_peranan)) {
      client.release(); // ⭐️ BARU: Lepaskan client sebelum return
      return res.status(403).json({ error: "No permission to add risiko" });
    }

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      if (parseInt(subsidiari) !== user.subsidiari_id) {
        client.release(); // ⭐️ BARU: Lepaskan client sebelum return
        return res.status(403).json({ error: "No permission for other subsidiari" });
      }
    }

    // ⭐️ BARU: Mulakan Transaksi
    await client.query('BEGIN');

    // 1. Masukkan ke jadual 'risiko'
    const result = await client.query( // ⭐️ BARU: Guna 'client.query'
      `INSERT INTO risiko
      (no_rujukan, tahun, separuh_tahun, subsidiari, kategori, bahagian, risiko, 
       skor_kebarangkalian, skor_impak, skor_risiko, status_risiko)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING risiko_id`,
      [noRujukan, tahun, separuhTahun, subsidiari, kategori, bahagian, risiko,
       skorKebarangkalian, skorImpak, skorRisiko, statusRisiko]
    );

    const risikoId = result.rows[0].risiko_id;

    // 2. Masukkan ke jadual 'punca_risiko'
    if (Array.isArray(punca)) {
      for (let p of punca) {
        if (p) await client.query( // ⭐️ BARU: Guna 'client.query'
          `INSERT INTO punca_risiko (risiko_id, punca) VALUES ($1,$2)`,
          [risikoId, p]
        );
      }
    }

    // 3. Masukkan ke jadual 'kesan_risiko'
    if (Array.isArray(kesan)) {
      for (let k of kesan) {
        if (k) await client.query( // ⭐️ BARU: Guna 'client.query'
          `INSERT INTO kesan_risiko (risiko_id, kesan) VALUES ($1,$2)`,
          [risikoId, k]
        );
      }
    }

    // 4. ⭐️ BARU: Automasi masukkan ke 'LogPemantauan'
    // (Anda perlu sahkan nama jadual dan lajur adalah betul)
    // Berdasarkan query GET anda, nama lajur ialah 'tahun_pemantauan' & 'separuh_tahun_pemantauan'
    await client.query( // ⭐️ BARU: Guna 'client.query'
        `INSERT INTO LogPemantauan 
            (risiko_id, tahun_pemantauan, separuh_tahun_pemantauan, status_pemantauan)
         VALUES ($1, $2, $3, $4)`,
        [risikoId, tahun, separuhTahun, 'Buka']
    );

    // ⭐️ BARU: Commit transaksi jika semua berjaya
    await client.query('COMMIT');

    res.status(201).json({ 
        message: "Risiko dan log pemantauan berjaya didaftarkan", 
        risiko_id: risikoId 
    });

  } catch (err) {
    // ⭐️ BARU: Rollback transaksi jika ada ralat
    await client.query('ROLLBACK');
    console.error("Ralat POST /risiko:", err);
    res.status(500).json({ message: err.message });
  } finally {
    // ⭐️ BARU: Lepaskan 'client' kembali ke 'pool' walau apa pun terjadi
    client.release();
  }
});

// ------------------- GET: Semua Risiko (DIBETULKAN SEPENUHNYA) -------------------
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
      
      -- ⭐️ PEMBETULAN 1: 'pt.pelan_tindakan' ditukar kepada 'pt.butiran_aktiviti'
      ButiranTerkini AS (
        SELECT 
          pt.log_id,
          STRING_AGG(DISTINCT pt.butiran_aktiviti, '; ') AS pemantauan_pelan_tindakan,
          STRING_AGG(DISTINCT kp.butiran_kakitangan, '; ') AS pemantauan_kakitangan
        FROM PelanTindakanPemantauan pt
        LEFT JOIN KakitanganPemantauan kp ON kp.log_id = pt.log_id
        GROUP BY pt.log_id
      ),
      
      -- ⭐️ PEMBETULAN 2: 'RawatanAgregat' ditulis semula berdasarkan skema 'rawatan.js'
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
        
        -- 3. Penilaian Risiko
        r.skor_kebarangkalian,
        r.skor_impak,
        r.skor_risiko, 
        r.status_risiko,
        r.justifikasi_pindaan_penilaian AS pindaan_penilaian,
        
        -- 4. Rawatan atas Risiko (Data dari RawatanAgregat)
        raw.pelan_tindakan,
        raw.jenis_kawalan,
        raw.tempoh_jangkaan_siap_tindakan,
        raw.kakitangan_bertanggungjawab,
        
        -- 5. Pemantauan Risiko (Data dari ButiranTerkini)
        CASE 
          WHEN pt.tahun_pemantauan IS NOT NULL THEN pt.tahun_pemantauan || ' - ' || pt.separuh_tahun_pemantauan
          ELSE NULL
        END AS pemantauan_tahun_separuh,
        bt.pemantauan_pelan_tindakan,
        pt.kekerapan_pemantauan AS pemantauan_kekerapan,
        bt.pemantauan_kakitangan,

        -- 6. Keberkesanan Tindakan (Data dari PemantauanTerkini)
        pt.skor_kebarangkalian_selepas AS semasa_skor_kebarangkalian,
        pt.skor_impak_selepas AS semasa_skor_impak,
        pt.skor_risiko_pemantauan,
        pt.keberkesanan,
        pt.status_pemantauan,
        pt.justifikasi_pindaan_pemantauan AS pindaan_keberkesanan,
        pt.catatan,
        
        -- Data tambahan (jika perlu)
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

// ------------------- GET: Tahun Unik -------------------
// (Kod ini bersih)
router.get("/tahun", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT DISTINCT tahun FROM risiko ORDER BY tahun DESC`);
    res.json(rows.map(r => r.tahun));
  } catch (err) {
    console.error("Ralat GET /risiko/tahun:", err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------- PUT: Update Risiko -------------------
// (Kod ini bersih)
router.put("/:risiko_id", verifyToken, async (req, res) => {
  try {
    const risikoId = req.params.risiko_id;
    const user = req.user;
    const {
      noRujukan, tahun, separuhTahun, subsidiari,
      kategori, bahagian, risiko,
      skorKebarangkalian, skorImpak, skorRisiko,
      statusRisiko
    } = req.body;

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      if (parseInt(subsidiari) !== user.subsidiari_id) {
        return res.status(403).json({ error: "No permission to update other subsidiari" });
      }
    }

    await pool.query(
      `UPDATE risiko SET
        no_rujukan=$1, tahun=$2, separuh_tahun=$3, subsidiari=$4, kategori=$5, bahagian=$6,
        risiko=$7, skor_kebarangkalian=$8, skor_impak=$9, skor_risiko=$10,
        status_risiko=$11
       WHERE risiko_id=$12`,
      [noRujukan, tahun, separuhTahun, subsidiari, kategori, bahagian,
       risiko, skorKebarangkalian, skorImpak, skorRisiko, statusRisiko, risikoId]
    );

    res.json({ message: "Risiko berjaya dikemaskini" });

  } catch (err) {
    console.error("Ralat PUT /risiko/:risiko_id:", err);
    res.status(500).json({ message: err.message });
  }
});



// ------------------- DELETE: Risiko (DIBAIKI / HANYA ADMIN) -------------------
router.delete("/:risiko_id", verifyToken, async (req, res) => {
  // 1. risiko_id adalah INTEGER
  const risikoId = parseInt(req.params.risiko_id, 10); 
  const user = req.user; // Dapatkan peranan dari token
  const client = await pool.connect(); 

  if (isNaN(risikoId)) {
    client.release();
    return res.status(400).json({ error: "risiko_id tidak sah, mesti integer." });
  }

  try {
    // --- 1. PENGESAHAN PERANAN (Hanya Admin) ---
    // ⭐️ PERUBAHAN DI SINI: Semak jika peranan BUKAN Admin
    if (user.nama_peranan !== "Admin") {
      await client.release();
      return res.status(403).json({ error: "Hanya Admin dibenarkan untuk memadam data ini." });
    }
    
    // --- 2. Semak jika risiko wujud ---
    // Kita tidak perlukan 'subsidiari' lagi, hanya periksa jika ia wujud
    const { rows } = await client.query(`SELECT 1 FROM risiko WHERE risiko_id = $1`, [risikoId]);
    
    if (!rows[0]) {
      await client.release(); 
      return res.status(404).json({ error: "Risiko tidak ditemui" });
    }

    // KOD LAMA (if ["Staff", "Ketua Subsidiari"]...) TELAH DIBUANG
    // Kerana semakan Admin di atas sudah memadai.

    // --- 3. Mulakan Transaksi ---
    await client.query('BEGIN');

    // --- 4. Dapatkan ID Bersarang ---
    // 2. rawatan_id adalah INTEGER
    const rawatanIdsRes = await client.query('SELECT rawatan_id FROM rawatan_risiko WHERE risiko_id = $1', [risikoId]);
    const rawatanIds = rawatanIdsRes.rows.map(r => r.rawatan_id); // [Array Integer]

    // 3. log_id adalah UUID
    const logIdsRes = await client.query('SELECT log_id FROM LogPemantauan WHERE risiko_id = $1', [risikoId]);
    const logIds = logIdsRes.rows.map(l => l.log_id); // [Array UUID]

    // --- 5. Padam Jadual "Grandchild" (Cucu) ---
    
    // Padam rawatan (menggunakan ::integer[])
    if (rawatanIds.length > 0) {
      await client.query('DELETE FROM pelan_tindakan_rawatan WHERE rawatan_id = ANY($1::integer[])', [rawatanIds]);
      await client.query('DELETE FROM kakitangan_rawatan WHERE rawatan_id = ANY($1::integer[])', [rawatanIds]);
    }
    
    // Padam log pemantauan (menggunakan ::uuid[])
    if (logIds.length > 0) {
      await client.query('DELETE FROM PelanTindakanPemantauan WHERE log_id = ANY($1::uuid[])', [logIds]);
      await client.query('DELETE FROM KakitanganPemantauan WHERE log_id = ANY($1::uuid[])', [logIds]);
    }

    // --- 6. Padam Jadual "Child" (Anak) ---
    await client.query('DELETE FROM rawatan_risiko WHERE risiko_id = $1', [risikoId]);
    await client.query('DELETE FROM LogPemantauan WHERE risiko_id = $1', [risikoId]);
    await client.query('DELETE FROM punca_risiko WHERE risiko_id = $1', [risikoId]);
    await client.query('DELETE FROM kesan_risiko WHERE risiko_id = $1', [risikoId]);

    // --- 7. Padam Jadual Utama "Parent" (Induk) ---
    await client.query("DELETE FROM risiko WHERE risiko_id = $1", [risikoId]);

    // --- 8. Commit Transaksi ---
    await client.query('COMMIT');

    res.json({ message: "Risiko dan semua data berkaitan berjaya dipadam" });

  } catch (err) {
    // --- 9. Rollback jika Gagal ---
    await client.query('ROLLBACK');
    console.error("Ralat DELETE /risiko/:risiko_id:", err); 
    res.status(500).json({ message: "Transaksi gagal: " + err.message });
  } finally {
    // --- 10. Lepaskan Client ---
    client.release();
  }
});

// ------------------- GET: Check No Rujukan -------------------
// (Kod ini bersih)
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