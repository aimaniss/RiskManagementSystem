// utils/transaksi.js — Helper transaksi pangkalan data pusat.
// Balut operasi tulis berbilang-jadual dalam satu transaksi (BEGIN/COMMIT/ROLLBACK).
// Peraturan: catatAktiviti & notifikasi mesti dipanggil SELEPAS COMMIT (luar fn),
// supaya kegagalan log/notifikasi tidak menggagalkan data perniagaan.

import pool from "../config/db.js";

/**
 * Jalankan fn(client) dalam satu transaksi. Auto-rollback jika fn envolv.
 * @param {import("pg").PoolClient => any} fn
 * @returns {Promise<any>} nilai pulangan fn
 */
export async function dalamTransaksi(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hasil = await fn(client);
    await client.query("COMMIT");
    return hasil;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}