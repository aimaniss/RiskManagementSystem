// 11-aliran-tulis.spec.mjs — Aliran tulis hujung-ke-hujung melalui API sebenar:
// daftar risiko -> kemaskini -> lulus -> rawatan (tambah/kemaskini/padam) ->
// log pemantauan (tambah/kemaskini/padam) -> pindaan (mohon/lulus/tolak/lulus
// terus) -> padam risiko (soft-delete berlata).
//
// Semua data ujian ditanda TANDA dan dipadam KEKAL dalam afterAll, termasuk
// kesan sampingan (log_aktiviti, notifikasi) yang dicipta selepas ujian bermula.

import { test, expect } from "@playwright/test";
import { DB } from "../db.helper.mjs";
import { API, CREDENTIALS, apiLogin } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

const TANDA = `E2E-Aliran-${Date.now()}`;
const SYARIKAT_STAFF = 8; // UKMDG1237 (Staff) — UKM Digital
const ctx = { rujukan: [] };
let sesi;

const satu = async (sql, params) => (await DB.query(sql, params)).rows[0];
const semua = async (sql, params) => (await DB.query(sql, params)).rows;

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
  ctx.id = {
    executive: (await satu("SELECT pengguna_id FROM pengguna WHERE staff_id = $1", [CREDENTIALS.executive.staff_id])).pengguna_id,
  };
});

test.afterAll(async () => {
  const risikoId = ctx.risikoId;
  if (risikoId) {
    const logIds = (await semua("SELECT log_id FROM logpemantauan WHERE risiko_id = $1", [risikoId])).map((r) => r.log_id);
    const rawatanIds = (await semua("SELECT rawatan_id FROM rawatan_risiko WHERE risiko_id = $1", [risikoId])).map((r) => r.rawatan_id);
    const pindaanIds = (await semua("SELECT pindaan_id FROM permohonan_pindaan WHERE risiko_id = $1", [risikoId])).map((r) => r.pindaan_id);
    await DB.query("DELETE FROM pelantindakanpemantauan WHERE log_id = ANY($1::uuid[])", [logIds]);
    await DB.query("DELETE FROM kakitanganpemantauan WHERE log_id = ANY($1::uuid[])", [logIds]);
    await DB.query("DELETE FROM pelan_tindakan_rawatan WHERE rawatan_id = ANY($1::int[])", [rawatanIds]);
    await DB.query("DELETE FROM kakitangan_rawatan WHERE rawatan_id = ANY($1::int[])", [rawatanIds]);
    await DB.query(
      `DELETE FROM notifikasi WHERE notifikasi_id > $1
        AND (entiti_id = ANY($2::int[]) OR mesej LIKE ANY($3::text[]))`,
      [ctx.maxNotifikasi, [risikoId, ...pindaanIds], ctx.rujukan.map((r) => `%${r}%`)]
    );
    await DB.query("DELETE FROM permohonan_pindaan WHERE risiko_id = $1", [risikoId]);
    await DB.query("DELETE FROM logpemantauan WHERE risiko_id = $1", [risikoId]);
    await DB.query("DELETE FROM rawatan_risiko WHERE risiko_id = $1", [risikoId]);
    await DB.query("DELETE FROM punca_risiko WHERE risiko_id = $1", [risikoId]);
    await DB.query("DELETE FROM kesan_risiko WHERE risiko_id = $1", [risikoId]);
    await DB.query("DELETE FROM risiko WHERE risiko_id = $1", [risikoId]);
  }
  const pola = [...ctx.rujukan, TANDA, `Risiko ID: ${risikoId}`].map((r) => `%${r}%`);
  await DB.query(
    `DELETE FROM log_aktiviti WHERE id > $1
      AND (ringkasan LIKE ANY($2::text[]) OR perincian LIKE ANY($2::text[]))`,
    [ctx.maxLog, pola]
  );
});

