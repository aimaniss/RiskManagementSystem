# E2E — Playwright (Fasa 6 revamp v2)

Suite ujian akhir-ke-akhir untuk Sistem Pengurusan Risiko UKM Holdings.

## Skop Spec

| Spec | Perkara yang disahkan |
|------|------------------------|
| `01-login-peranan.spec.mjs` | Login kelima-lima peranan (Admin/Executive/Ketua Subsidiari/Staff/Viewer), token JWT membawa array `kebenaran` dengan jumlah betul (17/14/11/9/5) |
| `02-kebenaran.spec.mjs` | Kebenaran dikuatkuasakan: API pulang `403` untuk yang tiada kebenaran; menu UI sembunyi/tunjuk per peranan |
| `03-rollback-transaksi.spec.mjs` | `dalamTransaksi` (utils/transaksi.js): ROLLBACK bila gagal / kena kekangan, COMMIT bila berjaya |
| `04-soft-delete.spec.mjs` | DELETE pengguna & log_aktiviti = soft-delete (baris kekal `is_deleted=true`, hilang dari API, pengguna padam gagal log masuk) |

## Prasyarat

- Node.js 18+
- `@playwright/test` + browser chromium (`npm install` sekali sahaja, lihat bawah)
- PostgreSQL berjalan dengan data seed (rujukan `risk_backend/.env`)

## Cara Jalankan

```bash
# 1. Install test-runner (satu kali)
npm install -D @playwright/test && npx playwright install chromium

# 2. Pastikan backend (5001) & frontend (5175) hidup — atau biarkan
#    playwright.config.mjs mulakan sendiri (reuseExistingServer: true)

# 3. Jalankan seluruh suite
npm run test:e2e        # = npx playwright test --config e2e/playwright.config.mjs

# 4. Buka laporan HTML
npm run test:e2e:report # = npx playwright show-report
```

## Nota

- Kredensial ujian diambil dari data seed sebenar (rujukan
  `e2e/tests/helpers.mjs`). Kata laluan legasi `123` akan ditukar ke bcrypt
  secara automatik (rehash-on-login).
- Spec soft-delete & rollback menulis data ujian terus ke DB (`bahagian`,
  `log_aktiviti`, `pengguna`) tetapi **membersihkan semula** artefak selepas
  ujian; rollback difailkan oleh transaksi itu sendiri.
- Laras kredensial DB dalam `e2e/db.helper.mjs` jika berbeza dari seed.