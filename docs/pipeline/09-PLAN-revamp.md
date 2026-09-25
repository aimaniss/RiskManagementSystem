# 09 — PLAN: Revamp Seni Bina RMS (v2)

## STATUS PELAKSANAAN (2026-09-25)

> ✅ **Implementasi selesai** untuk Fasa 1–4 & 6 (spec disediakan), Fasa 7
> (dokumen ini + `01-auth-rbac.md` + `10-PLAN-lanjutan.md`). Fasa 5 diselesaikan
> sebahagian (lihat nota). Sila rujuk `10-PLAN-lanjutan.md` untuk kerja lanjutan.

| Fasa | Status | Bukti / Nota |
|------|--------|--------------|
| 1 — Transaksi | ✅ | `utils/transaksi.js`; `rawatan` DELETE, `users` POST/PUT/DELETE, `bahagian` POST (advisory lock) dibalut. Log/notifikasi selepas COMMIT. Spec E2E `03`. |
| 2 — Soft-delete | ✅ | Migrasi 019 (`pengguna`/`notifikasi` `is_deleted`+`deleted_at`; `deleted_at` pada 11 jadual 015). Tiada `DELETE FROM` dalam `routes/*` (grep = 0, kecuali migration). Spec E2E `04`. |
| 3 — Role matrix | ✅ | Migrasi 020 (16 kebenaran) + 021 (`pindaan:lihat`). `authorizeKebenaran` + cache 60s. Semua route sensitif ditukar. Spec E2E `01`/`02`. |
| 4 — Reflektor frontend | ✅ | `useAuth.js` `hasKebenaran`/`getKebenaran`, `MATRIX_KEBENARAN` fallback; `utils/auth.js` re-export lengkap. |
| 5 — Clean-up | ⚠️ | Selesai: `tahun.js`, bcrypt, mesej BM teras, `controllers/` untuk users/bahagian/auth. **Belum**: pindah penuh logik `notifikasi`/`log_aktiviti`/`rawatan`/`risiko`/`pemantauan`/`pindaan` ke `controllers/` (mekanikal, nilai rendah — cadangan 10-PLAN), penamaan jadual (didokumenkan sebagai had). |
| 6 — E2E | ✅ (spec sedia) | Suite `e2e/` Playwright lengkap; jalankan dengan `npm run test:e2e` (prasyarat install lihat `e2e/README.md`). |
| 7 — Documentation | ✅ | `01-auth-rbac.md` (ditulis semula), fail ini, `10-PLAN-lanjutan.md`, `AGENTS.md`, `PROGRESS.md`. |

**Pengesahan teknikal**: `npm run migrate:status` → 21 migrasi lengkap, 0 pending.
(Selepas P1: 22 migrasi — 022 `token_dikemaskini_at`; lih. `10-PLAN-lanjutan.md`.)
Smoke test semua endpoint (dashboard, laporan, rawatan, pemantauan, pindaan,
users, log_aktiviti, risiko, bahagian, tahun, notifikasi) → OK. Lint/build
frontend OK (hanya isu pre-existing). Kata laluan log masuk teras kini bcrypt.

---

## Objektif

Pelaksanaan semula seni bina backend untuk menutup tiga kelemahan asas:

1. **Integriti data** — semua operasi tulis berbilang-jadual dibalut
   transaksi (fail → rollback, bukan tinggal data separa).
2. **Role matrix (RBAC)** — jadual `kebenaran`/`peranan_kebenaran` yang wujud
   tetapi mati hendaklah digerakkan sebagai matrix kebenaran sebenar.
3. **Dasar soft-delete** — *tiada* `DELETE FROM` dalam kod; setiap pemadaman
   hanya tanda `is_deleted = true` (+ timestamp), supaya rekod tidak hilang
   dari pangkalan data.

Sokongan: **Playwright MCP** untuk ujian E2E selepas revamp
(didaftarkan dalam `opencode.json`, command `npx -y @playwright/mcp@latest`).

---

## Dapatan Audit Semasa

### 1. Transaksi DB — separa & tidak konsisten

