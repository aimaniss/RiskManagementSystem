// 10-executive.spec.mjs — Dasar: Executive = Admin untuk kerja risiko/pindaan.
// - rujukan:urus (migration 024) untuk semua pendaftar risiko: Executive,
//   Ketua Subsidiari, Staff -> boleh tambah bahagian; Viewer tidak.
// - Executive boleh tapis senarai pindaan ikut syarikat (dahulu Admin sahaja).
// pengguna:urus & log:padam kekal Admin sahaja.

import { test, expect } from "@playwright/test";
import { DB } from "../db.helper.mjs";
import { API, CREDENTIALS, apiLogin } from "./helpers.mjs";

const TANDA = `E2E-Exec-${Date.now()}`;

test.afterAll(async () => {
  await DB.query("DELETE FROM bahagian WHERE nama_bahagian LIKE $1", [`${TANDA}%`]);
});

test("Executive boleh tambah bahagian (rujukan:urus) -> 2xx", async ({ request }) => {
  const exec = await apiLogin(request, CREDENTIALS.executive);
  const res = await request.post(`${API}/bahagian`, {
    headers: exec.auth,
    data: { nama_bahagian: `${TANDA}-Bahagian` },
  });
  expect(res.ok()).toBeTruthy();
});

test("Staff & Ketua Subsidiari boleh tambah bahagian; Viewer tidak (rujukan:urus)", async ({
  request,
}) => {
  for (const [akaun, jangka] of [
    [CREDENTIALS.staff, true],
    [CREDENTIALS.ketuaSubsidiari, true],
    [CREDENTIALS.viewer, false],
  ]) {
    const sesi = await apiLogin(request, akaun);
    const res = await request.post(`${API}/bahagian`, {
      headers: sesi.auth,
      data: { nama_bahagian: `${TANDA}-${akaun.staff_id}` },
    });
    if (jangka) expect(res.ok(), akaun.label).toBeTruthy();
    else expect(res.status(), akaun.label).toBe(403);
  }
});

test("Executive masih tiada pengguna:urus & log:padam -> 403", async ({ request }) => {
  const exec = await apiLogin(request, CREDENTIALS.executive);
  expect((await request.get(`${API}/users`, { headers: exec.auth })).status()).toBe(403);
  expect(
    (await request.delete(`${API}/log_aktiviti/0`, { headers: exec.auth })).status()
  ).toBe(403);
});

test("Executive boleh tapis senarai pindaan ikut syarikat (sama seperti Admin)", async ({
  request,
}) => {
  const { rows } = await DB.query(
    `SELECT r.syarikat_id
       FROM permohonan_pindaan p JOIN risiko r ON r.risiko_id = p.risiko_id
      GROUP BY r.syarikat_id ORDER BY count(*) DESC LIMIT 1`
  );
  const syarikatId = rows[0]?.syarikat_id ?? 1;
  const params = `status=Semua&syarikat_id=${syarikatId}`;

  const exec = await apiLogin(request, CREDENTIALS.executive);
  const admin = await apiLogin(request, CREDENTIALS.admin);
  const resExec = await request.get(`${API}/pindaan?${params}`, { headers: exec.auth });
  const resAdmin = await request.get(`${API}/pindaan?${params}`, { headers: admin.auth });
  expect(resExec.ok()).toBeTruthy();

  const idExec = (await resExec.json()).map((p) => p.pindaan_id).sort();
  const idAdmin = (await resAdmin.json()).map((p) => p.pindaan_id).sort();
  expect(idExec).toEqual(idAdmin);

  const semua = await request.get(`${API}/pindaan?status=Semua`, { headers: exec.auth });
  const jumlahSemua = (await semua.json()).length;
  const { rows: bil } = await DB.query(
    `SELECT count(*)::int n FROM permohonan_pindaan p JOIN risiko r ON r.risiko_id = p.risiko_id
      WHERE p.is_deleted = false AND r.syarikat_id = $1`,
    [syarikatId]
  );
  // Tapisan benar-benar diguna: bilangan sepadan DB dan tidak melebihi senarai penuh
  expect(idExec.length).toBeLessThanOrEqual(jumlahSemua);
  expect(idExec.length).toBe(bil[0].n);
});
