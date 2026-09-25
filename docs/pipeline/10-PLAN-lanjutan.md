# 10 — PLAN Lanjutan: Aliran Baharu & Skenario (selepas Revamp v2)

> Dekedin-v2 lengkap (Fasa 1–4, 6, 7). Dokumen ini merekod **aliran baharu**
> yang diperkenalkan semasa revamp, **scenario/isu yang belum dikenal pasti
> di awal**, dan cadangan langkah selanjutnya dengan keutamaan (P1/P2/P3).

---

## 1. Aliran baharu yang diperkenalkan (hasil Revamp v2)

### 1.1 Lumba-lumba (race) pada `bahagian` POST — kunci advisory

**Masalah** (Fasa 1): dua permintaan serentak boleh lulus `SELECT` (tidak jumpa)
sebelum sama-sama `INSERT` → pelanggaran `UNIQUE (nama_bahagian)` → ralat 500.

**Penyelesaian**: `pg_advisory_xact_lock(hashtextextended(LOWER($1), 0))` —
kunci dipegang **dalam transaksi sahaja** dan dilepas automatik pada COMMIT/ROLLBACK.
Query dilarikan di dalam `dalamTransaksi`.

```mermaid
sequenceDiagram
  autonumber
  participant A as Request 1 (Bahagian "IT")
  participant B as Request 2 (Bahagian "IT")
  participant D as DB

  A->>D: BEGIN (dalamTransaksi)
  A->>D: pg_advisory_xact_lock(IT)  🔒
  A->>D: SELECT 1 FROM bahagian WHERE nama_bahagian=LOWER('IT')
  D-->>A: (tiada)
  B->>D: BEGIN → pg_advisory_xact_lock(IT) ✋ menunggu
  A->>D: INSERT bahagian 'IT'
  A->>D: COMMIT 🔓
  B->>D: 🔒 dapat kunci & SELECT
  D-->>B: wujud → INSERT DITOLAK (409/500 terkawal)
```

**Skenario lanjutan (P2)**: kunci advisory berkesan per-sambungan/transaction;
bagi **berbilang instance aplikasi**, `hashtextextended` menggunakan seed hash
yang sama merentas DB — selamat. Walau bagaimanapun, `LOWER()` hanya normalkan ASCII;
cadang tambah indeks unik expression `UNIQUE (LOWER(nama_bahagian))` sebagai
pelindung kedua.

### 1.2 Rehash-on-login (kata laluan legasi → bcrypt)

Kata laluan lama disimpan **plain-text**. `utils/katalaluan.js`:
`sahkanKatalaluan` sahkan bcrypt dahulu, jika gagal cuba plain-text; bila padan
dalam bentuk plain-text, kira hash bcrypt baharu dan tulis ke DB (dalam
`authController.login`). **Skenario (P1 untuk audit)**: pengguna yang tidak log
masuk sejak naik taraf masih plain-text di DB — jalankan skrip migrasi pukal
atau biar rehash semula secara natural; jangan paksa reset kata laluan.

### 1.3 `pindaan:lihat` — kebenaran paparan berasingan

`pindaan:urus` dimiliki Staff & Ketua Subsidiari (untuk mohon), tetapi senarai
`GET /api/pindaan` mengandungi data **semua syarikat**. Kebenaran `pindaan:lihat`
(Admin + Executive sahaja) memastikan data rentas-syarikat tidak bocor kepada
role terhad. **Skenario (P1)**: pastikan setiap endpoint pindaan berskala dengan
kebenaran yang tepat — jangan sekali imbas memetakan `pindaan:urus` untuk GET
senarai.

### 1.4 Pembawa kebenaran dalam JWT — risiko staleness — **Selesai (P1)**