| Fail | Endpoint | Transaksi | Status |
|------|----------|-----------|--------|
| `risiko.js` | POST `/`, PUT kemaskini, DELETE `/:risiko_id`, PUT approve | ✔ `BEGIN/COMMIT/ROLLBACK` | OK |
| `risiko.js` | PUT reject | ✘ (single UPDATE) | OK (satu penyataan) |
| `rawatan.js` | PUT penilaian, POST `/`, PUT `/:rawatan_id` | ✔ | OK |
| `rawatan.js` | **DELETE `/:rawatan_id`** | ✘ **3 × UPDATE tanpa sebarang tx** | 🚨 SEPARA |
| `pindaan.js` | POST `/`, PUT approve (dan reject?) | ✔ `BEGIN/COMMIT` | OK |
| `pemantauan.js` | POST/PUT/DELETE log | ✔ | OK |
| `users.js` | POST/PUT/DELETE pengguna | ✘ (tulis 1 jadual + log aktiviti) | ⚠️ |
| `bahagian.js` | POST | ✘ (SELECT+INSERT tanpa tx / unique) | ⚠️ race |
| `log_aktiviti.js` | DELETE | ✘ (single statement) | ⚠️ |
| `notifikasi.js`, `syarikat.js`, `tahun.js`, `roles.js`, `laporan.js`, `dashboard.js` | — | baca / single | OK |

**Masalah struktur:**

- Tiada helper transaksi pusat — corak `pool.connect()` + `BEGIN/COMMIT/ROLLBACK`
  ditaip semula di setiap route; mudah terlepas (bukti: `rawatan.js` DELETE).
- Risiko partial-write sebenar: mis. `rawatan.js` DELETE gagal pada UPDATE ke-2
  → `rawatan_risiko` sudah `is_deleted` tetapi `pelan_tindakan_rawatan` &
  `kakitangan_rawatan` masih aktif → data yatim.
- `users.js`/`bahagian.js` tulis + log tanpa atomik; jika `catatAktiviti` gagal
  selepas `INSERT pengguna`, aplikasi kepala tetapi log hilang (kebergantungan
  tidak konsisten).
- Corak transaksi manual kelihatan pada `routes/*` sahaja; controller yang
  memegang logik (cth `authController.js`) tidak menggunakan klien transaksi.

### 2. Role Matrix — jadual wujud, kod tidak guna

- Migration `014` mencipta `kebenaran` & `peranan_kebenaran`, tetapi **sifar
  rujukan** dalam keseluruhan kod backend (grep: hanya dalam migration).
- Penguatkuasaan semasa: `authorizeRoles("Admin", ...)` **hardcode nama peranan**
  pada beberapa route sahaja. Tiada satu sumber kebenaran.
- Isolation `syarikat_id` sudah betul di `risiko.js` GET & `rawatan.js` GET, tapi
  tidak seragam pada **semua** endpoint tulis/papar.
- `roles.js` GET hanya pulang `peranan` — tidak termasuk kebenaran; klien tiada
  cara tahu apa yang peranan boleh buat.
- Frontend `useAuth.js` menduplikasi matrix (helper `canEdit`, `isAdmin`, dsb.)
  dan `authorizeRoles` backend — dua sumber kebenaran → senang lari.

### 3. Dasar Soft-Delete — bercampur (tepat ini yang perlu direvamp)

`is_deleted` sudah ditambah (migration knex `015`) kepada 11 jadual:
`risiko`, `punca_risiko`, `kesan_risiko`, `rawatan_risiko`,
`pelan_tindakan_rawatan`, `kakitangan_rawatan`, `logpemantauan`,
`pelantindakanpemantauan`, `kakitanganpemantauan`, `permohonan_pindaan`,
`log_aktiviti`.

**Tetapi masih ada `DELETE FROM` fizikal dalam kod → rekod hilang:**

| Lokasi | Penyataan | Masalah |
|--------|-----------|---------|
| `users.js:290` | `DELETE FROM pengguna` | Rekod pengguna hilang dari DB (FK dan jejak audit putus) |
| `notifikasi.js:101` | `DELETE FROM notifikasi` | Notifikasi yang diarkibkan hilang |
| `log_aktiviti.js:95,137` | `DELETE FROM log_aktiviti` | **Jejak audit hilang** — walaupun jadual ada `is_deleted`! |
| `risiko.js:379-380` | `DELETE FROM pelan_tindakan_rawatan / kakitangan_rawatan` (dalam PUT kemaskini) | Sejarah kanak-kanak hilang setiap kemaskini |
| `pemantauan.js:689-690` | `DELETE FROM PelanTindakanPemantauan / KakitanganPemantauan` (dalam PUT log) | Sejarah butiran pemantauan hilang |

