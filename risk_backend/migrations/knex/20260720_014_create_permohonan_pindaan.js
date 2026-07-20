/**
 * Migration: Create permohonan_pindaan, kebenaran, peranan_kebenaran, notifikasi tables
 * Created: 2026-07-20
 */

export async function up(knex) {
  // permohonan_pindaan
  if (!(await knex.schema.hasTable('permohonan_pindaan'))) {
    await knex.schema.createTable('permohonan_pindaan', (table) => {
      table.increments('pindaan_id').primary();
      table.integer('risiko_id').unsigned().notNullable().references('risiko_id').inTable('risiko').onDelete('CASCADE');
      table.integer('pengguna_id_pemohon').unsigned().notNullable().references('pengguna_id').inTable('pengguna');
      table.string('status_permohonan', 50).notNullable();
      table.jsonb('data_sebelum').notNullable();
      table.jsonb('data_selepas').notNullable();
      table.text('justifikasi_penilaian');
      table.text('justifikasi_keberkesanan');
      table.integer('pengguna_id_pelulus').unsigned().references('pengguna_id').inTable('pengguna');
      table.timestamp('tarikh_diproses');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.string('sebab_ditolak', 255);
    });
  }

  // kebenaran
  if (!(await knex.schema.hasTable('kebenaran'))) {
    await knex.schema.createTable('kebenaran', (table) => {
      table.increments('kebenaran_id').primary();
      table.string('nama_kebenaran', 100).notNullable();
      table.text('keterangan');
    });
  }

  // peranan_kebenaran
  if (!(await knex.schema.hasTable('peranan_kebenaran'))) {
    await knex.schema.createTable('peranan_kebenaran', (table) => {
      table.integer('peranan_id').unsigned().references('peranan_id').inTable('peranan').onDelete('CASCADE');
      table.integer('kebenaran_id').unsigned().references('kebenaran_id').inTable('kebenaran').onDelete('CASCADE');
    });
  }

  // notifikasi
  if (!(await knex.schema.hasTable('notifikasi'))) {
    await knex.schema.createTable('notifikasi', (table) => {
      table.increments('notifikasi_id').primary();
      table.integer('pengguna_id').unsigned().notNullable().references('pengguna_id').inTable('pengguna');
      table.string('tajuk', 255).notNullable();
      table.text('mesej').notNullable();
      table.string('jenis_notifikasi', 100).notNullable();
      table.integer('entiti_id');
      table.boolean('telah_dibaca').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('notifikasi');
  await knex.schema.dropTableIfExists('peranan_kebenaran');
  await knex.schema.dropTableIfExists('kebenaran');
  await knex.schema.dropTableIfExists('permohonan_pindaan');
}
