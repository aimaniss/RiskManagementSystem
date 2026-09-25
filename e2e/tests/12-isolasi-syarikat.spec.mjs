// 12-isolasi-syarikat.spec.mjs — Staff/Ketua Subsidiari hanya boleh menulis
// data risiko syarikat SENDIRI. Fixture: satu risiko milik syarikat lain
// (UKM Holdings, id 1) bersama rawatan & log pemantauan, dicipta terus di DB.
// Setiap endpoint tulis mesti memulangkan 403 dan data mesti kekal tidak berubah.

import { test, expect } from "@playwright/test";
import { DB } from "../db.helper.mjs";
import { API, CREDENTIALS, apiLogin } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

const TANDA = `E2E-Isolasi-${Date.now()}`;
const SYARIKAT_LAIN = 1; // bukan syarikat Staff (8) atau Ketua Subsidiari (3)
const fx = {};
let staff;
let ketua;

const satu = async (sql, params) => (await DB.query(sql, params)).rows[0];

test.beforeAll(async ({ request }) => {
  fx.maxNotifikasi = (await satu("SELECT COALESCE(max(notifikasi_id), 0) AS m FROM notifikasi")).m;
  fx.maxLog = (await satu("SELECT COALESCE(max(id), 0) AS m FROM log_aktiviti")).m;
  const admin = await satu("SELECT pengguna_id FROM pengguna WHERE staff_id = $1", [CREDENTIALS.admin.staff_id]);

  fx.risikoId = (
    await satu(
      `INSERT INTO risiko (no_rujukan, tahun, separuh_tahun, syarikat_id, kategori, bahagian, risiko,
         skor_kebarangkalian, skor_impak, skor_risiko, status_risiko, status_kelulusan, created_by)
       VALUES ($1, 2026, 1, $2, 'Operasi', 'Operasi', $3, 2, 2, 'R', 'Ya', 'Diluluskan', $4)
       RETURNING risiko_id`,
      [TANDA, SYARIKAT_LAIN, `${TANDA} risiko syarikat lain`, admin.pengguna_id]
    )
  ).risiko_id;
  fx.rawatanId = (
    await satu(
      `INSERT INTO rawatan_risiko (risiko_id, jenis_kawalan, tempoh_siap) VALUES ($1, 'Kurang', '6 bulan')
       RETURNING rawatan_id`,
      [fx.risikoId]
    )
  ).rawatan_id;
  fx.logId = (
    await satu(
      `INSERT INTO logpemantauan (risiko_id, tahun_pemantauan, separuh_tahun_pemantauan, status_pemantauan, catatan)
       VALUES ($1, 2026, 1, 'Pemantauan', $2) RETURNING log_id`,
      [fx.risikoId, TANDA]
    )
  ).log_id;

  staff = await apiLogin(request, CREDENTIALS.staff);
  ketua = await apiLogin(request, CREDENTIALS.ketuaSubsidiari);
});

