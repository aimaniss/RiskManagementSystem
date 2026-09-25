// 13-pengurusan-pengguna.spec.mjs — Kitaran hayat akaun pengguna.
// Sahkan: kata laluan sementara (jana automatik) + wajib tukar pada log masuk
// pertama (dikuatkuasa backend), polisi kata laluan, kunci selepas percubaan
// gagal, reset oleh pentadbir, aktif/nyahaktif, perlindungan akaun sendiri,
// dan aliran UI log masuk -> tukar kata laluan -> papan pemuka.

import { test, expect } from "@playwright/test";
import { DB, tutupDB } from "../db.helper.mjs";
import { API, CREDENTIALS, apiLogin } from "./helpers.mjs";

const UNIK = `E2E-UP-${Date.now()}`;
const UNIK_UI = `${UNIK}-UI`;
const KATALALUAN_BAHARU = "Baharu2026";

const login = (request, staff_id, katalaluan) =>
  request.post(`${API}/auth/login`, { data: { staff_id, katalaluan } });

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function sediaRujukan(request, admin) {
  const roles = await (await request.get(`${API}/roles`, { headers: admin.auth })).json();
  const syarikat = await (await request.get(`${API}/syarikat`, { headers: admin.auth })).json();
  return {
    staffId: roles.find((r) => r.nama_peranan === "Staff").peranan_id,
    syarikatId: syarikat[0].syarikat_id,
  };
}

async function ciptaPengguna(request, admin, rujukan, staff_id, tambahan = {}) {
  return request.post(`${API}/users`, {
    headers: admin.auth,
    data: {
      staff_id,
      nama_penuh: "Pengguna E2E Urus",
      peranan_id: rujukan.staffId,
      syarikat_id: rujukan.syarikatId,
      ...tambahan,
    },
  });
}

test.describe.configure({ mode: "serial" });

