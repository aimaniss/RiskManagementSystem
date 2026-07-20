/**
 * Migration: Create punca_risiko (Risk Causes) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('punca_risiko');
  if (!exists) {
    await knex.schema.createTable('punca_risiko', (table) => {
      table.increments('id').primary();
      table.integer('risiko_id').unsigned().notNullable().references('risiko_id').inTable('risiko').onDelete('CASCADE');
      table.text('punca').notNullable();
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('punca_risiko');
}
