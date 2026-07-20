/**
 * Migration: Create logpemantauan (Monitoring Logs) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('logpemantauan');
  if (!exists) {
    await knex.schema.createTable('logpemantauan', (table) => {
      table.uuid('log_id').primary().defaultTo(knex.fn.uuid());
      table.integer('risiko_id').unsigned().notNullable().references('risiko_id').inTable('risiko').onDelete('CASCADE');
      table.date('tarikh_pemantauan').notNullable();
      table.integer('tahun_pemantauan').notNullable();
      table.integer('separuh_tahun_pemantauan');
      table.integer('skor_kebarangkalian_selepas');
      table.integer('skor_impak_selepas');
      table.string('kekerapan_pemantauan', 100);
      table.string('keberkesanan', 100);
      table.string('status_pemantauan', 50).notNullable();
      table.text('catatan');
      table.string('no_bil_kelulusan', 100);
      table.timestamp('tarikh_kemaskini');
      table.string('skor_risiko_pemantauan', 10);
      table.text('justifikasi_pindaan_pemantauan');
      table.timestamp('created_at_pemantauan');
      table.timestamp('update_at_pemantauan');
      table.integer('created_by_pemantauan');
      table.integer('updated_by_pemantauan');
      table.integer('dipinda_oleh_id');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('logpemantauan');
}
