// 07-flush-cache-kebenaran.spec.mjs — 10-PLAN §1.5: invalidasi cache kebenaran.
// Tujuan: perubahan `peranan_kebenaran` di DB tidak berkuat kuasa selagi cache
// (TTL 60s) masih sah, tetapi berkuat kuasa serta-merta selepas
// POST /api/roles/flush-cache. Hanya `pengguna:urus` boleh flush.

import { test, expect } from "@playwright/test";
import { DB } from "../db.helper.mjs";
import { API, CREDENTIALS, apiLogin } from "./helpers.mjs";

const PERANAN_VIEWER = 5;
let kebenaranId;
let admin;

test.beforeAll(async ({ request }) => {
  const { rows } = await DB.query(
    "SELECT kebenaran_id FROM kebenaran WHERE nama_kebenaran = 'pindaan:lihat'"
  );
  kebenaranId = rows[0].kebenaran_id;
  admin = await apiLogin(request, CREDENTIALS.admin);
});

test.afterAll(async ({ request }) => {
  // Pulihkan matriks asal (Viewer tiada pindaan:lihat) dan cache
  await DB.query("DELETE FROM peranan_kebenaran WHERE peranan_id = $1 AND kebenaran_id = $2", [
    PERANAN_VIEWER,
    kebenaranId,
  ]);
  await request.post(`${API}/roles/flush-cache`, { headers: admin.auth });
});

test("Staff tidak boleh flush cache (pengguna:urus) -> 403", async ({ request }) => {
  const staff = await apiLogin(request, CREDENTIALS.staff);
  const res = await request.post(`${API}/roles/flush-cache`, { headers: staff.auth });
  expect(res.status()).toBe(403);
});

test("Perubahan peranan_kebenaran berkuat kuasa selepas flush, bukan sebelum", async ({
  request,
}) => {
  const viewer = await apiLogin(request, CREDENTIALS.viewer);
  const lihatPindaan = () => request.get(`${API}/pindaan`, { headers: viewer.auth });

  // Keadaan asal: Viewer tiada pindaan:lihat; panggilan ini mengisi cache
  await request.post(`${API}/roles/flush-cache`, { headers: admin.auth });
  expect((await lihatPindaan()).status()).toBe(403);

  await DB.query("INSERT INTO peranan_kebenaran (peranan_id, kebenaran_id) VALUES ($1, $2)", [
    PERANAN_VIEWER,
    kebenaranId,
  ]);

  // Cache masih sah -> kebenaran baharu belum kelihatan
  expect((await lihatPindaan()).status()).toBe(403);

  const flush = await request.post(`${API}/roles/flush-cache`, { headers: admin.auth });
  expect(flush.status()).toBe(200);
  const badan = await flush.json();
  expect(badan.message).toMatch(/dikosongkan/);
  expect(badan.dikosongkan).toBeGreaterThan(0);

  expect((await lihatPindaan()).status()).toBe(200);
});
