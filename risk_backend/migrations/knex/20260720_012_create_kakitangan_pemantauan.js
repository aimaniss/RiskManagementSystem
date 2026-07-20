/**
 * Migration: Create kakitanganpemantauan (Monitoring Personnel) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('kakitanganpemantauan');
  if (!exists) {
    await knex.schema.createTable('kakitanganpemantauan', (table) => {
      table.uuid('kakitangan_id').primary().defaultTo(knex.fn.uuid());
      table.uuid('log_id').notNullable().references('log_id').inTable('logpemantauan').onDelete('CASCADE');
      table.string('butiran_kakitangan', 255).notNullable();
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('kakitanganpemantauan');
}
