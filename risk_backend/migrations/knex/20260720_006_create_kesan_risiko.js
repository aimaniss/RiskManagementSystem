/**
 * Migration: Create kesan_risiko (Risk Consequences) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('kesan_risiko');
  if (!exists) {
    await knex.schema.createTable('kesan_risiko', (table) => {
      table.increments('id').primary();
      table.integer('risiko_id').unsigned().notNullable().references('risiko_id').inTable('risiko').onDelete('CASCADE');
      table.text('kesan').notNullable();
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('kesan_risiko');
}
