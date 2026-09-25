// 03-rollback-transaksi.spec.mjs — Fasa 6: Spec rollback transaksi.
// Tujuan: sahkan `dalamTransaksi` (utils/transaksi.js) membatalkan keseluruhan
// operasi bila satu langkah gagal, dan hanya komit bila semua berjaya.

import { test, expect } from "@playwright/test";
import { DB, muatDalamTransaksi, tutupDB } from "../db.helper.mjs";

let dalamTransaksi;
const NAMA_UNIK = `E2E-Rollback-${Date.now()}`;

test.beforeAll(async () => {
  dalamTransaksi = await muatDalamTransaksi();
});

test("Perubahan dibatalkan (ROLLBACK) bila fungsi dalam transaksi gagal", async () => {
  await expect(
    dalamTransaksi(async (client) => {
      await client.query(`INSERT INTO bahagian (nama_bahagian) VALUES ($1)`, [NAMA_UNIK]);
      throw new Error("Simulasi kegagalan selepas INSERT");
    })
  ).rejects.toThrow(/Simulasi kegagalan/);

  const { rows } = await DB.query(
    `SELECT 1 FROM bahagian WHERE nama_bahagian = $1`,
    [NAMA_UNIK]
  );
  expect(rows.length).toBe(0);
});

test("ROLLBACK juga berlaku untuk pelanggaran kekangan (UNIQUE) dalam transaksi", async () => {
  const nama = `${NAMA_UNIK}-dua`;
  await dalamTransaksi((client) =>
    client.query(`INSERT INTO bahagian (nama_bahagian) VALUES ($1)`, [nama])
  );

  const { rows } = await DB.query(`SELECT bahagian_id FROM bahagian WHERE nama_bahagian = $1`, [nama]);
  expect(rows.length).toBe(1);

  // Percubaan kedua dengan nama sama mesti gagal (UNIQUE) dan tidak meninggalkan
  // baris tambahan — butiran tidak boleh "menjadi dua".
  await expect(
    dalamTransaksi((client) =>
      client.query(`INSERT INTO bahagian (nama_bahagian) VALUES ($1)`, [nama])
    )
  ).rejects.toThrow();

  const { rows: selepas } = await DB.query(
    `SELECT bahagian_id FROM bahagian WHERE nama_bahagian = $1`,
    [nama]
  );
  expect(selepas.length).toBe(1);

  await DB.query(`DELETE FROM bahagian WHERE bahagian_id = $1`, [rows[0].bahagian_id]);
});

test("Perubahan kekal (COMMIT) bila semua langkah dalam transaksi berjaya", async () => {
  const nama = `${NAMA_UNIK}-commit`;
  const hasil = await dalamTransaksi((client) =>
    client.query(
      `INSERT INTO bahagian (nama_bahagian) VALUES ($1) RETURNING bahagian_id`,
      [nama]
    )
  );
  const id = hasil.rows[0].bahagian_id;
  expect(id).toBeTruthy();

  const { rows } = await DB.query(
    `SELECT 1 FROM bahagian WHERE bahagian_id = $1`,
    [id]
  );
  expect(rows.length).toBe(1);

  // Bersihkan artefak ujian
  await DB.query(`DELETE FROM bahagian WHERE bahagian_id = $1`, [id]);
  await DB.query(`DELETE FROM bahagian WHERE nama_bahagian LIKE $1`, [`${NAMA_UNIK}%`]);
});

test.afterAll(tutupDB);