/**
 * Migration: Create pelantindakanpemantauan (Monitoring Action Plans) table
 * Created: 2026-07-20
 */

export async function up(knex) {
  const exists = await knex.schema.hasTable('pelantindakanpemantauan');
  if (!exists) {
    await knex.schema.createTable('pelantindakanpemantauan', (table) => {
      table.uuid('pelan_tindakan_id').primary().defaultTo(knex.fn.uuid());
      table.uuid('log_id').notNullable().references('log_id').inTable('logpemantauan').onDelete('CASCADE');
      table.text('butiran_aktiviti').notNullable();
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pelantindakanpemantauan');
}
