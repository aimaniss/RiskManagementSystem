# Sistem Pengurusan Risiko (RMS)

Sistem web **dalaman** UKM Holdings untuk mendaftar, menilai, merawat, memantau
dan meluluskan risiko korporat merentasi subsidiari.

> **Sulit — kegunaan dalaman sahaja.** Jangan kongsi repositori, kredensial,
> alamat pelayan atau tangkapan skrin data sebenar di luar organisasi. Laporkan
> isu keselamatan terus kepada pentadbir sistem, bukan melalui isu awam.

---

## Kandungan

- [Modul](#modul)
- [Teknologi](#teknologi)
- [Struktur Repositori](#struktur-repositori)
- [Peranan Pengguna](#peranan-pengguna)
- [Persediaan Pembangunan](#persediaan-pembangunan)
- [Deploy](#deploy)
- [Penyelenggaraan](#penyelenggaraan)
- [Matriks Skor Risiko](#matriks-skor-risiko)
- [Dokumentasi Lanjut](#dokumentasi-lanjut)

---

## Modul

| Modul | Keterangan |
|-------|-----------|
| **Paparan Utama** | Dashboard statistik dan carta risiko |
| **Senarai Risiko** | Senarai risiko dengan tapisan; setiap risiko mempunyai halaman butiran dengan peringkat aliran kerja |
| **Daftar Risiko** | Pendaftaran risiko baharu (punca, kesan, kategori, bahagian) |
| **Penilaian & Rawatan** | Penilaian skor risiko dan rekod rawatan / pelan tindakan |
| **Pemantauan Risiko** | Log pemantauan berkala dan keberkesanan rawatan |
| **Pindaan** | Permohonan pindaan dengan kelulusan |
| **Laporan** | Dashboard analitik perbandingan (separuh tahun, syarikat, kategori) dan laporan PDF rasmi |
| **Urus Pengguna** | Akaun pengguna, peranan dan akses log masuk |
| **Tetapan Sistem** | Data rujukan (syarikat, bahagian, kategori risiko) tanpa mengubah pangkalan data secara terus |
| **Log Aktiviti** | Jejak audit (baca & eksport sahaja) |

---

## Teknologi

- **Backend:** Node.js, Express, PostgreSQL, Knex (migrasi)
- **Frontend:** React, Vite, Tailwind CSS, React Router
- **Ujian:** Playwright (E2E)
- **Deploy:** Docker Compose (nginx + backend + PostgreSQL), GitHub Actions (CI)

Versi kebergantungan: rujuk `package.json` masing-masing.

---

## Struktur Repositori

```
RiskManagementSystem/
├── risk_backend/     # REST API (Express)
├── risk_frontend/    # Aplikasi web (React + Vite)
├── e2e/              # Ujian Playwright
├── docs/pipeline/    # Dokumentasi teknikal pembangun (seni bina, aliran modul)
├── docker-compose.yml
├── AGENTS.md         # Konvensyen kod untuk pembangun / agen AI
└── PROGRESS.md       # Status projek & log kemajuan
```

---

## Peranan Pengguna

| Peranan | Ringkasan |
|---------|-----------|
| **Admin** | Pentadbir sistem: semua modul, urus pengguna & tetapan sistem |
| **Executive** | Kerja risiko & kelulusan untuk semua syarikat |
| **Ketua Subsidiari** | Urus risiko syarikat sendiri |
| **Staff** | Daftar & kemas kini risiko syarikat sendiri |
| **Viewer** | Baca sahaja |

Akses dikawal ikut kebenaran setiap peranan; Ketua Subsidiari dan Staff hanya
melihat data syarikat sendiri. Butiran matriks kebenaran untuk pembangun ada
dalam `docs/pipeline/`.

---

## Persediaan Pembangunan

**Prasyarat:** Node.js 18+ (disyorkan 22), PostgreSQL 14+.

```bash
# Backend
cd risk_backend
npm install
cp .env.example .env      # isi nilai sendiri — JANGAN commit .env
npm run migrate
npm run dev

# Frontend (terminal lain)
cd risk_frontend
npm install
npm run dev
```

Pemboleh ubah persekitaran yang diperlukan disenaraikan dalam
`risk_backend/.env.example`. Gunakan rahsia JWT yang panjang dan rawak
(contoh: `openssl rand -hex 32`) dan kata laluan pangkalan data yang kukuh.
Kredensial sebenar hanya disimpan dalam `.env` pelayan (gitignored), tidak
sekali-kali dalam kod, dokumentasi atau frontend.

### Akaun pentadbir pertama

Pangkalan data baharu tidak mempunyai pengguna. Cipta seorang Admin; kata
laluan sementara dipaparkan sekali dan wajib ditukar semasa log masuk pertama:

```bash
cd risk_backend
npm run cipta-pentadbir -- --staff-id=<ID_STAF> --nama="<Nama Penuh>"
```

Pengguna lain ditambah melalui **Urus Pengguna** dalam aplikasi.

---

## Deploy

Cara yang disyorkan ialah Docker Compose:

```bash
cp .env.docker.example .env        # isi nilai WAJIB (kata laluan DB, rahsia JWT)
docker compose up -d --build
docker compose exec backend npm run cipta-pentadbir -- --staff-id=<ID_STAF> --nama="<Nama>"
```

- Hanya perkhidmatan web (nginx) didedahkan; backend dan pangkalan data tidak
  boleh dicapai terus dari luar.
- Migrasi dijalankan secara automatik semasa backend bermula.
- Letakkan sistem di belakang HTTPS (reverse proxy organisasi) dan hadkan
  capaian kepada rangkaian dalaman / VPN.
- Sandarkan volume pangkalan data secara berkala dan simpan sandaran di lokasi
  yang terkawal.

---

## Penyelenggaraan

```bash
cd risk_backend
npm run migrate          # jalankan migrasi terkini
npm run migrate:status   # semak status migrasi
npm run purge            # pratonton pembersihan data lama (lihat docs/pipeline)
npm run format           # format kod
npm run lint             # semak kod
```

Ujian E2E dan CI: lihat `e2e/README.md`. Gunakan **pangkalan data ujian
berasingan** — jangan jalankan ujian pada data sebenar.

---

## Matriks Skor Risiko

Tahap risiko = Skor Kebarangkalian (1–5) × Skor Impak (1–5):

| Kebarangkalian \ Impak | 1 | 2 | 3 | 4 | 5 |
|------------------------|---|---|---|---|---|
| **1** | R | R | S | S | T |
| **2** | R | R | S | S | T |
| **3** | R | S | S | T | T |
| **4** | S | S | T | T | ST |
| **5** | S | T | T | ST | ST |

**R** Rendah · **S** Sederhana · **T** Tinggi · **ST** Sangat Tinggi

---

## Dokumentasi Lanjut

| Dokumen | Kandungan |
|---------|-----------|
| `docs/pipeline/` | Seni bina, aliran setiap modul, API (untuk pembangun sahaja) |
| `AGENTS.md` | Konvensyen kod & peraturan keselamatan pembangunan |
| `PROGRESS.md` | Status projek dan log kemajuan |
| `e2e/README.md` | Ujian E2E dan CI |
