/**
 * Migration: Create pelan_tindakan_rawatan (Treatment Action Plans) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('pelan_tindakan_rawatan');
  if (!exists) {
    await knex.schema.createTable('pelan_tindakan_rawatan', (table) => {
      table.increments('pelan_id').primary();
      table.text('pelan_tindakan').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.integer('rawatan_id').unsigned().notNullable().references('rawatan_id').inTable('rawatan_risiko').onDelete('CASCADE');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pelan_tindakan_rawatan');
}