Jadual yang langsung **tiada lajur soft-delete**: `pengguna`, `notifikasi` —
perlu migrasi untuk menyokong dasar baharu.

### 4. Isu lain dikenal pasti

- `tahun.js:10` memaparkan `daftar_risiko` — jadual sebenar bernama `risiko`
  (`migration 004`). Endpoint tahun berkemungkinan **rosak**.
- Nama jadual tak seragam: `logpemantauan` vs `LogPemantauan`; begitu juga
  `pelantindakanpemantauan`/`kakitanganpemantauan`. PostgreSQL case-insensitive
  → berfungsi tetapi mengelirukan dan rapuh pada CD/manifest SaaS.
- `authController.js` membanding kata laluan **plain-text** (tiada bcrypt).
- Mesej ralat bercampur EN/BM (`"No permission to add risiko"` di `risiko.js:45`).
- Logik perniagaan hampir semua di dalam `routes/`, sedangkan konvensyen
  AGENTS.md menetapkan `controllers/` untuk logik.

---

## Sasaran Seni Bina (v2)

> Semua blok di bawah telah **dilaksanakan** kecuali item yang ditanda (⚠️).
> `utils/transaksi.js`, `authorizeKebenaran`, migrasi 019–021, dan dasar
> soft-delete wujud dalam kod seperti yang diterangkan.

### A. Helper transaksi pusat — `utils/transaksi.js` ✅

Gantikan semua corak manual dengan satu pembalut:

```js
// utils/transaksi.js
import pool from "../config/db.js";

export async function dalamTransaksi(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hasil = await fn(client);
    await client.query("COMMIT");
    return hasil;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
```

Penggunaan dalam route:

```js
router.delete("/:rawatan_id", verifyToken, async (req, res) => {
  try {
    const { rawatan_id } = req.params;
    await dalamTransaksi(async (client) => {
      await client.query("UPDATE rawatan_risiko SET is_deleted = true WHERE rawatan_id = $1 AND is_deleted = false", [rawatan_id]);
      await client.query("UPDATE pelan_tindakan_rawatan SET is_deleted = true WHERE rawatan_id = $1 AND is_deleted = false", [rawatan_id]);
      await client.query("UPDATE kakitangan_rawatan SET is_deleted = true WHERE rawatan_id = $1 AND is_deleted = false", [rawatan_id]);
    });
    // log + notifikasi selepas COMMIT
    ... 
    res.json({ message: "Rawatan risiko berjaya dipadam" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memadam rawatan" });
  }
});
```

Peraturan: **catatAktiviti/notifikasi** dilepas SELEPAS `COMMIT` (bukan dalam
transaksi) supaya ia tidak mengakibatkan rollback data perniagaan.

### B. Role matrix berasaskan `kebenaran` / `peranan_kebenaran` ✅

**1. Middleware baharu** — `authorizeKebenaran(...namaKebenaran)`:

```js
// middleware/authMiddleware.js
const authorizeKebenaran = (...kebenaranDibolehkan) => {
  return async (req, res, next) => {
    // req.user.peranan_id sudah ada daripada verifyToken
    const { rows } = await pool.query(
      `SELECT k.nama_kebenaran
         FROM peranan_kebenaran pk
         JOIN kebenaran k ON k.kebenaran_id = pk.kebenaran_id
        WHERE pk.peranan_id = $1`,
      [req.user.peranan_id]
    );
    const miliki = new Set(rows.map(r => r.nama_kebenaran));
    const cukup = kebenaranDibolehkan.some(k => miliki.has(k));
    if (!cukup) return res.status(403).json({ error: "Akses ditolak. Kebenaran tidak mencukupi." });
    next();
  };
};
```

(Optimumkan: cache kebenaran per peranan selama N saat untuk elak query
setiap permintaan.)

**2. Separa senarai kebenaran yang dicadangkan** (seed dalam migration):

