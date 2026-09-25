/**
 * Migration 019 — Dasar soft-delete menyeluruh (Fasa 2 revamp v2)
 * 1. Tambah `is_deleted` + `deleted_at` pada `pengguna` dan `notifikasi`
 *    (dua jadual yang masih tiada lajur soft-delete).
 * 2. Tambah `deleted_at` pada 11 jadual yang sebelum ini hanya ada
 *    `is_deleted` (migration 015) — supaya waktu padam direkod.
 * Tiada data fizikal dipadam dalam migration ini.
 */
export async function up(knex) {
  // --- pengguna ---
  if (!(await knex.schema.hasColumn("pengguna", "is_deleted"))) {
    await knex.schema.alterTable("pengguna", (table) => {
      table.boolean("is_deleted").defaultTo(false);
    });
  }
  if (!(await knex.schema.hasColumn("pengguna", "deleted_at"))) {
    await knex.schema.alterTable("pengguna", (table) => {
      table.timestamp("deleted_at");
    });
  }

  // --- notifikasi ---
  if (!(await knex.schema.hasColumn("notifikasi", "is_deleted"))) {
    await knex.schema.alterTable("notifikasi", (table) => {
      table.boolean("is_deleted").defaultTo(false);
    });
  }
  if (!(await knex.schema.hasColumn("notifikasi", "deleted_at"))) {
    await knex.schema.alterTable("notifikasi", (table) => {
      table.timestamp("deleted_at");
    });
  }

  // --- deleted_at untuk jadual yang hanya ada is_deleted (migration 015) ---
  const jadual = [
    "risiko",
    "punca_risiko",
    "kesan_risiko",
    "rawatan_risiko",
    "pelan_tindakan_rawatan",
    "kakitangan_rawatan",
    "logpemantauan",
    "pelantindakanpemantauan",
    "kakitanganpemantauan",
    "permohonan_pindaan",
    "log_aktiviti",
  ];
  for (const t of jadual) {
    const has = await knex.schema.hasColumn(t, "deleted_at");
    if (!has) {
      await knex.schema.alterTable(t, (table) => {
        table.timestamp("deleted_at");
      });
    }
  }
}

export async function down(knex) {
  const jadual = [
    "pengguna",
    "notifikasi",
    "risiko",
    "punca_risiko",
    "kesan_risiko",
    "rawatan_risiko",
    "pelan_tindakan_rawatan",
    "kakitangan_rawatan",
    "logpemantauan",
    "pelantindakanpemantauan",
    "kakitanganpemantauan",
    "permohonan_pindaan",
    "log_aktiviti",
  ];
  for (const t of jadual) {
    const has = await knex.schema.hasColumn(t, "deleted_at");
    if (has) await knex.schema.alterTable(t, (table) => table.dropColumn("deleted_at"));
  }
  if (await knex.schema.hasColumn("notifikasi", "is_deleted")) {
    await knex.schema.alterTable("notifikasi", (table) => table.dropColumn("is_deleted"));
  }
  if (await knex.schema.hasColumn("pengguna", "is_deleted")) {
    await knex.schema.alterTable("pengguna", (table) => table.dropColumn("is_deleted"));
  }
}
