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
| GET | `/api/pindaan/risks-for-amendment` | `verifyToken, pindaan:urus` | Senarai risiko layak dipinda |
| POST | `/api/pindaan/:risk_id` | `verifyToken, pindaan:urus, hadSyarikat` | Mohon pindaan (pemegang `pindaan:lulus` lulus terus; `409` jika permohonan lain masih menunggu) |
| GET | `/api/pindaan/` | `verifyToken, pindaan:lihat` | Senarai permohonan |
| GET | `/api/pindaan/stats` | `verifyToken, pindaan:lulus` | Statistik |
| PUT | `/api/pindaan/:pindaan_id/approve` | `verifyToken, pindaan:lulus` | Lulus (apply ke risiko) |
| PUT | `/api/pindaan/:pindaan_id/reject` | `verifyToken, pindaan:lulus` | Tolak (`{ komen_pelulus }` → `sebab_ditolak`) |

**Titik masuk UI pemohon**: tab Penilaian di `/risiko/:id`
(`components/risiko/BorangPenilaian.jsx`, mod pinda) — butang "Pinda" untuk
pemegang `pindaan:lulus` (lulus terus) dan "Mohon Pindaan" untuk Staff/Ketua
Subsidiari. Justifikasi wajib. `GET /api/risiko/:id` memulangkan
`pindaan_terkini` (no. rujukan, status, sebab ditolak) supaya pemohon nampak
banner "menunggu kelulusan" / "ditolak" tanpa akses `/pindaan`. Halaman
`/Pindaan` (pindaan:lihat) kekal untuk pelulus, termasuk pindaan keberkesanan.

**Fail frontend** (`Pindaan/*`):

| Komponen | API |
|----------|-----|
| `Pindaan.jsx` | GET `/syarikat`, GET `/pindaan/stats`, GET `/pindaan/risks-for-amendment`, GET `/pindaan`, POST `/pindaan/:risikoId`, PUT (approve/reject) |
| `MohonPindaanModal.jsx` | POST `/pindaan/:risk_id` |
| `ComparisonView.jsx` | Paparan sebelum vs selepas (client dari data JSONB) |
| `PengesahanPindaanModal.jsx` | PUT `/pindaan/:id/approve` |
| `PindaanDetailsModal.jsx`, `PindaanFormModal.jsx`, `StatusBadge.jsx` | UI sokongan |

`SenaraiTugasan/SenaraiTugasan.jsx` juga memanggil `GET /pindaan?tugasan=true`
dan `SenaraiTugasanDetailModal.jsx` memanggil approve/reject pindaan.

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
- UI `Pindaan.jsx`: Admin & Executive (`PERANAN_PELULUS`) melihat statistik,
  tapisan syarikat dan lajur Pemohon yang sama.
- Notifikasi "Permohonan Pindaan Baru" dihantar kepada **semua pemegang
  `pindaan:lulus`** kecuali pemohon — `dapatkanPenerimaIkutKebenaran(["pindaan:lulus"], { kecuali })`
  (fallback pentadbir bila tiada). Keputusan dimaklumkan kepada pemohon.