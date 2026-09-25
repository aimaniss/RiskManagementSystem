# 05 — Pindaan (Workflow Kelulusan)

## Tujuan

Aliran kerja pindaan data risiko: pemohon mohon perubahan, sistem cipta
permohonan dengan data **sebelum/selepas**, admin menyemak perbandingan lalu
**melulus atau menolak**.

## Aliran Mohon → Lulus / Tolak

```mermaid
sequenceDiagram
  autonumber
  participant U as Pengguna (Staff/Ketua/Executive)
  participant P as Pindaan.jsx / MohonPindaanModal.jsx
  participant B as routes/pindaan.js → pindaanController
  participant A as Admin
  participant D as DB (permohonan_pindaan, risiko)

  U->>P: Buka "Mohon Pindaan" → senarai risiko layak
  P->>B: GET /api/pindaan/risks-for-amendment
  B-->>P: Risiko yang boleh dipinda
  U->>P: Kemas kini medan + justifikasi
  P->>B: POST /api/pindaan/:risk_id { data_selepas, justifikasi }
  B->>B: Jika pemohon ada pindaan:lulus (Admin/Executive) → lulus terus; jika lain → Menunggu
  B->>D: INSERT permohonan_pindaan (data_sebelum = risiko semasa, data_selepas)
  B->>D: hantarNotifikasiBulk → pemegang pindaan:lulus (kecuali pemohon)
  B-->>P: 201 { permohonan }

  A->>P: Buka senarai pindaan (admin)
  P->>B: GET /api/pindaan (Admin/Executive)
  P->>P: ComparisonView — banding sebelum vs selepas
  A->>P: Lulus / Tolak + komen
  P->>B: PUT /api/pindaan/:pindaan_id/approve | reject
  B->>B: approve → APPLY data_selepas ke risiko + status Diluluskan
  B->>D: hantarNotifikasi → pemohon; catatAktiviti
  B-->>P: 200 { status }
```

## Endpoint (`routes/pindaan.js` → `controllers/pindaanController.js`)

> **Pengasingan syarikat**: endpoint ikut ID (risiko/rawatan/log) dilindungi
> `hadSyarikat(...)` (`middleware/aksesSyarikat.js`) — Staff & Ketua Subsidiari
> menerima `403` untuk rekod syarikat lain. Dikawal oleh spec E2E `12-isolasi-syarikat`.


| Kaedah | Laluan | Middleware | Guna |
|--------|--------|------------|------|
| GET | `/api/pindaan/risks-for-amendment` | `verifyToken, pindaan:urus` | Senarai risiko layak dipinda (aktif, diluluskan, sudah dinilai) |
| GET | `/api/pindaan/risiko/:risk_id` | `verifyToken, risiko:lihat, hadSyarikat` | Sejarah semua permohonan bagi satu risiko (tab Pindaan) |
| POST | `/api/pindaan/:risk_id` | `verifyToken, pindaan:urus, hadSyarikat` | Mohon pindaan (pemegang `pindaan:lulus` lulus terus; `409` jika permohonan lain masih menunggu) |
| GET | `/api/pindaan/` | `verifyToken, pindaan:lihat` | Senarai permohonan (`?status=Menunggu Kelulusan|Diluluskan|Ditolak|Sejarah|Semua`, `?syarikat_id`); termasuk `nama_pelulus` |
| GET | `/api/pindaan/stats` | `verifyToken, pindaan:lulus` | Statistik |
| PUT | `/api/pindaan/:pindaan_id/approve` | `verifyToken, pindaan:lulus` | Lulus (apply ke risiko) |
| PUT | `/api/pindaan/:pindaan_id/reject` | `verifyToken, pindaan:lulus` | Tolak (`{ komen_pelulus }` → `sebab_ditolak`) |

**Satu borang pindaan**: tab **Pindaan** di `/risiko/:id` (`?tab=pindaan&sunting=1`)
memaparkan `components/risiko/BorangPindaan.jsx` — skor penilaian dan (jika log
terkini ada skor) skor keberkesanan, satu justifikasi wajib dan ringkasan perubahan.
Butang "Pinda" (pemegang `pindaan:lulus`, lulus terus) / "Mohon Pindaan"
(Staff/Ketua Subsidiari) di tab Penilaian & Pindaan membuka borang ini.
Butang "Mohon Pindaan" di halaman `/Pindaan` membuka `PilihRisikoPindaan` (dialog
carian risiko) lalu ke borang yang sama. `GET /api/risiko/:id` memulangkan
`pindaan_terkini` untuk banner "menunggu kelulusan" / "ditolak".

