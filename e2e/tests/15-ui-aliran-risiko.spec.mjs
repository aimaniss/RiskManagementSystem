// 15-ui-aliran-risiko.spec.mjs — Revamp UI U6: aliran penuh melalui UI.
// Halaman butiran /risiko/:id: stepper aliran & "tindakan seterusnya",
// penilaian → rawatan → log pemantauan disunting dalam tab (tiada modal
// bersarang), garis masa pemantauan + panel sisi, kebenaran Staff (medan
// terhad, tiada pinda), dan tiada skrol mendatar pada lebar telefon.

import { test, expect } from "@playwright/test";
import { DB, tutupDB } from "../db.helper.mjs";
import { API, CREDENTIALS, apiLogin, sealSession } from "./helpers.mjs";

const TANDA = `E2E-UI-${Date.now()}`;
const SYARIKAT_STAFF = 8;
const ctx = {};

const satu = async (sql, params) => (await DB.query(sql, params)).rows[0];
const semua = async (sql, params) => (await DB.query(sql, params)).rows;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  ctx.maxLog = (await satu("SELECT COALESCE(max(id), 0) AS m FROM log_aktiviti")).m;
  ctx.maxNotifikasi = (await satu("SELECT COALESCE(max(notifikasi_id), 0) AS m FROM notifikasi")).m;
  const staff = await apiLogin(request, CREDENTIALS.staff);
  const executive = await apiLogin(request, CREDENTIALS.executive);

  // Risiko didaftar tanpa penilaian, kemudian diluluskan
  const daftar = await request.post(`${API}/risiko`, {
    headers: staff.auth,
    data: {
      tahun: 2026,
      separuhTahun: 1,
      syarikatId: SYARIKAT_STAFF,
      kategori: "Operasi",
      bahagian: "Operasi",
      risiko: `${TANDA} Gangguan rangkaian`,
      skorKebarangkalian: null,
      skorImpak: null,
      skorRisiko: null,
      statusRisiko: "Ya",
      punca: ["Punca UI"],
      kesan: ["Kesan UI"],
    },
  });
  expect(daftar.status()).toBe(201);
  ctx.risikoId = (await daftar.json()).risiko_id;
  expect(
    (await request.put(`${API}/risiko/${ctx.risikoId}/approve`, { headers: executive.auth })).status()
  ).toBe(200);
});

test.afterAll(async () => {
  const id = ctx.risikoId;
  if (id) {
    const logIds = (await semua("SELECT log_id FROM logpemantauan WHERE risiko_id = $1", [id])).map(
      (r) => r.log_id
    );
    const rawatanIds = (
      await semua("SELECT rawatan_id FROM rawatan_risiko WHERE risiko_id = $1", [id])
    ).map((r) => r.rawatan_id);
    await DB.query("DELETE FROM pelantindakanpemantauan WHERE log_id = ANY($1::uuid[])", [logIds]);
    await DB.query("DELETE FROM kakitanganpemantauan WHERE log_id = ANY($1::uuid[])", [logIds]);
    await DB.query("DELETE FROM pelan_tindakan_rawatan WHERE rawatan_id = ANY($1::int[])", [rawatanIds]);
    await DB.query("DELETE FROM kakitangan_rawatan WHERE rawatan_id = ANY($1::int[])", [rawatanIds]);
    await DB.query("DELETE FROM notifikasi WHERE notifikasi_id > $1 AND entiti_id = $2", [
      ctx.maxNotifikasi,
      id,
    ]);
    await DB.query(
      "DELETE FROM notifikasi WHERE notifikasi_id > $1 AND entiti_id IN (SELECT pindaan_id FROM permohonan_pindaan WHERE risiko_id = $2)",
      [ctx.maxNotifikasi, id]
    );
    await DB.query("DELETE FROM permohonan_pindaan WHERE risiko_id = $1", [id]);
    await DB.query("DELETE FROM logpemantauan WHERE risiko_id = $1", [id]);
    await DB.query("DELETE FROM rawatan_risiko WHERE risiko_id = $1", [id]);
    await DB.query("DELETE FROM punca_risiko WHERE risiko_id = $1", [id]);
    await DB.query("DELETE FROM kesan_risiko WHERE risiko_id = $1", [id]);
    await DB.query("DELETE FROM risiko WHERE risiko_id = $1", [id]);
  }
  await DB.query(
    "DELETE FROM log_aktiviti WHERE id > $1 AND (ringkasan LIKE $2 OR perincian LIKE $2)",
    [ctx.maxLog, `%${TANDA}%`]
  );
  await tutupDB();
});

