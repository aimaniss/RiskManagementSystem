// 14-tetapan-sistem.spec.mjs — Tetapan Sistem & Log Aktiviti (revamp).
// Sahkan: `tetapan:urus` Admin sahaja; senarai rujukan (kategori risiko)
// tambah/tukar nama (kaskad ke risiko)/nyahaktif; syarikat tambah/sunting/
// nyahaktif (disekat jika ada pengguna aktif); bahagian tukar nama (kaskad) &
// nyahaktif; log aktiviti berhalaman, tapisan, jenis, eksport CSV & isolasi.

import { test, expect } from "@playwright/test";
import { DB, tutupDB } from "../db.helper.mjs";
import { API, CREDENTIALS, apiLogin } from "./helpers.mjs";

const TANDA = `E2E-TS-${Date.now()}`;
const satu = async (sql, params) => (await DB.query(sql, params)).rows[0];
const fx = {};

test.describe.configure({ mode: "serial" });

let admin;
let staff;

test.beforeAll(async ({ request }) => {
  admin = await apiLogin(request, CREDENTIALS.admin);
  staff = await apiLogin(request, CREDENTIALS.staff);
  fx.maxLog = (await satu("SELECT COALESCE(max(id), 0) AS m FROM log_aktiviti")).m;
  const pentadbir = await satu("SELECT pengguna_id FROM pengguna WHERE staff_id = $1", [
    CREDENTIALS.admin.staff_id,
  ]);
  fx.bahagian = (
    await satu("INSERT INTO bahagian (nama_bahagian) VALUES ($1) RETURNING bahagian_id", [
      `${TANDA} Bahagian`,
    ])
  ).bahagian_id;
  fx.risikoId = (
    await satu(
      `INSERT INTO risiko (no_rujukan, tahun, separuh_tahun, syarikat_id, kategori, bahagian, risiko,
         skor_kebarangkalian, skor_impak, skor_risiko, status_risiko, status_kelulusan, created_by)
       VALUES ($1, 2026, 1, 1, $2, $3, 'Risiko ujian tetapan', 2, 2, 'R', 'Ya', 'Diluluskan', $4)
       RETURNING risiko_id`,
      [TANDA, `${TANDA} Kategori`, `${TANDA} Bahagian`, pentadbir.pengguna_id]
    )
  ).risiko_id;
});

test.afterAll(async () => {
  await DB.query("DELETE FROM risiko WHERE risiko_id = $1", [fx.risikoId]);
  await DB.query("DELETE FROM bahagian WHERE nama_bahagian LIKE $1", [`${TANDA}%`]);
  await DB.query("DELETE FROM senarai_rujukan WHERE nilai LIKE $1", [`${TANDA}%`]);
  await DB.query("DELETE FROM syarikat WHERE nama_syarikat LIKE $1", [`${TANDA}%`]);
  await DB.query("DELETE FROM log_aktiviti WHERE id > $1 AND aktiviti = 'Tetapan Sistem'", [
    fx.maxLog,
  ]);
  await tutupDB();
});

test("Kategori risiko: senarai aktif untuk semua, urus Admin sahaja", async ({ request }) => {
  const senarai = await (
    await request.get(`${API}/rujukan?jenis=kategori_risiko`, { headers: staff.auth })
  ).json();
  expect(senarai.map((k) => k.nilai)).toEqual(
    expect.arrayContaining(["Strategik", "Kewangan", "Operasi", "Pematuhan / Perundangan"])
  );
  expect(
    (await request.get(`${API}/rujukan?jenis=tiada`, { headers: staff.auth })).status()
  ).toBe(400);
  expect(
    (
      await request.post(`${API}/rujukan`, {
        headers: staff.auth,
        data: { jenis: "kategori_risiko", nilai: `${TANDA} X` },
      })
    ).status()
  ).toBe(403);
});

