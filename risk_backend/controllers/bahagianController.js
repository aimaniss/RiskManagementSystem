// controllers/bahagianController.js — Rujukan Bahagian/Unit
import pool from "../config/db.js";
import { dalamTransaksi } from "../utils/transaksi.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";
import { ralat, hantarRalat, bacaBoolean } from "../utils/ralatApi.js";

// ---------------- GET /api/bahagian?semua=true -----------------
// Borang hanya memerlukan bahagian aktif; `semua=true` (Tetapan Sistem) turut
// memulangkan yang tidak aktif beserta bilangan risiko yang menggunakannya.
export const senaraiBahagian = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*,
              (SELECT COUNT(*)::int FROM risiko r
                WHERE r.is_deleted = false AND r.bahagian = b.nama_bahagian) AS bilangan_risiko
         FROM bahagian b
        WHERE ($1::boolean OR b.is_aktif = true)
        ORDER BY b.nama_bahagian ASC`,
      [req.query.semua === "true"]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ralat pelayan. Sila cuba sebentar lagi." });
  }
};

// ---------------- POST /api/bahagian -----------------
// SELECT + INSERT dibalut transaksi dan dikunci dengan advisory lock supaya
// dua permintaan serentak dengan nama sama tidak menghasilkan duplikat.
export const tambahBahagian = async (req, res) => {
  try {
    const { nama_bahagian } = req.body;

    if (!nama_bahagian || nama_bahagian.trim() === "") {
      return res.status(400).json({ error: "Nama bahagian diperlukan." });
    }

    const nama = nama_bahagian.trim();

    const bahagian = await dalamTransaksi(async (client) => {
      // Kunci transaksi mengikut nama (digabung huruf kecil) — serialize serentak
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended(LOWER($1), 0))", [nama]);

      const existing = await client.query(
        "SELECT * FROM bahagian WHERE LOWER(nama_bahagian) = LOWER($1)",
        [nama]
      );
      if (existing.rows.length > 0) {
        const err = new Error(
          existing.rows[0].is_aktif
            ? "Bahagian ini sudah wujud."
            : "Bahagian ini wujud tetapi tidak aktif. Hubungi pentadbir untuk mengaktifkannya."
        );
        err.statusCode = 409;
        throw err;
      }

      const { rows } = await client.query(
        "INSERT INTO bahagian (nama_bahagian) VALUES ($1) RETURNING *",
        [nama]
      );
      return rows[0];
    });

    res.status(201).json(bahagian);
  } catch (err) {
    console.error(err);
    if (err.statusCode === 409) return res.status(409).json({ error: err.message });
    res.status(500).json({ error: "Ralat pelayan. Sila cuba sebentar lagi." });
  }
};

// ---------------- PUT /api/bahagian/:id (tetapan:urus) -----------------
// risiko.bahagian menyimpan nama (teks), jadi tukar nama dikaskadkan ke risiko
// sedia ada dalam transaksi yang sama.
export const kemaskiniBahagian = async (req, res) => {
  try {
    const nama = String(req.body.nama_bahagian ?? "")
      .trim()
      .replace(/\s+/g, " ");
    if (!nama) throw ralat(400, "Nama bahagian diperlukan.");

    const hasil = await dalamTransaksi(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended(LOWER($1), 0))", [nama]);
      const { rows } = await client.query(
        "SELECT * FROM bahagian WHERE bahagian_id = $1 FOR UPDATE",
        [req.params.id]
      );
      const asal = rows[0];
      if (!asal) throw ralat(404, "Bahagian tidak ditemui.");

      const dup = await client.query(
        "SELECT 1 FROM bahagian WHERE LOWER(nama_bahagian) = LOWER($1) AND bahagian_id <> $2",
        [nama, asal.bahagian_id]
      );
      if (dup.rowCount > 0) throw ralat(409, "Bahagian dengan nama ini sudah wujud.");

      const { rows: baru } = await client.query(
        "UPDATE bahagian SET nama_bahagian = $1 WHERE bahagian_id = $2 RETURNING *",
        [nama, asal.bahagian_id]
      );
      const risiko =
        nama !== asal.nama_bahagian
          ? await client.query("UPDATE risiko SET bahagian = $1 WHERE bahagian = $2", [
              nama,
              asal.nama_bahagian,
            ])
          : { rowCount: 0 };
      return { asal, baru: baru[0], risikoDikemaskini: risiko.rowCount };
    });

    await catatAktiviti(
      req.user.pengguna_id,
      "Tetapan Sistem",
      `Menukar nama bahagian: ${hasil.asal.nama_bahagian} kepada ${nama}.`,
      `${req.user.nama_penuh} (${req.user.nama_peranan}) telah menukar nama bahagian "${hasil.asal.nama_bahagian}" kepada "${nama}" (${hasil.risikoDikemaskini} risiko dikemas kini).`
    );
    res.json({ ...hasil.baru, risiko_dikemaskini: hasil.risikoDikemaskini });
  } catch (err) {
    hantarRalat(res, err, "Gagal mengemaskini bahagian.", "kemaskini bahagian");
  }
};

// ---------------- PATCH /api/bahagian/:id/status (tetapan:urus) -----------------
export const tukarStatusBahagian = async (req, res) => {
  try {
    const is_aktif = bacaBoolean(req.body.is_aktif);
    const { rows } = await pool.query(
      "UPDATE bahagian SET is_aktif = $1 WHERE bahagian_id = $2 RETURNING *",
      [is_aktif, req.params.id]
    );
    if (!rows[0]) throw ralat(404, "Bahagian tidak ditemui.");

    await catatAktiviti(
      req.user.pengguna_id,
      "Tetapan Sistem",
      `${is_aktif ? "Mengaktifkan" : "Menyahaktifkan"} bahagian: ${rows[0].nama_bahagian}.`,
      `${req.user.nama_penuh} (${req.user.nama_peranan}) telah ${
        is_aktif ? "mengaktifkan" : "menyahaktifkan"
      } bahagian ${rows[0].nama_bahagian}.`
    );
    res.json(rows[0]);
  } catch (err) {
    hantarRalat(res, err, "Gagal mengemaskini status bahagian.", "status bahagian");
  }
};
