// 06-penerima-notifikasi.spec.mjs — 10-PLAN §2.2: penerima notifikasi kelulusan.
// Tujuan: sahkan `dapatkanPenerimaIkutKebenaran` (utils/notifikasi.js) memilih
// penerima mengikut kebenaran (bukan nama peranan), mengecualikan pelaku, dan
// jatuh balik kepada pentadbir bila tiada pemegang kebenaran.

import { test, expect } from "@playwright/test";
import { DB, muatUtilBackend } from "../db.helper.mjs";
import { CREDENTIALS } from "./helpers.mjs";

let dapatkanPenerimaIkutKebenaran;
const id = {};

const idPengguna = async (staff_id) => {
  const { rows } = await DB.query(
    "SELECT pengguna_id FROM pengguna WHERE staff_id = $1 AND is_deleted = false",
    [staff_id]
  );
  return rows[0].pengguna_id;
};

const idPemegang = async (kebenaran) => {
  const { rows } = await DB.query(
    `SELECT DISTINCT u.pengguna_id
       FROM pengguna u
       JOIN peranan_kebenaran pk ON pk.peranan_id = u.peranan_id
       JOIN kebenaran k ON k.kebenaran_id = pk.kebenaran_id
      WHERE u.is_deleted = false AND k.nama_kebenaran = $1`,
    [kebenaran]
  );
  return rows.map((r) => r.pengguna_id);
};

test.beforeAll(async () => {
  ({ dapatkanPenerimaIkutKebenaran } = await muatUtilBackend("notifikasi.js"));
  for (const [k, c] of Object.entries(CREDENTIALS)) id[k] = await idPengguna(c.staff_id);
});

test.describe("Penerima notifikasi ikut kebenaran", () => {
  test("pindaan:lulus merangkumi Executive (bukan Admin sahaja) dan kecualikan pemohon", async () => {
    const penerima = await dapatkanPenerimaIkutKebenaran(["pindaan:lulus"], {
      kecuali: [id.executive],
    });
    expect(penerima).toContain(id.admin);
    expect(penerima).not.toContain(id.executive);
    expect(penerima).not.toContain(id.staff);
    expect(penerima).not.toContain(id.viewer);

    const semua = await dapatkanPenerimaIkutKebenaran(["pindaan:lulus"]);
    expect(semua).toContain(id.executive);
  });

  test("risiko:lulus hanya pemegang kebenaran (Admin & Executive)", async () => {
    const penerima = await dapatkanPenerimaIkutKebenaran(["risiko:lulus"], {
      kecuali: [id.staff],
    });
    expect(penerima.sort()).toEqual((await idPemegang("risiko:lulus")).sort());
    expect(penerima).not.toContain(id.ketuaSubsidiari);
  });

  test("Tiada pemegang kebenaran -> jatuh balik kepada pentadbir (pengguna:urus)", async () => {
    const penerima = await dapatkanPenerimaIkutKebenaran(["e2e:tiada-kebenaran"]);
    expect(penerima.length).toBeGreaterThan(0);
    expect(penerima.sort()).toEqual((await idPemegang("pengguna:urus")).sort());
  });

  test("Tiada pemegang & semua pentadbir dikecualikan -> [] (tiada ralat)", async () => {
    const pentadbir = await idPemegang("pengguna:urus");
    const penerima = await dapatkanPenerimaIkutKebenaran(["e2e:tiada-kebenaran"], {
      kecuali: pentadbir,
    });
    expect(penerima).toEqual([]);
  });
});
