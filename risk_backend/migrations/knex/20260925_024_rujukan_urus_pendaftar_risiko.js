// Migration 024 — `rujukan:urus` (tambah bahagian baharu semasa daftar risiko,
// POST /api/bahagian) diberi kepada semua peranan yang boleh mendaftar risiko:
// Executive, Ketua Subsidiari, Staff (Admin sudah ada). Sebelum ini butang
// "Tambah Bahagian" dipaparkan kepada mereka tetapi API menolak dengan 403.
// `peranan_kebenaran` tiada kekangan unik, jadi guna NOT EXISTS (idempoten).
// Selepas migrasi pada server yang sedang berjalan: POST /api/roles/flush-cache.

const PERANAN = ["Executive", "Ketua Subsidiari", "Staff"];
const KEBENARAN = "rujukan:urus";

export async function up(knex) {
  await knex.raw(
    `INSERT INTO peranan_kebenaran (peranan_id, kebenaran_id)
     SELECT p.peranan_id, k.kebenaran_id
       FROM peranan p, kebenaran k
      WHERE p.nama_peranan = ANY(?) AND k.nama_kebenaran = ?
        AND NOT EXISTS (
          SELECT 1 FROM peranan_kebenaran pk
           WHERE pk.peranan_id = p.peranan_id AND pk.kebenaran_id = k.kebenaran_id
        )`,
    [PERANAN, KEBENARAN]
  );
}

export async function down(knex) {
  await knex.raw(
    `DELETE FROM peranan_kebenaran
      WHERE peranan_id IN (SELECT peranan_id FROM peranan WHERE nama_peranan = ANY(?))
        AND kebenaran_id = (SELECT kebenaran_id FROM kebenaran WHERE nama_kebenaran = ?)`,
    [PERANAN, KEBENARAN]
  );
}
