/**
 * Migration 027 — Tetapan Sistem
 *
 * - Kebenaran `tetapan:urus` (Admin sahaja): urus syarikat, bahagian dan
 *   senarai rujukan dari UI supaya pentadbir tidak perlu mengubah DB terus.
 * - `syarikat.is_aktif`, `bahagian.is_aktif`: nyahaktif menyembunyikan pilihan
 *   daripada borang baharu tanpa menjejaskan rekod sedia ada.
 * - Jadual `senarai_rujukan`: pilihan dropdown yang boleh diurus (bermula
 *   dengan `kategori_risiko`, dipindah dari kod frontend).
 * - Normalisasi ejaan kategori lama "Pematuhan/Perundangan" kepada
 *   "Pematuhan / Perundangan" (borang sunting menggunakan ejaan berbeza, jadi
 *   risiko tersebut dikira "Lain-lain" di dashboard).
 *
 * Selepas migrasi pada server yang sedang berjalan: POST /api/roles/flush-cache.
 */

const KEBENARAN = "tetapan:urus";

const KATEGORI_RISIKO = [
  [
    "Strategik",
    "Potensi halangan atau isu secara material yang mempengaruhi pencapaian objektif strategik",
  ],
  [
    "Kewangan",
    "Potensi risiko yang mungkin menjejaskan kewangan organisasi seperti belanjawan, pendapatan dan kos",
  ],
  [
    "Operasi",
    "Risiko timbul daripada kegagalan proses organisasi, polisi, sistem dan/atau peristiwa yang mengganggu operasi perniagaan",
  ],
  [
    "Pematuhan / Perundangan",
    "Potensi pendedahan kepada keperluan undang-undang dan pematuhan peraturan",
  ],
];

export async function up(knex) {
  await knex.raw(
    `INSERT INTO kebenaran (nama_kebenaran, keterangan)
     VALUES (?, 'Urus tetapan sistem (syarikat, bahagian, senarai rujukan)')
     ON CONFLICT DO NOTHING`,
    [KEBENARAN]
  );
  await knex.raw(
    `INSERT INTO peranan_kebenaran (peranan_id, kebenaran_id)
     SELECT p.peranan_id, k.kebenaran_id
       FROM peranan p, kebenaran k
      WHERE p.nama_peranan = 'Admin' AND k.nama_kebenaran = ?
        AND NOT EXISTS (
          SELECT 1 FROM peranan_kebenaran pk
           WHERE pk.peranan_id = p.peranan_id AND pk.kebenaran_id = k.kebenaran_id
        )`,
    [KEBENARAN]
  );

  for (const jadual of ["syarikat", "bahagian"]) {
    if (!(await knex.schema.hasColumn(jadual, "is_aktif"))) {
      await knex.schema.alterTable(jadual, (t) => {
        t.boolean("is_aktif").notNullable().defaultTo(true);
      });
    }
  }

  if (!(await knex.schema.hasTable("senarai_rujukan"))) {
    await knex.schema.createTable("senarai_rujukan", (t) => {
      t.increments("rujukan_id").primary();
      t.string("jenis", 50).notNullable();
      t.string("nilai", 255).notNullable();
      t.text("penerangan");
      t.integer("susunan").notNullable().defaultTo(0);
      t.boolean("is_aktif").notNullable().defaultTo(true);
      t.boolean("is_deleted").notNullable().defaultTo(false);
      t.timestamp("deleted_at", { useTz: true });
      t.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
      t.timestamp("updated_at", { useTz: true }).defaultTo(knex.fn.now());
    });
    await knex.raw(
      `CREATE UNIQUE INDEX senarai_rujukan_jenis_nilai_uniq
         ON senarai_rujukan (jenis, LOWER(nilai)) WHERE is_deleted = false`
    );
  }

  for (const [i, [nilai, penerangan]] of KATEGORI_RISIKO.entries()) {
    await knex.raw(
      `INSERT INTO senarai_rujukan (jenis, nilai, penerangan, susunan)
       SELECT 'kategori_risiko', ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM senarai_rujukan
           WHERE jenis = 'kategori_risiko' AND LOWER(nilai) = LOWER(?) AND is_deleted = false
        )`,
      [nilai, penerangan, i + 1, nilai]
    );
  }

  await knex.raw(
    `UPDATE risiko SET kategori = 'Pematuhan / Perundangan'
      WHERE kategori = 'Pematuhan/Perundangan'`
  );
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("senarai_rujukan");
  for (const jadual of ["syarikat", "bahagian"]) {
    if (await knex.schema.hasColumn(jadual, "is_aktif")) {
      await knex.schema.alterTable(jadual, (t) => t.dropColumn("is_aktif"));
    }
  }
  await knex.raw(
    `DELETE FROM peranan_kebenaran
      WHERE kebenaran_id = (SELECT kebenaran_id FROM kebenaran WHERE nama_kebenaran = ?)`,
    [KEBENARAN]
  );
  await knex.raw("DELETE FROM kebenaran WHERE nama_kebenaran = ?", [KEBENARAN]);
}
