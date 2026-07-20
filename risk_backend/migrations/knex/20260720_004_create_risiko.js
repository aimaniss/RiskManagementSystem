/**
 * Migration: Create risiko (Risks) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('risiko');
  if (!exists) {
    await knex.schema.createTable('risiko', (table) => {
      table.increments('risiko_id').primary();
      table.string('no_rujukan', 100).notNullable();
      table.integer('tahun').notNullable();
      table.integer('separuh_tahun').notNullable();
      table.integer('syarikat_id').notNullable();
      table.string('kategori', 100).notNullable();
      table.text('bahagian').notNullable();
      table.text('risiko').notNullable();
      table.integer('skor_kebarangkalian');
      table.integer('skor_impak');
      table.string('skor_risiko', 10);
      table.string('status_risiko', 50).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.integer('created_by');
      table.integer('updated_by');
      table.text('justifikasi_pindaan_penilaian');
      table.integer('dipinda_oleh_id');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('risiko');
}
