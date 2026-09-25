// 01-login-peranan.spec.mjs — Fasa 6: Spec login per peranan (5 peranan).
// Tujuan: pastikan setiap peranan dapat log masuk melalui API dan menerima
// array 'kebenaran' yang sesuai dalam respons pengguna.

import { test, expect } from "@playwright/test";
import { CREDENTIALS, apiLogin } from "./helpers.mjs";

const SEMUA = [
  CREDENTIALS.admin,
  CREDENTIALS.executive,
  CREDENTIALS.ketuaSubsidiari,
  CREDENTIALS.staff,
  CREDENTIALS.viewer,
];

for (const akaun of SEMUA) {
  test(`Login berjaya + dapat kebenaran: ${akaun.label} (${akaun.staff_id})`, async ({
    request,
  }) => {
    const sesi = await apiLogin(request, akaun);
    expect(sesi.token).toBeTruthy();
    expect(sesi.user?.peranan).toBe(akaun.label);
    expect(Array.isArray(sesi.user?.kebenaran)).toBe(true);
    expect(sesi.user?.kebenaran?.length).toBeGreaterThan(0);
  });
}

test("Kebenaran mengikut peranan (jumlah minimum disahkan)", async ({ request }) => {
  const hasil = {};
  for (const akaun of SEMUA) {
    const sesi = await apiLogin(request, akaun);
    hasil[akaun.staff_id] = sesi.user.kebenaran.length;
  }
  // Nilai disahkan dari migrasi 020/021/024/027: Admin 18, Executive 15, KS 12, Staff 10, Viewer 5
  expect(hasil[CREDENTIALS.admin.staff_id]).toBe(18);
  expect(hasil[CREDENTIALS.executive.staff_id]).toBe(15);
  expect(hasil[CREDENTIALS.ketuaSubsidiari.staff_id]).toBe(12);
  expect(hasil[CREDENTIALS.staff.staff_id]).toBe(10);
  expect(hasil[CREDENTIALS.viewer.staff_id]).toBe(5);
});

test("Pengguna yang dipadam / tidak aktif gagal log masuk (401)", async ({ request }) => {
  const res = await request.post(`${"http://localhost:5001/api"}/auth/login`, {
    data: { staff_id: "E2E_PADAM", katalaluan: "123" },
  });
  expect(res.status()).toBe(401);
});