# PROGRESS.md — Status & To-Do Terkini (Sistem Pengurusan Risiko)

> **WAJIB BACA dahulu** oleh mana-mana agen AI (opencode) sebelum mula kerja.
> Fail ini single source of truth untuk **status projek, kemajuan, dan to-do
> terkini**. Kemas kini fail ini setiap kali selesai / mula tugasan.
>
> Semua mesej **commit dalam Bahasa Inggeris** (lihat `AGENTS.md`).

---

## Status Keseluruhan

| Perkara | Status |
|---------|--------|
| Aplikasi teras (backend + frontend) | ✅ Berfungsi (production) |
| MCP `rms-boost` (imbas codebase) | ✅ Siap & didaftar |
| Agent `rms-architect` | ✅ Siap & didaftar |
| Playwright MCP (E2E) | ✅ Didaftar |
| Ujian E2E Playwright | ✅ 33/33 lulus |
| Dokumentasi pipeline (00–09) | ✅ Lengkap |
| Revamp seni bina v2 (Fasa 1–4, 6-7) | ✅ **Selesai & disahkan** |
| Work lanjutan P1–P3 | ✅ P1 selesai (auth, §2.5), §2.2, §1.5 & §2.1 selesai, Fasa 5 controllers; §2.4 (P3) berbaki — lih. `docs/pipeline/10-PLAN-lanjutan.md` |

📄 Pelan revamp: `docs/pipeline/09-PLAN-revamp.md` (status pelaksanaan di atas).
📄 Cadangan lanjutan: `docs/pipeline/10-PLAN-lanjutan.md`.

---

## To-Do Revamp v2 (siap semua)

### Fasa 1 — Transaksi DB
- [x] Bina `utils/transaksi.js` (helper `dalamTransaksi` BEGIN/COMMIT/ROLLBACK)
- [x] Wrap `rawatan.js` DELETE `/:rawatan_id` (3×UPDATE kini dalam transaksi)
- [x] Wrap `users.js` POST/PUT/DELETE (tulis + log aktiviti selepas COMMIT)
- [x] Wrap `bahagian.js` POST (SELECT+INSERT dengan `pg_advisory_xact_lock`)
- [x] Pastikan `catatAktiviti`/notifikasi dipanggil SELEPAS COMMIT

### Fasa 2 — Dasar Soft-Delete Menyeluruh
- [x] Migrasi 019: `is_deleted` + `deleted_at` pada `pengguna`, `notifikasi`;
      `deleted_at` pada 11 jadual lain (015)
- [x] Ganti `DELETE FROM pengguna` (users.js) → `UPDATE is_deleted=true`
- [x] Ganti `DELETE FROM notifikasi` (notifikasi.js) → soft-delete
- [x] Ganti `DELETE FROM log_aktiviti` (log_aktiviti.js) → soft-delete
      (termasuk DELETE julat tarikh)
- [x] Ganti `DELETE FROM pelan_tindakan_rawatan/kakitangan_rawatan`
      (risiko.js PUT kemaskini) → soft-delete kanak-kanak
- [x] Ganti `DELETE FROM PelanTindakanPemantauan/KakitanganPemantauan`
      (pemantauan.js PUT log) → soft-delete kanak-kanak
- [x] Filter `is_deleted = false` pada query pengguna/notifikasi/punca/kesan/
      dashboard/laporan yang tinggal
- [x] Pastikan `verifyToken` menapis pengguna `is_deleted=true`

### Fasa 3 — Role Matrix (kebenaran / peranan_kebenaran)
- [x] Migration seed 020: `kebenaran` (16 kebenaran) + `peranan_kebenaran`
- [x] Migration 021: `pindaan:lihat` (kebenaran ke-17, Admin+Executive)
- [x] Middleware `authorizeKebenaran(...)` dalam authMiddleware
- [x] Cache kebenaran per peranan (60s, elak query setiap request)
- [x] Gantikan `authorizeRoles(...)` pada semua route sensitif (grep = 0)

### Fasa 4 — Reflektor Frontend
- [x] Padan `useAuth.js` (helper `hasKebenaran`/`getKebenaran`) dengan matrix
      kebenaran tunggal + `MATRIX_KEBENARAN` fallback
- [x] `utils/auth.js` re-export lengkap (termasuk helper baharu)

### Fasa 5 — Clean-up Arkitektur
- [x] `tahun.js` dibetulkan (`daftar_risiko` → `risiko` + `is_deleted=false`)
- [x] Bcrypt untuk kata laluan (`utils/katalaluan.js` + authController/users;
      rehash-on-login untuk legasi plain-text)
