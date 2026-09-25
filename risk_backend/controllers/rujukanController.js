// controllers/rujukanController.js — Senarai rujukan boleh urus (Tetapan Sistem)
import pool from "../config/db.js";
import { dalamTransaksi } from "../utils/transaksi.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";
import { ralat, hantarRalat, bacaBoolean } from "../utils/ralatApi.js";

// Jenis yang dibenarkan. `lajurRisiko` ialah lajur teks dalam `risiko` yang
// menyimpan nilai ini; tukar nama dikaskadkan supaya laporan & dashboard kekal
// tepat. Status aliran kerja (Buka/Tutup, dsb.) sengaja TIDAK di sini kerana
// logik kod bergantung pada nilainya.
export const JENIS_RUJUKAN = {
  kategori_risiko: { label: "Kategori Risiko", lajurRisiko: "kategori" },
};

const semakJenis = (jenis) => {
  if (!JENIS_RUJUKAN[jenis]) throw ralat(400, "Jenis senarai rujukan tidak sah.");
  return JENIS_RUJUKAN[jenis];
};

const bersihkanNilai = (nilai) => {
  const hasil = String(nilai ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!hasil) throw ralat(400, "Nilai diperlukan.");
  if (hasil.length > 100) throw ralat(400, "Nilai tidak boleh melebihi 100 aksara.");
  return hasil;
};

const semakDuplikasi = async (client, jenis, nilai, kecualiId = null) => {
  const { rowCount } = await client.query(
    `SELECT 1 FROM senarai_rujukan
      WHERE jenis = $1 AND LOWER(nilai) = LOWER($2) AND is_deleted = false
        AND ($3::int IS NULL OR rujukan_id <> $3)`,
    [jenis, nilai, kecualiId]
  );
  if (rowCount > 0) throw ralat(409, `"${nilai}" sudah wujud dalam senarai.`);
};

// ---------------- GET /api/rujukan/jenis -----------------
export const senaraiJenisRujukan = (_req, res) => {
  res.json(Object.entries(JENIS_RUJUKAN).map(([jenis, { label }]) => ({ jenis, label })));
};

// ---------------- GET /api/rujukan?jenis=&semua=true -----------------
// Borang hanya memerlukan nilai aktif; `semua=true` (Tetapan Sistem) turut
// memulangkan yang tidak aktif beserta bilangan risiko yang menggunakannya.
export const senaraiRujukan = async (req, res) => {
  try {
    const { jenis, semua } = req.query;
    const { lajurRisiko } = semakJenis(jenis);

    const { rows } = await pool.query(
      `SELECT sr.rujukan_id, sr.jenis, sr.nilai, sr.penerangan, sr.susunan, sr.is_aktif,
              (SELECT COUNT(*)::int FROM risiko r
                WHERE r.is_deleted = false AND r.${lajurRisiko} = sr.nilai) AS bilangan_risiko
         FROM senarai_rujukan sr
        WHERE sr.jenis = $1 AND sr.is_deleted = false
          AND ($2::boolean OR sr.is_aktif = true)
        ORDER BY sr.susunan, sr.nilai`,
      [jenis, semua === "true"]
    );
    res.json(rows);
  } catch (err) {
    hantarRalat(res, err, "Gagal memuatkan senarai rujukan.", "senarai rujukan");
  }
};

// ---------------- POST /api/rujukan -----------------
export const tambahRujukan = async (req, res) => {
  try {
    const { jenis } = req.body;
    const { label } = semakJenis(jenis);
    const nilai = bersihkanNilai(req.body.nilai);
    const penerangan = String(req.body.penerangan ?? "").trim() || null;

    const baru = await dalamTransaksi(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        `rujukan:${jenis}`,
      ]);
      await semakDuplikasi(client, jenis, nilai);
      const { rows } = await client.query(
        `INSERT INTO senarai_rujukan (jenis, nilai, penerangan, susunan)
         VALUES ($1::varchar, $2, $3,
                 (SELECT COALESCE(MAX(susunan), 0) + 1 FROM senarai_rujukan
                   WHERE jenis = $1::varchar AND is_deleted = false))
         RETURNING rujukan_id, jenis, nilai, penerangan, susunan, is_aktif`,
        [jenis, nilai, penerangan]
      );
      return rows[0];
    });

    await catatAktiviti(
      req.user.pengguna_id,
      "Tetapan Sistem",
      `Menambah ${label}: ${nilai}.`,
      `${req.user.nama_penuh} (${req.user.nama_peranan}) telah menambah "${nilai}" ke senarai ${label}.`
    );
    res.status(201).json({ ...baru, bilangan_risiko: 0 });
  } catch (err) {
    hantarRalat(res, err, "Gagal menambah senarai rujukan.", "tambah rujukan");
  }
};