| Kebenaran | Keterangan |
|-----------|-------------|
| `risiko:daftar` | Daftar risiko baharu |
| `risiko:lihat` | Lihat semua senarai risiko |
| `risiko:nilai` | Kemaskini penilaian/skor |
| `risiko:lulus` | Luluskan/tolak risiko (ulasan) |
| `risiko:padam` | Soft-delete risiko |
| `rawatan:urus` | Tambah/kemaskini/padam rawatan |
| `pemantauan:urus` | Tambah/kemaskini/padam log pemantauan |
| `pindaan:urus` | Mohon pindaan & kelulusan |
| `pengguna:urus` | CRUD pengguna |
| `log:baca` | Lihat log aktiviti |
| `log:padam` | Padam (soft-delete) log aktiviti |
| `notifikasi:urus` | Urus notifikasi sendiri |
| `laporan:jana` | Jana/eksport laporan PDF |
| `dashboard:lihat` | Lihat statistik dashboard |

**3. Matrix peranan → kebenaran (target):**

| Kebenaran | Admin | Executive | Ketua Subsidiari | Staff | Viewer |
|-----------|:---:|:---:|:---:|:---:|:---:|
| `risiko:daftar` | ✔ | ✔ | ✔ | ✔ | — |
| `risiko:lihat` | ✔ | ✔ | ✔* | ✔* | ✔ |
| `risiko:nilai` | ✔ | ✔ | ✔* | — | — |
| `risiko:lulus` | ✔ | ✔ | — | — | — |
| `risiko:padam` | ✔ | ✔ | ✔* | — | — |
| `rawatan:urus` | ✔ | ✔ | ✔* | ✔* | — |
| `pemantauan:urus` | ✔ | ✔ | ✔* | ✔* | — |
| `pindaan:urus` | ✔ | ✔ | ✔* | ✔* | — |
| `pengguna:urus` | ✔ | — | — | — | — |
| `log:baca` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `log:padam` | ✔ | — | — | — | — |
| `notifikasi:urus` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `laporan:jana` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `dashboard:lihat` | ✔ | ✔ | ✔ | ✔ | ✔ |

\* Skop terhad `syarikat_id` sendiri — kekalkan klausa `WHERE syarikat_id` di
query (isolasi data sudah wujud dan **kekal**).

**4. Reflektor frontend** — memakai satu sumber: `authorizeKebenaran` di backend
+ padaman kunci kebenaran yang sama di `useAuth.js`/`canEdit()`, supaya UI dan
API tidak lari.

### C. Dasar SOFT-DELETE menyeluruh (peraturan utama revamp) ✅

```
🚫 TIADA "DELETE FROM <jadual>" dalam kod aplikasi.
✅ Semua "padam" = UPDATE <jadual> SET is_deleted = true (atau tambah kolum jika tiada).
```

Langkah:

1. **Migrasi baharu**: tambah `is_deleted BOOLEAN DEFAULT false` + `deleted_at
   TIMESTAMPTZ NULL` pada jadual yang tiada: `pengguna`, `notifikasi`.
2. Gantikan setiap `DELETE FROM` yang dikenal pasti dalam audit dengan soft-delete:
   - `users.js` DELETE → `UPDATE pengguna SET is_deleted=true, deleted_at=NOW()`.
     Set tanda `status` berkaitan ditetapkan supaya pengguna tidak boleh log masuk
     (libatkan `auth` — fail `verifyToken` harus menapis `is_deleted = false`).
   - `notifikasi.js` DELETE → `UPDATE notifikasi SET is_deleted=true`.
   - `log_aktiviti.js` DELETE (:id & julat tarikh) → `UPDATE ... SET is_deleted=true`.
   - `risiko.js` PUT kemaskini (kanak-kanak pelan/kakitangan) → `UPDATE ... SET
     is_deleted=true` dahulu, bukannya `DELETE FROM`; atau simpan versi penuh
     (sejarah kawalan kekal).
   - `pemantauan.js` PUT log (PelanTindakanPemantauan & KakitanganPemantauan) →
     soft-delete sebelum insert semula.
3. Selaraskan **setiap query pembacaan** menapis `is_deleted = false` (banyak
   sudah ada; lengkapkan yang tertinggal, cth pengguna & notifikasi).
