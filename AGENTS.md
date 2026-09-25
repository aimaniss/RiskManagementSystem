# AGENTS.md — Sistem Pengurusan Risiko (RMS)

Arahan projek untuk agen AI (opencode) yang bekerja pada repositori ini.
Baca fail ini dahulu sebelum membuat sebarang perubahan kod. Rujukan penuh:
`README.md` (docs user, seni bina, ER diagram, API endpoint).

## Mesti Dibaca Dahulu (Every Session)

1. **`PROGRESS.md`** — status projek, kemajuan, dan to-do terkini
   (single source of truth). **WAJIB** dibaca sebelum mula kerja dan dikemas
   kini (`[x]` + tambah log) setiap kali selesai/mula tugasan.
2. Fail ini (`AGENTS.md`).
3. Dokumen revamp: `docs/pipeline/09-PLAN-revamp.md` (status revamp v2) dan
   `docs/pipeline/10-PLAN-lanjutan.md` (kerja lanjutan P1–P3) jika menyentuh
   transaksi, RBAC/kebenaran, atau soft-delete.

> `PROGRESS.md` dan `AGENTS.md` dimuatkan automatik oleh opencode melalui
> `instructions` dalam `opencode.json`.

## Gambaran Projek

Sistem web pengurusan risiko korporat untuk **UKM Holdings** — daftar, nilai,
pantau, dan luluskan risiko merentasi beberapa subsidiari. Termasuk RBAC,
aliran kerja pindaan (kelulusan), notifikasi, jejak audit, dan laporan PDF.

**Monorepo** — dua aplikasi berasingan dalam satu repositori:

```
RiskManagementSystem/
├── risk_backend/    # REST API Express.js (port 5001)
├── risk_frontend/   # SPA React + Vite (port 5175)
├── risk_mcp/        # MCP server "rms-boost" (imbas codebase, sifar kebergantungan)
├── docs/pipeline/   # flow architecture system by module & general
├── AGENTS.md        # fail ini
└── README.md        # dokumentasi penuh sistem
```

## MCP & Dokumentasi Pipeline

- **`risk_mcp/`** — MCP server `rms-boost` (didaftar di `opencode.json`, sifar
  kebergantungan). Tool: `rms_scan`, `rms_struktur`, `rms_endpoints`,
  `rms_skema`, `rms_frontend`, `rms_konfig`, `rms_cari`, `rms_flow`.
  Guna untuk mengesahkan senarai endpoint/jadual/laluan secara langsung dari
  kod (sebelum menulis kod baru yang menyentuh seni bina).
- **Agent `rms-architect`** (`.opencode/agent/rms-architect.md`) — imbas codebase
  + jana/kemas kini `docs/pipeline/*.md`.
- **`docs/pipeline/`** — flow architecture mengikut modul dan general
  (`README.md` = indeks & cara buat semula). Sumber kebenaran bagi aliran
  frontend↔backend↔DB.

## Arahan Menjalankan

```bash
# Backend (terminal 1)
cd risk_backend
npm install
cp .env.example .env   # isi kredensial PostgreSQL
npm run dev            # http://localhost:5001

# Frontend (terminal 2)
cd risk_frontend
npm install
npm run dev            # http://localhost:5175
```

Frontend proxikan `/api` → `http://localhost:5001` (lihat `vite.config.js`).
`VITE_BACKEND_URL` / `VITE_API_URL` boleh override backend URL.

### Migrasi DB

```bash
cd risk_backend
npm run migrate          # knex migrate:latest
npm run migrate:rollback # knex migrate:rollback
npm run migrate:status
```

## Konvensyen Backend (`risk_backend`)

- **ES Modules** (`"type": "module"`, import/export, bukan require).
- **Format**: Prettier (`risk_backend/.prettierrc.json` — petikan berganda,
  semicolon, inden 2, lebar 100). Jalankan `npm run format` selepas ubah kod;
  `npm run format:check` mesti lulus.
- **Tiada emoji/ikon** dalam kod, komen, log atau mesej API. Komen terangkan
  *kenapa*, bukan sejarah perubahan (jangan tulis "DIKEMASKINI", "Kekal Sama",
  "PERUBAHAN DI SINI"); sejarah ada dalam git.
