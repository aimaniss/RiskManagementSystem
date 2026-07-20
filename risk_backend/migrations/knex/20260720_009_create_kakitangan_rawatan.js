/**
 * Migration: Create kakitangan_rawatan (Treatment Personnel) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('kakitangan_rawatan');
  if (!exists) {
    await knex.schema.createTable('kakitangan_rawatan', (table) => {
      table.increments('kakitangan_id').primary();
      table.string('nama_kakitangan', 255).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.integer('rawatan_id').unsigned().notNullable().references('rawatan_id').inTable('rawatan_risiko').onDelete('CASCADE');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('kakitangan_rawatan');
}
