// 02-kebenaran.spec.mjs — Fasa 6: Spec kebenaran (dibenarkan / ditolak).
// Tujuan: sahkan matriks kebenaran dikuatkuasakan di API (403) DAN di UI
// (menu sembunyi/tunjuk per peranan).

import { test, expect } from "@playwright/test";
import { DB } from "../db.helper.mjs";
import { CREDENTIALS, apiLogin, sealSession } from "./helpers.mjs";

const API = "http://localhost:5001/api";
let namaBahagian;

test.describe("Kebenaran — API (403 bagi yang tidak dibenarkan)", () => {
  test("Staff tidak dapat akses /api/users (pengguna:urus) -> 403", async ({ request }) => {
    const sesi = await apiLogin(request, CREDENTIALS.staff);
    const res = await request.get(`${API}/users`, { headers: sesi.auth });
    expect(res.status()).toBe(403);
  });

  test("Staff tidak dapat akses /api/pindaan (pindaan:lihat) -> 403", async ({ request }) => {
    const sesi = await apiLogin(request, CREDENTIALS.staff);
    const res = await request.get(`${API}/pindaan`, { headers: sesi.auth });
    expect(res.status()).toBe(403);
  });

  test("Viewer tidak boleh daftar risiko (risiko:daftar) -> 403", async ({ request }) => {
    const sesi = await apiLogin(request, CREDENTIALS.viewer);
    const res = await request.post(`${API}/risiko`, {
      headers: sesi.auth,
      data: { risiko: "Ujian E2E — tidak sepatutnya tersimpan", tahun: 2026 },
    });
    expect(res.status()).toBe(403);
  });

  test("Admin dibenarkan /api/users (pengguna:urus) -> 200", async ({ request }) => {
    const sesi = await apiLogin(request, CREDENTIALS.admin);
    const res = await request.get(`${API}/users`, { headers: sesi.auth });
    expect(res.ok()).toBeTruthy();
  });

  test("Admin dibenarkan POST /api/bahagian (rujukan:urus) -> 200", async ({ request }) => {
    const sesi = await apiLogin(request, CREDENTIALS.admin);
    namaBahagian = `E2E-Bahagian-${Date.now()}`;
    const res = await request.post(`${API}/bahagian`, {
      headers: sesi.auth,
      data: { nama_bahagian: namaBahagian },
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe("Kebenaran — UI (menu per peranan)", () => {
  test("Admin nampak menu Urus Pengguna & Pindaan", async ({ page }) => {
    const sesi = await apiLogin(page.request, CREDENTIALS.admin);
    await sealSession(page, sesi.token);
    await expect(page.getByText("Urus Pengguna", { exact: true })).toBeVisible();
    await expect(page.getByText("Pindaan", { exact: true })).toBeVisible();
  });

  test("Executive nampak Pindaan tapi TIDAK Urus Pengguna", async ({ page }) => {
    const sesi = await apiLogin(page.request, CREDENTIALS.executive);
    await sealSession(page, sesi.token);
    await expect(page.getByText("Pindaan", { exact: true })).toBeVisible();
    await expect(page.getByText("Urus Pengguna", { exact: true })).toHaveCount(0);
  });

  test("Staff & Viewer TIDAK nampak Urus Pengguna / Pindaan", async ({ page }) => {
    for (const akaun of [CREDENTIALS.staff, CREDENTIALS.viewer]) {
      const sesi = await apiLogin(page.request, akaun);
      await sealSession(page, sesi.token);
      await expect(page.getByText("Urus Pengguna", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Pindaan", { exact: true })).toHaveCount(0);
    }
  });

  // Menu ikut kebenaran & peranan dikenal pasti ikut nama (bukan peranan_id,
  // yang berbeza antara pangkalan data)
  test("Staff nampak Daftar Risiko & label STAFF; Viewer tiada Daftar Risiko", async ({ page }) => {
    const staff = await apiLogin(page.request, CREDENTIALS.staff);
    await sealSession(page, staff.token);
    await expect(page.locator(".sidebar").getByText("Daftar Risiko", { exact: true })).toBeVisible();
    await expect(page.getByText("Senarai Tugasan", { exact: true })).toHaveCount(0);
    await expect(page.getByText("STAFF", { exact: true })).toBeVisible();

    const viewer = await apiLogin(page.request, CREDENTIALS.viewer);
    await sealSession(page, viewer.token);
    await expect(page.locator(".sidebar").getByText("Daftar Risiko", { exact: true })).toHaveCount(0);
    await expect(page.locator(".sidebar").getByText("Pemantauan Risiko", { exact: true })).toBeVisible();
  });
});

test.afterAll(async () => {
  if (namaBahagian) {
    await DB.query(`DELETE FROM bahagian WHERE nama_bahagian = $1`, [namaBahagian]);
  }
  await DB.end();
});