Array `kebenaran` tidak lagi dibawa dalam payload JWT. Respons login masih
mengembalikan `user.kebenaran` untuk keserasian, tetapi sumber kebenaran UI
sekarang ialah `GET /api/users/me`, yang mengembalikan snapshot kebenaran terkini
bersama profil pengguna. `AppLayout` memuat semula snapshot pada mount, apabila
jendela menerima fokus, dan setiap 60 saat; `MATRIX_KEBENARAN` hanya fallback
untuk token lama.

Backend masih mengesahkan kebenaran daripada role matrix pada setiap request
(dengan cache proses 60 saat), jadi penyingkiran array daripada JWT tidak
mengurangkan penguatkuasaan API.

### 1.5 Cache kebenaran — invalidasi

Cache `dapatkanKebenaranPeranan` disimpan dalam memori proses. Perubahan
`peranan_kebenaran` (migrasi/ad-hoc admin) tidak kelihatan sehingga 60s. Untuk
pentauliahan segera, tambah endpooint `POST /api/roles/flush-cache` (Admin)
atau `LISTEN/NOTIFY pg` untuk invalidasi. **(P2)**

### 1.6 Soft-delete jadual anak (`deleted_at` karat)

Migrasi 019 menambah `deleted_at` pada **11 jadual** selain `pengguna`/
`notifikasi`. Ini memastikan `is_deleted=true` lama boleh diaudit masa. Query
pembacaan kini menapis `is_deleted=false`, termasuk aggregate CTE di
`dashboard.js` dan `laporan.js` (data-penuh) supaya risiko/rawatan dipadam tidak
muncul dalam statistik PDF. **(Selesai; tiada tindakan lanjut kecuali**
**penulisan polisi retention — lihat §2.1.)**

---

## 2. Scenario yang belum dikenal pasti semasa audit awal

### 2.1 Policy retention & purging data soft-deleted (P2)

Soft-delete menyebabkan jadual membesar tanpa had. Cadangkan:
- Backoff `/api/jadual/*` (Admin) untuk **purging nyata** baris yang
  `deleted_at < NOW() - INTERVAL 'X'` sebagai cron/script berkala.
- Senaraikan jadual berkenaan: `risiko` + anak, `log_aktiviti`, `notifikasi`,
  `permohonan_pindaan`, `pengguna`.
- Log audit ke `log_aktiviti` sebelum purge supaya jejak kekal.

### 2.2 Notifikasi terhadap pengguna yang dipadam — **Selesai**

`dapatkanPenggunaIdByPeranan` kini menapis `is_deleted=false`. Skenario:
kelulusan pindaan menunggu pelulus yang dipadam → notifikasi tiada. Cadang
fallback ke Admin (atau penanda "pelulus tidak aktif") bila senarai kosong.
**(P2 — tingkah laku semasa: senyap.)**

**Pelaksanaan (2026-09-25)**: `dapatkanPenggunaIdByPeranan` diganti dengan
`dapatkanPenerimaIkutKebenaran(kebenaran, { kecuali })`:
- Penerima dipilih ikut **kebenaran** (`pindaan:lulus`, `risiko:lulus`), bukan
  nama peranan. Ini membetulkan bug: notifikasi pindaan baru dahulu hanya ke
  Admin walaupun Executive juga memegang `pindaan:lulus`.
- Pelaku dikecualikan (`kecuali`).
- Tiada pemegang aktif → fallback kepada pentadbir (`pengguna:urus`) +
  `console.warn`; pentadbir juga tiada → `[]` + amaran (tiada ralat).
- Spec `e2e/tests/06-penerima-notifikasi.spec.mjs`.

### 2.3 JWT masih sah selepas ubah kata laluan/role — **Selesai (P1)**

Migration 022 menambah `pengguna.token_dikemaskini_at`. Nilai ini dimasukkan ke
payload JWT semasa login dan dibandingkan dengan DB dalam `verifyToken`. Update
kata laluan, role, `staff_id` atau `syarikat_id` mengemas kini nilai tersebut;
token lama menerima `401` dan pengguna perlu log masuk semula. `/users/me` juga
memulihkan role, syarikat dan kebenaran terkini selepas login.

