import pool from "../config/db.js";
import { kiraTahapRisiko } from "../utils/matriksRisiko.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";

// Item senarai pelan/kakitangan boleh jadi string atau objek { [kunci]: "..." }
const ambilButiran = (item, kunci) =>
  (typeof item === "string" ? item : item?.[kunci] || "").trim();

/* =======================================================
  GET: Semua Risiko + Pemantauan Terkini
  ENDPOINT: /pemantauan-risiko
======================================================= */
export const senaraiPemantauan = async (req, res) => {
  try {
    const user = req.user;

    // Bahagian 'RisikoAdaRawatan' telah dibuang
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
        JOIN Risiko r ON pm.risiko_id = r.risiko_id AND r.is_deleted = false
        WHERE pm.is_deleted = false
      ),
      ButiranTerkini AS (
        SELECT
          pt.log_id,
          ARRAY_AGG(DISTINCT pt.butiran_aktiviti) AS pelan_tindakan_terkini,
          ARRAY_AGG(DISTINCT kp.butiran_kakitangan) AS kakitangan_terkini
        FROM PelanTindakanPemantauan pt
        LEFT JOIN KakitanganPemantauan kp ON kp.log_id = pt.log_id
        WHERE pt.is_deleted = false AND (kp.is_deleted = false OR kp.log_id IS NULL)
        GROUP BY pt.log_id
      )
      SELECT
        r.risiko_id AS id,
        r.no_rujukan,
        r.tahun,
        r.separuh_tahun,
        s.nama_syarikat,
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
      -- JOIN RisikoAdaRawatan raw ON raw.risiko_id = r.risiko_id  -- <<< Baris ini telah dibuang
      LEFT JOIN syarikat s ON s.syarikat_id = CAST(r.syarikat_id AS INTEGER)
      LEFT JOIN PemantauanTerkini pt ON pt.risiko_id = r.risiko_id AND pt.rn = 1
      LEFT JOIN ButiranTerkini bt ON bt.log_id = pt.log_id
    `;

    const params = [];
    let whereClause = " WHERE r.is_deleted = false";
    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      whereClause += ` AND CAST(r.syarikat_id AS INTEGER) = $1`;
      params.push(user.syarikat_id);
    }
    query += whereClause;

    query += ` ORDER BY r.tahun DESC, r.separuh_tahun DESC, r.no_rujukan ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Ralat GET /pemantauan-risiko:", err);
    res.status(500).json({ error: "Gagal memuatkan data pemantauan." });
  }
};

/* =======================================================
  GET: Butiran Risiko Berdasarkan Risiko ID
  ENDPOINT: /pemantauan-risiko/:risiko_id/info
======================================================= */
export const infoRisikoPemantauan = async (req, res) => {
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
        s.nama_syarikat
      FROM Risiko r
      LEFT JOIN syarikat s ON s.syarikat_id = CAST(r.syarikat_id AS INTEGER)
      WHERE r.risiko_id = $1;
    `;

    const { rows } = await pool.query(query, [risikoIdInt]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Risiko tidak dijumpai." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Ralat GET /:risiko_id/info:", err);
    res.status(500).json({ error: "Gagal memuatkan maklumat risiko." });
  }
};

/* =======================================================
  GET: Sejarah Log untuk satu Risiko
  ENDPOINT: /pemantauan-risiko/:risiko_id/sejarah
======================================================= */
export const sejarahPemantauan = async (req, res) => {
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
        (SELECT ARRAY_AGG(pt.butiran_aktiviti) FROM PelanTindakanPemantauan pt WHERE pt.log_id = lp.log_id AND pt.is_deleted = false) AS pelan_tindakan_log,
        (SELECT ARRAY_AGG(kp.butiran_kakitangan) FROM KakitanganPemantauan kp WHERE kp.log_id = lp.log_id AND kp.is_deleted = false) AS kakitangan_log
      FROM LogPemantauan lp
      WHERE lp.risiko_id = $1 AND lp.is_deleted = false
      ORDER BY lp.tahun_pemantauan DESC, lp.tarikh_pemantauan DESC;
    `;

    const { rows } = await pool.query(logQuery, [risikoIdInt]);
    res.json(rows);
  } catch (err) {
    console.error("Ralat GET /:risiko_id/sejarah:", err);
    res.status(500).json({ error: "Gagal memuatkan sejarah pemantauan." });
  }
};