test.describe("Pengurusan pengguna", () => {
  let admin;
  let rujukan;
  let idPengguna;
  let sementara;

  test.beforeAll(async ({ request }) => {
    admin = await apiLogin(request, CREDENTIALS.admin);
    rujukan = await sediaRujukan(request, admin);
  });

  test.afterAll(async () => {
    const { rows } = await DB.query("SELECT pengguna_id FROM pengguna WHERE staff_id LIKE $1", [
      `${UNIK}%`,
    ]);
    const ids = rows.map((r) => r.pengguna_id);
    if (ids.length) {
      await DB.query("DELETE FROM log_aktiviti WHERE pengguna_id = ANY($1)", [ids]);
      await DB.query("DELETE FROM notifikasi WHERE pengguna_id = ANY($1)", [ids]);
      await DB.query("DELETE FROM pengguna WHERE pengguna_id = ANY($1)", [ids]);
    }
    await tutupDB();
  });

  test("Tambah tanpa kata laluan menjana kata laluan sementara; input disahkan", async ({
    request,
  }) => {
    const lemah = await ciptaPengguna(request, admin, rujukan, `${UNIK}-X`, { katalaluan: "123" });
    expect(lemah.status()).toBe(400);
    expect((await lemah.json()).error).toMatch(/8 aksara/);

    const tiadaSyarikat = await ciptaPengguna(request, admin, rujukan, `${UNIK}-X`, {
      syarikat_id: "",
    });
    expect(tiadaSyarikat.status()).toBe(400);
    expect((await tiadaSyarikat.json()).error).toMatch(/Syarikat diperlukan/);

    const res = await ciptaPengguna(request, admin, rujukan, UNIK);
    expect(res.status()).toBe(201);
    const body = await res.json();
    idPengguna = body.pengguna_id;
    sementara = body.katalaluan_sementara;
    expect(sementara).toMatch(/^(?=.*[A-Za-z])(?=.*\d)\S{10}$/);
    expect(body.perlu_tukar_katalaluan).toBe(true);
    expect(body.is_aktif).toBe(true);
    expect(body).not.toHaveProperty("katalaluan");

    // Kata laluan sementara tidak disimpan plain-text
    const { rows } = await DB.query("SELECT katalaluan FROM pengguna WHERE pengguna_id = $1", [
      idPengguna,
    ]);
    expect(rows[0].katalaluan).toMatch(/^\$2/);
  });

  test("Log masuk pertama wajib tukar kata laluan (dikuatkuasa backend)", async ({ request }) => {
    const res = await login(request, UNIK, sementara);
    expect(res.status()).toBe(200);
    const sesi = await res.json();
    expect(sesi.user.perlu_tukar_katalaluan).toBe(true);

    const disekat = await request.get(`${API}/risiko`, { headers: auth(sesi.token) });
    expect(disekat.status()).toBe(403);
    expect((await disekat.json()).kod).toBe("PERLU_TUKAR_KATALALUAN");
    expect((await request.get(`${API}/users/me`, { headers: auth(sesi.token) })).status()).toBe(
      200
    );

    const tukar = (lama, baru) =>
      request.put(`${API}/auth/tukar-katalaluan`, {
        headers: auth(sesi.token),
        data: { katalaluan_lama: lama, katalaluan_baru: baru },
      });
    expect((await tukar(sementara, "abcdefgh")).status()).toBe(400);
    expect((await tukar(sementara, sementara)).status()).toBe(400);
    expect((await tukar("SalahLama1", KATALALUAN_BAHARU)).status()).toBe(400);

    const berjaya = await tukar(sementara, KATALALUAN_BAHARU);
    expect(berjaya.status()).toBe(200);
    const baharu = await berjaya.json();
    expect(baharu.user.perlu_tukar_katalaluan).toBe(false);

    expect((await request.get(`${API}/users/me`, { headers: auth(sesi.token) })).status()).toBe(
      401
    );
    expect((await request.get(`${API}/risiko`, { headers: auth(baharu.token) })).status()).toBe(
      200
    );

    const semula = await (await login(request, UNIK, KATALALUAN_BAHARU)).json();
    expect(semula.user.perlu_tukar_katalaluan).toBe(false);
  });

  test("Akaun dikunci selepas 5 percubaan gagal; reset pentadbir membuka kunci", async ({
    request,
  }) => {
    const status = [];
    for (let i = 0; i < 5; i++) status.push((await login(request, UNIK, "Salah12345")).status());
    expect(status).toEqual([401, 401, 401, 401, 423]);

    // Kata laluan betul pun ditolak semasa dikunci
    expect((await login(request, UNIK, KATALALUAN_BAHARU)).status()).toBe(423);

    const senarai = await (await request.get(`${API}/users`, { headers: admin.auth })).json();
    expect(senarai.find((u) => u.pengguna_id === idPengguna).dikunci).toBe(true);

    const reset = await request.post(`${API}/users/${idPengguna}/reset-katalaluan`, {
      headers: admin.auth,
    });
    expect(reset.status()).toBe(200);
    const body = await reset.json();
    expect(body.pengguna.dikunci).toBe(false);
    expect(body.pengguna.perlu_tukar_katalaluan).toBe(true);

    expect((await login(request, UNIK, KATALALUAN_BAHARU)).status()).toBe(401);
    const sesi = await (await login(request, UNIK, body.katalaluan_sementara)).json();
    expect(sesi.user.perlu_tukar_katalaluan).toBe(true);
    sementara = body.katalaluan_sementara;
  });

  test("Nyahaktif mencabut sesi dan menyekat log masuk; aktifkan memulihkan", async ({
    request,
  }) => {
    const sesi = await (await login(request, UNIK, sementara)).json();

    const nyah = await request.patch(`${API}/users/${idPengguna}/status`, {
      headers: admin.auth,
      data: { is_aktif: false },
    });
    expect(nyah.status()).toBe(200);
    expect((await nyah.json()).is_aktif).toBe(false);

    expect((await request.get(`${API}/users/me`, { headers: auth(sesi.token) })).status()).toBe(
      401
    );
    const disekat = await login(request, UNIK, sementara);
    expect(disekat.status()).toBe(403);
    expect((await disekat.json()).error).toMatch(/dinyahaktifkan/);
    // Status tidak didedahkan tanpa kata laluan yang betul
    expect((await login(request, UNIK, "Salah12345")).status()).toBe(401);

    const aktif = await request.patch(`${API}/users/${idPengguna}/status`, {
      headers: admin.auth,
      data: { is_aktif: true },
    });
    expect((await aktif.json()).is_aktif).toBe(true);
    expect((await login(request, UNIK, sementara)).status()).toBe(200);
  });

  test("Perlindungan akaun sendiri dan kebenaran pengguna:urus", async ({ request }) => {
    const saya = await (await request.get(`${API}/users/me`, { headers: admin.auth })).json();

    const resetSendiri = await request.post(`${API}/users/${saya.pengguna_id}/reset-katalaluan`, {
      headers: admin.auth,
    });
    expect(resetSendiri.status()).toBe(400);

    const nyahSendiri = await request.patch(`${API}/users/${saya.pengguna_id}/status`, {
      headers: admin.auth,
      data: { is_aktif: false },
    });
    expect(nyahSendiri.status()).toBe(400);

    const perananLain = await request.put(`${API}/users/${saya.pengguna_id}`, {
      headers: admin.auth,
      data: {
        staff_id: saya.staff_id,
        nama_penuh: saya.nama_penuh,
        peranan_id: rujukan.staffId,
        syarikat_id: rujukan.syarikatId,
      },
    });
    expect(perananLain.status()).toBe(400);

    const executive = await apiLogin(request, CREDENTIALS.executive);
    expect(
      (
        await request.post(`${API}/users/${idPengguna}/reset-katalaluan`, {
          headers: executive.auth,
        })
      ).status()
    ).toBe(403);
    expect(
      (
        await request.patch(`${API}/users/${idPengguna}/status`, {
          headers: executive.auth,
          data: { is_aktif: false },
        })
      ).status()
    ).toBe(403);
  });

  test("UI: log masuk dengan kata laluan sementara -> tukar -> papan pemuka", async ({
    page,
    request,
  }) => {
    const res = await ciptaPengguna(request, admin, rujukan, UNIK_UI);
    const { katalaluan_sementara } = await res.json();

    await page.goto("/login");
    await page.getByPlaceholder("contoh: 12345").fill(UNIK_UI);
    await page.getByPlaceholder("Masukkan kata laluan").fill(katalaluan_sementara);
    await page.getByRole("button", { name: "Log masuk" }).click();

    await expect(page).toHaveURL(/\/tukar-katalaluan$/);
    await expect(page.getByText("Tetapkan kata laluan baharu")).toBeVisible();

    // Laluan terlindung lain dihalakan semula selagi belum tukar
    await page.goto("/SenaraiRisiko");
    await expect(page).toHaveURL(/\/tukar-katalaluan$/);

    const simpan = page.getByRole("button", { name: "Simpan kata laluan" });
    await page.getByPlaceholder("Kata laluan yang diberi pentadbir").fill(katalaluan_sementara);
    await page.getByPlaceholder("Kata laluan baharu", { exact: true }).fill(KATALALUAN_BAHARU);
    await page.getByPlaceholder("Taip semula kata laluan baharu").fill("Tidak2026");
    await expect(simpan).toBeDisabled();
    await page.getByPlaceholder("Taip semula kata laluan baharu").fill(KATALALUAN_BAHARU);
    await simpan.click();

    await expect(page).toHaveURL(/localhost:5175\/$/);
    expect((await login(request, UNIK_UI, KATALALUAN_BAHARU)).status()).toBe(200);
  });

  test("UI: log masuk memaparkan mesej akaun tidak aktif", async ({ page, request }) => {
    await request.patch(`${API}/users/${idPengguna}/status`, {
      headers: admin.auth,
      data: { is_aktif: false },
    });

    await page.goto("/login");
    await page.getByPlaceholder("contoh: 12345").fill(UNIK);
    await page.getByPlaceholder("Masukkan kata laluan").fill(sementara);
    await page.getByRole("button", { name: "Log masuk" }).click();
    await expect(page.getByText(/dinyahaktifkan/)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
