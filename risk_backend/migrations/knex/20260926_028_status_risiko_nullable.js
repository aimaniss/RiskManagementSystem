/**
 * Migration: risiko.status_risiko boleh NULL
 *
 * Borang Daftar Risiko tidak menghantar status risiko (ia diisi kemudian);
 * pangkalan data sedia ada sudah membenarkan NULL dan mempunyai baris NULL.
 * Migrasi 004 menetapkan NOT NULL, jadi pemasangan baharu gagal (500) semasa
 * mendaftar risiko melalui UI.
 */

export async function up(knex) {
  await knex.raw("ALTER TABLE risiko ALTER COLUMN status_risiko DROP NOT NULL");
}

export async function down(knex) {
  // Hanya boleh dipulihkan jika tiada baris NULL
  const { rows } = await knex.raw(
    "SELECT COUNT(*)::int AS n FROM risiko WHERE status_risiko IS NULL"
  );
  if (rows[0].n === 0) {
    await knex.raw("ALTER TABLE risiko ALTER COLUMN status_risiko SET NOT NULL");
  }
}