/* =======================================================
  GET: Semak Kewujudan Tahun & Separuh Tahun
  ENDPOINT: /pemantauan-risiko/check-duplicate
======================================================= */
export const semakPenduaLog = async (req, res) => {
  try {
    const { risiko_id, tahun, separuh } = req.query;

    if (!risiko_id || !tahun || !separuh) {
      return res.status(400).json({ error: "Parameter tidak lengkap." });
    }

    const tahunPemantauan = parseInt(tahun, 10);
    const separuhPemantauan = parseInt(separuh, 10); // 1. Dapatkan Tarikh Risiko ASAL

    const risikoQuery = `SELECT tahun, separuh_tahun FROM risiko WHERE risiko_id = $1`;
    const risikoResult = await pool.query(risikoQuery, [risiko_id]);

    if (risikoResult.rows.length === 0) {
      return res.status(404).json({ error: "Risiko tidak dijumpai." });
    }

    const risikoTahun = parseInt(risikoResult.rows[0].tahun, 10);
    const risikoSeparuh = parseInt(risikoResult.rows[0].separuh_tahun, 10); // 2. SEMAKAN #1: Tidak boleh LEBIH AWAL daripada risiko asal
    // (Logik 'tahunPemantauan === risikoTahun && separuhPemantauan <= risikoSeparuh' diubah kepada '<')

    if (
      tahunPemantauan < risikoTahun ||
      (tahunPemantauan === risikoTahun && separuhPemantauan < risikoSeparuh)
    ) {
      return res.json({
        duplicate: false,
        invalid: true, // Ralat
        message: `Tahun/separuh tahun pemantauan tidak boleh lebih awal daripada risiko asal (Tahun: ${risikoTahun}, Separuh: ${risikoSeparuh}).`, // Mesej diubah
      });
    } // 3. Dapatkan Tarikh Log TERAKHIR

    const logTerakhirQuery = `SELECT tahun_pemantauan, separuh_tahun_pemantauan FROM LogPemantauan WHERE risiko_id = $1 AND is_deleted = false ORDER BY tahun_pemantauan DESC, separuh_tahun_pemantauan DESC LIMIT 1`;
    const logTerakhirResult = await pool.query(logTerakhirQuery, [risiko_id]); // 4. SEMAKAN #2: Mesti lebih lewat daripada log terakhir (jika ada)

    if (logTerakhirResult.rows.length > 0) {
      const logTahunTerakhir = parseInt(logTerakhirResult.rows[0].tahun_pemantauan, 10);
      const logSeparuhTerakhir = parseInt(logTerakhirResult.rows[0].separuh_tahun_pemantauan, 10); // Semak jika tempoh baharu adalah SAMA ATAU LEBIH AWAL dari log terakhir

      if (
        tahunPemantauan < logTahunTerakhir ||
        (tahunPemantauan === logTahunTerakhir && separuhPemantauan <= logSeparuhTerakhir)
      ) {
        return res.json({
          duplicate: true, // Ia adalah "duplicate" atau "lebih awal"
          invalid: true, // Ralat
          message: `Pemantauan mesti lebih lewat daripada log terakhir (Tahun: ${logTahunTerakhir}, Separuh: ${logSeparuhTerakhir}).`,
        });
      }
    } // 5. Jika Lulus semua semakan

    res.json({
      duplicate: false,
      invalid: false,
      message: "Pemantauan sah untuk ditambah.",
    });
  } catch (err) {
    console.error("Ralat GET /check-duplicate:", err);
    res.status(500).json({ error: "Gagal menyemak data duplicate." });
  }
};

