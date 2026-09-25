/**
 * Migration: Status akaun pengguna (kitaran hayat log masuk)
 *
 * - perlu_tukar_katalaluan: kata laluan ditetapkan pentadbir (akaun baharu /
 *   reset) mesti ditukar oleh pengguna sendiri pada log masuk pertama.
 * - is_aktif: pentadbir boleh menggantung akses tanpa memadam akaun.
 * - percubaan_gagal + dikunci_hingga: kunci sementara selepas percubaan
 *   log masuk gagal berturut-turut.
 * - log_masuk_terakhir, katalaluan_dikemaskini_at: maklumat untuk paparan
 *   pentadbir.
 *
 * Akaun sedia ada kekal aktif dan tidak dipaksa menukar kata laluan.
 */

const LAJUR = [
  [
    "perlu_tukar_katalaluan",
    (t) => t.boolean("perlu_tukar_katalaluan").notNullable().defaultTo(false),
  ],
  ["is_aktif", (t) => t.boolean("is_aktif").notNullable().defaultTo(true)],
  ["percubaan_gagal", (t) => t.integer("percubaan_gagal").notNullable().defaultTo(0)],
  ["dikunci_hingga", (t) => t.timestamp("dikunci_hingga", { useTz: true })],
  ["log_masuk_terakhir", (t) => t.timestamp("log_masuk_terakhir", { useTz: true })],
  ["katalaluan_dikemaskini_at", (t) => t.timestamp("katalaluan_dikemaskini_at", { useTz: true })],
];

export async function up(knex) {
  for (const [nama, tambah] of LAJUR) {
    if (!(await knex.schema.hasColumn("pengguna", nama))) {
      await knex.schema.alterTable("pengguna", (table) => tambah(table));
    }
  }
}

export async function down(knex) {
  for (const [nama] of [...LAJUR].reverse()) {
    if (await knex.schema.hasColumn("pengguna", nama)) {
      await knex.schema.alterTable("pengguna", (table) => table.dropColumn(nama));
    }
  }
}
