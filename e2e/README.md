# E2E — Playwright (Fasa 6 revamp v2)

Suite ujian akhir-ke-akhir untuk Sistem Pengurusan Risiko UKM Holdings.

## Skop Spec

| Spec | Perkara yang disahkan |
|------|------------------------|
| `01-login-peranan.spec.mjs` | Login kelima-lima peranan (Admin/Executive/Ketua Subsidiari/Staff/Viewer), respons login mengembalikan array `kebenaran` dengan jumlah betul (17/15/12/10/5) |
| `02-kebenaran.spec.mjs` | Kebenaran dikuatkuasakan: API pulang `403` untuk yang tiada kebenaran; menu UI sembunyi/tunjuk per peranan |
| `03-rollback-transaksi.spec.mjs` | `dalamTransaksi` (utils/transaksi.js): ROLLBACK bila gagal / kena kekangan, COMMIT bila berjaya |
| `04-soft-delete.spec.mjs` | DELETE pengguna & log_aktiviti = soft-delete (baris kekal `is_deleted=true`, hilang dari API, pengguna padam gagal log masuk) |
| `05-p1-auth-session.spec.mjs` | `/users/me` memulangkan kebenaran segar; token lama ditolak selepas perubahan role/password; login semula mendapat snapshot baru |
| `06-penerima-notifikasi.spec.mjs` | `dapatkanPenerimaIkutKebenaran`: penerima ikut kebenaran (Executive termasuk untuk `pindaan:lulus`), pelaku dikecualikan, fallback pentadbir, `[]` tanpa ralat |
| `07-flush-cache-kebenaran.spec.mjs` | Perubahan `peranan_kebenaran` hanya berkuat kuasa selepas `POST /api/roles/flush-cache`; Staff ditolak `403`; matriks dipulihkan selepas ujian |
| `08-purge-soft-delete.spec.mjs` | `scripts/purge.js`: pratonton tanpa ubah data; tolak bukan pentadbir; buang hanya baris soft-delete melepasi tempoh (langkau `deleted_at NULL` & baris aktif); jejak audit dicatat |
| `09-keselamatan.spec.mjs` | Pengawal regresi: tiada kata laluan plain-text dalam DB, setiap pengguna ada `token_dikemaskini_at`, tiada respons 5xx yang memulangkan `err.message` (semakan statik controllers) |
| `10-executive.spec.mjs` | Dasar Executive = Admin: tapis pindaan ikut syarikat sama seperti Admin; `pengguna:urus` & `log:padam` masih `403`. `rujukan:urus`: Executive, Ketua Subsidiari & Staff boleh tambah bahagian, Viewer `403` |
| `11-aliran-tulis.spec.mjs` | Aliran tulis penuh melalui API: daftar/kemaskini/lulus risiko, rawatan & log pemantauan (tambah/kemaskini/padam, anak soft-delete), pindaan (mohon/lulus/tolak/lulus terus + notifikasi Executive), padam risiko berlata. Semua data & kesan sampingan dibuang kekal selepas ujian |
| `12-isolasi-syarikat.spec.mjs` | Staff/Ketua Subsidiari: 11 endpoint tulis & 7 bacaan ikut ID untuk risiko syarikat lain -> `403`, data kekal; Executive/Viewer masih boleh baca |

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
- Suite semasa: **58/58 ujian lulus**.
- Spec `07` menambah kebenaran sementara kepada Viewer dan memadamnya semula
  dalam `afterAll` (termasuk flush cache).
- Spec soft-delete & rollback menulis data ujian terus ke DB (`bahagian`,
  `log_aktiviti`, `pengguna`) tetapi **membersihkan semula** artefak selepas
  ujian; rollback difailkan oleh transaksi itu sendiri.
- Laras kredensial DB dalam `e2e/db.helper.mjs` jika berbeza dari seed.