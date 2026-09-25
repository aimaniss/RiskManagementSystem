import pool from "../config/db.js";

/**
 * GET: Dapatkan notifikasi untuk pengguna semasa
 * Endpoint: /api/notifikasi/
 */
export const senaraiNotifikasi = async (req, res) => {
  try {
    const { pengguna_id } = req.user;
    const { limit = 20, offset = 0 } = req.query;

    const { rows } = await pool.query(
      `SELECT notifikasi_id, tajuk, mesej, jenis_notifikasi, entiti_id, telah_dibaca, created_at
       FROM notifikasi
       WHERE pengguna_id = $1 AND is_deleted = false
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [pengguna_id, parseInt(limit), parseInt(offset)]
    );

    res.json(rows);
  } catch (err) {
    console.error("Ralat GET /notifikasi:", err);
    res.status(500).json({ error: "Gagal memuatkan notifikasi." });
  }
};

/**
 * GET: Dapatkan bilangan notifikasi belum dibaca
 * Endpoint: /api/notifikasi/unread-count
 */
export const kiraBelumBaca = async (req, res) => {
  try {
    const { pengguna_id } = req.user;
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM notifikasi WHERE pengguna_id = $1 AND telah_dibaca = false AND is_deleted = false`,
      [pengguna_id]
    );
    res.json({ count: parseInt(rows[0].count) || 0 });
  } catch (err) {
    console.error("Ralat GET /notifikasi/unread-count:", err);
    res.status(500).json({ error: "Gagal memuatkan bilangan notifikasi." });
  }
};

/**
 * PUT: Tanda satu notifikasi sebagai sudah dibaca
 * Endpoint: /api/notifikasi/:notifikasi_id/baca
 */
export const tandaDibaca = async (req, res) => {
  try {
    const { notifikasi_id } = req.params;
    const { pengguna_id } = req.user;

    await pool.query(
      `UPDATE notifikasi SET telah_dibaca = true WHERE notifikasi_id = $1 AND pengguna_id = $2 AND is_deleted = false`,
      [notifikasi_id, pengguna_id]
    );

    res.json({ message: "Notifikasi ditanda sebagai dibaca." });
  } catch (err) {
    console.error("Ralat PUT /notifikasi/:id/baca:", err);
    res.status(500).json({ error: "Gagal mengemaskini notifikasi." });
  }
};

/**
 * PUT: Tanda semua notifikasi sebagai sudah dibaca
 * Endpoint: /api/notifikasi/baca-semua
 */
export const tandaSemuaDibaca = async (req, res) => {
  try {
    const { pengguna_id } = req.user;

    await pool.query(
      `UPDATE notifikasi SET telah_dibaca = true WHERE pengguna_id = $1 AND telah_dibaca = false AND is_deleted = false`,
      [pengguna_id]
    );

    res.json({ message: "Semua notifikasi ditanda sebagai dibaca." });
  } catch (err) {
    console.error("Ralat PUT /notifikasi/baca-semua:", err);
    res.status(500).json({ error: "Gagal mengemaskini notifikasi." });
  }
};

/**
 * DELETE: Padam (soft-delete) satu notifikasi
 * Endpoint: /api/notifikasi/:notifikasi_id
 */
export const padamNotifikasi = async (req, res) => {
  try {
    const { notifikasi_id } = req.params;
    const { pengguna_id } = req.user;

    const { rowCount } = await pool.query(
      `UPDATE notifikasi SET is_deleted = true, deleted_at = NOW() WHERE notifikasi_id = $1 AND pengguna_id = $2 AND is_deleted = false`,
      [notifikasi_id, pengguna_id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "Notifikasi tidak dijumpai." });
    }

    res.json({ message: "Notifikasi berjaya dipadam." });
  } catch (err) {
    console.error("Ralat DELETE /notifikasi/:id:", err);
    res.status(500).json({ error: "Gagal memadam notifikasi." });
  }
};
