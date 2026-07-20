/**
 * Migration: Create pengguna (Users) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('pengguna');
  if (!exists) {
    await knex.schema.createTable('pengguna', (table) => {
      table.increments('pengguna_id').primary();
      table.string('staff_id', 50).notNullable().unique();
      table.string('nama_penuh', 255).notNullable();
      table.text('katalaluan').notNullable();
      table.integer('syarikat_id').unsigned().references('syarikat_id').inTable('syarikat');
      table.integer('peranan_id').unsigned().notNullable().references('peranan_id').inTable('peranan');
      table.timestamp('tarikh_dibuat').defaultTo(knex.fn.now());
      table.timestamp('tarikh_dikemaskini').defaultTo(knex.fn.now());
      table.specificType('gambar_profil', 'bytea');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pengguna');
}
