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
| GET | `/api/pindaan/risks-for-amendment` | `verifyToken` | Senarai risiko layak dipinda |
| POST | `/api/pindaan/:risk_id` | `verifyToken, pindaan:urus` | Mohon pindaan (pemegang `pindaan:lulus` lulus terus) |
| GET | `/api/pindaan/` | `verifyToken, authorizeRoles("Admin","Executive")` | Senarai permohonan |
| GET | `/api/pindaan/stats` | `verifyToken, authorizeRoles("Admin")` | Statistik |
| PUT | `/api/pindaan/:pindaan_id/approve` | `verifyToken, authorizeRoles("Admin")` | Lulus (apply ke risiko) |
| PUT | `/api/pindaan/:pindaan_id/reject` | `verifyToken, authorizeRoles("Admin")` | Tolak |

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
- UI `Pindaan.jsx`: Admin & Executive (`PERANAN_PELULUS`) melihat statistik,
  tapisan syarikat dan lajur Pemohon yang sama.
- Notifikasi "Permohonan Pindaan Baru" dihantar kepada **semua pemegang
  `pindaan:lulus`** kecuali pemohon — `dapatkanPenerimaIkutKebenaran(["pindaan:lulus"], { kecuali })`
  (fallback pentadbir bila tiada). Keputusan dimaklumkan kepada pemohon.