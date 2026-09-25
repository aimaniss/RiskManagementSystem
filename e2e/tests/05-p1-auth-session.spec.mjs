import { test, expect } from "@playwright/test";
import { DB, tutupDB } from "../db.helper.mjs";
import { CREDENTIALS, apiLogin } from "./helpers.mjs";

const API = "http://localhost:5001/api";
const UNIK = `E2E-P1-${Date.now()}`;
let idPengguna;

test.describe("P1 auth session", () => {
  test("Mengembalikan kebenaran segar dan mencabut token selepas perubahan role/password", async ({ request }) => {
    const admin = await apiLogin(request, CREDENTIALS.admin);
    const cipta = await request.post(`${API}/users`, {
      headers: admin.auth,
      data: {
        staff_id: UNIK,
        nama_penuh: "Pengguna P1 E2E",
        katalaluan: "Awal1234",
        peranan_id: 4,
        syarikat_id: 1,
      },
    });
    expect(cipta.status()).toBe(201);
    idPengguna = (await cipta.json()).pengguna_id;

    try {
      const sesiAwal = await apiLogin(request, { staff_id: UNIK, katalaluan: "Awal1234" });
      const profilAwal = await request.get(`${API}/users/me`, { headers: sesiAwal.auth });
      expect(profilAwal.status()).toBe(200);
      const dataAwal = await profilAwal.json();
      expect(dataAwal.kebenaran).toContain("risiko:daftar");
      expect(dataAwal.kebenaran).not.toContain("pengguna:urus");

      const kemaskini = await request.put(`${API}/users/${idPengguna}`, {
        headers: admin.auth,
        data: {
          staff_id: UNIK,
          nama_penuh: "Pengguna P1 E2E",
          katalaluan: "Baharu1234",
          peranan_id: 5,
          syarikat_id: 1,
        },
      });
      expect(kemaskini.status()).toBe(200);

      const tokenLama = await request.get(`${API}/users/me`, { headers: sesiAwal.auth });
      expect(tokenLama.status()).toBe(401);

      const sesiBaharu = await apiLogin(request, { staff_id: UNIK, katalaluan: "Baharu1234" });
      const profilBaharu = await request.get(`${API}/users/me`, { headers: sesiBaharu.auth });
      expect(profilBaharu.status()).toBe(200);
      const dataBaharu = await profilBaharu.json();
      expect(dataBaharu.kebenaran).not.toContain("risiko:daftar");
      expect(dataBaharu.kebenaran).toContain("risiko:lihat");
    } finally {
      if (idPengguna) {
        await request.delete(`${API}/users/${idPengguna}`, { headers: admin.auth }).catch(() => null);
        await DB.query("DELETE FROM log_aktiviti WHERE pengguna_id = $1", [idPengguna]);
        await DB.query("DELETE FROM pengguna WHERE pengguna_id = $1", [idPengguna]);
      }
      await tutupDB();
    }
  });
});
