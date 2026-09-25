import pool from "../config/db.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";
import { PERANAN_TERHAD } from "../middleware/aksesSyarikat.js";
import { ralat, hantarRalat, bacaBoolean } from "../utils/ralatApi.js";

const LAJUR_SYARIKAT = `
  s.syarikat_id, s.nama_syarikat, s.singkatan, s.kod_warna,
  s.light_logo_url, s.dark_logo_url, s.is_aktif`;

// ---------------- GET /api/syarikat?semua=true -----------------
// Borang hanya memerlukan syarikat aktif; `semua=true` (Tetapan Sistem) turut
// memulangkan yang tidak aktif beserta bilangan pengguna & risiko.
export const senaraiSyarikat = async (req, res) => {
  try {
    const params = [req.query.semua === "true"];
    let query = `
      SELECT ${LAJUR_SYARIKAT},
             (SELECT COUNT(*)::int FROM pengguna u
               WHERE u.syarikat_id = s.syarikat_id AND u.is_deleted = false) AS bilangan_pengguna,
             (SELECT COUNT(*)::int FROM risiko r
               WHERE r.syarikat_id = s.syarikat_id AND r.is_deleted = false) AS bilangan_risiko
        FROM syarikat s
       WHERE ($1::boolean OR s.is_aktif = true)`;

    if (PERANAN_TERHAD.includes(req.user.nama_peranan)) {
      query += " AND s.syarikat_id = $2";
      params.push(req.user.syarikat_id);
    }

    query += " ORDER BY s.syarikat_id";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    hantarRalat(res, err, "Ralat pelayan. Sila cuba sebentar lagi.", "senarai syarikat");
  }
};

const sahkanBorangSyarikat = (body) => {
  const nama_syarikat = String(body.nama_syarikat ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const singkatan = String(body.singkatan ?? "").trim() || null;
  const kod_warna = String(body.kod_warna ?? "").trim() || null;

  if (!nama_syarikat) throw ralat(400, "Nama syarikat diperlukan.");
  if (nama_syarikat.length > 255) throw ralat(400, "Nama syarikat terlalu panjang.");
  if (singkatan && singkatan.length > 20) throw ralat(400, "Singkatan maksimum 20 aksara.");
  if (kod_warna && !/^#[0-9a-fA-F]{6}$/.test(kod_warna)) {
    throw ralat(400, "Kod warna mesti dalam format #RRGGBB.");
  }
  return { nama_syarikat, singkatan, kod_warna };
};

const semakNamaUnik = async (nama, kecualiId = null) => {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM syarikat
      WHERE LOWER(nama_syarikat) = LOWER($1) AND ($2::int IS NULL OR syarikat_id <> $2)`,
    [nama, kecualiId]
  );
  if (rowCount > 0) throw ralat(409, "Syarikat dengan nama ini sudah wujud.");
};

// ---------------- POST /api/syarikat (tetapan:urus) -----------------
export const tambahSyarikat = async (req, res) => {
  try {
    const borang = sahkanBorangSyarikat(req.body);
    await semakNamaUnik(borang.nama_syarikat);

    const { rows } = await pool.query(
      `INSERT INTO syarikat (nama_syarikat, singkatan, kod_warna)
       VALUES ($1, $2, $3)
       RETURNING syarikat_id, nama_syarikat, singkatan, kod_warna,
                 light_logo_url, dark_logo_url, is_aktif`,
      [borang.nama_syarikat, borang.singkatan, borang.kod_warna]
    );

    await catatAktiviti(
      req.user.pengguna_id,
      "Tetapan Sistem",
      `Menambah syarikat: ${borang.nama_syarikat}.`,
      `${req.user.nama_penuh} (${req.user.nama_peranan}) telah menambah syarikat ${borang.nama_syarikat}${
        borang.singkatan ? ` (${borang.singkatan})` : ""
      }.`
    );
    res.status(201).json({ ...rows[0], bilangan_pengguna: 0, bilangan_risiko: 0 });
  } catch (err) {
    hantarRalat(res, err, "Gagal menambah syarikat.", "tambah syarikat");
  }
};

// ---------------- PUT /api/syarikat/:id (tetapan:urus) -----------------
// Risiko & pengguna merujuk syarikat_id, jadi tukar nama tidak perlu dikaskad.
export const kemaskiniSyarikat = async (req, res) => {
  try {
    const { id } = req.params;
    const borang = sahkanBorangSyarikat(req.body);
    await semakNamaUnik(borang.nama_syarikat, id);

    const { rows: asal } = await pool.query(
      "SELECT nama_syarikat FROM syarikat WHERE syarikat_id = $1",
      [id]
    );
    if (!asal[0]) throw ralat(404, "Syarikat tidak ditemui.");

    const { rows } = await pool.query(
      `UPDATE syarikat SET nama_syarikat = $1, singkatan = $2, kod_warna = $3
        WHERE syarikat_id = $4
        RETURNING syarikat_id, nama_syarikat, singkatan, kod_warna,
                  light_logo_url, dark_logo_url, is_aktif`,
      [borang.nama_syarikat, borang.singkatan, borang.kod_warna, id]
    );

    await catatAktiviti(
      req.user.pengguna_id,
      "Tetapan Sistem",
      `Mengemaskini syarikat: ${borang.nama_syarikat}.`,
      `${req.user.nama_penuh} (${req.user.nama_peranan}) telah mengemaskini syarikat ${asal[0].nama_syarikat}${
        asal[0].nama_syarikat !== borang.nama_syarikat
          ? ` (nama baharu: ${borang.nama_syarikat})`
          : ""
      }.`
    );
    res.json(rows[0]);
  } catch (err) {
    hantarRalat(res, err, "Gagal mengemaskini syarikat.", "kemaskini syarikat");
  }
};

// ---------------- PATCH /api/syarikat/:id/status (tetapan:urus) -----------------
// Tidak boleh nyahaktif selagi ada pengguna aktif (mereka akan kehilangan
// syarikat dalam borang); pindahkan atau nyahaktif pengguna dahulu.
export const tukarStatusSyarikat = async (req, res) => {
  try {
    const { id } = req.params;
    const is_aktif = bacaBoolean(req.body.is_aktif);

    if (!is_aktif) {
      const { rows: bil } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM pengguna
          WHERE syarikat_id = $1 AND is_deleted = false AND is_aktif = true`,
        [id]
      );
      if (bil[0].n > 0) {
        throw ralat(
          409,
          `Syarikat ini masih mempunyai ${bil[0].n} pengguna aktif. Pindahkan atau nyahaktifkan pengguna tersebut dahulu.`
        );
      }
    }

    const { rows } = await pool.query(
      `UPDATE syarikat SET is_aktif = $1 WHERE syarikat_id = $2
        RETURNING syarikat_id, nama_syarikat, singkatan, kod_warna,
                  light_logo_url, dark_logo_url, is_aktif`,
      [is_aktif, id]
    );
    if (!rows[0]) throw ralat(404, "Syarikat tidak ditemui.");

    await catatAktiviti(
      req.user.pengguna_id,
      "Tetapan Sistem",
      `${is_aktif ? "Mengaktifkan" : "Menyahaktifkan"} syarikat: ${rows[0].nama_syarikat}.`,
      `${req.user.nama_penuh} (${req.user.nama_peranan}) telah ${
        is_aktif ? "mengaktifkan" : "menyahaktifkan"
      } syarikat ${rows[0].nama_syarikat}.`
    );
    res.json(rows[0]);
  } catch (err) {
    hantarRalat(res, err, "Gagal mengemaskini status syarikat.", "status syarikat");
  }
};
