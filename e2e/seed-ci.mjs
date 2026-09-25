// e2e/seed-ci.mjs — Data minimum untuk menjalankan suite E2E pada pangkalan data
// KOSONG yang dibina daripada migrasi (CI / pembangun baharu).
//
//   node e2e/seed-ci.mjs --sahkan
//
// Mencipta syarikat 1–8 dan lima akaun ujian dalam `tests/helpers.mjs`
// (Staff dalam syarikat 8, Ketua Subsidiari dalam syarikat 3, seperti yang
// diandaikan oleh spec 11 & 12). Enggan berjalan jika jadual pengguna sudah
// mempunyai data selain akaun ujian — JANGAN jalankan pada pangkalan data sebenar.

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { DB, tutupDB } from "./db.helper.mjs";
import { CREDENTIALS } from "./tests/helpers.mjs";

const require = createRequire(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "risk_backend", "index.js")
);
const bcrypt = require("bcrypt");

if (!process.argv.includes("--sahkan")) {
  console.error("Tambah --sahkan untuk mengesahkan ini pangkalan data ujian.");
  process.exit(1);
}

const SYARIKAT = [
  "UKM Holdings",
  "UKM Medic",
  "UKM Digital",
  "Syarikat Ujian 4",
  "Syarikat Ujian 5",
  "Syarikat Ujian 6",
  "Syarikat Ujian 7",
  "Syarikat Ujian 8",
];

const AKAUN = [
  [CREDENTIALS.admin, "Admin", 1],
  [CREDENTIALS.executive, "Executive", 1],
  [CREDENTIALS.ketuaSubsidiari, "Ketua Subsidiari", 3],
  [CREDENTIALS.staff, "Staff", 8],
  [CREDENTIALS.viewer, "Viewer", 1],
];

try {
  const ujian = AKAUN.map(([a]) => a.staff_id);
  const { rows } = await DB.query(
    "SELECT COUNT(*)::int AS n FROM pengguna WHERE NOT (staff_id = ANY($1))",
    [ujian]
  );
  if (rows[0].n > 0) {
    throw new Error(`Pangkalan data mempunyai ${rows[0].n} pengguna bukan ujian — dibatalkan.`);
  }

  const { rows: sedia } = await DB.query("SELECT COUNT(*)::int AS n FROM syarikat");
  if (sedia[0].n === 0) {
    for (const [i, nama] of SYARIKAT.entries()) {
      await DB.query(
        "INSERT INTO syarikat (syarikat_id, nama_syarikat, singkatan) VALUES ($1, $2, $3)",
        [i + 1, nama, `S${i + 1}`]
      );
    }
    await DB.query(
      "SELECT setval('syarikat_syarikat_id_seq', (SELECT MAX(syarikat_id) FROM syarikat))"
    );
  }

  for (const [akaun, peranan, syarikat] of AKAUN) {
    const hash = await bcrypt.hash(akaun.katalaluan, 10);
    await DB.query(
      `INSERT INTO pengguna (staff_id, nama_penuh, katalaluan, peranan_id, syarikat_id)
       SELECT $1, $2, $3, peranan_id, $5 FROM peranan WHERE nama_peranan = $4
       ON CONFLICT (staff_id) DO UPDATE
         SET katalaluan = EXCLUDED.katalaluan, peranan_id = EXCLUDED.peranan_id,
             syarikat_id = EXCLUDED.syarikat_id, is_deleted = false, is_aktif = true,
             perlu_tukar_katalaluan = false, percubaan_gagal = 0, dikunci_hingga = NULL`,
      [akaun.staff_id, `${peranan} Ujian`, hash, peranan, syarikat]
    );
  }
  console.log(`Seed E2E: ${SYARIKAT.length} syarikat, ${AKAUN.length} akaun ujian.`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await tutupDB();
}
