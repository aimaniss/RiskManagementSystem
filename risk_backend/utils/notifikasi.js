import pool from "../config/db.js";

/**
 * Hantar notifikasi kepada satu pengguna.
 */
const hantarNotifikasi = async (pengguna_id, tajuk, mesej, jenis_notifikasi, entiti_id = null) => {
  try {
    await pool.query(
      `INSERT INTO notifikasi (pengguna_id, tajuk, mesej, jenis_notifikasi, entiti_id, telah_dibaca, created_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW())`,
      [pengguna_id, tajuk, mesej, jenis_notifikasi, entiti_id]
    );
  } catch (error) {
    console.error("Ralat hantar notifikasi:", error);
  }
};

/**
 * Hantar notifikasi kepada ramai pengguna sekaligus.
 */
const hantarNotifikasiBulk = async (
  pengguna_ids,
  tajuk,
  mesej,
  jenis_notifikasi,
  entiti_id = null
) => {
  if (!Array.isArray(pengguna_ids) || pengguna_ids.length === 0) return;
  try {
    const values = [];
    const placeholders = [];
    pengguna_ids.forEach((id, index) => {
      placeholders.push(
        `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5}, false, NOW())`
      );
      values.push(id, tajuk, mesej, jenis_notifikasi, entiti_id);
    });
    await pool.query(
      `INSERT INTO notifikasi (pengguna_id, tajuk, mesej, jenis_notifikasi, entiti_id, telah_dibaca, created_at)
       VALUES ${placeholders.join(", ")}`,
      values
    );
  } catch (error) {
    console.error("Ralat hantar notifikasi bulk:", error);
  }
};

/**
 * Dapatkan semua ID pengguna berdasarkan peranan.
 */
const dapatkanPenggunaIdByPeranan = async (...nama_peranan) => {
  try {
    const { rows } = await pool.query(
      `SELECT pengguna_id FROM pengguna WHERE is_deleted = false AND peranan_id IN (
         SELECT peranan_id FROM peranan WHERE nama_peranan = ANY($1)
       )`,
      [nama_peranan]
    );
    return rows.map((r) => r.pengguna_id);
  } catch (error) {
    console.error("Ralat dapatkan pengguna by peranan:", error);
    return [];
  }
};

export { hantarNotifikasi, hantarNotifikasiBulk, dapatkanPenggunaIdByPeranan };