const risikoAsas = (lebih = {}) => ({
  tahun: 2026,
  separuhTahun: 1,
  syarikatId: SYARIKAT_STAFF,
  kategori: "Operasi",
  bahagian: "Operasi",
  risiko: `${TANDA} Gangguan sistem`,
  skorKebarangkalian: 2,
  skorImpak: 2,
  skorRisiko: "R",
  statusRisiko: "Ya",
  punca: ["Punca A", "Punca B"],
  kesan: ["Kesan A", "Kesan B"],
  ...lebih,
});

test.describe("Risiko", () => {
  test("Staff tidak boleh daftar risiko untuk syarikat lain -> 403", async ({ request }) => {
    const res = await request.post(`${API}/risiko`, {
      headers: sesi.staff.auth,
      data: risikoAsas({ syarikatId: 1 }),
    });
    expect(res.status()).toBe(403);
  });

  test("Staff daftar risiko -> 201; punca/kesan disimpan; pelulus dimaklumkan", async ({ request }) => {
    const res = await request.post(`${API}/risiko`, { headers: sesi.staff.auth, data: risikoAsas() });
    expect(res.status()).toBe(201);
    ctx.risikoId = (await res.json()).risiko_id;

    const r = await satu("SELECT * FROM risiko WHERE risiko_id = $1", [ctx.risikoId]);
    ctx.rujukan.push(r.no_rujukan);
    expect(r.status_kelulusan).toBe("Menunggu Kelulusan");
    expect(r.syarikat_id).toBe(SYARIKAT_STAFF);
    expect((await semua("SELECT punca FROM punca_risiko WHERE risiko_id = $1 AND is_deleted = false", [ctx.risikoId])).length).toBe(2);
    expect((await semua("SELECT kesan FROM kesan_risiko WHERE risiko_id = $1 AND is_deleted = false", [ctx.risikoId])).length).toBe(2);

    const notif = await semua(
      "SELECT pengguna_id FROM notifikasi WHERE entiti_id = $1 AND jenis_notifikasi = 'risiko_baru'",
      [ctx.risikoId]
    );
    expect(notif.map((n) => n.pengguna_id)).toContain(ctx.id.executive);
  });

  test("Staff kemaskini risiko -> punca lama soft-delete, punca baharu aktif", async ({ request }) => {
    const r = await satu("SELECT no_rujukan FROM risiko WHERE risiko_id = $1", [ctx.risikoId]);
    const res = await request.put(`${API}/risiko/${ctx.risikoId}`, {
      headers: sesi.staff.auth,
      data: risikoAsas({ noRujukan: r.no_rujukan, risiko: `${TANDA} Gangguan sistem (dikemaskini)`, punca: ["Punca C"] }),
    });
    expect(res.status()).toBe(200);

    const aktif = await semua("SELECT punca FROM punca_risiko WHERE risiko_id = $1 AND is_deleted = false", [ctx.risikoId]);
    expect(aktif.map((p) => p.punca)).toEqual(["Punca C"]);
    const dipadam = await semua("SELECT 1 FROM punca_risiko WHERE risiko_id = $1 AND is_deleted = true AND deleted_at IS NOT NULL", [ctx.risikoId]);
    expect(dipadam.length).toBe(2);
    expect((await satu("SELECT risiko FROM risiko WHERE risiko_id = $1", [ctx.risikoId])).risiko).toContain("dikemaskini");
  });

  test("Staff tidak boleh luluskan risiko (risiko:lulus) -> 403", async ({ request }) => {
    const res = await request.put(`${API}/risiko/${ctx.risikoId}/approve`, { headers: sesi.staff.auth });
    expect(res.status()).toBe(403);
  });

  test("Executive luluskan risiko -> Diluluskan + log pemantauan awal dicipta", async ({ request }) => {
    const res = await request.put(`${API}/risiko/${ctx.risikoId}/approve`, { headers: sesi.executive.auth });
    expect(res.status()).toBe(200);
    const r = await satu("SELECT status_kelulusan, diluluskan_oleh_id FROM risiko WHERE risiko_id = $1", [ctx.risikoId]);
    expect(r.status_kelulusan).toBe("Diluluskan");
    expect(r.diluluskan_oleh_id).toBe(ctx.id.executive);
    const log = await semua("SELECT 1 FROM logpemantauan WHERE risiko_id = $1 AND is_deleted = false", [ctx.risikoId]);
    expect(log.length).toBe(1);
  });
});

