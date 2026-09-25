import pool from "../config/db.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";
import { PERANAN_TERHAD } from "../middleware/aksesSyarikat.js";
import { ralat, hantarRalat } from "../utils/ralatApi.js";

// Log aktiviti ialah jejak audit: tiada endpoint padam. Pembersihan hanya
// melalui `npm run purge` (baris soft-delete lama).

const HAD_LALAI = 25;
const HAD_MAKSIMUM = 200;
const HAD_EKSPORT = 10_000;

const TARIKH_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Bina klausa WHERE daripada tapisan query. Staff & Ketua Subsidiari hanya
 * melihat log pengguna syarikat sendiri tanpa mengira tapisan yang dihantar.
 */
const binaTapisan = (req) => {
  const { tarikhMula, tarikhAkhir, peranan_id, syarikat_id, aktiviti, carian } = req.query;
  const syarat = ["la.is_deleted = false"];
  const params = [];
  const tambah = (klausa, nilai) => {
    params.push(nilai);
    syarat.push(klausa.replace("?", `$${params.length}`));
  };

  if (PERANAN_TERHAD.includes(req.user.nama_peranan)) {
    tambah("p.syarikat_id = ?", req.user.syarikat_id);
  } else if (syarikat_id) {
    tambah("p.syarikat_id = ?", parseInt(syarikat_id, 10));
  }

  for (const [nama, nilai] of [
    ["tarikhMula", tarikhMula],
    ["tarikhAkhir", tarikhAkhir],
  ]) {
    if (nilai && !TARIKH_ISO.test(nilai)) throw ralat(400, `Format ${nama} mesti YYYY-MM-DD.`);
  }
  // Tarikh ditafsir dalam zon waktu Malaysia; tarikhAkhir termasuk sepanjang hari itu
  if (tarikhMula)
    tambah("la.tarikh_masa >= (?::date AT TIME ZONE 'Asia/Kuala_Lumpur')", tarikhMula);
  if (tarikhAkhir) {
    tambah("la.tarikh_masa < ((?::date + 1) AT TIME ZONE 'Asia/Kuala_Lumpur')", tarikhAkhir);
  }
  if (peranan_id) tambah("p.peranan_id = ?", parseInt(peranan_id, 10));
  if (aktiviti) tambah("la.aktiviti = ?", aktiviti);
  if (carian && carian.trim()) {
    params.push(`%${carian.trim()}%`);
    const i = `$${params.length}`;
    syarat.push(
      `(p.nama_penuh ILIKE ${i} OR p.staff_id ILIKE ${i} OR la.ringkasan ILIKE ${i} OR la.perincian ILIKE ${i})`
    );
  }

  return { where: `WHERE ${syarat.join(" AND ")}`, params };
};

const DARI_LOG = `
  FROM log_aktiviti la
  JOIN pengguna p ON la.pengguna_id = p.pengguna_id
  JOIN peranan r ON p.peranan_id = r.peranan_id
  LEFT JOIN syarikat s ON p.syarikat_id = s.syarikat_id`;

const LAJUR_LOG = `
  la.id AS log_id,
  p.pengguna_id AS user_id,
  p.staff_id,
  p.nama_penuh AS nama_pengguna,
  r.nama_peranan AS peranan_pengguna,
  s.nama_syarikat AS syarikat,
  la.aktiviti,
  la.ringkasan,
  la.perincian,
  la.tarikh_masa`;

