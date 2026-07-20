/**
 * Migration: Create syarikat (Company/Subsidiary) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('syarikat');
  if (!exists) {
    await knex.schema.createTable('syarikat', (table) => {
      table.increments('syarikat_id').primary();
      table.string('nama_syarikat', 255).notNullable();
      table.string('light_logo_url', 255);
      table.string('kod_warna', 50);
      table.string('singkatan', 100);
      table.string('dark_logo_url', 255);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('syarikat');
}
