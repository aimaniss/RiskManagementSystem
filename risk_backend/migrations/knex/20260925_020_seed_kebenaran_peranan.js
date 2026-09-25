/**
 * Migration 020 — Role Matrix `kebenaran` / `peranan_kebenaran` (Fasa 3 revamp v2)
 *
 * Menghidupkan jadual `kebenaran` & `peranan_kebenaran` yang wujud sejak
 * migration 014 tetapi tidak digunakan dalam kod. Matriks ini menjadi
 * SATU SUMBER KEBENARAN untuk middleware `authorizeKebenaran`.
 *
 * Senarai kebenaran (16):
 *  risiko:daftar, risiko:lihat, risiko:nilai, risiko:lulus, risiko:padam,
 *  rawatan:urus, pemantauan:urus, pindaan:urus, pindaan:lulus,
 *  pengguna:urus, log:baca, log:padam, notifikasi:urus, laporan:jana,
 *  dashboard:lihat, rujukan:urus
 */
export async function up(knex) {
  // Permastian: peranan `Viewer` wujud (tidak di-seed dalam migration 001)
  await knex.raw(
    `INSERT INTO peranan (nama_peranan, keterangan)
     SELECT 'Viewer', 'Pembaca sahaja (semua syarikat)'
     WHERE NOT EXISTS (SELECT 1 FROM peranan WHERE nama_peranan = 'Viewer')`
  );

  // Indeks unik (dedupe dahulu supaya selamat jika ada data sedia ada)
  await knex.raw(
    `DELETE FROM peranan_kebenaran a
      USING peranan_kebenaran b
      WHERE a.peranan_id = b.peranan_id
        AND a.kebenaran_id = b.kebenaran_id
        AND a.ctid < b.ctid`
  );
  await knex.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS peranan_kebenaran_uniq
       ON peranan_kebenaran (peranan_id, kebenaran_id)`
  );

  // Indeks unik pada nama_kebenaran
  await knex.raw(
    `DELETE FROM kebenaran a
      USING kebenaran b
      WHERE a.kebenaran_id = b.kebenaran_id
        AND LOWER(a.nama_kebenaran) = LOWER(b.nama_kebenaran)
        AND a.ctid < b.ctid`
  );
  await knex.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS kebenaran_nama_uniq
       ON kebenaran (LOWER(nama_kebenaran))`
  );

  // ---- Senarai kebenaran ----
  const kebenaran = [
    ["risiko:daftar", "Daftar risiko baharu"],
    ["risiko:lihat", "Lihat senarai risiko"],
    ["risiko:nilai", "Kemaskini penilaian/skor risiko"],
    ["risiko:lulus", "Lulus/tolak risiko (ulasan)"],
    ["risiko:padam", "Soft-delete risiko"],
    ["rawatan:urus", "Tambah/kemaskini/padam rawatan"],
    ["pemantauan:urus", "Tambah/kemaskini/padam log pemantauan"],
    ["pindaan:urus", "Mohon pindaan"],
    ["pindaan:lulus", "Lulus/tolak pindaan"],
    ["pengguna:urus", "CRUD pengguna"],
    ["log:baca", "Lihat log aktiviti"],
    ["log:padam", "Padam (soft-delete) log aktiviti"],
    ["notifikasi:urus", "Urus notifikasi sendiri"],
    ["laporan:jana", "Jana/eksport laporan PDF"],
    ["dashboard:lihat", "Lihat statistik dashboard"],
    ["rujukan:urus", "Urus data rujukan (bahagian)"],
  ];

  for (const [nama, keterangan] of kebenaran) {
    await knex.raw(
      `INSERT INTO kebenaran (nama_kebenaran, keterangan)
       VALUES (?, ?)
       ON CONFLICT DO NOTHING`,
      [nama, keterangan]
    );
  }

  // ---- Matriks peranan -> kebenaran ----
  const matriks = {
    Admin: [
      "risiko:daftar",
      "risiko:lihat",
      "risiko:nilai",
      "risiko:lulus",
      "risiko:padam",
      "rawatan:urus",
      "pemantauan:urus",
      "pindaan:urus",
      "pindaan:lulus",
      "pengguna:urus",
      "log:baca",
      "log:padam",
      "notifikasi:urus",
      "laporan:jana",
      "dashboard:lihat",
      "rujukan:urus",
    ],
    Executive: [
      "risiko:daftar",
      "risiko:lihat",
      "risiko:nilai",
      "risiko:lulus",
      "risiko:padam",
      "rawatan:urus",
      "pemantauan:urus",
      "pindaan:urus",
      "pindaan:lulus",
      "log:baca",
      "notifikasi:urus",
      "laporan:jana",
      "dashboard:lihat",
    ],
    "Ketua Subsidiari": [
      "risiko:daftar",
      "risiko:lihat",
      "risiko:nilai",
      "risiko:padam",
      "rawatan:urus",
      "pemantauan:urus",
      "pindaan:urus",
      "log:baca",
      "notifikasi:urus",
      "laporan:jana",
      "dashboard:lihat",
    ],
    Staff: [
      "risiko:daftar",
      "risiko:lihat",
      "rawatan:urus",
      "pemantauan:urus",
      "pindaan:urus",
      "log:baca",
      "notifikasi:urus",
      "laporan:jana",
      "dashboard:lihat",
    ],
    Viewer: ["risiko:lihat", "log:baca", "notifikasi:urus", "laporan:jana", "dashboard:lihat"],
  };

  for (const [peranan, kunciList] of Object.entries(matriks)) {
    for (const kunci of kunciList) {
      await knex.raw(
        `INSERT INTO peranan_kebenaran (peranan_id, kebenaran_id)
         SELECT p.peranan_id, k.kebenaran_id
         FROM peranan p, kebenaran k
         WHERE p.nama_peranan = ? AND k.nama_kebenaran = ?
         ON CONFLICT DO NOTHING`,
        [peranan, kunci]
      );
    }
  }
}

export async function down(knex) {
  await knex.raw(`DELETE FROM peranan_kebenaran`);
  await knex.raw(`DELETE FROM kebenaran`);
  try {
    await knex.raw(`DROP INDEX IF EXISTS peranan_kebenaran_uniq`);
    await knex.raw(`DROP INDEX IF EXISTS kebenaran_nama_uniq`);
  } catch (e) {
    // abaikan — indeks mungkin tidak wujud
  }
}