test.describe("Rawatan", () => {
  test("Tambah rawatan -> pelan & kakitangan disimpan", async ({ request }) => {
    const res = await request.post(`${API}/rawatan`, {
      headers: sesi.staff.auth,
      data: {
        risiko_id: ctx.risikoId,
        jenis_kawalan: "Kurang",
        tempoh_jangkaan_siap: "6 bulan",
        plan_tindakan: ["Pelan 1", "Pelan 2"],
        kakitangan_bertanggungjawab: ["Pegawai A"],
      },
    });
    expect(res.status()).toBe(201);
    const rw = await satu("SELECT rawatan_id FROM rawatan_risiko WHERE risiko_id = $1 AND is_deleted = false", [ctx.risikoId]);
    ctx.rawatanId = rw.rawatan_id;
    expect((await semua("SELECT 1 FROM pelan_tindakan_rawatan WHERE rawatan_id = $1 AND is_deleted = false", [ctx.rawatanId])).length).toBe(2);
    expect((await semua("SELECT 1 FROM kakitangan_rawatan WHERE rawatan_id = $1 AND is_deleted = false", [ctx.rawatanId])).length).toBe(1);
  });

  test("Kemaskini rawatan -> senarai pelan diganti (lama soft-delete)", async ({ request }) => {
    const res = await request.put(`${API}/rawatan/${ctx.rawatanId}`, {
      headers: sesi.staff.auth,
      data: {
        jenis_kawalan: "Elak",
        tempoh_jangkaan_siap: "3 bulan",
        plan_tindakan: ["Pelan 3"],
        kakitangan_bertanggungjawab: ["Pegawai B", "Pegawai C"],
      },
    });
    expect(res.status()).toBe(200);
    const rw = await satu("SELECT jenis_kawalan, tempoh_siap FROM rawatan_risiko WHERE rawatan_id = $1", [ctx.rawatanId]);
    expect(rw).toEqual({ jenis_kawalan: "Elak", tempoh_siap: "3 bulan" });
    const pelan = await semua("SELECT pelan_tindakan FROM pelan_tindakan_rawatan WHERE rawatan_id = $1 AND is_deleted = false", [ctx.rawatanId]);
    expect(pelan.map((p) => p.pelan_tindakan)).toEqual(["Pelan 3"]);
    expect((await semua("SELECT 1 FROM kakitangan_rawatan WHERE rawatan_id = $1 AND is_deleted = false", [ctx.rawatanId])).length).toBe(2);
  });

  test("Viewer tidak boleh padam rawatan (rawatan:urus) -> 403", async ({ request }) => {
    const viewer = await apiLogin(request, CREDENTIALS.viewer);
    const res = await request.delete(`${API}/rawatan/${ctx.rawatanId}`, { headers: viewer.auth });
    expect(res.status()).toBe(403);
  });

  test("Padam rawatan -> rawatan & anak soft-delete", async ({ request }) => {
    const res = await request.delete(`${API}/rawatan/${ctx.rawatanId}`, { headers: sesi.staff.auth });
    expect(res.status()).toBe(200);
    expect((await satu("SELECT is_deleted FROM rawatan_risiko WHERE rawatan_id = $1", [ctx.rawatanId])).is_deleted).toBe(true);
    expect((await semua("SELECT 1 FROM pelan_tindakan_rawatan WHERE rawatan_id = $1 AND is_deleted = false", [ctx.rawatanId])).length).toBe(0);
    expect((await semua("SELECT 1 FROM kakitangan_rawatan WHERE rawatan_id = $1 AND is_deleted = false", [ctx.rawatanId])).length).toBe(0);
  });
});