**Fail frontend**:

| Komponen | API |
|----------|-----|
| `Pindaan/Pindaan.jsx` | GET `/syarikat`, GET `/pindaan/stats`, GET `/pindaan` — tab "Menunggu Kelulusan" / "Sejarah" (tapis keputusan & syarikat), kad statistik boleh diklik |
| `Pindaan/PilihRisikoPindaan.jsx` | GET `/pindaan/risks-for-amendment` (dialog pilih risiko) |
| `components/risiko/BorangPindaan.jsx` | POST `/pindaan/:risk_id` |
| `components/risiko/PanelKelulusan.jsx` | PUT `/risiko/:id/approve|reject`, PUT `/pindaan/:id/approve|reject` (panel sisi; dikongsi Senarai Tugasan & halaman Pindaan) |
| `components/risiko/KadPindaan.jsx` | Paparan satu permohonan (perubahan, justifikasi, status, pelulus) |
| `ButiranRisiko/TabPindaan.jsx` | GET `/pindaan/risiko/:id` (melalui halaman butiran) |

`SenaraiTugasan/SenaraiTugasan.jsx` memanggil `GET /pindaan?tugasan=true` dan
membuka `PanelKelulusan`.

## Status Permohonan

- `Menunggu` / `Diluluskan` / `Ditolak` — disimpan dalam `status_permohonan`.
- **Lulus terus**: bila pemohon memegang `pindaan:lulus` (Admin & Executive), permohonan
  diluluskan serta-merta (`dapatkanKebenaranPeranan(peranan_id).has("pindaan:lulus")`).

## Jadual DB Disentuh

`permohonan_pindaan` (PK `pindaan_id`, FK `risiko_id`, FK pemohon/pelulus,
`data_sebelum` JSONB, `data_selepas` JSONB, `status_permohonan`, `komen_pelulus`,
timestamps + soft-delete), `risiko` (dikemas kini bila approve), `notifikasi`,
`log_aktiviti`.

## RBAC

| Tindakan | Admin | Executive | Ketua Subsidiari | Staff | Viewer |
|----------|-------|-----------|------------------|-------|--------|
| Mohon pindaan | ✔ (lulus terus) | ✔ (lulus terus) | ✔ | ✔ | ✘ |
| Lihat permohonan (senarai) + tapis syarikat | ✔ | ✔ | ✘ | ✘ | ✘ |
| Lulus / Tolak | ✔ | ✔ | ✘ | ✘ | ✘ |

## Nota / Gotcha

- **No. rujukan `PIN-<tahun>-<0001>`** dijana dalam transaksi permohonan di bawah
  `pg_advisory_xact_lock` (jujukan setahun, termasuk rekod soft-delete supaya tidak
  diguna semula); indeks unik `permohonan_pindaan_no_rujukan_unik` (migrasi 029,
  yang turut menomborkan rekod lama ikut tarikh).
- `data_sebelum` ialah snapshot risiko semasa ketika permohonan dibuat (JSONB),
  jadi bandingan tidak bergantung pada perubahan semasa.
- Approve/reject perlu `pindaan:lulus` (Admin & Executive); reject turut
  menerima body `{ komen_pelulus }`. Permohonan oleh Admin/Executive diluluskan terus.
- Pindaan penilaian yang diluluskan turut mengemas kini `risiko.status_risiko`
  ("Perlu rawatan": R → Tidak, lain → Ya) melalui `statusRawatan()` dalam
  `utils/matriksRisiko.js`.
- Satu permohonan terbuka setiap risiko: `POST` kedua semasa `Menunggu Kelulusan`
  → `409`.
- Notifikasi pindaan menyimpan `pindaan_id` dalam `entiti_id`; `GET /api/notifikasi`
  menambah `risiko_id` supaya klik notifikasi membuka `/risiko/:id?tab=penilaian`.
  Mesej notifikasi menyebut no. rujukan pindaan.
- Notifikasi "Permohonan Pindaan Baru" dihantar kepada **semua pemegang
  `pindaan:lulus`** kecuali pemohon — `dapatkanPenerimaIkutKebenaran(["pindaan:lulus"], { kecuali })`
  (fallback pentadbir bila tiada). Keputusan dimaklumkan kepada pemohon.