const peringkatSemasa = (page) => page.locator('[aria-current="step"]').locator("..");

test("Executive: nilai → rawat → pantau melalui tab halaman butiran", async ({ page }) => {
  const sesi = await apiLogin(page.request, CREDENTIALS.executive);
  await sealSession(page, sesi.token);
  await page.goto(`/risiko/${ctx.risikoId}`);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(`${TANDA} Gangguan rangkaian`).first()).toBeVisible();
  await expect(peringkatSemasa(page)).toContainText("Penilaian");
  await expect(page.getByText("Buat penilaian risiko")).toBeVisible();

  // 1. Penilaian (dalam tab, bukan modal)
  await page.getByRole("button", { name: "Mula" }).click();
  await expect(page.getByRole("tab", { name: /Penilaian/ })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Skor Kebarangkalian *").selectOption("4");
  await page.getByLabel("Skor Impak *").selectOption("4");
  await page.getByRole("button", { name: "Simpan Penilaian" }).click();
  await expect(page.getByText("Penilaian risiko disimpan.")).toBeVisible();
  await expect(peringkatSemasa(page)).toContainText("Rawatan");
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // 2. Rawatan
  await page.getByRole("button", { name: "Mula" }).click();
  await page.getByLabel("Jenis Kawalan *").selectOption("Kurang");
  await page.getByLabel("Tempoh Jangkaan Siap Tindakan *").fill("6 bulan");
  await page.getByLabel("Pelan Tindakan * 1").fill("Pasang rangkaian sandaran");
  await page.getByLabel("Kakitangan Bertanggungjawab * 1").fill("Unit IT");
  await page.getByRole("button", { name: "Tambah Rawatan" }).click();
  await expect(page.getByText("Rawatan risiko ditambah.")).toBeVisible();
  await expect(peringkatSemasa(page)).toContainText("Pemantauan");

  // 3. Log pemantauan (panel sisi dibuka terus dengan borang)
  await page.getByRole("button", { name: "Mula" }).click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByText("Tambah log pemantauan")).toBeVisible();
  await panel.getByLabel("Separuh Tahun *").selectOption("2");
  await panel.getByLabel("Status Pemantauan *").selectOption("Pemantauan");
  await panel.getByLabel("Skor Kebarangkalian").selectOption("2");
  await panel.getByLabel("Skor Impak").selectOption("2");
  await panel.getByLabel("Pelan Tindakan 1").fill("Semak log rangkaian mingguan");
  await panel.getByLabel("Kakitangan Bertanggungjawab 1").fill("Unit IT");
  await expect(panel.getByText(/Keberkesanan:\s*Ya/)).toBeVisible();
  await panel.getByRole("button", { name: "Tambah Log" }).click();
  await expect(page.getByText("Log pemantauan ditambah.")).toBeVisible();

  // Garis masa: log baharu (2026 · Kedua) di atas log awal kelulusan
  const garisMasa = page.locator("ol li button");
  await expect(garisMasa).toHaveCount(2);
  await expect(garisMasa.first()).toContainText("2026 · Kedua");
  await expect(garisMasa.first()).toContainText("Semak log rangkaian mingguan");

  // 4. Butiran & sunting log dalam panel yang sama
  await garisMasa.first().click();
  await expect(page.getByRole("dialog").getByText("Keberkesanan")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Sunting" }).click();
  await page.getByRole("dialog").getByLabel("Catatan").fill(`${TANDA} catatan dikemaskini`);
  await page.getByRole("dialog").getByRole("button", { name: "Simpan Perubahan" }).click();
  await expect(page.getByText("Log pemantauan dikemaskini.")).toBeVisible();

  const log = await satu(
    "SELECT catatan, keberkesanan FROM logpemantauan WHERE risiko_id = $1 AND separuh_tahun_pemantauan = 2 AND is_deleted = false",
    [ctx.risikoId]
  );
  expect(log).toEqual({ catatan: `${TANDA} catatan dikemaskini`, keberkesanan: "Ya" });
  // Pelan tindakan & kakitangan kekal selepas tambah dan sunting
  const pelan = await semua(
    `SELECT pt.butiran_aktiviti FROM pelantindakanpemantauan pt
       JOIN logpemantauan lp ON lp.log_id = pt.log_id
      WHERE lp.risiko_id = $1 AND pt.is_deleted = false`,
    [ctx.risikoId]
  );
  expect(pelan.map((p) => p.butiran_aktiviti)).toEqual(["Semak log rangkaian mingguan"]);
});

