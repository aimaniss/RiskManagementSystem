/**
 * Migration: Fix existing risks stuck as 'Menunggu Kelulusan'
 * Semua risiko sedia ada warga 'Diluluskan' sebelum workflow ini wujud
 */

export async function up(knex) {
  await knex("risiko")
    .where("status_kelulusan", "Menunggu Kelulusan")
    .whereNull("diluluskan_oleh_id")
    .update({ status_kelulusan: "Diluluskan" });
}

export async function down(knex) {
  // no-op
}