/* =======================================================
  GET: Tahap Risiko Rujukan
  ENDPOINT: /pemantauan-risiko/:risiko_id/tahap-rujukan
======================================================= */
export const tahapRujukan = async (req, res) => {
  try {
    const { risiko_id } = req.params;

    // Skor di-clamp ke 1–5 (lalai 1); "Tiada" hanya jika skor bukan nombor
    const tahapTerhad = (k, i) => {
      const kk = Math.min(Math.max(parseInt(k || 1), 1), 5);
      const ii = Math.min(Math.max(parseInt(i || 1), 1), 5);
      return kiraTahapRisiko(kk, ii) ?? "Tiada";
    };

    const { tahun, separuh } = req.query;

    let logQuery = `
      SELECT skor_kebarangkalian_selepas AS k, skor_impak_selepas AS i
      FROM logpemantauan
      WHERE risiko_id = $1 AND is_deleted = false
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

    let k = 1,
      i = 1,
      sumber = "risiko";

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
        return res.status(404).json({ error: "Risiko tidak dijumpai" });
      }

      k = risikoRes.rows[0].k;
      i = risikoRes.rows[0].i;
      sumber = "risiko";
    }

    res.json({
      risiko_id,
      sumber,
      skor_kebarangkalian: k,
      skor_impak: i,
      tahap_risiko_rujukan: tahapTerhad(k, i),
    });
  } catch (err) {
    console.error("Ralat GET /:risiko_id/tahap-rujukan:", err);
    res.status(500).json({ error: "Ralat pelayan. Sila cuba sebentar lagi." });
  }
};

/* =======================================================
  GET: Sejarah Log (sejarah-baru)
  ENDPOINT: /pemantauan-risiko/:risiko_id/sejarah-baru
======================================================= */
export const sejarahPemantauanBaru = async (req, res) => {
  try {
    const { risiko_id } = req.params;
    const risikoIdInt = parseInt(risiko_id, 10);

    const risikoQuery = `SELECT skor_kebarangkalian AS k_asal, skor_impak AS i_asal FROM Risiko WHERE risiko_id = $1`;
    const risikoResult = await pool.query(risikoQuery, [risikoIdInt]);

    if (risikoResult.rows.length === 0) {
      return res.status(404).json({ error: "Risiko tidak dijumpai." });
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
        (SELECT ARRAY_AGG(pt.butiran_aktiviti) FROM PelanTindakanPemantauan pt WHERE pt.log_id = lp.log_id AND pt.is_deleted = false) AS pelan_tindakan_log,
        (SELECT ARRAY_AGG(kp.butiran_kakitangan) FROM KakitanganPemantauan kp WHERE kp.log_id = lp.log_id AND kp.is_deleted = false) AS kakitangan_log
      FROM LogPemantauan lp
      WHERE lp.risiko_id = $1 AND lp.is_deleted = false
      ORDER BY lp.tahun_pemantauan ASC, lp.separuh_tahun_pemantauan ASC, lp.tarikh_pemantauan ASC
    `;

    const { rows: logRows } = await pool.query(logQuery, [risikoIdInt]);

    let skorSebelumK = k_asal;
    let skorSebelumI = i_asal;

    const sejarahLog = logRows.map((log) => {
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
    console.error("Ralat GET /:risiko_id/sejarah-baru:", err);
    res.status(500).json({ error: "Gagal memuatkan sejarah pemantauan." });
  }
};

/* =======================================================
  POST: Tambah Log Pemantauan Baru
  ENDPOINT: /pemantauan-risiko/log
======================================================= */
export const tambahLogPemantauan = async (req, res) => {
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
      kakitangan_list,
    } = req.body;

    if (!risiko_id || !tahun_pemantauan || !status_pemantauan) {
      return res.status(400).json({ error: "Sila isi semua medan wajib (risiko, tahun, status)." });
    }

    const skor_risiko_pemantauan = kiraTahapRisiko(skor_kebarangkalian_selepas, skor_impak_selepas);

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
      risikoIdInt,
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
    ]);

    const newLog = logResult.rows[0];
    const new_log_id = newLog.log_id;

    if (Array.isArray(pelan_tindakan_list)) {
      for (const item of pelan_tindakan_list) {
        const butiran = ambilButiran(item, "butiran_aktiviti");
        if (!butiran) continue;
        await client.query(
          `INSERT INTO PelanTindakanPemantauan (log_id, butiran_aktiviti) VALUES ($1, $2)`,
          [new_log_id, butiran]
        );
      }
    }

    if (Array.isArray(kakitangan_list)) {
      for (const item of kakitangan_list) {
        const butiran = ambilButiran(item, "butiran_kakitangan");
        if (!butiran) continue;
        await client.query(
          `INSERT INTO KakitanganPemantauan (log_id, butiran_kakitangan) VALUES ($1, $2)`,
          [new_log_id, butiran]
        );
      }
    }

    await client.query("COMMIT");

    try {
      const logRingkasan = `Menambah log pemantauan baru (Risiko ID: ${risiko_id}).`;
      const logPerincian = `${req.user.nama_penuh} (ID Staf: ${req.user.staff_id}) telah menambah log pemantauan baru untuk Risiko ID: ${risiko_id}.`;
      await catatAktiviti(
        req.user.pengguna_id,
        "Tambah Log Pemantauan",
        logRingkasan,
        logPerincian
      );
    } catch (logErr) {
      console.error("Gagal mencatat log selepas TAMBAH log pemantauan:", logErr);
    }

    res.status(201).json({
      message: "Log Pemantauan berjaya ditambah.",
      data: newLog,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Ralat POST /pemantauan-risiko/log:", err);
    res.status(500).json({ error: "Gagal menambah log pemantauan." });
  } finally {
    client.release();
  }
};

