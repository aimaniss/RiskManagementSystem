// 17-ui-aliran-penuh.spec.mjs — Aliran pengguna hujung-ke-hujung melalui UI:
// Staff log masuk & daftar risiko dari borang (terus ke halaman risiko) ->
// Executive lulus/tolak dari Senarai Tugasan -> penilaian di halaman butiran ->
// Staff mohon pindaan dari tab Penilaian (banner status, satu permohonan
// terbuka) -> Executive lulus, Staff dimaklumkan & klik notifikasi -> Admin
// tolak, Staff nampak sebab -> Executive mohon dari halaman Pindaan & pinda
// terus di halaman butiran (direkodkan, "Perlu rawatan" dikemas kini).
// Spec 11 menguji API yang sama; spec ini menangkap pepijat pada lapisan UI.

import { test, expect } from "@playwright/test";
import { DB, tutupDB } from "../db.helper.mjs";
import { API, CREDENTIALS, apiLogin, sealSession } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

const TANDA = `E2E-UIPenuh-${Date.now()}`;
const SYARIKAT_STAFF = 8; // UKMDG1237 (Staff) — UKM Digital
const ctx = { rujukan: [] };
let sesi;

const satu = async (sql, params) => (await DB.query(sql, params)).rows[0];
const semua = async (sql, params) => (await DB.query(sql, params)).rows;

