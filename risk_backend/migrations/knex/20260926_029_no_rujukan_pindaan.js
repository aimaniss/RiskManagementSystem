/**
 * Migration: no. rujukan pindaan seragam PIN-<tahun>-<0001>
 *
 * Permohonan lama tidak mempunyai nombor (dan penjanaan lama "PIN-001/2026"
 * berdasarkan COUNT boleh berulang). Semua rekod dinomborkan semula mengikut
 * tahun & tarikh permohonan, kemudian indeks unik menghalang pertindihan.
 * Rekod soft-delete turut dinomborkan supaya nombor tidak digunakan semula.
 */

export async function up(knex) {
  await knex.raw(`
    WITH bernombor AS (
      SELECT pindaan_id,
             EXTRACT(YEAR FROM created_at)::int AS tahun,
             ROW_NUMBER() OVER (
               PARTITION BY EXTRACT(YEAR FROM created_at)
               ORDER BY created_at, pindaan_id
             ) AS bil
        FROM permohonan_pindaan
    )
    UPDATE permohonan_pindaan p
       SET no_rujukan_pindaan = 'PIN-' || b.tahun || '-' || LPAD(b.bil::text, 4, '0')
      FROM bernombor b
     WHERE b.pindaan_id = p.pindaan_id
  `);
  await knex.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS permohonan_pindaan_no_rujukan_unik ON permohonan_pindaan (no_rujukan_pindaan)"
  );
}

export async function down(knex) {
  await knex.raw("DROP INDEX IF EXISTS permohonan_pindaan_no_rujukan_unik");
}
