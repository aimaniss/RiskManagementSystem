# AGENTS.md — Sistem Pengurusan Risiko (RMS)

Arahan projek untuk agen AI (opencode) yang bekerja pada repositori ini.
Baca fail ini dahulu sebelum membuat sebarang perubahan kod. Rujukan penuh:
`README.md` (docs user, seni bina, ER diagram, API endpoint).

## Gambaran Projek

Sistem web pengurusan risiko korporat untuk **UKM Holdings** — daftar, nilai,
pantau, dan luluskan risiko merentasi beberapa subsidiari. Termasuk RBAC,
aliran kerja pindaan (kelulusan), notifikasi, jejak audit, dan laporan PDF.

**Monorepo** — dua aplikasi berasingan dalam satu repositori:

```
RiskManagementSystem/
├── risk_backend/    # REST API Express.js (port 5001)
├── risk_frontend/   # SPA React + Vite (port 5175)
├── AGENTS.md        # fail ini
└── README.md        # dokumentasi penuh sistem
```

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
- Senarai jadual/routes utama: `auth, users, roles, syarikat, bahagian,
  risiko, tahun, rawatan, pemantauan-risiko, pindaan, log_aktiviti, laporan,
  dashboard, notifikasi` (didaftarkan dalam `server.js`).
- Gaya fail: `routes/<nama>.js` sahaja daftar endpoint + panggil controller;
  `controllers/` untuk logik; `utils/` untuk utiliti dikongsi.
- **SQL parameterized** sentiasa: `pool.query("... $1 ...", [nilai])`. Jangan
  interpolate string SQL secara langsung.
- Auth: gunakan `verifyToken` dan `authorizeRoles(...namaPeranan)` dari
  `middleware/authMiddleware.js`. `req.user` mengandungi
  `{ pengguna_id, staff_id, nama_penuh, peranan_id, nama_peranan, syarikat_id }`.
  Nama peranan yang dibandingkan ialah bentuk **Title Case**: `"Admin"`,
  `"Executive"`, `"Ketua Subsidiari"`, `"Staff"`, `"Viewer"`.
- Log tindakan: `catatAktiviti(pengguna_id, aktiviti, ringkasan, perincian)`
  dari `utils/catatAktiviti.js` — **parameter posisi**, bukan objek.
- Notifikasi: `hantarNotifikasi`, `hantarNotifikasiBulk`,
  `dapatkanPenggunaIdByPeranan` dari `utils/notifikasi.js`.
- Migrasi knex dalam `risk_backend/migrations/knex/` (config: `knexfile.js`).
- Mesej ralat API & respons pengguna dalam **Bahasa Melayu**, format JSON
  `{ error: "..." }`.
- Tiada suite ujian dikonfig; `npm test` hanya echo error.

## Konvensyen Frontend (`risk_frontend`)

- React 19 + Vite 7 + React Router 7. Alias import: `@` → `./src`.
- Axios instance: `src/api/api.js` (auto-attach JWT dari `localStorage.token`)
  dengan `baseURL: VITE_API_URL || http://localhost:5001/api`.
- Auth/RBAC di klien: `src/hooks/useAuth.js` — role uppercase (`ADMIN`,
  `EXECUTIVE`, `KETUA SUBSIDIARI`, `STAFF`, `VIEWER`), helper `isAdmin()`,
  `canEdit()`, `isRestrictedRole()`, `hasRole()`.
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
- `server.js` tidak menyebut `bahagian` route dengan prefix `/api/bahagian`
  — semua prefix didaftarkan di `server.js`; daftarkan route baru di sana.
- Jangan ganggu `verifiedToken`/auth flow tanpa ujian penuh — ia teras keselamatan.
- Skor risiko: `skor_risiko` bersifat derived (R/S/T/ST) dari
  kebarangkalian × impak — jangan ubah pengiraan tanpa menyemak
  `src/constants/riskMatrix.js` dan sisi backend.