4. `role` jadual rujukan (`peranan`, `syarikat`, `bahagian`) — kendalikan dengan
   teliti: `bahagian` tiada endpoint padam; `syarikat` tiada CRUD penuh; pastikan
   tiada `DELETE` baru diperkenalkan.
5. Jejak audit: log aktiviti kekal walaupun indikator `is_deleted=true`.

### D. Piawaian & struktur yang lain

- Pindahkan logik perniagaan dari `routes/` ke `controllers/` (patuh AGENTS.md).
- Betulkan `tahun.js`: `daftar_risiko` → `risiko`.
- Normalkan nama jadual (cadangan min: jadikan semua `snake_case`) & betulkan
  rujukan di query — satu migrasi penamaan disertakan ujian regresi E2E.
- Ganti bandingan kata laluan plain-text dengan **bcrypt** dalam `authController.js`
  (migrasi kata laluan sedia ada perlu strategi rehash-on-login).
- Piawai mesej ralat BM sepenuhnya (`risiko.js:45` → BM).

### E. Ujian E2E — Playwright (selepas revamp)

- Skenario teras peranan: login tiap peranan → cuba kebenaran yang sepatutnya
  dibenarkan / ditolak.
- Skenario transaksi: paksa kegagalan (contoh hantar data tidak sah) pada
  endpoint multi-tulis → sahkan data asal kekal (rollback) bukan data separa.
- Skenario soft-delete: padam risiko/rawatan/log → sahkan rekod masih dalam DB
  (`is_deleted=true`) dan tidak muncul di UI, dan dapat dipulihkan.

---

## Pelan Pelaksanaan (Fasa)

| Fasa | Skop | Output |
|------|------|--------|
| **1** | Helper `utils/transaksi.js` + wrap endpoint multi-tulis yang tertinggal (`rawatan` DELETE, `users`, `bahagian`) | Tiada partial-write |
| **2** | Migration soft-delete (`pengguna`, `notifikasi`, `deleted_at`) + ganti semua `DELETE FROM` | Dasar soft-delete penuh |
| **3** | Rangka RBAC: migration seed `kebenaran` + `peranan_kebenaran`, middleware `authorizeKebenaran`, gantikan `authorizeRoles` beransur | Role matrix hidup |
| **4** | Reflektor `useAuth.js`/frontend kepada matrix kebenaran tunggal | UI-API selari |
| **5** | Pindah logik ke `controllers/`, betulkan `tahun.js`, penamaan jadual, mesej BM, bcrypt | Clean-up arkitektur |
| **6** | Sediakan Playwright E2E + jalankan regresi tiap fasa | Pengesahan |
| **7** | Kemas kini `docs/pipeline/*.md` & `AGENTS.md` bersama perubahan | Dokumentasi |

Setiap fasa **berasingan boleh di-deploy** dan diuji dengan Playwright sebelum
berpindah ke fasa seterusnya.

---

## Kriteria Selesai

1. `rg "DELETE FROM" risk_backend/routes` → **0 hasil** ✅ (kecuali migration;
   disahkan 2026-09-25).
2. Setiap route yang menulis >1 jadual menggunakan `dalamTransaksi()` ✅
   (modul kritikal; `syarikat.js`/`roles.js` baca sahaja).
3. `authorizeRoles` digantikan `authorizeKebenaran` pada semua route sensitif;
   tiada kebenaran tersembunyi dalam helper frontend sahaja ✅.
4. Data difailkan hanya dikemas kini dengan `is_deleted=true` (+`deleted_at`);
   rekod kekal dalam DB (`SELECT` terus boleh nampak) ✅.
5. Playwright pass untuk skenario peranan, rollback, dan soft-delete —
   spec disediakan (`e2e/`); **jalankan** `npm run test:e2e` sebelum deploy.
6. `docs/pipeline/` & `AGENTS.md` dikemas kini ✅ (termasuk fail ini &
   `10-PLAN-lanjutan.md`).

---

> Dokumen perancangan. Mula dengan **Fasa 1** selepas pengesahan. Gunakan
> `rms-boost` untuk verifikasi endpoint/jadual semasa implementasi.