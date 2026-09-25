// 04-soft-delete.spec.mjs — Fasa 6: Spec soft-delete.
// Tujuan: sahkan DELETE pengguna ialah soft-delete (baris kekal is_deleted=true,
// hilang dari senarai API, tidak boleh log masuk) dan log aktiviti tidak boleh
// dipadam langsung melalui API (jejak audit).

import { test, expect } from "@playwright/test";
import { DB, tutupDB } from "../db.helper.mjs";
import { CREDENTIALS, apiLogin } from "./helpers.mjs";

const API = "http://localhost:5001/api";
const UNIK = `E2E-SD-${Date.now()}`;
let idPengguna;
let idLog;

test.describe("Soft-delete pengguna", () => {
  test("Jalankan aliran lengkap", async ({ request }) => {
    const admin = await apiLogin(request, CREDENTIALS.admin);

    // 1. Daftar pengguna ujian (peranan Staff = 4, syarikat 1)
    const penciptaan = await request.post(`${API}/users`, {
      headers: admin.auth,
      data: { staff_id: UNIK, nama_penuh: "Pengguna E2E", katalaluan: "Ujian1234", peranan_id: 4, syarikat_id: 1 },
    });
    expect(penciptaan.ok()).toBeTruthy();

    const senarai = await request.get(`${API}/users`, { headers: admin.auth });
    const pengguna = (await senarai.json()).find((u) => u.staff_id === UNIK);
    expect(pengguna).toBeTruthy();
    idPengguna = pengguna.pengguna_id;

    // 2. Pengguna ini boleh log masuk (sebelum padam)
    const loginSebelum = await apiLogin(request, { staff_id: UNIK, katalaluan: "Ujian1234" });
    expect(loginSebelum.token).toBeTruthy();

    // 3. Padam (soft-delete)
    const padam = await request.delete(`${API}/users/${idPengguna}`, { headers: admin.auth });
    expect(padam.ok()).toBeTruthy();

    // 4. Hilang dari senarai API
    const senaraiSemula = await request.get(`${API}/users`, { headers: admin.auth });
    const ditemui = (await senaraiSemula.json()).find((u) => u.staff_id === UNIK);
    expect(ditemui).toBeFalsy();

    // 5. Tidak boleh log masuk (401)
    const loginSelepas = await request.post(`${API}/auth/login`, {
      data: { staff_id: UNIK, katalaluan: "Ujian1234" },
    });
    expect(loginSelepas.status()).toBe(401);

    // 6. Baris kekal dalam DB sebagai is_deleted
    const { rows } = await DB.query(
      `SELECT is_deleted, deleted_at FROM pengguna WHERE staff_id = $1`,
      [UNIK]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].is_deleted).toBe(true);
    expect(rows[0].deleted_at).toBeTruthy();
  });
});

test.describe("Log aktiviti ialah jejak audit", () => {
  test("Tiada endpoint padam: DELETE /api/log_aktiviti/:id -> 404, baris kekal", async ({
    request,
  }) => {
    const admin = await apiLogin(request, CREDENTIALS.admin);

    // 1. Cipta baris log aktiviti ujian (langsung ke DB)
    const insert = await DB.query(
      `INSERT INTO log_aktiviti (pengguna_id, aktiviti, perincian, ringkasan)
       VALUES ($1, 'E2E', 'Ujian audit', 'Log ujian E2E') RETURNING id`,
      [admin.user.pengguna_id]
    );
    idLog = insert.rows[0].id;

    // 2. Kelihatan dalam senarai API (berhalaman)
    const senarai = await request.get(`${API}/log_aktiviti?aktiviti=E2E`, { headers: admin.auth });
    expect((await senarai.json()).data.some((l) => l.log_id === idLog)).toBeTruthy();

    // 3. Padam tunggal & pukal tidak lagi wujud, walaupun untuk Admin
    expect(
      (await request.delete(`${API}/log_aktiviti/${idLog}`, { headers: admin.auth })).status()
    ).toBe(404);
    expect(
      (
        await request.delete(`${API}/log_aktiviti?tarikhMula=2000-01-01&tarikhAkhir=2100-01-01`, {
          headers: admin.auth,
        })
      ).status()
    ).toBe(404);

    // 4. Baris kekal tanpa ditanda padam
    const { rows } = await DB.query(`SELECT is_deleted FROM log_aktiviti WHERE id = $1`, [idLog]);
    expect(rows[0].is_deleted).toBe(false);
  });
});

test.afterAll(async () => {
  if (idLog) {
    await DB.query(`DELETE FROM log_aktiviti WHERE id = $1`, [idLog]);
  }
  if (idPengguna) {
    await DB.query(`DELETE FROM log_aktiviti WHERE pengguna_id = $1`, [idPengguna]);
    await DB.query(`DELETE FROM pengguna WHERE pengguna_id = $1`, [idPengguna]);
  }
  await tutupDB();
});