async function logMasukUI(page, { staff_id, katalaluan }) {
  await page.goto("/login");
  await page.getByLabel("ID Staf").fill(staff_id);
  await page.getByLabel("Kata laluan", { exact: true }).fill(katalaluan);
  await page.getByRole("button", { name: "Log masuk" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function daftarMelaluiBorang(page, risiko) {
  await page.goto("/DaftarRisiko");
  await expect(page.getByLabel("Syarikat *")).toHaveValue(String(SYARIKAT_STAFF));
  await page.getByLabel("Kategori Risiko *").selectOption({ label: "Operasi" });
  await page.getByLabel("Bahagian / Unit *").selectOption({ label: "Operasi" });
  await page.getByLabel("Risiko *", { exact: true }).fill(risiko);
  await page.getByLabel("Punca 1").fill("Perkakasan usang");
  await page.getByLabel("Kesan 1").fill("Gangguan perkhidmatan");
  await page.getByRole("button", { name: "Daftar Risiko" }).last().click();

  // Pendaftar dibawa ke halaman risiko baharu dengan status kelulusan
  await expect(page).toHaveURL(/\/risiko\/\d+$/);
  await expect(page.getByText(/berjaya didaftarkan dan menunggu kelulusan/)).toBeVisible();
  await expect(page.getByText("Menunggu Kelulusan").first()).toBeVisible();
  const id = Number(page.url().split("/").pop());
  const r = await satu("SELECT * FROM risiko WHERE risiko_id = $1", [id]);
  expect(r.risiko).toBe(risiko);
  ctx.rujukan.push(r.no_rujukan);
  return r;
}

async function bukaTugasan(page, teks) {
  await page.goto("/SenaraiTugasan");
  await page.getByRole("row", { name: new RegExp(teks) }).getByRole("button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

// Borang pindaan bersatu di tab Pindaan (skor penilaian)
async function isiBorangPindaan(page, kebarangkalian, impak, justifikasi) {
  await expect(page).toHaveURL(/tab=pindaan&sunting=1/);
  await page.getByLabel("Skor Kebarangkalian", { exact: true }).selectOption(String(kebarangkalian));
  await page.getByLabel("Skor Impak", { exact: true }).selectOption(String(impak));
  await page.getByLabel("Justifikasi Pindaan *").fill(justifikasi);
}

// Staff mohon pindaan: butang di tab Penilaian membuka borang di tab Pindaan
async function mohonPindaanUI(page, kebarangkalian, impak, justifikasi) {
  await page.goto(`/risiko/${ctx.risikoA}?tab=penilaian`);
  await page.getByRole("button", { name: "Mohon Pindaan" }).click();
  await isiBorangPindaan(page, kebarangkalian, impak, justifikasi);
  await page.getByRole("button", { name: "Hantar Permohonan" }).click();
  await expect(page.getByText("Permohonan pindaan dihantar untuk kelulusan.")).toBeVisible();
  const p = await pindaanTerkini();
  expect(p.no_rujukan_pindaan).toMatch(/^PIN-\d{4}-\d{4}$/);
  ctx.rujukan.push(p.no_rujukan_pindaan);
  return p;
}

const pindaanTerkini = () =>
  satu(
    `SELECT pindaan_id, status_permohonan, no_rujukan_pindaan, sebab_ditolak
       FROM permohonan_pindaan WHERE risiko_id = $1 ORDER BY pindaan_id DESC LIMIT 1`,
    [ctx.risikoA]
  );
const skor = () =>
  satu(
    `SELECT skor_kebarangkalian, skor_impak, skor_risiko, status_risiko
       FROM risiko WHERE risiko_id = $1`,
    [ctx.risikoA]
  );

test.beforeAll(async ({ request }) => {
  const [n, l] = await Promise.all([
    satu("SELECT COALESCE(max(notifikasi_id), 0) AS m FROM notifikasi"),
    satu("SELECT COALESCE(max(id), 0) AS m FROM log_aktiviti"),
  ]);
  ctx.maxNotifikasi = n.m;
  ctx.maxLog = l.m;
  sesi = {
    admin: await apiLogin(request, CREDENTIALS.admin),
    executive: await apiLogin(request, CREDENTIALS.executive),
    staff: await apiLogin(request, CREDENTIALS.staff),
  };
  ctx.staffId = (
    await satu("SELECT pengguna_id FROM pengguna WHERE staff_id = $1", [CREDENTIALS.staff.staff_id])
  ).pengguna_id;
  ctx.namaSyarikat = (
    await satu("SELECT nama_syarikat FROM syarikat WHERE syarikat_id = $1", [SYARIKAT_STAFF])
  ).nama_syarikat;
});

test.afterAll(async () => {
  const ids = [ctx.risikoA, ctx.risikoB].filter(Boolean);
  if (ids.length) {
    const logIds = (
      await semua("SELECT log_id FROM logpemantauan WHERE risiko_id = ANY($1::int[])", [ids])
    ).map((r) => r.log_id);
    const pindaanIds = (
      await semua("SELECT pindaan_id FROM permohonan_pindaan WHERE risiko_id = ANY($1::int[])", [ids])
    ).map((r) => r.pindaan_id);
    await DB.query("DELETE FROM pelantindakanpemantauan WHERE log_id = ANY($1::uuid[])", [logIds]);
    await DB.query("DELETE FROM kakitanganpemantauan WHERE log_id = ANY($1::uuid[])", [logIds]);
    await DB.query(
      `DELETE FROM notifikasi WHERE notifikasi_id > $1
        AND (entiti_id = ANY($2::int[]) OR mesej LIKE ANY($3::text[]))`,
      [ctx.maxNotifikasi, [...ids, ...pindaanIds], ctx.rujukan.map((r) => `%${r}%`)]
    );
    await DB.query("DELETE FROM permohonan_pindaan WHERE risiko_id = ANY($1::int[])", [ids]);
    await DB.query("DELETE FROM logpemantauan WHERE risiko_id = ANY($1::int[])", [ids]);
    await DB.query("DELETE FROM punca_risiko WHERE risiko_id = ANY($1::int[])", [ids]);
    await DB.query("DELETE FROM kesan_risiko WHERE risiko_id = ANY($1::int[])", [ids]);
    await DB.query("DELETE FROM risiko WHERE risiko_id = ANY($1::int[])", [ids]);
  }
  const pola = [...ctx.rujukan, TANDA, ...ids.map((id) => `Risiko ID: ${id}`)].map((r) => `%${r}%`);
  await DB.query(
    `DELETE FROM log_aktiviti WHERE id > $1
      AND (ringkasan LIKE ANY($2::text[]) OR perincian LIKE ANY($2::text[]))`,
    [ctx.maxLog, pola]
  );
  await tutupDB();
});

test("Staff log masuk & daftar dua risiko melalui borang -> halaman risiko baharu", async ({
  page,
}) => {
  await logMasukUI(page, CREDENTIALS.staff);

  const a = await daftarMelaluiBorang(page, `${TANDA} A Kegagalan pelayan pusat data`);
  expect(a.syarikat_id).toBe(SYARIKAT_STAFF);
  expect(a.status_kelulusan).toBe("Menunggu Kelulusan");
  expect(a.kategori).toBe("Operasi");
  ctx.risikoA = a.risiko_id;
  const punca = await semua(
    "SELECT punca FROM punca_risiko WHERE risiko_id = $1 AND is_deleted = false",
    [a.risiko_id]
  );
  expect(punca.map((p) => p.punca)).toEqual(["Perkakasan usang"]);

  const b = await daftarMelaluiBorang(page, `${TANDA} B Kebocoran data pelanggan`);
  expect(b.syarikat_id).toBe(SYARIKAT_STAFF);
  ctx.risikoB = b.risiko_id;
});

test("Executive luluskan risiko dari Senarai Tugasan; Staff dimaklumkan", async ({ page }) => {
  await sealSession(page, sesi.executive.token);
  await bukaTugasan(page, `${TANDA} A`);
  await expect(page.getByRole("dialog").getByText(ctx.namaSyarikat, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Luluskan" }).click();
  await expect(page.getByRole("row", { name: new RegExp(`${TANDA} A`) })).toHaveCount(0);

  const r = await satu("SELECT status_kelulusan FROM risiko WHERE risiko_id = $1", [ctx.risikoA]);
  expect(r.status_kelulusan).toBe("Diluluskan");
  const notif = await semua(
    "SELECT 1 FROM notifikasi WHERE notifikasi_id > $1 AND pengguna_id = $2 AND entiti_id = $3",
    [ctx.maxNotifikasi, ctx.staffId, ctx.risikoA]
  );
  expect(notif.length).toBeGreaterThan(0);
});

test("Executive tolak risiko: sebab wajib, kemudian disimpan", async ({ page }) => {
  await sealSession(page, sesi.executive.token);
  await bukaTugasan(page, `${TANDA} B`);
  await page.getByRole("button", { name: "Tolak" }).click();
  await expect(page.getByText("Sila isi sebab penolakan.")).toBeVisible();
  expect(
    (await satu("SELECT status_kelulusan FROM risiko WHERE risiko_id = $1", [ctx.risikoB]))
      .status_kelulusan
  ).toBe("Menunggu Kelulusan");

  await page.getByLabel("Sebab Penolakan").fill(`${TANDA} pendua`);
  await page.getByRole("button", { name: "Tolak" }).click();
  await expect(page.getByRole("row", { name: new RegExp(`${TANDA} B`) })).toHaveCount(0);
  const r = await satu(
    "SELECT status_kelulusan, sebab_ditolak_risiko FROM risiko WHERE risiko_id = $1",
    [ctx.risikoB]
  );
  expect(r).toEqual({ status_kelulusan: "Ditolak", sebab_ditolak_risiko: `${TANDA} pendua` });
});

test("Executive nilai risiko di halaman butiran", async ({ page }) => {
  await sealSession(page, sesi.executive.token);
  await page.goto(`/risiko/${ctx.risikoA}`);
  await expect(page.getByText("Buat penilaian risiko")).toBeVisible();
  await page.getByRole("button", { name: "Mula" }).click();
  await page.getByLabel("Skor Kebarangkalian *").selectOption("2");
  await page.getByLabel("Skor Impak *").selectOption("2");
  await page.getByRole("button", { name: "Simpan Penilaian" }).click();
  await expect(page.getByText("Penilaian risiko disimpan.")).toBeVisible();
  expect(await skor()).toMatchObject({ skor_kebarangkalian: 2, skor_impak: 2, skor_risiko: "R" });
});

test("Staff mohon pindaan dari tab Penilaian -> menunggu; permohonan kedua disekat", async ({
  page,
}) => {
  await sealSession(page, sesi.staff.token);
  const p = await mohonPindaanUI(page, 4, 4, `${TANDA} kejadian berulang`);
  expect(p.status_permohonan).toBe("Menunggu Kelulusan");
  expect(await skor()).toMatchObject({ skor_kebarangkalian: 2, skor_impak: 2 });

  await expect(page.getByText(/sedang menunggu kelulusan/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Mohon Pindaan" })).toHaveCount(0);

  const kedua = await page.request.post(`${API}/pindaan/${ctx.risikoA}`, {
    headers: sesi.staff.auth,
    data: {
      justifikasi: { penilaian: `${TANDA} kedua` },
      perubahan: { data_sebelum: {}, data_selepas: { skor_kebarangkalian: 5, skor_impak: 5 } },
    },
  });
  expect(kedua.status()).toBe(409);
});

test("Executive lulus pindaan; Staff klik notifikasi -> tab Penilaian dengan skor baharu", async ({
  page,
}) => {
  const p = await pindaanTerkini();
  await sealSession(page, sesi.executive.token);
  await bukaTugasan(page, p.no_rujukan_pindaan);
  await page.getByRole("button", { name: "Luluskan" }).click();
  await expect(page.getByRole("row", { name: new RegExp(p.no_rujukan_pindaan) })).toHaveCount(0);
  expect((await pindaanTerkini()).status_permohonan).toBe("Diluluskan");
  expect(await skor()).toMatchObject({
    skor_kebarangkalian: 4,
    skor_impak: 4,
    skor_risiko: "T",
    status_risiko: "Ya",
  });

  await sealSession(page, sesi.staff.token);
  await page.getByRole("button", { name: /^Notifikasi/ }).click();
  await page.getByText(/telah diluluskan oleh/).first().click();
  await expect(page).toHaveURL(new RegExp(`/risiko/${ctx.risikoA}\\?tab=penilaian`));
  await expect(page.getByRole("button", { name: "Mohon Pindaan" })).toBeVisible();
});

test("Admin tolak pindaan kedua; Staff nampak sebab dan skor kekal", async ({ page }) => {
  await sealSession(page, sesi.staff.token);
  const p = await mohonPindaanUI(page, 1, 1, `${TANDA} risiko menurun`);

  await sealSession(page, sesi.admin.token);
  await bukaTugasan(page, p.no_rujukan_pindaan);
  await page.getByLabel("Sebab Penolakan").fill(`${TANDA} tiada bukti`);
  await page.getByRole("button", { name: "Tolak" }).click();
  await expect(page.getByRole("row", { name: new RegExp(p.no_rujukan_pindaan) })).toHaveCount(0);

  expect(await pindaanTerkini()).toMatchObject({
    status_permohonan: "Ditolak",
    sebab_ditolak: `${TANDA} tiada bukti`,
  });
  expect(await skor()).toMatchObject({ skor_kebarangkalian: 4, skor_impak: 4 });

  await sealSession(page, sesi.staff.token);
  await page.goto(`/risiko/${ctx.risikoA}?tab=penilaian`);
  await expect(page.getByText(/ditolak$/)).toBeVisible();
  await expect(page.getByText(`Sebab: ${TANDA} tiada bukti`)).toBeVisible();
});

test("Executive mohon pindaan dari halaman Pindaan -> diluluskan terus", async ({ page }) => {
  await sealSession(page, sesi.executive.token);
  await page.goto("/Pindaan");
  await page.getByRole("button", { name: "Mohon Pindaan" }).click();
  const noRujukan = ctx.rujukan[0];
  await page.getByLabel("Cari risiko untuk dipinda").fill(noRujukan);
  await page.getByRole("button", { name: `Pilih risiko ${noRujukan}` }).click();

  // Dialog membuka borang bersatu di tab Pindaan risiko tersebut
  await expect(page).toHaveURL(new RegExp(`/risiko/${ctx.risikoA}\\?tab=pindaan&sunting=1`));
  // Log awal kelulusan tiada skor, jadi hanya bahagian penilaian dipaparkan
  await expect(page.getByLabel("Kebarangkalian Keberkesanan")).toHaveCount(0);
  await isiBorangPindaan(page, 5, 5, `${TANDA} justifikasi Executive`);
  await expect(page.getByText("Ringkasan perubahan")).toBeVisible();
  const sebelum = (await pindaanTerkini()).pindaan_id;
  await page.getByRole("button", { name: "Simpan Pindaan" }).click();
  await expect(page.getByText("Pindaan disimpan dan berkuat kuasa.")).toBeVisible();

  await expect.poll(async () => (await pindaanTerkini()).pindaan_id).not.toBe(sebelum);
  const p = await pindaanTerkini();
  expect(p.no_rujukan_pindaan).toMatch(/^PIN-\d{4}-\d{4}$/);
  ctx.rujukan.push(p.no_rujukan_pindaan);
  expect(p.status_permohonan).toBe("Diluluskan");
  expect(await skor()).toMatchObject({ skor_kebarangkalian: 5, skor_impak: 5, skor_risiko: "ST" });
});

test("Executive pinda terus di halaman butiran -> direkodkan; Perlu rawatan dikemas kini", async ({
  page,
}) => {
  await sealSession(page, sesi.executive.token);
  await page.goto(`/risiko/${ctx.risikoA}?tab=penilaian`);
  await page.getByRole("button", { name: "Pinda", exact: true }).click();
  await isiBorangPindaan(page, 1, 1, `${TANDA} kawalan berkesan`);
  await page.getByRole("button", { name: "Simpan Pindaan" }).click();
  await expect(page.getByText("Pindaan disimpan dan berkuat kuasa.")).toBeVisible();

  const p = await pindaanTerkini();
  ctx.rujukan.push(p.no_rujukan_pindaan);
  expect(p.status_permohonan).toBe("Diluluskan");
  expect(await skor()).toMatchObject({
    skor_kebarangkalian: 1,
    skor_impak: 1,
    skor_risiko: "R",
    status_risiko: "Tidak",
  });
});

test("Tab Pindaan di butiran: Staff nampak semua permohonan, status & sebab ditolak", async ({
  page,
}) => {
  await sealSession(page, sesi.staff.token);
  await page.goto(`/risiko/${ctx.risikoA}?tab=pindaan`);
  await expect(page.getByRole("tab", { name: /Pindaan\s*4/ })).toBeVisible();
  const item = page.getByRole("list", { name: "Sejarah pindaan" }).getByRole("listitem");
  await expect(item).toHaveCount(4);
  // Terkini dahulu: pinda terus Executive (1×1), ...; permohonan Staff yang ditolak
  await expect(item.first()).toContainText("Diluluskan");
  await expect(item.first()).toContainText(`${TANDA} kawalan berkesan`);
  const ditolak = item.filter({ hasText: "Ditolak" });
  await expect(ditolak).toHaveCount(1);
  await expect(ditolak).toContainText(`Sebab ditolak: ${TANDA} tiada bukti`);
  await expect(ditolak).toContainText("Tinggi");
});

test("Halaman Pindaan: tab Sejarah menyenaraikan keputusan & membuka tab Pindaan risiko", async ({
  page,
}) => {
  await sealSession(page, sesi.executive.token);
  await page.goto("/Pindaan");
  await expect(page.getByRole("tab", { name: /Menunggu Kelulusan/ })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await page.getByRole("tab", { name: /Sejarah/ }).click();
  const baris = page.getByRole("row").filter({ hasText: ctx.rujukan[0] });
  await expect(baris.filter({ hasText: "Ditolak" })).toHaveCount(1);
  await expect(baris.filter({ hasText: "Diluluskan" })).toHaveCount(3);

  await page.getByLabel("Tapis mengikut keputusan").selectOption("Ditolak");
  await expect(baris).toHaveCount(1);
  await baris.getByRole("link", { name: ctx.rujukan[0] }).click();
  await expect(page).toHaveURL(new RegExp(`/risiko/${ctx.risikoA}\\?tab=pindaan`));
});

test("Penilaian & Rawatan: jalur aliran, hanya risiko diluluskan, butang membuka borang", async ({
  page,
}) => {
  await sealSession(page, sesi.executive.token);
  await page.goto("/RawatanRisiko");
  const aliran = page.getByRole("navigation", { name: "Aliran kerja risiko" });
  await expect(aliran.getByRole("button", { name: /Perlu Dinilai/ })).toHaveAttribute("aria-current", "step");

  // Risiko A sudah dinilai tetapi belum dirawat; B ditolak — tidak disenaraikan
  await aliran.getByRole("button", { name: /Perlu Rawatan/ }).click();
  await expect(page).toHaveURL(/tab=rawatan/);
  await page.getByLabel("Cari no. rujukan atau risiko").fill(TANDA);
  const baris = page.getByRole("row").filter({ hasText: TANDA });
  await expect(baris).toHaveCount(1);
  await expect(baris).toContainText(`${TANDA} A`);

  await aliran.getByRole("button", { name: /Perlu Dinilai/ }).click();
  await expect(page.getByRole("row").filter({ hasText: TANDA })).toHaveCount(0);

  await aliran.getByRole("button", { name: /Perlu Rawatan/ }).click();
  await baris.getByRole("button", { name: "Rawat" }).click();
  await expect(page).toHaveURL(new RegExp(`/risiko/${ctx.risikoA}\\?tab=rawatan&sunting=1`));
  await expect(page.getByLabel("Jenis Kawalan *")).toBeVisible();

  // Langkah 3 membawa ke halaman Pemantauan
  await page.goto("/RawatanRisiko");
  await page
    .getByRole("navigation", { name: "Aliran kerja risiko" })
    .getByRole("button", { name: /Dalam Pemantauan/ })
    .click();
  await expect(page).toHaveURL(/\/PemantauanRisiko\?kumpulan=aktif/);
});

test("Pemantauan: peringkat aliran, tahap terkini & membuka tab Pemantauan", async ({ page }) => {
  await sealSession(page, sesi.executive.token);
  await page.goto("/PemantauanRisiko");
  await expect(
    page
      .getByRole("navigation", { name: "Aliran kerja risiko" })
      .getByRole("button", { name: /Dalam Pemantauan/ })
  ).toHaveAttribute("aria-current", "step");
  await page.getByLabel("Cari no. rujukan, risiko atau syarikat").fill(TANDA);
  // Risiko A belum dirawat: bukan "Dalam Pemantauan", tetapi ada dalam "Semua"; B ditolak tiada
  await expect(page.getByRole("tab", { name: /Dalam Pemantauan\s*0/ })).toBeVisible();
  await page.getByRole("tab", { name: /^Semua/ }).click();
  await expect(page.getByRole("tab", { name: /^Semua\s*1/ })).toBeVisible();
  const baris = page.getByRole("row").filter({ hasText: TANDA });
  await expect(baris).toHaveCount(1);
  await expect(baris).toContainText("Rendah");
  await expect(baris).toContainText("Belum dirawat");

  await baris.getByRole("button", { name: "Buka" }).click();
  await expect(page).toHaveURL(new RegExp(`/risiko/${ctx.risikoA}\\?tab=pemantauan`));
});