test("Executive: sunting pengenalpastian & pinda penilaian menyimpan syarikat asal", async ({
  page,
}) => {
  const sesi = await apiLogin(page.request, CREDENTIALS.executive);
  await sealSession(page, sesi.token);
  await page.goto(`/risiko/${ctx.risikoId}?tab=ringkasan`);

  await page.getByRole("button", { name: "Sunting" }).click();
  await page.getByLabel("Risiko *", { exact: true }).fill(`${TANDA} Gangguan rangkaian utama`);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByText("Maklumat pengenalpastian dikemaskini.")).toBeVisible();

  await page.getByRole("tab", { name: /Penilaian/ }).click();
  await page.getByRole("button", { name: "Pinda", exact: true }).click();
  await expect(page).toHaveURL(/tab=pindaan&sunting=1/);
  await page.getByLabel("Skor Impak", { exact: true }).selectOption("3");
  await page.getByRole("button", { name: "Simpan Pindaan" }).click();
  await expect(page.getByText("Sila nyatakan justifikasi pindaan.")).toBeVisible();
  await page.getByLabel("Justifikasi Pindaan *").fill(`${TANDA} impak disemak semula`);
  await page.getByRole("button", { name: "Simpan Pindaan" }).click();
  await expect(page.getByText("Pindaan disimpan dan berkuat kuasa.")).toBeVisible();

  // Pinda terus oleh pelulus tetap direkodkan sebagai permohonan diluluskan
  const p = await satu(
    "SELECT status_permohonan, justifikasi_penilaian FROM permohonan_pindaan WHERE risiko_id = $1 ORDER BY pindaan_id DESC LIMIT 1",
    [ctx.risikoId]
  );
  expect(p).toEqual({
    status_permohonan: "Diluluskan",
    justifikasi_penilaian: `${TANDA} impak disemak semula`,
  });

  const r = await satu(
    "SELECT risiko, syarikat_id, skor_kebarangkalian, skor_impak FROM risiko WHERE risiko_id = $1",
    [ctx.risikoId]
  );
  expect(r).toEqual({
    risiko: `${TANDA} Gangguan rangkaian utama`,
    syarikat_id: SYARIKAT_STAFF,
    skor_kebarangkalian: 4,
    skor_impak: 3,
  });
  // Punca & kesan dikekalkan semasa pinda penilaian
  const punca = await semua("SELECT punca FROM punca_risiko WHERE risiko_id = $1 AND is_deleted = false", [
    ctx.risikoId,
  ]);
  expect(punca.map((p) => p.punca)).toEqual(["Punca UI"]);
});

test("Staff: tiada pinda terus; sunting log terkini dengan medan terhad", async ({ page }) => {
  const sesi = await apiLogin(page.request, CREDENTIALS.staff);
  await sealSession(page, sesi.token);
  await page.goto(`/risiko/${ctx.risikoId}?tab=penilaian`);
  await expect(page.getByText("Skor Kebarangkalian")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pinda", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mohon Pindaan" })).toBeVisible();

  await page.getByRole("tab", { name: /Ringkasan/ }).click();
  await expect(page.getByRole("button", { name: "Sunting" })).toHaveCount(0);

  await page.getByRole("tab", { name: /Pemantauan/ }).click();
  const garisMasa = page.locator("ol li button");
  // Log lama: tiada butang sunting (hanya log terkini)
  await garisMasa.last().click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Sunting" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await garisMasa.first().click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Padam" })).toHaveCount(0);
  await page.getByRole("dialog").getByRole("button", { name: "Sunting" }).click();
  await expect(page.getByRole("dialog").getByLabel("Skor Kebarangkalian")).toBeDisabled();
  await expect(page.getByRole("dialog").getByLabel("Status Pemantauan *")).toBeEnabled();
});

test("Paparan telefon: tiada skrol mendatar pada halaman butiran", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const sesi = await apiLogin(page.request, CREDENTIALS.executive);
  await sealSession(page, sesi.token);
  for (const tab of ["ringkasan", "penilaian", "rawatan", "pemantauan"]) {
    await page.goto(`/risiko/${ctx.risikoId}?tab=${tab}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const lebih = await page
      .locator("main")
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(lebih, `tab ${tab}`).toBeLessThanOrEqual(1);
  }
});

test("Senarai Risiko membuka halaman butiran (boleh dipautkan)", async ({ page }) => {
  const sesi = await apiLogin(page.request, CREDENTIALS.executive);
  await sealSession(page, sesi.token);
  await page.goto("/SenaraiRisiko");
  await page.getByText(`${TANDA} Gangguan rangkaian utama`).first().click();
  await expect(page).toHaveURL(new RegExp(`/risiko/${ctx.risikoId}$`));
});