test.afterAll(async () => {
  const logIds = (await DB.query("SELECT log_id FROM logpemantauan WHERE risiko_id = $1", [fx.risikoId])).rows.map((r) => r.log_id);
  const rawatanIds = (await DB.query("SELECT rawatan_id FROM rawatan_risiko WHERE risiko_id = $1", [fx.risikoId])).rows.map((r) => r.rawatan_id);
  const pindaanIds = (await DB.query("SELECT pindaan_id FROM permohonan_pindaan WHERE risiko_id = $1", [fx.risikoId])).rows.map((r) => r.pindaan_id);
  await DB.query("DELETE FROM pelantindakanpemantauan WHERE log_id = ANY($1::uuid[])", [logIds]);
  await DB.query("DELETE FROM kakitanganpemantauan WHERE log_id = ANY($1::uuid[])", [logIds]);
  await DB.query("DELETE FROM pelan_tindakan_rawatan WHERE rawatan_id = ANY($1::int[])", [rawatanIds]);
  await DB.query("DELETE FROM kakitangan_rawatan WHERE rawatan_id = ANY($1::int[])", [rawatanIds]);
  await DB.query("DELETE FROM notifikasi WHERE notifikasi_id > $1 AND entiti_id = ANY($2::int[])", [
    fx.maxNotifikasi,
    [fx.risikoId, ...pindaanIds],
  ]);
  for (const jadual of ["permohonan_pindaan", "logpemantauan", "rawatan_risiko", "punca_risiko", "kesan_risiko"]) {
    await DB.query(`DELETE FROM ${jadual} WHERE risiko_id = $1`, [fx.risikoId]);
  }
  await DB.query("DELETE FROM risiko WHERE risiko_id = $1", [fx.risikoId]);
  await DB.query(
    `DELETE FROM log_aktiviti WHERE id > $1 AND (ringkasan LIKE $2 OR perincian LIKE $2 OR perincian LIKE $3)`,
    [fx.maxLog, `%${TANDA}%`, `%${fx.logId}%`]
  );
});

const cubaan = () => [
  ["PUT", `/risiko/${fx.risikoId}/rawatan`, staff, { jenis_kawalan: "Elak" }],
  ["PUT", `/risiko/${fx.risikoId}/pemantauan/log/${fx.logId}`, staff, { status_pemantauan: "Tutup" }],
  ["DELETE", `/risiko/${fx.risikoId}`, ketua, undefined],
  ["PUT", `/rawatan/penilaian/${fx.risikoId}`, ketua, { skor_kebarangkalian: 5, skor_impak: 5 }],
  ["POST", `/rawatan`, staff, { risiko_id: fx.risikoId, jenis_kawalan: "Kurang", plan_tindakan: ["x"] }],
  ["PUT", `/rawatan/${fx.rawatanId}`, staff, { jenis_kawalan: "Elak", plan_tindakan: ["x"] }],
  ["DELETE", `/rawatan/${fx.rawatanId}`, staff, undefined],
  ["POST", `/pemantauan-risiko/log`, staff, { risiko_id: fx.risikoId, tahun_pemantauan: 2026, separuh_tahun_pemantauan: 2, status_pemantauan: "Pemantauan" }],
  ["PUT", `/pemantauan-risiko/log/${fx.logId}`, staff, { risiko_id: fx.risikoId, tahun_pemantauan: 2026, separuh_tahun_pemantauan: 1, status_pemantauan: "Tutup" }],
  ["DELETE", `/pemantauan-risiko/log/${fx.logId}`, staff, undefined],
  ["POST", `/pindaan/${fx.risikoId}`, staff, { justifikasi: { penilaian: TANDA }, perubahan: { data_sebelum: {}, data_selepas: { skor_impak: 5 } } }],
];

test("Setiap endpoint tulis menolak risiko syarikat lain -> 403", async ({ request }) => {
  const gagal = [];
  for (const [kaedah, laluan, sesi, data] of cubaan()) {
    const res = await request.fetch(`${API}${laluan}`, { method: kaedah, headers: sesi.auth, data });
    if (res.status() !== 403) gagal.push(`${kaedah} ${laluan} -> ${res.status()}`);
  }
  expect(gagal).toEqual([]);
});

const bacaan = () => [
  `/risiko/${fx.risikoId}/rawatan`,
  `/rawatan/${fx.risikoId}`,
  `/pemantauan-risiko/${fx.risikoId}/info`,
  `/pemantauan-risiko/${fx.risikoId}/sejarah`,
  `/pemantauan-risiko/${fx.risikoId}/tahap-rujukan`,
  `/pemantauan-risiko/${fx.risikoId}/sejarah-baru`,
  `/pemantauan-risiko/check-duplicate?risiko_id=${fx.risikoId}&tahun=2026&separuh_tahun=2`,
];

