/**
 * Migration: Add is_deleted, timestamps, and no_rujukan_pindaan
 * Purpose: Soft delete support, audit timestamps, amendment reference numbers
 */

export async function up(knex) {
  // ---- risiko ----
  const hasRisikoCol = await knex.schema.hasColumn('risiko', 'is_deleted');
  if (!hasRisikoCol) {
    await knex.schema.alterTable('risiko', (table) => {
      table.boolean('is_deleted').defaultTo(false);
    });
  }

  // ---- punca_risiko ----
  const hasPuncaCol = await knex.schema.hasColumn('punca_risiko', 'is_deleted');
  if (!hasPuncaCol) {
    await knex.schema.alterTable('punca_risiko', (table) => {
      table.boolean('is_deleted').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // ---- kesan_risiko ----
  const hasKesanCol = await knex.schema.hasColumn('kesan_risiko', 'is_deleted');
  if (!hasKesanCol) {
    await knex.schema.alterTable('kesan_risiko', (table) => {
      table.boolean('is_deleted').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // ---- rawatan_risiko ----
  const hasRawatanCol = await knex.schema.hasColumn('rawatan_risiko', 'is_deleted');
  if (!hasRawatanCol) {
    await knex.schema.alterTable('rawatan_risiko', (table) => {
      table.boolean('is_deleted').defaultTo(false);
    });
  }

  // ---- pelan_tindakan_rawatan ----
  const hasPelanCol = await knex.schema.hasColumn('pelan_tindakan_rawatan', 'is_deleted');
  if (!hasPelanCol) {
    await knex.schema.alterTable('pelan_tindakan_rawatan', (table) => {
      table.boolean('is_deleted').defaultTo(false);
    });
  }

  // ---- kakitangan_rawatan ----
  const hasKakRawCol = await knex.schema.hasColumn('kakitangan_rawatan', 'is_deleted');
  if (!hasKakRawCol) {
    await knex.schema.alterTable('kakitangan_rawatan', (table) => {
      table.boolean('is_deleted').defaultTo(false);
    });
  }

  // ---- logpemantauan ----
  const hasLogCol = await knex.schema.hasColumn('logpemantauan', 'is_deleted');
  if (!hasLogCol) {
    await knex.schema.alterTable('logpemantauan', (table) => {
      table.boolean('is_deleted').defaultTo(false);
    });
  }

  // ---- pelantindakanpemantauan ----
  const hasPelPemCol = await knex.schema.hasColumn('pelantindakanpemantauan', 'is_deleted');
  if (!hasPelPemCol) {
    await knex.schema.alterTable('pelantindakanpemantauan', (table) => {
      table.boolean('is_deleted').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // ---- kakitanganpemantauan ----
  const hasKakPemCol = await knex.schema.hasColumn('kakitanganpemantauan', 'is_deleted');
  if (!hasKakPemCol) {
    await knex.schema.alterTable('kakitanganpemantauan', (table) => {
      table.boolean('is_deleted').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // ---- permohonan_pindaan: is_deleted + no_rujukan_pindaan ----
  const hasPinCol = await knex.schema.hasColumn('permohonan_pindaan', 'is_deleted');
  if (!hasPinCol) {
    await knex.schema.alterTable('permohonan_pindaan', (table) => {
      table.boolean('is_deleted').defaultTo(false);
      table.string('no_rujukan_pindaan', 100);
    });
  }

  // ---- log_aktiviti: tarikh_masa already exists, add is_deleted ----
  const hasLogAktCol = await knex.schema.hasColumn('log_aktiviti', 'is_deleted');
  if (!hasLogAktCol) {
    await knex.schema.alterTable('log_aktiviti', (table) => {
      table.boolean('is_deleted').defaultTo(false);
    });
  }
}

export async function down(knex) {
  const tables = [
    'risiko', 'punca_risiko', 'kesan_risiko', 'rawatan_risiko',
    'pelan_tindakan_rawatan', 'kakitangan_rawatan', 'logpemantauan',
    'pelantindakanpemantauan', 'kakitanganpemantauan', 'permohonan_pindaan',
    'log_aktiviti'
  ];
  for (const t of tables) {
    const has = await knex.schema.hasColumn(t, 'is_deleted');
    if (has) await knex.schema.alterTable(t, (table) => table.dropColumn('is_deleted'));
  }
  const hasPindaanRef = await knex.schema.hasColumn('permohonan_pindaan', 'no_rujukan_pindaan');
  if (hasPindaanRef) await knex.schema.alterTable('permohonan_pindaan', (table) => table.dropColumn('no_rujukan_pindaan'));
}
