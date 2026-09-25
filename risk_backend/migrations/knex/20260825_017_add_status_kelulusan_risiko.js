/**
 * Migration: Add status_kelulusan and sebab_ditolak to risiko
 * Purpose: Risk approval workflow — Admin/Executive must accept newly registered risks
 */

export async function up(knex) {
  const hasStatusCol = await knex.schema.hasColumn("risiko", "status_kelulusan");
  if (!hasStatusCol) {
    await knex.schema.alterTable("risiko", (table) => {
      table.string("status_kelulusan", 50).defaultTo("Menunggu Kelulusan");
    });
  }

  const hasSebabCol = await knex.schema.hasColumn("risiko", "sebab_ditolak_risiko");
  if (!hasSebabCol) {
    await knex.schema.alterTable("risiko", (table) => {
      table.text("sebab_ditolak_risiko").nullable();
    });
  }

  const hasDiluluskanOlehCol = await knex.schema.hasColumn("risiko", "diluluskan_oleh_id");
  if (!hasDiluluskanOlehCol) {
    await knex.schema.alterTable("risiko", (table) => {
      table.integer("diluluskan_oleh_id").nullable();
    });
  }

  const hasTarikhKelulusanCol = await knex.schema.hasColumn("risiko", "tarikh_kelulusan");
  if (!hasTarikhKelulusanCol) {
    await knex.schema.alterTable("risiko", (table) => {
      table.timestamp("tarikh_kelulusan").nullable();
    });
  }

  // Set ALL existing risks to 'Diluluskan' (they were already active before this workflow)
  // whereNull tak function sebab PostgreSQL dah set default value
  await knex("risiko")
    .where("status_kelulusan", "Menunggu Kelulusan")
    .whereNull("diluluskan_oleh_id")
    .update({ status_kelulusan: "Diluluskan" });
}

export async function down(knex) {
  const cols = [
    "status_kelulusan",
    "sebab_ditolak_risiko",
    "diluluskan_oleh_id",
    "tarikh_kelulusan",
  ];
  for (const col of cols) {
    const has = await knex.schema.hasColumn("risiko", col);
    if (has) await knex.schema.alterTable("risiko", (table) => table.dropColumn(col));
  }
}
