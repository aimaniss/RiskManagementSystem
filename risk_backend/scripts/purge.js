// scripts/purge.js — Buang KEKAL rekod soft-delete yang melepasi tempoh simpanan.
//
// Pratonton (lalai, tiada perubahan):
//   npm run purge
// Laksana (perlu ID staf pentadbir untuk jejak audit):
//   npm run purge -- --laksana --oleh=UKMH001
// Tukar tempoh simpanan (hari, minimum 30; lalai 365):
//   npm run purge -- --hari=730
//
// Skop: `notifikasi` dan `log_aktiviti` sahaja (10-PLAN §2.1). Baris dengan
// is_deleted=true tetapi deleted_at NULL dilangkau kerana umurnya tidak diketahui.
// Ini satu-satunya tempat `DELETE FROM` dibenarkan dalam risk_backend.

import { pathToFileURL } from "node:url";
import pool from "../config/db.js";
import { dalamTransaksi } from "../utils/transaksi.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";

const JADUAL = ["notifikasi", "log_aktiviti"];
const HARI_LALAI = 365;
const HARI_MINIMUM = 30;

const bacaArgumen = (argv) => {
  const arg = { laksana: false, hari: HARI_LALAI, oleh: null };
  for (const a of argv) {
    if (a === "--laksana") arg.laksana = true;
    else if (a.startsWith("--hari=")) arg.hari = Number(a.slice("--hari=".length));
    else if (a.startsWith("--oleh=")) arg.oleh = a.slice("--oleh=".length).trim();
    else throw new Error(`Argumen tidak dikenali: ${a}`);
  }
  if (!Number.isInteger(arg.hari) || arg.hari < HARI_MINIMUM) {
    throw new Error(`--hari mesti integer >= ${HARI_MINIMUM}.`);
  }
  if (arg.laksana && !arg.oleh) {
    throw new Error("--laksana memerlukan --oleh=<staff_id pentadbir> untuk jejak audit.");
  }
  return arg;
};

const kira = async (hari) => {
  const hasil = {};
  for (const jadual of JADUAL) {
    const { rows } = await pool.query(
      `SELECT
         count(*) FILTER (WHERE is_deleted AND deleted_at < NOW() - make_interval(days => $1))::int AS layak,
         count(*) FILTER (WHERE is_deleted AND deleted_at IS NULL)::int AS tanpa_tarikh
       FROM ${jadual}`,
      [hari]
    );
    hasil[jadual] = rows[0];
  }
  return hasil;
};

const dapatkanPentadbir = async (staffId) => {
  const { rows } = await pool.query(
    `SELECT u.pengguna_id, u.nama_penuh, p.nama_peranan
       FROM pengguna u
       JOIN peranan p ON p.peranan_id = u.peranan_id
       JOIN peranan_kebenaran pk ON pk.peranan_id = u.peranan_id
       JOIN kebenaran k ON k.kebenaran_id = pk.kebenaran_id
      WHERE u.staff_id = $1 AND u.is_deleted = false AND k.nama_kebenaran = 'pengguna:urus'`,
    [staffId]
  );
  if (!rows[0]) {
    throw new Error(`Staf "${staffId}" tidak wujud, dipadam, atau tiada kebenaran pengguna:urus.`);
  }
  return rows[0];
};

export const jalankanPurge = async ({ laksana, hari, oleh }) => {
  const pratonton = await kira(hari);
  if (!laksana) return { laksana: false, hari, pratonton };

  const pelaku = await dapatkanPentadbir(oleh);
  const dibuang = await dalamTransaksi(async (client) => {
    const hasil = {};
    for (const jadual of JADUAL) {
      const { rowCount } = await client.query(
        `DELETE FROM ${jadual}
          WHERE is_deleted = true AND deleted_at < NOW() - make_interval(days => $1)`,
        [hari]
      );
      hasil[jadual] = rowCount;
    }
    return hasil;
  });

  const ringkas = JADUAL.map((j) => `${j}: ${dibuang[j]}`).join(", ");
  await catatAktiviti(
    pelaku.pengguna_id,
    "Purge Data Soft-Delete",
    `${pelaku.nama_penuh} telah membuang kekal rekod soft-delete lebih ${hari} hari.`,
    `${pelaku.nama_penuh} (${pelaku.nama_peranan}) menjalankan purge rekod soft-delete lebih ${hari} hari. Dibuang — ${ringkas}.`
  );

  return { laksana: true, hari, pratonton, dibuang };
};

const utama = async () => {
  try {
    const arg = bacaArgumen(process.argv.slice(2));
    const hasil = await jalankanPurge(arg);

    console.log(`Tempoh simpanan: ${hasil.hari} hari`);
    for (const jadual of JADUAL) {
      const { layak, tanpa_tarikh } = hasil.pratonton[jadual];
      const status = hasil.laksana ? `dibuang ${hasil.dibuang[jadual]}` : `layak ${layak}`;
      console.log(`  ${jadual}: ${status} (dilangkau tanpa deleted_at: ${tanpa_tarikh})`);
    }
    if (!hasil.laksana) {
      console.log(
        "Mod pratonton — tiada data diubah. Tambah --laksana --oleh=<staff_id> untuk buang."
      );
    }
    process.exitCode = 0;
  } catch (err) {
    console.error(`Purge gagal: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

// Jalankan hanya bila dipanggil terus (bukan bila diimport oleh ujian)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  utama();
}