- [x] Mesej ralat BM ditingkatkan (`risiko.js`, `auth`, `users`, `tahun`)
- [x] LOGIK → `controllers/` untuk `users`, `bahagian`, `auth`
- [x] Pindah penuh logik semua modul ke `controllers/` (11 controller baharu,
      48 handler; `routes/` hanya daftar) — 2026-09-25
- [x] Satukan matriks risiko server → `utils/matriksRisiko.js` (`kiraTahapRisiko`)
- [x] Ralat API seragam `{ error }` (10-PLAN §2.5)
- [x] Buang emoji/ikon & nota perubahan gaya AI dalam kod backend
- [x] Prettier untuk backend (`npm run format` / `format:check`)
- [⚠️] Normalkan nama jadual (`LogPemantauan`, dsb.) — **sengaja tidak dibuat**
      (had didokumenkan; 10-PLAN §2.4)

### Fasa 6 — Ujian E2E (Playwright)
- [x] Spec login per peranan (5 peranan) — `e2e/tests/01-login-peranan.spec.mjs`
- [x] Spec kebenaran (dibenarkan / ditolak) — `e2e/tests/02-kebenaran.spec.mjs`
- [x] Spec rollback transaksi — `e2e/tests/03-rollback-transaksi.spec.mjs`
- [x] Spec soft-delete — `e2e/tests/04-soft-delete.spec.mjs`
- [x] Spec P1 auth/session — `e2e/tests/05-p1-auth-session.spec.mjs`
- [x] Spec penerima notifikasi (§2.2) — `e2e/tests/06-penerima-notifikasi.spec.mjs`
- [x] Spec flush cache kebenaran (§1.5) — `e2e/tests/07-flush-cache-kebenaran.spec.mjs`
- [x] Spec purge soft-delete (§2.1) — `e2e/tests/08-purge-soft-delete.spec.mjs`
- [x] Config + README + root `package.json` scripts (`npm run test:e2e`)
- [x] **Jalankan** suite end-to-end penuh — 21/21 lulus pada 2026-09-25

### Fasa 7 — Dokumentasi
- [x] Kemas kini `docs/pipeline/09-PLAN-revamp.md` (status + kriteria selesai)
- [x] Kemas kini `docs/pipeline/01-auth-rbac.md` (matrix kebenaran + bcrypt)
- [x] Bina `docs/pipeline/10-PLAN-lanjutan.md` (aliran baharu & P1–P3)
- [x] Kemas kini `AGENTS.md` (kebenaran, transaksi, soft-delete, bcrypt, E2E)
- [x] Kemas kini fail `PROGRESS.md` ini

---

### P1 Auth/Session (selesai)
- [x] Migration 022: tambah `pengguna.token_dikemaskini_at`
- [x] `verifyToken` membandingkan claim token dengan DB dan menolak token lama
- [x] `GET /api/users/me` mengembalikan `kebenaran` terkini
- [x] Frontend refresh session pada mount, focus, dan setiap 60 saat
- [x] Password change memaksa log masuk semula; role/staff/syarikat change
      mencabut token
- [x] Spec P1 E2E: `e2e/tests/05-p1-auth-session.spec.mjs`

---

## Log Kemajuan

