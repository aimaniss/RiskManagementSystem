import pool from "../config/db.js";
import { kosongkanCacheKebenaran } from "../middleware/authMiddleware.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";

export const senaraiPeranan = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM peranan ORDER BY peranan_id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Guna selepas mengubah `peranan_kebenaran` terus di DB/migrasi.
export const kosongkanCache = async (req, res) => {
  const dikosongkan = kosongkanCacheKebenaran();

  await catatAktiviti(
    req.user.pengguna_id,
    "Kosongkan Cache Kebenaran",
    `${req.user.nama_penuh} telah mengosongkan cache kebenaran.`,
    `${req.user.nama_penuh} (${req.user.nama_peranan}) mengosongkan cache kebenaran peranan (${dikosongkan} entri). Perubahan peranan_kebenaran kini berkuat kuasa serta-merta.`
  );

  res.json({ message: "Cache kebenaran berjaya dikosongkan.", dikosongkan });
};