test("Bacaan ikut ID untuk risiko syarikat lain -> 403 bagi Staff", async ({ request }) => {
  const gagal = [];
  for (const laluan of bacaan()) {
    const res = await request.get(`${API}${laluan}`, { headers: staff.auth });
    if (res.status() !== 403) gagal.push(`GET ${laluan} -> ${res.status()}`);
  }
  expect(gagal).toEqual([]);
});

test("Executive & Viewer masih boleh membaca semua syarikat", async ({ request }) => {
  const gagal = [];
  for (const akaun of [CREDENTIALS.executive, CREDENTIALS.viewer]) {
    const sesi = await apiLogin(request, akaun);
    for (const laluan of bacaan()) {
      const res = await request.get(`${API}${laluan}`, { headers: sesi.auth });
      if (res.status() === 403) gagal.push(`${akaun.label} GET ${laluan} -> 403`);
    }
  }
  expect(gagal).toEqual([]);
});

test("Laporan penuh risiko syarikat lain -> 403 bagi Staff, 200 bagi Executive", async ({
  request,
}) => {
  const laluan = `${API}/laporan/${fx.risikoId}/data-penuh`;
  expect((await request.get(laluan, { headers: staff.auth })).status()).toBe(403);
  const exec = await apiLogin(request, CREDENTIALS.executive);
  expect((await request.get(laluan, { headers: exec.auth })).status()).toBe(200);
});

test("Log aktiviti: Staff hanya nampak syarikat sendiri; Viewer nampak semua", async ({
  request,
}) => {
  const { nama_syarikat: syarikatStaff } = await satu(
    `SELECT s.nama_syarikat FROM pengguna u JOIN syarikat s ON s.syarikat_id = u.syarikat_id
      WHERE u.staff_id = $1`,
    [CREDENTIALS.staff.staff_id]
  );
  const logStaff = await (await request.get(`${API}/log_aktiviti`, { headers: staff.auth })).json();
  expect(logStaff.length).toBeGreaterThan(0);
  expect([...new Set(logStaff.map((l) => l.syarikat))]).toEqual([syarikatStaff]);

  const viewer = await apiLogin(request, CREDENTIALS.viewer);
  const logViewer = await (await request.get(`${API}/log_aktiviti`, { headers: viewer.auth })).json();
  expect(new Set(logViewer.map((l) => l.syarikat)).size).toBeGreaterThan(1);
});

test("check-no-rujukan hanya memulangkan kewujudan, bukan rekod", async ({ request }) => {
  const res = await request.get(`${API}/risiko/check-no-rujukan/${encodeURIComponent(TANDA)}`, {
    headers: staff.auth,
  });
  expect(await res.json()).toEqual({ exists: true });
});

test("Data syarikat lain kekal tidak berubah", async () => {
  const r = await satu("SELECT is_deleted, skor_kebarangkalian, skor_impak FROM risiko WHERE risiko_id = $1", [fx.risikoId]);
  expect(r).toEqual({ is_deleted: false, skor_kebarangkalian: 2, skor_impak: 2 });
  const rw = await satu("SELECT is_deleted, jenis_kawalan FROM rawatan_risiko WHERE rawatan_id = $1", [fx.rawatanId]);
  expect(rw).toEqual({ is_deleted: false, jenis_kawalan: "Kurang" });
  const log = await satu("SELECT is_deleted, status_pemantauan FROM logpemantauan WHERE log_id = $1", [fx.logId]);
  expect(log).toEqual({ is_deleted: false, status_pemantauan: "Pemantauan" });
  const tambahan = await satu(
    `SELECT (SELECT count(*) FROM rawatan_risiko WHERE risiko_id = $1)
          + (SELECT count(*) FROM logpemantauan WHERE risiko_id = $1)
          + (SELECT count(*) FROM permohonan_pindaan WHERE risiko_id = $1) AS n`,
    [fx.risikoId]
  );
  expect(Number(tambahan.n)).toBe(2); // hanya fixture asal (1 rawatan + 1 log)
});