Spes `e2e/tests/05-p1-auth-session.spec.mjs` mengesahkan kebenaran segar,
penolakan token lama, dan login semula selepas perubahan role/password.

### 2.4 Penamaan jadual tidak normatif (had didokumenkan, P3)

`logpemantauan` / `LogPemantauan`, `pelantindakanpemantauan`,
`kakitanganpemantauan` — berfungsi (case-insensitive) tetapi rapuh pada CD/
manifest SaaS. **Sengaja tidak dinamakan semula** (kos tinggi, risiko besar).
Cadang satu migrasi penamaan lengkap + spec E2E regresi membaca jadual dengan
nama baharu. **Jangan sentuh sehingga semua query dikemas kini serentak.**

### 2.5 Mesej kesilapan dan `authorizeKebenaran` pesanan — **Selesai**

Semasa menukar route ke `authorizeKebenaran`, mesej ralat diseragamkan BM
(`{ error: "..." }`). Arahkan audit sisa: beberapa route masih pulang
`{ message: ... }` (bukan `{ error }`); klien `api.js` interceptor mungkin
bergantung pada `error.response.data.message`. Cadang piawai **`error` utama +
`message` maklumat**, atau sepakat satu medan sahaja.

**Pelaksanaan (2026-09-25)**: semua respons 4xx/5xx kini `{ error: "..." }`
(±80 respons dalam risiko/rawatan/pemantauan/pindaan/notifikasi/laporan/
dashboard/tahun). Respons yang dahulu `{ message, error: err.message }` kini
hanya `{ error: <mesej BM> }` (butiran teknikal di `console.error`).
`{ message }` dikekalkan untuk respons berjaya. 7 halaman frontend yang membaca
`data.message` semasa ralat ditukar ke `data.error`.

### 2.6 `roles.js` kini dikekang `pengguna:urus` — senarai peranan untuk log masuk

Jadual `peranan` ialah rujukan; sesetengah borang (cth. RegisterPage/permohonan
pengguna sendiri) mungkin memanggil `GET /api/roles` sebelum log masuk →
**403**. Semak klien: jika ada, tambah kebenaran `rujukan:urus` atau endpoint
awam khusus (hanya id+nama). **(P1-diperiksa)**

---

## 3. Kerja sisa Fasa 5 (didokumenkan, bukan keperluan kritikal)

| Item | Kesan | Potensi langkah awal |
|------|-------|----------------------|
| ~~Pindah logik ke `controllers/`~~ | **Selesai 2026-09-25** — 48 handler dipindah (salinan AST); 180/180 respons GET (5 peranan) identik dengan versi sebelum; E2E 21/21 | — |
| ~~Piawai `{ error }` vs `{ message }`~~ | **Selesai** | §2.5 |
| Skrip migrasi pukal bcrypt | Pengguna tidak bertindak hilang | §1.2 |
| Polisi purge `is_deleted` | Saiz DB | §2.1 |

---

## 4. Ringkasan langkah yang disyorkan (ikut keutamaan)

1. **[x] [P1] §1.4 + §2.3** — sumber kebenaran UI kini `users/me`; token
   direvisi dan dicabut selepas perubahan kata laluan/role/staff/syarikat.
2. **[x] [P1] §2.6** — audit klien `GET /api/roles` sebelum login selesai; tiada
   penggunaan pra-login yang memerlukan endpoint awam.
3. **[x] [P1] §2.5** — ralat `{ error }`, berjaya `{ message }`.
4. **[x] [P2] §2.2** — penerima ikut kebenaran + fallback pentadbir.
5. **[ ] [P2] §1.5 / §2.1** — flush-cache kebenaran & toolbar purge.
6. **[ ] [P3] §2.4** — nibble penamaan jadual serentak dengan spec E2E.