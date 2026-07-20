/**
 * Migration: Create rawatan_risiko (Risk Treatments) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('rawatan_risiko');
  if (!exists) {
    await knex.schema.createTable('rawatan_risiko', (table) => {
      table.increments('rawatan_id').primary();
      table.integer('risiko_id').unsigned().notNullable().references('risiko_id').inTable('risiko').onDelete('CASCADE');
      table.string('jenis_kawalan', 100).notNullable();
      table.string('tempoh_siap', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('rawatan_risiko');
}
