/**
 * Migration: Create peranan (Roles) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('peranan');
  if (!exists) {
    await knex.schema.createTable('peranan', (table) => {
      table.increments('peranan_id').primary();
      table.string('nama_peranan', 100).notNullable().unique();
      table.text('keterangan');
    });

    await knex('peranan').insert([
      { nama_peranan: 'Admin', keterangan: 'Pentadbir sistem' },
      { nama_peranan: 'Executive', keterangan: 'Eksekutif' },
      { nama_peranan: 'Staff', keterangan: 'Kakitangan' },
      { nama_peranan: 'Ketua Subsidiari', keterangan: 'Ketua Subsidiari' },
    ]);
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('peranan');
}