| Tarikh | Fasa | Apa yang dilakukan |
|--------|------|--------------------|
| 2026-09-25 | — | Siapkan MCP `rms-boost`, agent `rms-architect`, dokumentasi pipeline 00–09, audit revamp v2, daftar Playwright MCP |
| 2026-09-25 | — | Bina fail ini (`PROGRESS.md`) + ikat dalam `opencode.json` instructions + konvensyen commit English |
| 2026-09-25 | 1–7 | **Revamp v2 selesai**: `utils/transaksi.js`; bcrypt (`utils/katalaluan.js`); `authorizeKebenaran` + cache 60s; migrasi 019/020/021; soft-delete menyeluruh (grep `DELETE FROM` = 0); `controllers/` untuk users/bahagian/auth; pindaan:lihat; reflektor `useAuth.js`; smoke test semua endpoint lulus; suite E2E `e2e/` disediakan; docs dikemas kini |
| 2026-09-25 | 6 | Jalankan suite E2E penuh: **21/21 lulus**; tambah `/health`, betulkan kontrak respons login, env transaksi, lifecycle pool DB, dan fixture FK log aktiviti |
| 2026-09-25 | P1 | Tambah migration 022 `token_dikemaskini_at`; `/users/me` kini sumber kebenaran UI; session refresh pada mount/focus/60s; token lama dicabut selepas role/password/staff/syarikat berubah; spec P1 E2E — suite **21/21 lulus** |
| 2026-09-25 | 5 / §2.5 | **Ralat seragam** `{ error }` (±80 respons BE + 7 halaman FE). **Refactor BE**: 48 handler dari 11 `routes/*.js` dipindah ke `controllers/*Controller.js` (salinan AST), matriks risiko 4 salinan → `utils/matriksRisiko.js`, buang kod mati. Pengesahan: 180/180 respons GET identik vs HEAD (5 peranan), lint `no-undef` bersih, E2E 21/21, build FE lulus |
| 2026-09-25 | Keselamatan | Migration 023: rehash 5 kata laluan plain-text → bcrypt + isi `token_dikemaskini_at` (lalai `NOW()`; semua pengguna log masuk semula sekali); tutup 37 kebocoran `err.message` dalam respons 5xx (buang cawangan debug SQL pindaan; tambah `console.error` yang tiada); spec 09 pengawal regresi — E2E **33/33** |
| 2026-09-25 | §2.1 | `npm run purge` (`scripts/purge.js`): buang kekal `notifikasi`/`log_aktiviti` soft-delete > 365 hari; pratonton lalai, `--laksana --oleh` (pengguna:urus), transaksi + log audit; betulkan kebocoran sambungan `config/db.js` (`pool.connect()` tanpa release); spec 08 — E2E **30/30**. Tambah peraturan AGENTS: jangan hardcode kunci API/rahsia di FE |
| 2026-09-25 | §1.5 | `POST /api/roles/flush-cache` (`pengguna:urus`) + `kosongkanCacheKebenaran()` + log aktiviti; spec 07 (kebenaran baharu hanya berkuat kuasa selepas flush; matriks dipulihkan) — E2E **27/27** |
| 2026-09-25 | §2.2 | Penerima notifikasi ikut **kebenaran** (`dapatkanPenerimaIkutKebenaran`) + fallback pentadbir; betulkan bug Executive (`pindaan:lulus`) tidak dimaklumkan permohonan pindaan baru; buang 9 komen sejarah yang tertinggal; spec 06 — E2E **25/25** |
| 2026-09-25 | 5 | **Kemas kod BE**: buang semua emoji (±110 baris) & nota "DIKEMASKINI/Kekal Sama", buang SQL mati dikomen di dashboard; pasang Prettier 3 + `.prettierrc.json` + skrip `format`/`format:check`, format semua fail `.js`. Pengesahan: 180/180 respons GET identik vs HEAD, E2E 21/21 |
| 2026-09-25 | 7 | Audit docs selepas revamp/P1: kemas kini `00-general.md` (authorizeKebenaran, `/health`, controllers), `08-pengguna-notifikasi-log.md` (kebenaran per route, soft-delete, `/users/me` + pencabutan token), `01-auth-rbac.md` (interceptor 401, nota `NULL` revision), `09` (migrasi 022), root `README.md` (respons login, endpoint auth, 22 migrasi) |

---

## Rekod / Nota

- **Migrasi sedia**: 001–023 (23 migrasi, semuanya applied; `migrate:status` = 0 pending).
- Jadual `is_deleted` + `deleted_at`: 11 jadual (migration 015) + `pengguna`,
  `notifikasi` (migration 019). Semua query pembacaan menapis `is_deleted = false`.
- `kebenaran` / `peranan_kebenaran` (migration 014 seed dalam 020/021) kini
  **aktif** — 17 kebenaran; `authorizeKebenaran` di semua route sensitif.
- Jumlah kebenaran per peranan (disahkan): Admin 17, Executive 14,
  Ketua Subsidiari 11, Staff 9, Viewer 5.
- Kata laluan: **semua** bcrypt (migration 023 menukar baki plain-text; tiada
  reset). Semua pengguna ada `token_dikemaskini_at` (lalai `NOW()`).
- `verifyToken` menolak pengguna `is_deleted=true` dan token lama melalui
  `token_dikemaskini_at`.
- Kredensial ujian E2E: `e2e/tests/helpers.mjs` (Admin UKMH001/1234, dsb.).
- Suite E2E Playwright: **33/33 lulus** pada 2026-09-25.
- `npm run build` frontend lulus; `npm run lint` masih melaporkan 49 error
  dan 9 warning sedia ada pada fail frontend yang tidak disentuh.
- Dikenal pasti & difailkan untuk lanjutan: penamaan jadual (§2.4) — rujuk
  `docs/pipeline/10-PLAN-lanjutan.md`.