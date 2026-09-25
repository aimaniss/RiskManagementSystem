# rms-boost — MCP Server untuk RMS UKM Holdings

Server MCP (Model Context Protocol) ala **Laravel Boost** untuk mengimbas
codebase **Sistem Pengurusan Risiko** UKM Holdings. Tiada kebergantungan luaran
(node_modules tidak diperlukan) — guna Node.js ≥ 18 sahaja.

## Pendaftaran

Sudah didaftarkan dalam `opencode.json` di akar repositori:

```json
{
  "mcp": {
    "rms-boost": {
      "type": "local",
      "command": ["node", "risk_mcp/index.mjs"],
      "enabled": true
    }
  }
}
```

> Selepas mengubah konfigurasi, **quit & restart opencode** supaya MCP server
> dimuatkan.

## Tool Tersedia

| Tool | Fungsi |
|------|--------|
| `rms_scan` | Imbasan penuh codebase (struktur + endpoint + jadual + laluan frontend) dalam satu panggilan |
| `rms_struktur` | Hierarki fail backend (routes/controllers/migrations/utils/middleware) & frontend (pages/components/hooks/constants/utils/api) |
| `rms_endpoints` | Semua endpoint REST API (kaedah, laluan penuh, middleware, fail sumber); boleh tapis mengikut modul |
| `rms_skema` | Jadual DB + lajur (jenis, PK, FK/rujukan, unique, index) dari migrasi Knex (termasuk `CREATE TABLE` SQL mentah) |
| `rms_frontend` | Laluan React Router + senarai pages/komponen/hooks/constants/utils |
| `rms_konfig` | Port, prefix `/api`, CORS, DB pool, middleware auth, versi pakej, Vite & Knexfile |
| `rms_cari` | Cari corak teks/regex dalam kod (node_modules dikecualikan) |
| `rms_flow` | Baca dokumen pipeline flow architecture (`docs/pipeline/`) untuk satu modul |

## Pipeline Flow Architecture

Dokumen flow arkitektur disimpan dalam `docs/pipeline/` dan dijana/diselenggara
oleh agent opencode `rms-architect` (`.opencode/agent/rms-architect.md`) yang
menggunakan tool `rms-boost` ini.

## Ujian Manual

```bash
# dari akar repositori
@'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"rms_scan","arguments":{}}}
'@ | node risk_mcp/index.mjs
```