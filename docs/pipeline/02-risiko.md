# 02 — Risiko: Daftar & Senarai

## Tujuan

Daftar risiko baharu (pengenalpastian → penilaian → status) dan senarai risiko
yang boleh ditapis, diedit, diluluskan/ditolak, dan dipadam.

## Aliran Daftar Risiko

```mermaid
sequenceDiagram
  autonumber
  participant U as Pengguna
  participant D as DaftarRisiko.jsx
  participant B as routes/risiko.js → risikoController
  participant DB as DB (risiko, punca_risiko, kesan_risiko, syarikat)

  U->>D: Isi form (tahun, separuh tahun, syarikat, kategori, bahagian, risiko, skor K×I, punca[], kesan[])
  D->>D: Semak duplikasi → GET /risiko/check-duplicate?no_rujukan=...
  D->>B: POST /api/risiko (verifyToken)
  B->>DB: INSERT risiko + INSERT punca_risiko[] + INSERT kesan_risiko[]
  B->>DB: catatAktiviti(pengguna_id, "Daftar Risiko", ...)
  DB-->>B: row
  B-->>D: 201 { risiko }
  D->>U: Toast berjaya → kembali ke SenaraiRisiko
```

**Endpoint terlibat** (semua `verifyToken`):

| Kaedah | Laluan | Guna |
|--------|--------|------|
| POST | `/api/risiko/` | Daftar risiko baru (pengenalpastian + penilaian) |
| GET | `/api/risiko/` | Senarai risiko (tapis: `tugasan=true`, `syarikat_id`, tahun, dll.) |
| GET | `/api/risiko/tahun` | Tahun tersedia (juga `routes/tahun.js`) |
| GET | `/api/risiko/check-no-rujukan/:noRujukan` | Semak no. rujukan |
| GET | `/api/risiko/check-duplicate` | Semak duplikasi sebelum daftar |
| GET | `/api/risiko/:risiko_id/rawatan` | Rawatan bagi risiko |
| PUT | `/api/risiko/:risiko_id` | Kemas kini (penilaian, pengenalpastian, rawatan, log) |
| PUT | `/api/risiko/:risiko_id/pemantauan/log/:log_id` | Kemas kini log pemantauan |
| PUT | `/api/risiko/:risiko_id/approve` | Lulus (Admin/Executive, `authorizeRoles`) |
| PUT | `/api/risiko/:risiko_id/reject` | Tolak (Admin/Executive) |
| DELETE | `/api/risiko/:risiko_id` | Padam (Admin) |

**Fail frontend**: `DaftarRisiko/DaftarRisiko.jsx`, `SenaraiRisiko/*`:

| Halaman/Komponen | API |
|------------------|-----|
| `SenaraiRisiko.jsx` | GET `/risiko` (hook `useRisks`), DELETE `/risiko/:id`; klik baris → `/risiko/:id` |
| `ButiranRisiko/ButiranRisiko.jsx` (`/risiko/:id?tab=&sunting=1`) | GET `/risiko/:risiko_id`, GET `/pemantauan-risiko/:id/sejarah`, GET `/log_aktiviti?carian=<no_rujukan>` (tab Sejarah) |
| `components/risiko/BorangPengenalpastian.jsx` | PUT `/risiko/:risiko_id` (payload penuh `payloadKemaskiniRisiko`) |
| `components/risiko/BorangPenilaian.jsx` | Pertama: PUT `/rawatan/penilaian/:id`; pinda: PUT `/risiko/:id` |

### Halaman butiran risiko (revamp UI, `11-PLAN-ui-revamp.md`)

- Pengepala ringkasan (No. rujukan, tahap semasa, status kelulusan) +
  **stepper** Daftar → Kelulusan → Penilaian → Rawatan → Pemantauan
  (`kiraPeringkat` dalam `components/risiko/data.js`) + "Tindakan seterusnya".
- Tab Ringkasan · Penilaian · Rawatan · Pemantauan · Sejarah; sunting dalam tab
  (`?sunting=1`), log pemantauan sebagai garis masa + panel sisi.
- Pinda terus (pengenalpastian, penilaian, rawatan sedia ada, semua log) =
  `pindaan:lulus` (Admin/Executive). Penilaian pertama = `risiko:nilai` atau
  `rawatan:urus`; rawatan pertama = `rawatan:urus`; log = `pemantauan:urus`
  (bukan Admin/Executive: log terkini sahaja; tanpa `risiko:nilai`: status &
  catatan sahaja). Padam log = Admin/Executive.
- `PUT /risiko/:id` menulis semula semua medan — sentiasa guna
  `payloadKemaskiniRisiko` (borang lama menghantar `syarikat` bukan
  `syarikatId` dan gagal).

## Pengasingan Syarikat

`PUT/DELETE /api/risiko/:risiko_id`, `GET/PUT /:risiko_id/rawatan` dan
`PUT /:risiko_id/pemantauan/log/:log_id` dilindungi `hadSyarikat(...)`
(`middleware/aksesSyarikat.js`): Staff & Ketua Subsidiari `403` untuk risiko
syarikat lain. Daftar risiko (`POST`) menyemak `syarikatId` dalam controller.

## Skor & Status Risiko

- `skor_kebarangkalian` (1–5) × `skor_impak` (1–5) → `skor_risiko` =
  **R**endah /*S**ederhana / **T**inggi / **ST**inggi (sangat tinggi).
  Matriks: `src/constants/riskMatrix.js` (klien) & `utils/matriksRisiko.js`
  (`kiraTahapRisiko`, server — dikongsi risiko/pemantauan/pindaan).
- `status_risiko` (string) digunakan dalam aliran kelulusan & SENARAI TUGASAN
  (`?tugasan=true`).

## Kelulusan Risiko

- `SenaraiTugasan.jsx` memanggil `GET /risiko?tugasan=true` (dan
  `GET /pindaan?tugasan=true`).
- `SenaraiTugasanDetailModal.jsx` → `PUT /risiko/:id/approve` (hantar body
  {sebab}/{komen} bila reject) — butang hanya untuk ADMIN/EXECUTIVE
  (`canEditPenilaian`).
- Reject: `PUT /risiko/:id/reject` dengan `{ sebab: adminComment }`.

## Jadual DB Disentuh

`risiko` (PK `risiko_id`, FK `syarikat_id`, `created_by`), `punca_risiko`
(`risiko_id`, `punca`), `kesan_risiko` (`risiko_id`, `kesan`), `syarikat`,
`log_aktiviti` (audit).

## RBAC

| Tindakan | Admin | Executive | Ketua Subsidiari | Staff | Viewer |
|----------|-------|-----------|------------------|-------|--------|
| Lihat (semua syarikat) | ✔ | ✔ | ✘ (syarikat sendiri) | ✘ (syarikat sendiri) | ✔ |
| Daftar / Edit | ✔ | ✔ | ✔ (sendiri) | ✔ (sendiri) | ✘ |
| Lulus / Tolak | ✔ | ✔ | ✘ | ✘ | ✘ |
| Padam | ✔ | ✘ | ✘ | ✘ | ✘ |

## Nota / Gotcha

- `routes/tahun.js` dan beberapa query merujuk jadual `daftar_risiko`, manakala
  migrasi skema mencipta `risiko` — percanggahan nama yang perlu diawasi.
- Admin Auto-Lulus tidak terpakai di sini; kelulusan risiko manual oleh
  Admin/Executive.
- Isolasi data: query `risiko` mesti guna `syarikat_id` dari `req.user` untuk
  Staff/Ketua Subsidiari.