// scripts/cipta-pentadbir.js — Cipta akaun pentadbir (Admin) pertama.
//
// Pangkalan data baharu (cth. selepas `docker compose up`) tidak mempunyai
// sebarang pengguna, jadi tiada siapa boleh log masuk untuk menambah pengguna
// melalui UI. Skrip ini mencipta satu akaun Admin dengan kata laluan sementara
// (wajib ditukar semasa log masuk pertama).
//
//   npm run cipta-pentadbir -- --staff-id=ADMIN01 --nama="Nama Pentadbir"
//   docker compose exec backend npm run cipta-pentadbir -- --staff-id=ADMIN01 --nama="..."
//
// Jika tiada syarikat, "UKM Holdings" dicipta (peranan kumpulan diletakkan di sini).

import { pathToFileURL } from "node:url";
import pool from "../config/db.js";
import { dalamTransaksi } from "../utils/transaksi.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";
import { hashKatalaluan, janaKatalaluanSementara } from "../utils/katalaluan.js";

const SYARIKAT_KUMPULAN = "UKM Holdings";

export const bacaArgumen = (argv) => {
  const arg = { staffId: null, nama: null };
  for (const a of argv) {
    if (a.startsWith("--staff-id=")) arg.staffId = a.slice("--staff-id=".length).trim();
    else if (a.startsWith("--nama=")) arg.nama = a.slice("--nama=".length).trim();
    else throw new Error(`Argumen tidak dikenali: ${a}`);
  }
  if (!arg.staffId || /\s/.test(arg.staffId)) {
    throw new Error("--staff-id=<ID> diperlukan (tanpa ruang kosong).");
  }
  if (!arg.nama) throw new Error('--nama="Nama Penuh" diperlukan.');
  return arg;
};

const utama = async () => {
  try {
    const { staffId, nama } = bacaArgumen(process.argv.slice(2));
    const katalaluan = janaKatalaluanSementara(12);
    const hash = await hashKatalaluan(katalaluan);

    const penggunaId = await dalamTransaksi(async (client) => {
      const wujud = await client.query("SELECT 1 FROM pengguna WHERE staff_id = $1", [staffId]);
      if (wujud.rowCount > 0) throw new Error(`ID Staf ${staffId} sudah wujud.`);

      const { rows: peranan } = await client.query(
        "SELECT peranan_id FROM peranan WHERE nama_peranan = 'Admin'"
      );
      if (!peranan[0]) throw new Error("Peranan Admin tidak wujud. Jalankan `npm run migrate`.");

      let { rows: syarikat } = await client.query(
        "SELECT syarikat_id FROM syarikat WHERE nama_syarikat = $1",
        [SYARIKAT_KUMPULAN]
      );
      if (!syarikat[0]) {
        ({ rows: syarikat } = await client.query(
          "INSERT INTO syarikat (nama_syarikat, singkatan) VALUES ($1, 'UKMH') RETURNING syarikat_id",
          [SYARIKAT_KUMPULAN]
        ));
      }

      const { rows } = await client.query(
        `INSERT INTO pengguna (staff_id, nama_penuh, katalaluan, peranan_id, syarikat_id,
                               perlu_tukar_katalaluan, katalaluan_dikemaskini_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW()) RETURNING pengguna_id`,
        [staffId, nama, hash, peranan[0].peranan_id, syarikat[0].syarikat_id]
      );
      return rows[0].pengguna_id;
    });

    await catatAktiviti(
      penggunaId,
      "Tambah Pengguna",
      `Akaun pentadbir ${nama} dicipta melalui skrip.`,
      `Akaun pentadbir ${nama} (ID Staf: ${staffId}) dicipta melalui scripts/cipta-pentadbir.js. Kata laluan sementara perlu ditukar pada log masuk pertama.`
    );

    console.log(`Akaun Admin dicipta: ${staffId}`);
    console.log(`Kata laluan sementara (dipaparkan sekali): ${katalaluan}`);
    console.log("Pengguna wajib menukar kata laluan ini semasa log masuk pertama.");
    process.exitCode = 0;
  } catch (err) {
    console.error(`Gagal mencipta pentadbir: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

// Jalankan hanya bila dipanggil terus (bukan bila diimport oleh ujian)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  utama();
}