// =======================================================
// GET /api/log_aktiviti?halaman=&had=&tarikhMula=&tarikhAkhir=&peranan_id=
//     &syarikat_id=&aktiviti=&carian=
// =======================================================
export const senaraiLogAktiviti = async (req, res) => {
  try {
    const { where, params } = binaTapisan(req);
    const had = Math.min(Math.max(parseInt(req.query.had, 10) || HAD_LALAI, 1), HAD_MAKSIMUM);
    const halaman = Math.max(parseInt(req.query.halaman, 10) || 1, 1);

    const [{ rows: data }, { rows: kiraan }] = await Promise.all([
      pool.query(
        `SELECT ${LAJUR_LOG} ${DARI_LOG} ${where}
          ORDER BY la.tarikh_masa DESC, la.id DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, had, (halaman - 1) * had]
      ),
      pool.query(`SELECT COUNT(*)::int AS jumlah ${DARI_LOG} ${where}`, params),
    ]);

    res.json({
      data,
      jumlah: kiraan[0].jumlah,
      halaman,
      had,
      jumlah_halaman: Math.max(Math.ceil(kiraan[0].jumlah / had), 1),
    });
  } catch (err) {
    hantarRalat(res, err, "Gagal mengambil data log dari server.", "senarai log aktiviti");
  }
};

// =======================================================
// GET /api/log_aktiviti/jenis — senarai jenis aktiviti sebenar (untuk tapisan)
// =======================================================
export const senaraiJenisAktiviti = async (req, res) => {
  try {
    const terhad = PERANAN_TERHAD.includes(req.user.nama_peranan);
    const { rows } = await pool.query(
      `SELECT la.aktiviti, COUNT(*)::int AS bilangan
         FROM log_aktiviti la
         JOIN pengguna p ON la.pengguna_id = p.pengguna_id
        WHERE la.is_deleted = false AND ($1::int IS NULL OR p.syarikat_id = $1)
        GROUP BY la.aktiviti
        ORDER BY la.aktiviti`,
      [terhad ? req.user.syarikat_id : null]
    );
    res.json(rows);
  } catch (err) {
    hantarRalat(res, err, "Gagal mengambil jenis aktiviti.", "jenis aktiviti");
  }
};

const selCsv = (nilai) => {
  if (nilai === null || nilai === undefined) return "";
  let teks = nilai instanceof Date ? nilai.toISOString() : String(nilai);
  // Elak suntikan formula apabila fail dibuka dalam Excel
  if (/^[=+\-@\t\r]/.test(teks)) teks = `'${teks}`;
  return `"${teks.replace(/"/g, '""')}"`;
};

// =======================================================
// GET /api/log_aktiviti/eksport — CSV mengikut tapisan yang sama
// =======================================================
export const eksportLogAktiviti = async (req, res) => {
  try {
    const { where, params } = binaTapisan(req);
    const { rows } = await pool.query(
      `SELECT ${LAJUR_LOG} ${DARI_LOG} ${where}
        ORDER BY la.tarikh_masa DESC, la.id DESC
        LIMIT $${params.length + 1}`,
      [...params, HAD_EKSPORT + 1]
    );
    if (rows.length > HAD_EKSPORT) {
      throw ralat(
        400,
        `Terlalu banyak rekod (melebihi ${HAD_EKSPORT.toLocaleString("ms-MY")}). Sila kecilkan julat tarikh atau tapisan.`
      );
    }

    const pengepala = [
      "Tarikh & Masa",
      "ID Staf",
      "Nama",
      "Peranan",
      "Syarikat",
      "Aktiviti",
      "Ringkasan",
      "Perincian",
    ];
    const baris = rows.map((r) =>
      [
        new Date(r.tarikh_masa).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" }),
        r.staff_id,
        r.nama_pengguna,
        r.peranan_pengguna,
        r.syarikat,
        r.aktiviti,
        r.ringkasan,
        r.perincian,
      ]
        .map(selCsv)
        .join(",")
    );

    await catatAktiviti(
      req.user.pengguna_id,
      "Eksport Log Aktiviti",
      `${req.user.nama_penuh} telah mengeksport ${rows.length} rekod log aktiviti.`,
      `${req.user.nama_penuh} (${req.user.nama_peranan}) telah mengeksport ${rows.length} rekod log aktiviti ke CSV. Tapisan: ${
        JSON.stringify(req.query) === "{}" ? "tiada" : JSON.stringify(req.query)
      }.`
    );

    const namaFail = `log-aktiviti-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${namaFail}"`);
    // BOM supaya Excel membaca UTF-8 dengan betul
    res.send(`﻿${[pengepala.map(selCsv).join(","), ...baris].join("\r\n")}`);
  } catch (err) {
    hantarRalat(res, err, "Gagal mengeksport log aktiviti.", "eksport log aktiviti");
  }
};
