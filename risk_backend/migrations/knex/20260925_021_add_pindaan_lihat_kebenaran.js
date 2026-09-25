/**
 * Migration 021 — Kebenaran `pindaan:lihat`
 *
 * Senarai permohonan pindaan (GET /api/pindaan) sebelum ini hanya untuk
 * Admin + Executive. Tanpa kebenaran khusus, memetakannya kepada
 * `pindaan:lulus` akan menghadkan pula kepada Admin sahaja. Kebenaran ini
 * memelihara hak asal: Admin + Executive boleh melihat senarai semua
 * permohonan, manakala Staff/Ketua Subsidiari tidak terdedah kepada
 * permohonan syarikat lain.
 */
export async function up(knex) {
  await knex.raw(
    `INSERT INTO kebenaran (nama_kebenaran, keterangan)
     VALUES ('pindaan:lihat', 'Lihat senarai permohonan pindaan (semua syarikat)')
     ON CONFLICT DO NOTHING`
  );

  // Admin + Executive sahaja
  for (const peranan of ["Admin", "Executive"]) {
    await knex.raw(
      `INSERT INTO peranan_kebenaran (peranan_id, kebenaran_id)
       SELECT p.peranan_id, k.kebenaran_id
       FROM peranan p, kebenaran k
       WHERE p.nama_peranan = ? AND k.nama_kebenaran = 'pindaan:lihat'
       ON CONFLICT DO NOTHING`,
      [peranan]
    );
  }
}

export async function down(knex) {
  await knex.raw(
    `DELETE FROM peranan_kebenaran WHERE kebenaran_id IN
       (SELECT kebenaran_id FROM kebenaran WHERE nama_kebenaran = 'pindaan:lihat')`
  );
  await knex.raw(`DELETE FROM kebenaran WHERE nama_kebenaran = 'pindaan:lihat'`);
}