/* =======================================================
  DELETE: Padam Log Pemantauan (DIKEMASKINI )
  ENDPOINT: /pemantauan-risiko/log/:log_id
======================================================= */
export const padamLogPemantauan = async (req, res) => {
  const client = await pool.connect();
  const { log_id } = req.params;

  try {
    const check = await client.query(
      `SELECT lp.log_id, r.no_rujukan
         FROM LogPemantauan lp
         JOIN risiko r ON r.risiko_id = lp.risiko_id
        WHERE lp.log_id = $1 AND lp.is_deleted = false`,
      [log_id]
    );
    if (check.rowCount === 0) {
      return res.status(404).json({ error: "Rekod pemantauan tidak dijumpai." });
    }

    const noRujukan = check.rows[0].no_rujukan;

    await client.query("BEGIN");

    // Anak dahulu, kemudian log induk (soft-delete)
    await client.query(
      "UPDATE PelanTindakanPemantauan SET is_deleted = true, deleted_at = NOW() WHERE log_id = $1 AND is_deleted = false",
      [log_id]
    );
    await client.query(
      "UPDATE KakitanganPemantauan SET is_deleted = true, deleted_at = NOW() WHERE log_id = $1 AND is_deleted = false",
      [log_id]
    );

    await client.query(
      "UPDATE LogPemantauan SET is_deleted = true, deleted_at = NOW() WHERE log_id = $1 AND is_deleted = false",
      [log_id]
    );

    await client.query("COMMIT");

    try {
      const logRingkasan = `Memadam log pemantauan untuk risiko: ${noRujukan}.`;
      const logPerincian = `${req.user.nama_penuh} (ID Staf: ${req.user.staff_id}) telah memadam log pemantauan (Log ID: ${log_id}) untuk risiko No. Rujukan: ${noRujukan}.`;
      await catatAktiviti(req.user.pengguna_id, "Padam Log Pemantauan", logRingkasan, logPerincian);
    } catch (logErr) {
      console.error("Gagal mencatat log selepas PADAM log pemantauan:", logErr);
    }

    res.json({ message: "Log pemantauan berjaya dipadam." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Ralat DELETE /log/:log_id:", err);
    res.status(500).json({ error: "Gagal memadam log pemantauan." });
  } finally {
    client.release();
  }
};

/* =======================================================
  PUT: Kemaskini Log Pemantauan
  ENDPOINT: /pemantauan-risiko/log/:log_id
======================================================= */
export const kemaskiniLogPemantauan = async (req, res) => {
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

  const skor_risiko_pemantauan = kiraTahapRisiko(skor_kebarangkalian_selepas, skor_impak_selepas);

  const finalPelanList =
    (pelan_tindakan_list?.length ? pelan_tindakan_list : pelan_tindakan_log) || [];
  const finalKakitanganList = (kakitangan_list?.length ? kakitangan_list : kakitangan_log) || [];

  if (!log_id || !risiko_id) {
    return res.status(400).json({ error: "Log ID dan Risiko ID diperlukan" });
  }

  try {
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
      return res.status(404).json({ error: "Log tidak dijumpai" });
    }

    await client.query(
      "UPDATE PelanTindakanPemantauan SET is_deleted = true, deleted_at = NOW() WHERE log_id = $1 AND is_deleted = false",
      [log_id]
    );
    await client.query(
      "UPDATE KakitanganPemantauan SET is_deleted = true, deleted_at = NOW() WHERE log_id = $1 AND is_deleted = false",
      [log_id]
    );

    if (Array.isArray(finalPelanList) && finalPelanList.length > 0) {
      for (const item of finalPelanList) {
        const butiran = ambilButiran(item, "butiran_aktiviti");
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
        const butiran = ambilButiran(item, "butiran_kakitangan");
        if (!butiran) continue;
        await client.query(
          `INSERT INTO KakitanganPemantauan (log_id, butiran_kakitangan)
           VALUES ($1, $2)`,
          [log_id, butiran]
        );
      }
    }

    await client.query("COMMIT");

    try {
      const logRingkasan = `Mengemaskini log pemantauan (Log ID: ${log_id}).`;
      const logPerincian = `${req.user.nama_penuh} (ID Staf: ${req.user.staff_id}) telah mengemaskini log pemantauan untuk Risiko ID: ${risiko_id}.`;
      await catatAktiviti(
        req.user.pengguna_id,
        "Kemaskini Log Pemantauan",
        logRingkasan,
        logPerincian
      );
    } catch (logErr) {
      console.error("Gagal mencatat log selepas KEMASKINI log pemantauan:", logErr);
    }

    res.json({
      message: "Log berjaya dikemaskini",
      data: logResult.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Ralat PUT log:", err);
    res.status(500).json({ error: "Ralat server semasa mengemaskini log." });
  } finally {
    client.release();
  }
};