test.describe("Log pemantauan", () => {
  const logAsas = (lebih = {}) => ({
    risiko_id: ctx.risikoId,
    tahun_pemantauan: 2026,
    separuh_tahun_pemantauan: 2,
    skor_kebarangkalian_selepas: 3,
    skor_impak_selepas: 4,
    keberkesanan: "Berkesan",
    status_pemantauan: "Pemantauan",
    catatan: TANDA,
    // Bentuk UI (objek) + baris kosong (dilangkau) + string (diterima)
    pelan_tindakan_list: [{ butiran_aktiviti: "Aktiviti 1" }, { butiran_aktiviti: "" }, "Aktiviti 2"],
    kakitangan_list: [{ butiran_kakitangan: "Pemantau A" }],
    ...lebih,
  });

  test("Tambah log -> skor_risiko_pemantauan dikira server; anak disimpan", async ({ request }) => {
    const res = await request.post(`${API}/pemantauan-risiko/log`, { headers: sesi.staff.auth, data: logAsas() });
    expect(res.status()).toBe(201);
    const log = await satu(
      "SELECT log_id, skor_risiko_pemantauan FROM logpemantauan WHERE risiko_id = $1 AND catatan = $2 AND is_deleted = false",
      [ctx.risikoId, TANDA]
    );
    ctx.logId = log.log_id;
    expect(log.skor_risiko_pemantauan).toBe("T"); // 3 x 4 -> Tinggi (utils/matriksRisiko.js)
    expect((await semua("SELECT 1 FROM pelantindakanpemantauan WHERE log_id = $1 AND is_deleted = false", [ctx.logId])).length).toBe(2);
    expect((await semua("SELECT 1 FROM kakitanganpemantauan WHERE log_id = $1 AND is_deleted = false", [ctx.logId])).length).toBe(1);
  });

  test("Kemaskini log -> skor dikira semula", async ({ request }) => {
    const res = await request.put(`${API}/pemantauan-risiko/log/${ctx.logId}`, {
      headers: sesi.staff.auth,
      data: logAsas({ skor_kebarangkalian_selepas: 5, skor_impak_selepas: 5 }),
    });
    expect(res.status()).toBe(200);
    const log = await satu("SELECT skor_risiko_pemantauan, skor_kebarangkalian_selepas FROM logpemantauan WHERE log_id = $1", [ctx.logId]);
    expect(log.skor_kebarangkalian_selepas).toBe(5);
    expect(log.skor_risiko_pemantauan).toBe("ST");
  });

  test("Padam log -> log & anak soft-delete", async ({ request }) => {
    const res = await request.delete(`${API}/pemantauan-risiko/log/${ctx.logId}`, { headers: sesi.staff.auth });
    expect(res.status()).toBe(200);
    expect((await satu("SELECT is_deleted FROM logpemantauan WHERE log_id = $1", [ctx.logId])).is_deleted).toBe(true);
    expect((await semua("SELECT 1 FROM pelantindakanpemantauan WHERE log_id = $1 AND is_deleted = false", [ctx.logId])).length).toBe(0);
  });
});

