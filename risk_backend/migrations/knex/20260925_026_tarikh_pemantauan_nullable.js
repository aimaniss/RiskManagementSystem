/**
 * Migration: logpemantauan.tarikh_pemantauan boleh NULL
 *
 * Log pemantauan awal (lulus risiko) dan log baharu tidak mengisi lajur ini;
 * pangkalan data sedia ada sudah membenarkan NULL dan query menyusun dengan
 * `NULLS LAST`. Migrasi 010 menetapkan NOT NULL, jadi pemasangan baharu gagal
 * semasa meluluskan risiko. Tiada nilai lalai ditambah kerana ia akan mengubah
 * susunan "log terkini" (ORDER BY tarikh_pemantauan DESC).
 */

export async function up(knex) {
  await knex.raw("ALTER TABLE logpemantauan ALTER COLUMN tarikh_pemantauan DROP NOT NULL");
}

export async function down(knex) {
  // Hanya boleh dipulihkan jika tiada baris NULL
  const { rows } = await knex.raw(
    "SELECT COUNT(*)::int AS n FROM logpemantauan WHERE tarikh_pemantauan IS NULL"
  );
  if (rows[0].n === 0) {
    await knex.raw("ALTER TABLE logpemantauan ALTER COLUMN tarikh_pemantauan SET NOT NULL");
  }
}
