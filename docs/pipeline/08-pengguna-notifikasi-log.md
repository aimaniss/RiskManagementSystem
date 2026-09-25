# 08 — Pengguna, Notifikasi & Log Aktiviti

## Tujuan

Mengurus pengguna & profil (Admin), data rujukan (roles, syarikat, bahagian),
mekanik notifikasi merentas modul, dan jejak audit `log_aktiviti`.

## Aliran Urus Pengguna

```mermaid
sequenceDiagram
  autonumber
  participant A as Admin
  participant U as UrusPengguna.jsx
  participant B as routes/users.js & roles.js & syarikat.js
  participant DB as DB (pengguna, peranan, syarikat)

  A->>U: Buka Urus Pengguna
  U->>B: GET /api/roles, GET /api/syarikat, GET /api/users
  B-->>U: Pemilihan role/syarikat + senarai pengguna
  A->>U: Tambah / Edit pengguna (staff_id, nama, role, syarikat, katalaluan, gambar)
  U->>B: POST /api/users (upload.single gambar) | PUT /api/users/:id
  U->>B: DELETE /api/users/:id (pengguna:urus)
  B->>DB: INSERT/UPDATE pengguna (padam = soft-delete) + catatAktiviti
```

- `PUT /api/users/:id` mengemas kini `token_dikemaskini_at = NOW()` jika kata
  laluan, `staff_id`, `peranan_id` atau `syarikat_id` berubah → token lama
  pengguna itu dicabut (`401`) dan dia perlu log masuk semula.

### Profil Sendiri

- `navbar.jsx` menarik `GET /users/me`; kemaskini profil menerusi
  `PUT /users/me` dengan `upload.single("gambar_profil")` (multer).
- `GET /users/me` & `PUT /users/me` — dibuka kepada semua (verifyToken sahaja).
- `GET /users/me` memulangkan profil + **array `kebenaran` terkini** (sumber
  kebenaran UI; dimuat semula oleh `AppLayout` pada mount/focus/60s).
- `PUT /users/me` dengan kata laluan baharu → `token_dikemaskini_at` dikemas
  kini; navbar memadam token dan mengarahkan ke `/login`.

## Endpoint

| Kaedah | Laluan | Middleware | Modul |
|--------|--------|------------|-------|
| POST | `/api/auth/login` | — (awam) | Auth |
| POST | `/api/auth/logout` | `verifyToken` | Auth |
| PUT | `/api/auth/tukar-katalaluan` | `verifyToken` | Auth (cabut token lama) |
| GET | `/api/users/` | `verifyToken, pengguna:urus` | Urus Pengguna |
| GET | `/api/users/me` | `verifyToken` | Profil + `kebenaran` |
| PUT | `/api/users/me` | `verifyToken, upload` | Profil |
| POST | `/api/users/` | `verifyToken, pengguna:urus, upload` | Urus Pengguna |
| PUT | `/api/users/:id` | `verifyToken, pengguna:urus, upload` | Urus Pengguna |
| DELETE | `/api/users/:id` | `verifyToken, pengguna:urus` | Urus Pengguna (soft-delete) |
| GET | `/api/roles/` | `verifyToken, pengguna:urus` | Rujukan |
| GET | `/api/syarikat/` | `verifyToken` (RBAC-filtered) | Rujukan |
| GET | `/api/bahagian/` | `verifyToken` | Rujukan |
| POST | `/api/bahagian/` | `verifyToken, rujukan:urus` | Rujukan (DaftarRisiko tambah bahagian) |
| GET | `/api/log_aktiviti/` | `verifyToken, log:baca` | Jejak audit |
| DELETE | `/api/log_aktiviti/:id` | `verifyToken, log:padam` | Jejak audit (soft-delete) |
| DELETE | `/api/log_aktiviti/` | `verifyToken, log:padam` | Jejak audit (soft-delete) |
| GET | `/api/notifikasi/` | `verifyToken` | Notifikasi |
| GET | `/api/notifikasi/unread-count` | `verifyToken` | Notifikasi |
| PUT | `/api/notifikasi/:notifikasi_id/baca` | `verifyToken` | Notifikasi |
| PUT | `/api/notifikasi/baca-semua` | `verifyToken` | Notifikasi |
| DELETE | `/api/notifikasi/:notifikasi_id` | `verifyToken` | Notifikasi |

## Notifikasi

- **Utiliti**: `utils/notifikasi.js` →
  `hantarNotifikasi(pengguna_id, tajuk, mesej, jenis, entiti_id)`,
  `hantarNotifikasiBulk(pengguna_ids[], ...)`,
  `dapatkanPenggunaIdByPeranan("Admin", ...)`.
- **UI**: `navbar.jsx` — badge unread (`/notifikasi/unread-count`), senarai
  drop-down (`/notifikasi?limit=15`), tandai baca, baca-semua, padam.
- Digunakan dalam pindaan (kepada pelulus & pemohon), kelulusan risiko,
  dan tugasan.

## Log Aktiviti (Jejak Audit)

- **Utiliti**: `utils/catatAktiviti.js` →
  `catatAktiviti(pengguna_id, aktiviti, ringkasan, perincian)` — parameter
  **posisi**, menulis ke `log_aktiviti`, ralat ditekan (hanya log).
- **UI**: `LogAktiviti/LogAktiviti.jsx` — GET `/log_aktiviti` (params tapisan,
  guna role & syarikat filter), GET `/roles`/`/syarikat` untuk penapis, DELETE
  `/log_aktiviti/:id` & DELETE `/log_aktiviti` (Admin).

## Jadual DB Disentuh

`pengguna`, `peranan`, `syarikat`, `bahagian`, `notifikasi`, `log_aktiviti`.

## RBAC

| Tindakan | Admin | Executive | Ketua Subsidiari | Staff | Viewer |
|----------|-------|-----------|------------------|-------|--------|
| Urus pengguna | ✔ | ✘ | ✘ | ✘ | ✘ |
| Lihat/profil sendiri | ✔ | ✔ | ✔ | ✔ | ✔ |
| Padam / lihat log aktiviti | ✔ | ✔ (lihat) | ✔ (lihat) | ✔ (lihat) | ✔ (lihat) |
| Tandai notifikasi | ✔ | ✔ | ✔ | ✔ | ✔ |

## Nota / Gotcha

- **Multer**: muat naik gambar profil guna `upload.single("gambar_profil")` —
  endpoint users memerlukan `multipart/form-data`.
- `DELETE /log_aktiviti/` (tanpa id) soft-delete pukal dengan `params` penapis;
  perlu `log:padam` (Admin).
- Roles/syarikat dipakai sebagai penapis di LogAktiviti — pastikan senarai
  sentiasa dimuat sebelum paparan.