- Senarai jadual/routes utama: `auth, users, roles, syarikat, bahagian,
  risiko, tahun, rawatan, pemantauan-risiko, pindaan, log_aktiviti, laporan,
  dashboard, notifikasi` (didaftarkan dalam `server.js`).
- Gaya fail: `routes/<nama>.js` sahaja daftar endpoint + panggil controller;
  `controllers/<nama>Controller.js` untuk logik (handler dieksport bernama BM,
  cth. `senaraiRisiko`, `luluskanPindaan`); `utils/` untuk utiliti dikongsi.
  JANGAN tulis handler inline dalam `routes/`.
- **SQL parameterized** sentiasa: `pool.query("... $1 ...", [nilai])`. Jangan
  interpolate string SQL secara langsung.
- **Transaksi**: operasi tulis berbilang-jadual WAJIB balut dengan
  `dalamTransaksi(fn)` dari `utils/transaksi.js` (BEGIN/COMMIT/ROLLBACK).
  `catatAktiviti`/notifikasi dipanggil **SELEPAS COMMIT** (luar transaksi).
- **Auth**: gunakan `verifyToken` diikuti `authorizeKebenaran(...kebenaran)`
  dari `middleware/authMiddleware.js`. `req.user` mengandungi
  `{ pengguna_id, staff_id, nama_penuh, peranan_id, nama_peranan, syarikat_id }`.
  `verifyToken` menapis pengguna `is_deleted=true`; `authorizeKebenaran` LULUS
  jika pengguna miliki ≥1 daripada senarai (OR). `authorizeRoles(...)` MASIH
  dieksport tetapi JANGAN guna pada route baharu.
- **Kebenaran (17)**: `risiko:daftar`, `risiko:lihat`, `risiko:nilai`,
  `risiko:lulus`, `risiko:padam`, `rawatan:urus`, `pemantauan:urus`,
  `pindaan:urus`, `pindaan:lihat`, `pindaan:lulus`, `pengguna:urus`,
  `log:baca`, `log:padam`, `notifikasi:urus`, `laporan:jana`,
  `dashboard:lihat`, `rujukan:urus`. Jumlah per peranan: Admin 17, Executive 14,
  Ketua Subsidiari 11, Staff 9, Viewer 5.
- **Soft-delete**: TIADA `DELETE FROM` dalam kod aplikasi. Semua "padam" =
  `UPDATE <jadual> SET is_deleted = true, deleted_at = NOW()`. Semua query
  pembacaan menapis `is_deleted = false`.
- **Kata laluan**: bcrypt melalui `utils/katalaluan.js`
  (`hashKatalaluan`, `sahkanKatalaluan` — sokongan fallback legasi +
  rehash-on-login, `perluRehash`). Jangan simpan/banding plain-text.
- Log tindakan: `catatAktiviti(pengguna_id, aktiviti, ringkasan, perincian)`
  dari `utils/catatAktiviti.js` — **parameter posisi**, bukan objek.
- Notifikasi: `hantarNotifikasi`, `hantarNotifikasiBulk`,
  `dapatkanPenerimaIkutKebenaran(["pindaan:lulus"], { kecuali: [pelaku] })` dari
  `utils/notifikasi.js`. Pilih penerima ikut **kebenaran**, bukan nama peranan;
  hanya pengguna `is_deleted=false`; fallback kepada pentadbir (`pengguna:urus`)
  bila tiada pemegang kebenaran.
- Migrasi knex dalam `risk_backend/migrations/knex/` (config: `knexfile.js`).
- Mesej ralat API & respons pengguna dalam **Bahasa Melayu**. Ralat (4xx/5xx)
  SENTIASA `{ error: "..." }`; `{ message }` hanya untuk respons berjaya.
  Klien baca `err.response?.data?.error`.
- Tiada suite unit dikonfig; E2E melalui Playwright — lihat root `e2e/README.md`
  (`npm run test:e2e` dari root khas `e2e/`).

## Konvensyen Frontend (`risk_frontend`)

- React 19 + Vite 7 + React Router 7. Alias import: `@` → `./src`.
- Axios instance: `src/api/api.js` (auto-attach JWT dari `localStorage.token`)
  dengan `baseURL: VITE_API_URL || http://localhost:5001/api`.