test("Kategori risiko: tambah, duplikasi, tukar nama dikaskad ke risiko, nyahaktif", async ({
  request,
}) => {
  const tambah = await request.post(`${API}/rujukan`, {
    headers: admin.auth,
    data: { jenis: "kategori_risiko", nilai: `  ${TANDA} Kategori  `, penerangan: "Ujian" },
  });
  expect(tambah.status()).toBe(201);
  const k = await tambah.json();
  expect(k.nilai).toBe(`${TANDA} Kategori`);

  const dup = await request.post(`${API}/rujukan`, {
    headers: admin.auth,
    data: { jenis: "kategori_risiko", nilai: `${TANDA} kategori` },
  });
  expect(dup.status()).toBe(409);

  const tukar = await request.put(`${API}/rujukan/${k.rujukan_id}`, {
    headers: admin.auth,
    data: { nilai: `${TANDA} Kategori Baharu`, penerangan: "Ujian" },
  });
  expect(tukar.status()).toBe(200);
  expect((await tukar.json()).risiko_dikemaskini).toBe(1);
  expect((await satu("SELECT kategori FROM risiko WHERE risiko_id = $1", [fx.risikoId])).kategori).toBe(
    `${TANDA} Kategori Baharu`
  );

  const nyah = await request.patch(`${API}/rujukan/${k.rujukan_id}/status`, {
    headers: admin.auth,
    data: { is_aktif: false },
  });
  expect((await nyah.json()).is_aktif).toBe(false);

  const aktif = await (
    await request.get(`${API}/rujukan?jenis=kategori_risiko`, { headers: admin.auth })
  ).json();
  expect(aktif.some((r) => r.rujukan_id === k.rujukan_id)).toBe(false);
  const semua = await (
    await request.get(`${API}/rujukan?jenis=kategori_risiko&semua=true`, { headers: admin.auth })
  ).json();
  expect(semua.find((r) => r.rujukan_id === k.rujukan_id).bilangan_risiko).toBe(1);

  // Dashboard masih mengira kategori tidak aktif
  const dash = await (await request.get(`${API}/dashboard`, { headers: admin.auth })).json();
  expect(dash.kategoriRisikoData.some((d) => d.name === `${TANDA} Kategori Baharu`)).toBe(true);
});

test("Syarikat: tambah, sahkan input, nyahaktif disekat jika ada pengguna aktif", async ({
  request,
}) => {
  const tambah = await request.post(`${API}/syarikat`, {
    headers: admin.auth,
    data: { nama_syarikat: `${TANDA} Sdn Bhd`, singkatan: "E2E", kod_warna: "#123ABC" },
  });
  expect(tambah.status()).toBe(201);
  const s = await tambah.json();

  expect(
    (
      await request.put(`${API}/syarikat/${s.syarikat_id}`, {
        headers: admin.auth,
        data: { nama_syarikat: `${TANDA} Sdn Bhd`, kod_warna: "merah" },
      })
    ).status()
  ).toBe(400);
  expect(
    (
      await request.post(`${API}/syarikat`, {
        headers: admin.auth,
        data: { nama_syarikat: `${TANDA} sdn bhd` },
      })
    ).status()
  ).toBe(409);

  const staffSyarikat = (
    await satu("SELECT syarikat_id FROM pengguna WHERE staff_id = $1", [CREDENTIALS.staff.staff_id])
  ).syarikat_id;
  expect(
    (
      await request.patch(`${API}/syarikat/${staffSyarikat}/status`, {
        headers: admin.auth,
        data: { is_aktif: false },
      })
    ).status()
  ).toBe(409);

  const nyah = await request.patch(`${API}/syarikat/${s.syarikat_id}/status`, {
    headers: admin.auth,
    data: { is_aktif: false },
  });
  expect((await nyah.json()).is_aktif).toBe(false);
  const aktif = await (await request.get(`${API}/syarikat`, { headers: admin.auth })).json();
  expect(aktif.some((x) => x.syarikat_id === s.syarikat_id)).toBe(false);
  const semua = await (
    await request.get(`${API}/syarikat?semua=true`, { headers: admin.auth })
  ).json();
  expect(semua.some((x) => x.syarikat_id === s.syarikat_id)).toBe(true);
});

