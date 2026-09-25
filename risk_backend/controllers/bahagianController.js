// controllers/bahagianController.js — Rujukan Bahagian/Unit
import pool from "../config/db.js";
import { dalamTransaksi } from "../utils/transaksi.js";

// ---------------- GET /api/bahagian -----------------
export const senaraiBahagian = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM bahagian ORDER BY nama_bahagian ASC");
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
        const err = new Error("Bahagian ini sudah wujud.");
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