- Auth/RBAC di klien: `src/hooks/useAuth.js` — role uppercase (`ADMIN`,
  `EXECUTIVE`, `KETUA SUBSIDIARI`, `STAFF`, `VIEWER`), helper `isAdmin()`,
  `canEdit()`, `isRestrictedRole()`, `hasRole()`. Selepas P1: helper
  `hasKebenaran(...)`, `getKebenaran()` menggunakan snapshot `kebenaran` daripada
  `GET /api/users/me`; token JWT tidak lagi membawa array kebenaran
  (`MATRIX_KEBENARAN` hanya fallback token lama). `isAdmin()` =
  `hasKebenaran("pengguna:urus")`; `canEditPenilaian()` =
  `hasKebenaran("risiko:nilai")`; `canEdit()` = `hasKebenaran("risiko:daftar")`.
  Re-export lengkap di `src/utils/auth.js`.
- Laluan terlindung: `components/ProtectedRoute.jsx`.
- Komponen UI: guna komponen sedia ada dalam `src/components/ui/`
  (button, dialog, select, card, toast, dsb.) — jangan cipta komponen baru jika
  ada yang sesuai.
- Setiap modul: folder `src/pages/<Nama>/` dengan fail utama + modal berkaitan.
- Teks UI dalam **Bahasa Melayu**. Guna `src/constants/riskMatrix.js` untuk
  matriks skor R/S/T/ST dan `src/utils/formatters.js` untuk pemformatan.
- Styling: Tailwind CSS 4 + class `shadcn/ui` (cva, clsx, tailwind-merge).

## Peranan & Data Isolation

| peranan_id | nama_peranan | Skop data |
|-----------|--------------|-----------|
| 1 | Admin | Semua, penuh CRUD, kelulusan pindaan |
| 2 | Executive | Semua syarikat (lihat + pindaan) |
| 3 | Ketua Subsidiari | Syarikat sendiri sahaja |
| 4 | Staff | Syarikat sendiri sahaja |
| 5 | Viewer | Semua (baca sahaja) |

Ketua subsidiari & Staff hanya lihat/sunting rekod `syarikat_id` mereka sendiri;
Admin & Executive lihat semua. Pastikan setiap query risiko menghormati kawalan
ini (klausa `WHERE syarikat_id` untuk peranan terhad).

## Gotchas / Amaran

- `.env` dalam `risk_backend/` adalah **gitignored**. Jangan commit kredensial.
  Rujuk `.env.example` untuk variabel yang diperlukan.
- Semua prefix route didaftarkan di `server.js` (`/api/auth`, `/api/users`,
  `/api/roles`, `/api/syarikat`, `/api/bahagian`, `/api/risiko`, `/api/tahun`,
  `/api/rawatan`, `/api/pemantauan-risiko`, `/api/pindaan`, `/api/log_aktiviti`,
  `/api/laporan`, `/api/dashboard`, `/api/notifikasi`) — daftarkan route baharu
  di sana.
- Jangan ganggu `verifyToken`/auth flow tanpa ujian penuh — ia teras keselamatan.
- Kebenaran UI diambil daripada `GET /api/users/me` dan disegarkan oleh
  `AppLayout`; backend mengesahkan `token_dikemaskini_at` untuk mencabut token
  selepas perubahan kata laluan/role/syarikat.
- Skor risiko: `skor_risiko` bersifat derived (R/S/T/ST) dari
  kebarangkalian × impak — jangan ubah pengiraan tanpa menyemak
  `src/constants/riskMatrix.js` dan `risk_backend/utils/matriksRisiko.js`
  (`kiraTahapRisiko` — satu-satunya matriks di server).
- Hanya opencode/agent yang dibenarkan commit apabila **diminta eksplisit**.

## Konvensyen Commit

- **Semua mesej commit dalam Bahasa Inggeris** (English), bukan Bahasa Melayu.
- Ikut corak `type(scope): subject` ala Conventional Commits:
  `feat(...)`, `fix(...)`, `style(...)`, `refactor(...)`, `docs(...)`,
  `test(...)`, `chore(...)`, `perf(...)`.
- Subject pendek, imperatif: `feat: add transaction helper`, bukan
  `menambah helper`.
- Jangan commit kredensial/`.env`; stage hanya fail yang berkaitan.