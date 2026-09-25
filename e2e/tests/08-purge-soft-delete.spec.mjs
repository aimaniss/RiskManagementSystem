// 08-purge-soft-delete.spec.mjs — 10-PLAN §2.1: purge rekod soft-delete.
// Tujuan: `jalankanPurge` (risk_backend/scripts/purge.js) hanya membuang baris
// is_deleted=true yang melepasi tempoh simpanan, melangkau deleted_at NULL,
// tidak menyentuh baris aktif, dan mencatat jejak audit.
//
// Keselamatan: baris ujian bertarikh ~100 tahun dahulu dan purge dijalankan
// dengan hari=36000, supaya rekod soft-delete sebenar dalam DB tidak tersentuh.

import { test, expect } from "@playwright/test";
import { DB, muatModulBackend } from "../db.helper.mjs";
import { CREDENTIALS } from "./helpers.mjs";

const HARI = 36000;
const TANDA = `E2E-Purge-${Date.now()}`;
let jalankanPurge;
let penggunaId;
const id = { notifikasi: {}, log: {} };

const tambahNotifikasi = async (isDeleted, deletedAt) => {
  const { rows } = await DB.query(
    `INSERT INTO notifikasi (pengguna_id, tajuk, mesej, jenis_notifikasi, telah_dibaca, created_at, is_deleted, deleted_at)
     VALUES ($1, $2, 'ujian', 'e2e', false, NOW(), $3, ${deletedAt}) RETURNING notifikasi_id`,
    [penggunaId, TANDA, isDeleted]
  );
  return rows[0].notifikasi_id;
};

const tambahLog = async (isDeleted, deletedAt) => {
  const { rows } = await DB.query(
    `INSERT INTO log_aktiviti (pengguna_id, aktiviti, ringkasan, perincian, tarikh_masa, is_deleted, deleted_at)
     VALUES ($1, $2, 'ujian', 'ujian', NOW(), $3, ${deletedAt}) RETURNING id`,
    [penggunaId, TANDA, isDeleted]
  );
  return rows[0].id;
};

const wujud = async (jadual, lajur, nilai) =>
  (await DB.query(`SELECT 1 FROM ${jadual} WHERE ${lajur} = $1`, [nilai])).rows.length === 1;

test.beforeAll(async () => {
  ({ jalankanPurge } = await muatModulBackend("scripts", "purge.js"));
  const { rows } = await DB.query("SELECT pengguna_id FROM pengguna WHERE staff_id = $1", [
    CREDENTIALS.admin.staff_id,
  ]);
  penggunaId = rows[0].pengguna_id;

  const LAMA = "NOW() - INTERVAL '100 years'";
  const BARU = "NOW() - INTERVAL '10 days'";
  id.notifikasi = {
    lama: await tambahNotifikasi(true, LAMA),
    baru: await tambahNotifikasi(true, BARU),
    tanpaTarikh: await tambahNotifikasi(true, "NULL"),
    aktif: await tambahNotifikasi(false, "NULL"),
  };
  id.log = {
    lama: await tambahLog(true, LAMA),
    baru: await tambahLog(true, BARU),
    tanpaTarikh: await tambahLog(true, "NULL"),
    aktif: await tambahLog(false, "NULL"),
  };
});

test.afterAll(async () => {
  await DB.query("DELETE FROM notifikasi WHERE tajuk = $1", [TANDA]);
  await DB.query("DELETE FROM log_aktiviti WHERE aktiviti = $1", [TANDA]);
  await DB.query(
    `DELETE FROM log_aktiviti WHERE aktiviti = 'Purge Data Soft-Delete' AND perincian LIKE $1`,
    [`%lebih ${HARI} hari%`]
  );
});

test("Pratonton tidak mengubah data", async () => {
  const hasil = await jalankanPurge({ laksana: false, hari: HARI, oleh: null });
  expect(hasil.laksana).toBe(false);
  expect(hasil.pratonton.notifikasi.layak).toBeGreaterThanOrEqual(1);
  expect(hasil.pratonton.log_aktiviti.layak).toBeGreaterThanOrEqual(1);
  expect(await wujud("notifikasi", "notifikasi_id", id.notifikasi.lama)).toBe(true);
  expect(await wujud("log_aktiviti", "id", id.log.lama)).toBe(true);
});

test("Laksana tanpa pentadbir sah ditolak", async () => {
  await expect(
    jalankanPurge({ laksana: true, hari: HARI, oleh: CREDENTIALS.staff.staff_id })
  ).rejects.toThrow(/pengguna:urus/);
  expect(await wujud("notifikasi", "notifikasi_id", id.notifikasi.lama)).toBe(true);
});

test("Laksana: buang hanya baris lama, kekalkan yang lain, catat audit", async () => {
  const hasil = await jalankanPurge({
    laksana: true,
    hari: HARI,
    oleh: CREDENTIALS.admin.staff_id,
  });
  expect(hasil.dibuang.notifikasi).toBe(1);
  expect(hasil.dibuang.log_aktiviti).toBe(1);

  expect(await wujud("notifikasi", "notifikasi_id", id.notifikasi.lama)).toBe(false);
  expect(await wujud("notifikasi", "notifikasi_id", id.notifikasi.baru)).toBe(true);
  expect(await wujud("notifikasi", "notifikasi_id", id.notifikasi.tanpaTarikh)).toBe(true);
  expect(await wujud("notifikasi", "notifikasi_id", id.notifikasi.aktif)).toBe(true);

  expect(await wujud("log_aktiviti", "id", id.log.lama)).toBe(false);
  expect(await wujud("log_aktiviti", "id", id.log.baru)).toBe(true);
  expect(await wujud("log_aktiviti", "id", id.log.tanpaTarikh)).toBe(true);
  expect(await wujud("log_aktiviti", "id", id.log.aktif)).toBe(true);

  const { rows } = await DB.query(
    `SELECT pengguna_id FROM log_aktiviti
      WHERE aktiviti = 'Purge Data Soft-Delete' AND perincian LIKE $1`,
    [`%lebih ${HARI} hari%`]
  );
  expect(rows.length).toBe(1);
  expect(rows[0].pengguna_id).toBe(penggunaId);
});