// ---------------- PUT /api/rujukan/:id -----------------
// Tukar nama turut mengemas kini risiko sedia ada (dalam satu transaksi).
export const kemaskiniRujukan = async (req, res) => {
  try {
    const { id } = req.params;
    const nilai = bersihkanNilai(req.body.nilai);
    const penerangan = String(req.body.penerangan ?? "").trim() || null;
    const susunan = req.body.susunan === undefined ? null : parseInt(req.body.susunan, 10);
    if (susunan !== null && !Number.isInteger(susunan)) throw ralat(400, "Susunan tidak sah.");

    const hasil = await dalamTransaksi(async (client) => {
      const { rows } = await client.query(
        "SELECT * FROM senarai_rujukan WHERE rujukan_id = $1 AND is_deleted = false FOR UPDATE",
        [id]
      );
      const asal = rows[0];
      if (!asal) throw ralat(404, "Rekod senarai rujukan tidak ditemui.");
      const { lajurRisiko } = semakJenis(asal.jenis);

      await semakDuplikasi(client, asal.jenis, nilai, asal.rujukan_id);

      const { rows: dikemaskini } = await client.query(
        `UPDATE senarai_rujukan
            SET nilai = $1, penerangan = $2, susunan = COALESCE($3, susunan), updated_at = NOW()
          WHERE rujukan_id = $4
          RETURNING rujukan_id, jenis, nilai, penerangan, susunan, is_aktif`,
        [nilai, penerangan, susunan, id]
      );

      let risikoDikemaskini = 0;
      if (nilai !== asal.nilai) {
        const kemaskini = await client.query(
          `UPDATE risiko SET ${lajurRisiko} = $1 WHERE ${lajurRisiko} = $2`,
          [nilai, asal.nilai]
        );
        risikoDikemaskini = kemaskini.rowCount;
      }
      return { asal, baru: dikemaskini[0], risikoDikemaskini };
    });

    const { label } = JENIS_RUJUKAN[hasil.asal.jenis];
    const tukarNama = hasil.asal.nilai !== nilai;
    await catatAktiviti(
      req.user.pengguna_id,
      "Tetapan Sistem",
      tukarNama
        ? `Menukar ${label}: ${hasil.asal.nilai} kepada ${nilai}.`
        : `Mengemaskini ${label}: ${nilai}.`,
      `${req.user.nama_penuh} (${req.user.nama_peranan}) telah mengemaskini ${label} "${hasil.asal.nilai}"${
        tukarNama ? ` kepada "${nilai}" (${hasil.risikoDikemaskini} risiko dikemas kini)` : ""
      }.`
    );

    res.json({ ...hasil.baru, risiko_dikemaskini: hasil.risikoDikemaskini });
  } catch (err) {
    hantarRalat(res, err, "Gagal mengemaskini senarai rujukan.", "kemaskini rujukan");
  }
};

// ---------------- PATCH /api/rujukan/:id/status -----------------
// Nyahaktif hanya menyembunyikan pilihan daripada borang; risiko sedia ada kekal.
export const tukarStatusRujukan = async (req, res) => {
  try {
    const is_aktif = bacaBoolean(req.body.is_aktif);
    const { rows } = await pool.query(
      `UPDATE senarai_rujukan SET is_aktif = $1, updated_at = NOW()
        WHERE rujukan_id = $2 AND is_deleted = false
        RETURNING rujukan_id, jenis, nilai, penerangan, susunan, is_aktif`,
      [is_aktif, req.params.id]
    );
    if (!rows[0]) throw ralat(404, "Rekod senarai rujukan tidak ditemui.");

    const { label } = JENIS_RUJUKAN[rows[0].jenis] || { label: rows[0].jenis };
    await catatAktiviti(
      req.user.pengguna_id,
      "Tetapan Sistem",
      `${is_aktif ? "Mengaktifkan" : "Menyahaktifkan"} ${label}: ${rows[0].nilai}.`,
      `${req.user.nama_penuh} (${req.user.nama_peranan}) telah ${
        is_aktif ? "mengaktifkan" : "menyahaktifkan"
      } "${rows[0].nilai}" dalam senarai ${label}.`
    );
    res.json(rows[0]);
  } catch (err) {
    hantarRalat(res, err, "Gagal mengemaskini status.", "status rujukan");
  }
};