test.describe("Pindaan", () => {
  const mohon = (request, akaun, kebarangkalian, impak) =>
    request.post(`${API}/pindaan/${ctx.risikoId}`, {
      headers: akaun.auth,
      data: {
        justifikasi: { penilaian: `${TANDA} justifikasi` },
        perubahan: {
          data_sebelum: { skor_kebarangkalian: 2, skor_impak: 2 },
          data_selepas: { skor_kebarangkalian: kebarangkalian, skor_impak: impak },
        },
      },
    });
  const pindaanTerkini = () =>
    satu(
      "SELECT pindaan_id, status_permohonan, no_rujukan_pindaan FROM permohonan_pindaan WHERE risiko_id = $1 ORDER BY pindaan_id DESC LIMIT 1",
      [ctx.risikoId]
    );
  const skor = () => satu("SELECT skor_kebarangkalian, skor_impak, skor_risiko FROM risiko WHERE risiko_id = $1", [ctx.risikoId]);

  test("Staff mohon -> Menunggu Kelulusan; Executive dimaklumkan", async ({ request }) => {
    const res = await mohon(request, sesi.staff, 4, 4);
    expect(res.ok()).toBeTruthy();
    const p = await pindaanTerkini();
    ctx.rujukan.push(p.no_rujukan_pindaan);
    ctx.pindaanLulus = p.pindaan_id;
    expect(p.status_permohonan).toBe("Menunggu Kelulusan");
    expect(await skor()).toMatchObject({ skor_kebarangkalian: 2, skor_impak: 2 });

    const notif = await semua(
      "SELECT pengguna_id FROM notifikasi WHERE entiti_id = $1 AND jenis_notifikasi = 'pindaan_baru'",
      [p.pindaan_id]
    );
    expect(notif.map((n) => n.pengguna_id)).toContain(ctx.id.executive);
  });

  test("Executive luluskan -> skor risiko dikemas kini", async ({ request }) => {
    const res = await request.put(`${API}/pindaan/${ctx.pindaanLulus}/approve`, {
      headers: sesi.executive.auth,
      data: { komen_pelulus: TANDA },
    });
    expect(res.status()).toBe(200);
    expect((await pindaanTerkini()).status_permohonan).toBe("Diluluskan");
    expect(await skor()).toMatchObject({ skor_kebarangkalian: 4, skor_impak: 4, skor_risiko: "T" });
  });

  test("Staff mohon lagi -> Admin tolak -> skor tidak berubah", async ({ request }) => {
    expect((await mohon(request, sesi.staff, 1, 1)).ok()).toBeTruthy();
    const p = await pindaanTerkini();
    ctx.rujukan.push(p.no_rujukan_pindaan);
    const res = await request.put(`${API}/pindaan/${p.pindaan_id}/reject`, {
      headers: sesi.admin.auth,
      data: { komen_pelulus: TANDA },
    });
    expect(res.status()).toBe(200);
    expect((await pindaanTerkini()).status_permohonan).toBe("Ditolak");
    expect(await skor()).toMatchObject({ skor_kebarangkalian: 4, skor_impak: 4 });
  });

  test("Executive mohon -> diluluskan terus (pindaan:lulus)", async ({ request }) => {
    expect((await mohon(request, sesi.executive, 5, 5)).ok()).toBeTruthy();
    const p = await pindaanTerkini();
    ctx.rujukan.push(p.no_rujukan_pindaan);
    expect(p.status_permohonan).toBe("Diluluskan");
    expect(await skor()).toMatchObject({ skor_kebarangkalian: 5, skor_impak: 5, skor_risiko: "ST" });
  });
});

test.describe("Padam risiko", () => {
  test("Admin padam risiko -> soft-delete berlata & hilang dari senarai", async ({ request }) => {
    const res = await request.delete(`${API}/risiko/${ctx.risikoId}`, { headers: sesi.admin.auth });
    expect(res.status()).toBe(200);

    const r = await satu("SELECT is_deleted, deleted_at FROM risiko WHERE risiko_id = $1", [ctx.risikoId]);
    expect(r.is_deleted).toBe(true);
    expect(r.deleted_at).not.toBeNull();
    for (const jadual of ["punca_risiko", "kesan_risiko", "logpemantauan", "rawatan_risiko"]) {
      const aktif = await semua(`SELECT 1 FROM ${jadual} WHERE risiko_id = $1 AND is_deleted = false`, [ctx.risikoId]);
      expect(aktif.length, jadual).toBe(0);
    }

    const senarai = await (await request.get(`${API}/risiko`, { headers: sesi.admin.auth })).json();
    expect(senarai.some((x) => x.risiko_id === ctx.risikoId)).toBe(false);
  });
});