test("Bahagian: tukar nama dikaskad ke risiko; tidak aktif disembunyi & tidak boleh ditambah semula", async ({
  request,
}) => {
  expect(
    (
      await request.put(`${API}/bahagian/${fx.bahagian}`, {
        headers: staff.auth,
        data: { nama_bahagian: "X" },
      })
    ).status()
  ).toBe(403);

  const tukar = await request.put(`${API}/bahagian/${fx.bahagian}`, {
    headers: admin.auth,
    data: { nama_bahagian: `${TANDA} Bahagian Baharu` },
  });
  expect((await tukar.json()).risiko_dikemaskini).toBe(1);
  expect((await satu("SELECT bahagian FROM risiko WHERE risiko_id = $1", [fx.risikoId])).bahagian).toBe(
    `${TANDA} Bahagian Baharu`
  );

  await request.patch(`${API}/bahagian/${fx.bahagian}/status`, {
    headers: admin.auth,
    data: { is_aktif: false },
  });
  const aktif = await (await request.get(`${API}/bahagian`, { headers: staff.auth })).json();
  expect(aktif.some((b) => b.bahagian_id === fx.bahagian)).toBe(false);

  const tambahSemula = await request.post(`${API}/bahagian`, {
    headers: staff.auth,
    data: { nama_bahagian: `${TANDA} bahagian baharu` },
  });
  expect(tambahSemula.status()).toBe(409);
  expect((await tambahSemula.json()).error).toMatch(/tidak aktif/);
});

test("Log aktiviti: berhalaman, tapisan, jenis & eksport CSV", async ({ request }) => {
  const res = await request.get(`${API}/log_aktiviti?had=2&halaman=1`, { headers: admin.auth });
  const hasil = await res.json();
  expect(hasil.data.length).toBeLessThanOrEqual(2);
  expect(hasil.jumlah).toBeGreaterThan(0);
  expect(hasil.jumlah_halaman).toBe(Math.max(Math.ceil(hasil.jumlah / 2), 1));

  const tetapan = await (
    await request.get(`${API}/log_aktiviti?aktiviti=Tetapan%20Sistem&carian=${TANDA}&had=200`, {
      headers: admin.auth,
    })
  ).json();
  expect(tetapan.jumlah).toBeGreaterThanOrEqual(4);
  expect(new Set(tetapan.data.map((l) => l.aktiviti))).toEqual(new Set(["Tetapan Sistem"]));

  const jenis = await (await request.get(`${API}/log_aktiviti/jenis`, { headers: admin.auth })).json();
  expect(jenis.some((j) => j.aktiviti === "Tetapan Sistem")).toBe(true);

  expect(
    (await request.get(`${API}/log_aktiviti?tarikhMula=salah`, { headers: admin.auth })).status()
  ).toBe(400);

  const csv = await request.get(`${API}/log_aktiviti/eksport?aktiviti=Tetapan%20Sistem`, {
    headers: admin.auth,
  });
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const teks = await csv.text();
  expect(teks).toContain('"Tarikh & Masa","ID Staf"');
  expect(teks).toContain(TANDA);
});

test("Log aktiviti: Staff hanya nampak & eksport log syarikat sendiri", async ({ request }) => {
  const { nama_syarikat } = await satu(
    `SELECT s.nama_syarikat FROM pengguna u JOIN syarikat s ON s.syarikat_id = u.syarikat_id
      WHERE u.staff_id = $1`,
    [CREDENTIALS.staff.staff_id]
  );
  // Tapisan syarikat lain diabaikan untuk peranan terhad
  const log = await (
    await request.get(`${API}/log_aktiviti?syarikat_id=1&had=200`, { headers: staff.auth })
  ).json();
  expect(new Set(log.data.map((l) => l.syarikat))).toEqual(new Set([nama_syarikat]));

  const csv = await (
    await request.get(`${API}/log_aktiviti/eksport?aktiviti=Tetapan%20Sistem`, {
      headers: staff.auth,
    })
  ).text();
  expect(csv).not.toContain(TANDA);
});
