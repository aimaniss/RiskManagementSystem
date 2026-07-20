/**
 * Migration: Create log_aktiviti (Activity/Audit Log) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('log_aktiviti');
  if (!exists) {
    await knex.schema.createTable('log_aktiviti', (table) => {
      table.bigIncrements('id').primary();
      table.integer('pengguna_id').unsigned().notNullable().references('pengguna_id').inTable('pengguna');
      table.string('aktiviti', 100).notNullable();
      table.text('perincian').notNullable();
      table.timestamp('tarikh_masa').notNullable().defaultTo(knex.fn.now());
      table.string('ringkasan', 255).notNullable();
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('log_aktiviti');
}
