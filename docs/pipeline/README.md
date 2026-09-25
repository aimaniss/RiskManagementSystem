# Pipeline Flow Architecture — Sistem Pengurusan Risiko (RMS)

Dokumentasi flow arkitektur sistem UKM Holdings, dijana & diselenggara dengan
tool MCP **`rms-boost`** (lokal: `risk_mcp/`) dan agent
**`rms-architect`** (`.opencode/agent/rms-architect.md`).

Setiap fail menerangkan perjalanan lengkap satu modul: UI → API → backend → DB,
termasuk RBAC, notifikasi, dan jejak audit.

## Senarai Dokumen

| Fail | Modul | Perkara utama |
|------|-------|----------------|
| `00-general.md` | General | Seni bina keseluruhan, kitaran hayat permintaan, instrumen merentas modul |
| `01-auth-rbac.md` | Autentikasi & RBAC | Login, JWT, `verifyToken`/`authorizeKebenaran` (matrix `kebenaran`), `ProtectedRoute`, data isolation |
| `02-risiko.md` | Risiko | Daftar & Senarai Risiko, pengenalpastian (punca/kesan), penilaian & skor |
| `03-rawatan.md` | Rawatan | Jenis rawatan, pelan tindakan, kakitangan, penilaian semula |
| `04-pemantauan.md` | Pemantauan | Log pemantauan, tahap rujukan, sejarah keberkesanan |
| `05-pindaan.md` | Pindaan | Mohon pindaan → perbandingan → kelulusan, JSONB sebelum/selepas |
| `06-laporan.md` | Laporan | Penapis, data API, penjanaan PDF (jsPDF di klien) |
| `07-dashboard.md` | Paparan Utama | Statistik, carta, penapis syarikat per RBAC |
| `08-pengguna-notifikasi-log.md` | Pengguna / Notifikasi / Log | CRUD pengguna, roles, syarikat, bahagian, notifikasi, log aktiviti |
| `09-PLAN-revamp.md` | PLAN Revamp v2 | Status pelaksanaan + transaksi, role matrix `kebenaran`, soft-delete, E2E |
| `10-PLAN-lanjutan.md` | PLAN Lanjutan | Aliran baharu (advisory lock, rehash, pindaan:lihat), senario P1–P3 |

## Cara Baca

1. Baca `00-general.md` dahulu untuk rangka sistem.
2. Pilih fail modul berkenaan untuk butiran aliran.
3. Guna tool MCP untuk verifikasi kod:
   - `rms_endpoints` (modul=...) — senarai endpoint sebenar.
   - `rms_skema` (jadual=...) — skema jadual.
   - `rms_frontend` / `rms_cari` — pemetaan halaman & rujukan kod.

## Cara Buat Semula / Kemas Kini

Minta agent arkitek:

> `scan codebase dan kemas kini pipeline docs` (atau sebut modul tertentu,
> contoh `kemas kini flow pindaan`).

Agent akan mengimbas codebase dengan `rms-boost`, mengesahkan fakta di kod,
dan menulis semula fail yang terjejas sahaja.

> Laluan fail: `docs/pipeline/<N>.md`. Mesyuarat `mermaid` disokong oleh
> GitHub & VS Code (extension Mermaid).