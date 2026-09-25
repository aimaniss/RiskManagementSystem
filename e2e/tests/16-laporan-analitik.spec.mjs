// 16-laporan-analitik.spec.mjs — Dashboard analitik halaman Laporan:
// perbandingan separuh tahun & syarikat dikira betul (tahap pada akhir setiap
// separuh tahun = log pemantauan terkini, atau penilaian awal), tapisan
// kategori/syarikat, paparan jadual, skrin penuh, dan tab Jana Laporan PDF.
// Fixture menggunakan kategori unik supaya tidak bergantung pada data lain.

import { test, expect } from "@playwright/test";
import { DB, tutupDB } from "../db.helper.mjs";
import { CREDENTIALS, apiLogin, sealSession } from "./helpers.mjs";

const TANDA = `E2E-Analitik-${Date.now()}`;
const ctx = { risiko: [] };

const satu = async (sql, params) => (await DB.query(sql, params)).rows[0];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const admin = await satu("SELECT pengguna_id FROM pengguna WHERE staff_id = $1", [
    CREDENTIALS.admin.staff_id,
  ]);
  const daftar = async (syarikat, separuh, skor) =>
    (
      await satu(
        `INSERT INTO risiko (no_rujukan, tahun, separuh_tahun, syarikat_id, kategori, bahagian, risiko,
           skor_kebarangkalian, skor_impak, skor_risiko, status_risiko, status_kelulusan, created_by)
         VALUES ($1, 2025, $2, $3, $4, 'Operasi', $5, 4, 4, $6, 'Ya', 'Diluluskan', $7)
         RETURNING risiko_id`,
        [`${TANDA}-${syarikat}`, separuh, syarikat, TANDA, `${TANDA} risiko ${syarikat}`, skor, admin.pengguna_id]
      )
    ).risiko_id;
  // Syarikat 1: Tinggi pada Jan-Jun 2025, turun ke Sederhana (berkesan) pada Jul-Dis 2025
  ctx.risiko.push(await daftar(1, 1, "T"));
  ctx.risiko.push(await daftar(8, 2, "ST"));
  await DB.query(
    `INSERT INTO logpemantauan (risiko_id, tarikh_pemantauan, tahun_pemantauan, separuh_tahun_pemantauan,
       skor_kebarangkalian_selepas, skor_impak_selepas, skor_risiko_pemantauan, keberkesanan, status_pemantauan)
     VALUES ($1, '2025-10-01', 2025, 2, 2, 3, 'S', 'Ya', 'Pemantauan')`,
    [ctx.risiko[0]]
  );
  await DB.query(
    `INSERT INTO rawatan_risiko (risiko_id, jenis_kawalan, tempoh_siap) VALUES ($1, 'Kurang', '6 bulan')`,
    [ctx.risiko[0]]
  );
});

test.afterAll(async () => {
  await DB.query("DELETE FROM logpemantauan WHERE risiko_id = ANY($1::int[])", [ctx.risiko]);
  await DB.query("DELETE FROM rawatan_risiko WHERE risiko_id = ANY($1::int[])", [ctx.risiko]);
  await DB.query("DELETE FROM risiko WHERE risiko_id = ANY($1::int[])", [ctx.risiko]);
  await tutupDB();
});

const barisJadual = (kad, nama) => kad.getByRole("row").filter({ hasText: nama });

test("Analitik: perbandingan separuh tahun & syarikat, tapisan, jadual dan skrin penuh", async ({
  page,
  request,
}) => {
  const sesi = await apiLogin(request, CREDENTIALS.executive);
  await sealSession(page, sesi.token);
  await page.goto("/laporan");

  const analitik = page.getByTestId("analitik-laporan");
  await expect(analitik).toBeVisible();
  await analitik.getByLabel("Kategori", { exact: true }).selectOption(TANDA);
  await analitik.getByLabel("Dari", { exact: true }).selectOption({ label: "Jan–Jun 2025" });
  await analitik.getByLabel("Hingga", { exact: true }).selectOption({ label: "Jul–Dis 2025" });

  // Petunjuk warna tahap risiko hadir pada carta
  const kadTempoh = page.locator(".rounded-xl", { hasText: "Perbandingan Separuh Tahun: Tahap Risiko" }).last();
  await expect(kadTempoh.getByText("Sangat Tinggi (ST)")).toBeVisible();
  await expect(kadTempoh.locator(".recharts-rectangle").first()).toBeVisible();

  // Paparan jadual: Jan-Jun 2025 = 1 Tinggi; Jul-Dis 2025 = 1 Sederhana + 1 Sangat Tinggi
  await kadTempoh.getByTitle("Paparan jadual").click();
  const h1 = barisJadual(kadTempoh, "Jan–Jun 2025");
  await expect(h1.getByRole("cell")).toHaveText(["Jan–Jun 2025", "0", "0", "1", "0", "0", "1"]);
  const h2 = barisJadual(kadTempoh, "Jul–Dis 2025");
  await expect(h2.getByRole("cell")).toHaveText(["Jul–Dis 2025", "0", "1", "0", "1", "0", "2"]);

  // Statistik: 1 berkesan daripada 1 log
  await expect(analitik.getByText("100%")).toBeVisible();

  // Tapis syarikat 8: hanya risiko Sangat Tinggi berbaki
  const { nama_syarikat } = await satu("SELECT nama_syarikat FROM syarikat WHERE syarikat_id = 8");
  await analitik.getByLabel("Syarikat", { exact: true }).selectOption({ label: nama_syarikat });
  await expect(barisJadual(kadTempoh, "Jul–Dis 2025").getByRole("cell")).toHaveText([
    "Jul–Dis 2025", "0", "0", "0", "1", "0", "1",
  ]);

  // Skrin penuh dan keluar semula
  await analitik.getByRole("button", { name: "Skrin Penuh" }).click();
  await expect(page.getByText("Analitik Laporan Risiko")).toBeVisible();
  await analitik.getByRole("button", { name: "Keluar Skrin Penuh" }).click();
  await expect(page.getByText("Analitik Laporan Risiko")).toHaveCount(0);

  // Tab Jana Laporan PDF: jadual risiko dengan lencana tahap berwarna
  await page.getByRole("tab", { name: "Jana Laporan PDF" }).click();
  await expect(page).toHaveURL(/paparan=pdf/);
  await page.getByLabel("Cari").fill(`${TANDA}-1`);
  const baris = page.getByRole("row", { name: new RegExp(`${TANDA}-1`) });
  await expect(baris.getByText("Sederhana (S)")).toBeVisible();
  await expect(baris.getByRole("button", { name: "Jana PDF" })).toBeVisible();
});
