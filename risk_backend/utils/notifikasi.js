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

const cariPenggunaAktifDenganKebenaran = async (namaKebenaran) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT u.pengguna_id
       FROM pengguna u
       JOIN peranan_kebenaran pk ON pk.peranan_id = u.peranan_id
       JOIN kebenaran k ON k.kebenaran_id = pk.kebenaran_id
      WHERE u.is_deleted = false AND k.nama_kebenaran = ANY($1)`,
    [namaKebenaran]
  );
  return rows.map((r) => r.pengguna_id);
};

/**
 * Dapatkan ID pengguna aktif yang memiliki sekurang-kurangnya satu kebenaran
 * (cth. "pindaan:lulus"), tidak termasuk `kecuali` (biasanya pelaku sendiri).
 *
 * Jika tiada penerima (semua pelulus dipadam / matriks berubah), jatuh balik
 * kepada pentadbir ("pengguna:urus") supaya notifikasi kelulusan tidak hilang
 * tanpa jejak. Jika pentadbir juga tiada, amaran dicatat dan [] dipulangkan.
 */
const dapatkanPenerimaIkutKebenaran = async (namaKebenaran, { kecuali = [] } = {}) => {
  const tapis = (ids) => ids.filter((id) => !kecuali.includes(id));
  try {
    const penerima = tapis(await cariPenggunaAktifDenganKebenaran(namaKebenaran));
    if (penerima.length > 0) return penerima;

    const pentadbir = tapis(await cariPenggunaAktifDenganKebenaran(["pengguna:urus"]));
    if (pentadbir.length > 0) {
      console.warn(
        `Tiada pengguna aktif dengan ${namaKebenaran.join("/")}; notifikasi dihantar kepada pentadbir.`
      );
      return pentadbir;
    }

    console.warn(
      `Tiada penerima notifikasi untuk ${namaKebenaran.join("/")} (termasuk pentadbir).`
    );
    return [];
  } catch (error) {
    console.error("Ralat dapatkan penerima notifikasi:", error);
    return [];
  }
};

export { hantarNotifikasi, hantarNotifikasiBulk, dapatkanPenerimaIkutKebenaran };
