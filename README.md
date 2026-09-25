<div align="center">

# Sistem Pengurusan Risiko

### UKM Holdings — Risk Management System

![React](https://img.shields.io/badge/React-19.1-61DAFB?style=flat-square&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-5.1-339933?style=flat-square&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8.16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?style=flat-square&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-green?style=flat-square)

Sistem pengurusan risiko korporat berbasis web untuk mendaftar, menilai, memantau, dan meluluskan risiko merentasi beberapa subsidiari.

<br>

</div>

---

## Jadual Kandungan

- [Gambaran Umum](#gambaran-umum)
- [Ciri-ciri Utama](#ciri-ciri-utama)
- [Seni Bina Sistem](#seni-bina-sistem)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Projek](#struktur-projek)
- [Reka Bentuk Pangkalan Data](#reka-bentuk-pangkalan-data)
- [API Endpoints](#api-endpoints)
- [Peranan & Kebenaran](#peranan--kebenaran)
- [Persediaan Pembangunan](#persediaan-pembangunan)
- [Arahan Menjalankan](#arahan-menjalankan)
- [Panduan API](#panduan-api)

---

## Gambaran Umum

**Sistem Pengurusan Risiko (RMS)** ialah aplikasi web responsif penuh yang dibina untuk organisasi korporat bagi mengurus kitaran hayat risiko secara menyeluruh — daripada pendaftaran awal hingga pemantauan berterusan.

Sistem ini menyokong **pengurusan multi-subsidiari** dengan kawalan akses berdasarkan peranan (RBAC), aliran kerja pindaan untuk kelulusan, dan dashboard analitik dengan carta interaktif.

---

## Ciri-ciri Utama

| Modul | Keterangan |
|-------|-----------|
| **Paparan Utama** | Dashboard statistik dengan carta pai, carta bar, dan metrik kunci prestasi risiko |
| **Senarai Risiko** | Senarai risiko yang boleh ditapis mengikut tahun, separuh tahun, syarikat, dan kategori |
| **Daftar Risiko** | Borang pendaftaran risiko baru dengan punca, kesan, dan skor kebarangkalian/impak |
| **Penilaian & Rawatan** | Pengurusan rawatan risiko: Terima, Kurang, Elak, Pindah — beserta pelan tindakan |
| **Pemantauan Risiko** | Penjejakan keberkesanan rawatan dari semasa ke semasa |
| **Pindaan** | Aliran kerja pindaan dengan perbandingan sebelum/lepas dan kelulusan admin |
| **Laporan** | Penjanaan laporan PDF dengan penapis lanjutan |
| **Urus Pengguna** | Pengurusan pengguna, peranan, dan profil oleh admin |
| **Log Aktiviti Jejak Audit** | Jejak audit lengkap untuk setiap tindakan dalam sistem |

---

## Seni Bina Sistem

```
┌──────────────────────────────────────────────────────────────────┐
│                       CLIENT (Browser)                          │
│                                                                 │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │  React SPA   │   │  Axios HTTP  │   │  Recharts    │       │
│   │  Router v7   │──▶│  Client      │──▶│  jsPDF       │       │
│   │  Tailwind    │   │              │   │  Radix UI    │       │
│   └──────────────┘   └──────┬───────┘   └──────────────┘       │
│                             │  Port 5175                        │
├─────────────────────────────┼────────────────────────────────────┤
│                             ▼                                    │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                    API PROXY (Vite)                       │  │
│   │              /api → localhost:5001/api                    │  │
│   └──────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                              ▼                                   │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                   SERVER (Express.js)                     │  │
│   │                     Port 5001                             │  │
│   │                                                           │  │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │  │
│   │  │  Auth   │  │ Risiko  │  │ Pindaan │  │ Users   │    │  │
│   │  │  JWT    │  │  CRUD   │  │ Workflow│  │  CRUD   │    │  │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │  │
│   │                                                           │  │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │  │
│   │  │ Dashboard│ │ Laporan │  │ Pemantau │ │  Log    │    │  │
│   │  │ Stats   │  │  PDF    │  │ an      │  │ Aktiviti│    │  │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │  │
│   └──────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                          │
│                        UKMH_RMS                                  │
│                                                                   │
│   ┌────────────┐  ┌────────────┐  ┌────────────────────┐        │
│   │  peranan   │  │  pengguna  │  │  syarikat          │        │
│   └────────────┘  └────────────┘  └────────────────────┘        │
│                                                                   │
│   ┌────────────┐  ┌────────────┐  ┌────────────────────┐        │
│   │  risiko    │──│ punca_     │  │  kesan_risiko      │        │
│   │            │  │ risiko     │  │                    │        │
│   └─────┬──────┘  └────────────┘  └────────────────────┘        │
│         │                                                         │
│   ┌─────┴──────┐  ┌────────────┐  ┌────────────────────┐        │
│   │  rawatan_  │──│ pelan_     │  │  kakitangan_       │        │
│   │  risiko    │  │ tindakan_  │  │  rawatan           │        │
│   └─────┬──────┘  │ rawatan    │  └────────────────────┘        │
│         │         └────────────┘                                 │
│   ┌─────┴──────┐  ┌────────────┐  ┌────────────────────┐        │
│   │ logpemantau│──│ pelantinda-│  │  kakitangan-       │        │
│   │ an         │  │ kanpemant. │  │  pemantauan        │        │
│   └────────────┘  └────────────┘  └────────────────────┘        │
│                                                                   │
│   ┌──────────────────────┐  ┌────────────┐  ┌──────────────┐    │
│   │  permohonan_pindaan  │  │ log_aktiviti│  │  notifikasi  │    │
│   └──────────────────────┘  └────────────┘  └──────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Teknologi yang Digunakan

### Backend

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **Node.js** | — | Runtime JavaScript |
| **Express.js** | 5.1 | Web framework REST API |
| **PostgreSQL** | — | Pangkalan data relasi |
| **pg** | 8.16 | PostgreSQL client untuk Node.js |
| **Knex.js** | 3.3 | Pengurusan migrasi skema |
| **jsonwebtoken** | 9.0 | Pengesahan & penjanaan token JWT |
| **bcrypt** | 6.0 | Peng-hashing kata laluan |
| **multer** | 2.0 | Pengendalian muat naik fail |
| **dotenv** | 17.2 | Pengurusan persekitaran |
| **cors** | 2.8 | Kebenaran merentas sumber |
| **nodemon** | 3.1 | Auto-reload semasa pembangunan |

### Frontend

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **React** | 19.1 | UI library |
| **Vite** | 7.1 | Build tool & dev server |
| **React Router** | 7.8 | Pengurusan navigasi SPA |
| **Tailwind CSS** | 4.1 | Utility-first CSS framework |
| **Axios** | 1.11 | HTTP client |
| **Recharts** | 3.1 | Pustaka carta React |
| **jsPDF** | 4.2 | Penjanaan PDF di browser |
| **Radix UI** | — | Komponen UI yang boleh diakses |
| **Lucide React** | — | Set ikon |
| **jwt-decode** | 4.0 | Pengesahan token di klien |

---

## Struktur Projek

```
RiskManagementSystem/
├── risk_backend/                     # REST API (Express.js)
│   ├── config/
│   │   └── db.js                     # Sambungan PostgreSQL Pool
│   ├── controllers/                  # Logik setiap modul (<modul>Controller.js)
│   │   ├── authController.js         # Log masuk / tukar kata laluan
│   │   ├── risikoController.js       # CRUD & kelulusan risiko
│   │   ├── pindaanController.js      # Aliran kerja pindaan
│   │   └── ...                       # 14 controller (satu per route)
│   ├── middleware/
│   │   └── authMiddleware.js         # JWT + RBAC middleware
│   ├── migrations/
│   │   ├── knex/                     # Migrasi Knex (25 fail)
│   │   └── sql/                      # Migrasi SQL mentah
│   ├── routes/                       # Daftar endpoint + middleware sahaja
│   │   ├── auth.js                   # Log masuk / JWT
│   │   ├── dashboard.js              # Statistik dashboard
│   │   ├── laporan.js                # Data laporan PDF
│   │   ├── log_aktiviti.js           # Jejak audit
│   │   ├── pemantauan.js             # Log pemantauan
│   │   ├── pindaan.js                # Aliran kerja pindaan
│   │   ├── rawatan.js                # CR rawatan risiko
│   │   ├── risiko.js                 # CRUD risiko
│   │   ├── roles.js                  # Senarai peranan
│   │   ├── syarikat.js               # Senarai syarikat
│   │   ├── tahun.js                  # Tahun tersedia
│   │   └── users.js                  # CRUD pengguna
│   ├── utils/
│   │   ├── catatAktiviti.js          # Utiliti log aktiviti
│   │   ├── katalaluan.js             # bcrypt + rehash legasi
│   │   ├── matriksRisiko.js          # kiraTahapRisiko (R/S/T/ST)
│   │   ├── notifikasi.js             # Hantar notifikasi
│   │   └── transaksi.js              # dalamTransaksi (BEGIN/COMMIT/ROLLBACK)
│   ├── knexfile.js                   # Konfigurasi Knex
│   └── server.js                     # Titik masuk Express
│
├── risk_frontend/                    # SPA (React + Vite)
│   ├── src/
│   │   ├── api/
│   │   │   └── api.js                # Axios instance + interceptor JWT
│   │   ├── components/
│   │   │   ├── AppLayout.jsx         # Layout utama (sidebar + navbar)
│   │   │   ├── navbar.jsx            # Bar navigasi atas
│   │   │   ├── sidebar.jsx           # Panel sisi berperanan
│   │   │   ├── ProtectedRoute.jsx    # Pengawal laluan terlindung
│   │   │   └── ui/                   # Komponen shadcn/ui
│   │   ├── hooks/
│   │   │   ├── useAuth.js            # Pengurusan pengesahan
│   │   │   ├── usePanduan.jsx        # Panduan pengguna
│   │   │   ├── useRisks.js           # Pengambilan data risiko
│   │   │   └── useSyarikats.js       # Pengambilan data syarikat
│   │   ├── pages/
│   │   │   ├── DaftarRisiko/         # Pendaftaran risiko baru
│   │   │   ├── Laporan/              # Laporan & eksport PDF
│   │   │   ├── LogAktiviti/          # Jejak audit
│   │   │   ├── Login/                # Halaman log masuk
│   │   │   ├── LogKeluar/            # Log keluar
│   │   │   ├── PaparanUtama/         # Dashboard statistik
│   │   │   ├── PemantauanRisiko/     # Pemantauan risiko
│   │   │   ├── Pindaan/              # Urusan pindaan
│   │   │   ├── RawatanRisiko/        # Rawatan risiko
│   │   │   ├── SenaraiRisiko/        # Senarai risiko
│   │   │   ├── Unauthorized/         # Halaman akses ditolak
│   │   │   └── UrusPengguna/         # Pengurusan pengguna
│   │   ├── utils/
│   │   ├── constants/
│   │   └── App.jsx                   # Pengesahan laluan
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Reka Bentuk Pangkalan Data

### Carta Hubungan Entiti

```
┌──────────────┐       ┌──────────────┐
│   peranan    │       │   syarikat   │
│──────────────│       │──────────────│
│ peranan_id   │◀──┐   │ syarikat_id  │◀──┐
│ nama_peranan │   │   │ nama_syarikat│   │
│ keterangan   │   │   └──────────────┘   │
└──────────────┘   │                      │
                   │   ┌──────────────┐   │
                   │   │   pengguna   │   │
                   │   │──────────────│   │
                   ├───│ peranan_id   │   │
                   │   │ syarikat_id  │───┘
                   │   │ staff_id     │
                   │   │ nama_penuh   │
                   │   │ katalaluan   │
                   │   │ gambar_profil│
                   │   └──────┬───────┘
                   │          │
                   │          ▼
                   │   ┌──────────────┐
                   │   │ log_aktiviti │
                   │   │──────────────│
                   │   │ pengguna_id  │
                   │   │ aktiviti     │
                   │   │ perincian    │
                   │   │ tarikh_masa  │
                   │   └──────────────┘
                   │
                   │   ┌──────────────────┐
                   │   │     risiko        │
                   │   │──────────────────│
                   ├───│ created_by        │
                   │   │ syarikat_id       │──── syarikat
                   │   │ no_rujukan        │
                   │   │ tahun             │
                   │   │ kategori          │
                   │   │ bahagian          │
                   │   │ risiko (teks)     │
                   │   │ skor_kebarangkalian│  (1-5)
                   │   │ skor_impak        │  (1-5)
                   │   │ skor_risiko       │  (R/S/T/ST)
                   │   │ status_risiko     │
                   │   └────────┬─────────┘
                   │            │
            ┌──────┴────────────┼────────────────┐
            │                   │                │
            ▼                   ▼                ▼
   ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
   │ punca_risiko │   │ kesan_risiko │  │ logpemantauan│
   │──────────────│   │──────────────│  │──────────────│
   │ risiko_id    │   │ risiko_id    │  │ risiko_id    │
   │ punca        │   │ kesan        │  │ tahun        │
   └──────────────┘   └──────────────┘  │ skor lepas   │
                                        │ keberkesanan │
                                        └──────┬───────┘
                                               │
                        ┌──────────────────────┴──────┐
                        │                             │
                        ▼                             ▼
              ┌──────────────┐              ┌──────────────┐
              │ pelantinda-  │              │ kakitangan-  │
              │ kanpemantauan│              │ pemantauan   │
              └──────────────┘              └──────────────┘

   ┌──────────────────────┐
   │  permohonan_pindaan  │
   │──────────────────────│
   │ risiko_id            │──── risiko
   │ pengguna_id_pemohon  │──── pengguna
   │ status_permohonan    │  (Menunggu/Diluluskan/Ditolak)
   │ data_sebelum (JSONB) │
   │ data_selepas (JSONB) │
   │ pengguna_id_pelulus   │──── pengguna
   └──────────────────────┘
```

### Senarai Jadual

| Jadual | Keterangan |
|--------|-----------|
| `peranan` | Peranan pengguna (Admin, Executive, Staff, Ketua Subsidiari) |
| `syarikat` | Senarai subsidiari/syarikat |
| `pengguna` | Data pengguna dengan katalaluan & profil |
| `risiko` | Rekod risiko teras dengan skor kebarangkalian & impak |
| `punca_risiko` | Senarai punca bagi setiap risiko |
| `kesan_risiko` | Senarai kesan bagi setiap risiko |
| `rawatan_risiko` | Rawatan/kawalan risiko (Terima/Kurang/Elak/Pindah) |
| `pelan_tindakan_rawatan` | Pelan tindakan spesifik bagi setiap rawatan |
| `kakitangan_rawatan` | Kakitangan yang ditugaskan kepada rawatan |
| `logpemantauan` | Log pemantauan berkala bagi setiap risiko |
| `pelantindakanpemantauan` | Tindakan pemantauan |
| `kakitanganpemantauan` | Kakitangan pemantauan |
| `permohonan_pindaan` | Permohonan pindaan dengan data sebelum/lepas (JSONB) |
| `kebenaran` | 17 kebenaran (`risiko:daftar`, `pengguna:urus`, …) — dikuatkuasa oleh `authorizeKebenaran` |
| `peranan_kebenaran` | Peta peranan-kebenaran (junction table) |
| `notifikasi` | Notifikasi pengguna (pindaan, kelulusan, tugasan) |
| `log_aktiviti` | Jejak audit untuk semua tindakan |

---

## API Endpoints

### Pengesahan

| Kaedah | Endpoint | Penerangan | Akses |
|--------|----------|-----------|-------|
| `POST` | `/api/auth/login` | Log masuk dan terima JWT | Awam |
| `POST` | `/api/auth/logout` | Log keluar (catat aktiviti) | Semua |
| `PUT` | `/api/auth/tukar-katalaluan` | Tukar kata laluan (polisi; token lama dicabut, token baharu dipulangkan) | Semua |
| `GET` | `/health` | Semakan hayat server | Awam |

### Pengguna

| Kaedah | Endpoint | Penerangan | Akses |
|--------|----------|-----------|-------|
| `GET` | `/api/users/` | Senarai semua pengguna | `pengguna:urus` |
| `GET` | `/api/users/me` | Dapatkan profil sendiri + `kebenaran` terkini | Semua |
| `PUT` | `/api/users/me` | Kemaskini profil sendiri | Semua |
| `POST` | `/api/users/` | Cipta pengguna baru (kata laluan sementara dijana jika kosong) | `pengguna:urus` |
| `PUT` | `/api/users/:id` | Kemaskini pengguna | `pengguna:urus` |
| `POST` | `/api/users/:id/reset-katalaluan` | Jana kata laluan sementara, buka kunci akaun | `pengguna:urus` |
| `PATCH` | `/api/users/:id/status` | Aktif / nyahaktif akaun (`{ is_aktif }`) | `pengguna:urus` |
| `DELETE` | `/api/users/:id` | Padam pengguna (soft-delete) | `pengguna:urus` |

### Risiko

| Kaedah | Endpoint | Penerangan | Akses |
|--------|----------|-----------|-------|
| `GET` | `/api/risiko/` | Senarai risiko (ditapis mengikut syarikat) | `risiko:lihat` |
| `POST` | `/api/risiko/` | Daftar risiko baru | `risiko:daftar` |
| `PUT` | `/api/risiko/:risiko_id` | Kemaskini risiko | `risiko:daftar` |
| `DELETE` | `/api/risiko/:risiko_id` | Padam risiko (soft-delete) | `risiko:padam` |
| `PUT` | `/api/risiko/:risiko_id/approve` | Luluskan risiko | `risiko:lulus` |
| `PUT` | `/api/risiko/:risiko_id/reject` | Tolak risiko | `risiko:lulus` |
| `GET` | `/api/risiko/tahun` | Dapatkan tahun tersedia | Semua |
| `GET` | `/api/risiko/check-no-rujukan/:no` | Semak kewujudan no. rujukan | Semua |
| `GET` | `/api/risiko/check-duplicate` | Semak risiko pendua | Semua |

### Rawatan & Pemantauan

| Kaedah | Endpoint | Penerangan | Akses |
|--------|----------|-----------|-------|
| `GET` | `/api/risiko/:id/rawatan` | Dapatkan rawatan risiko | Semua |
| `PUT` | `/api/risiko/:id/rawatan` | Kemaskini rawatan | `rawatan:urus` |
| `GET` | `/api/rawatan/`, `/api/rawatan/with-status`, `/api/rawatan/:risiko_id` | Senarai / butiran rawatan | Semua |
| `PUT` | `/api/rawatan/penilaian/:risiko_id` | Simpan penilaian | `risiko:nilai` atau `rawatan:urus` |
| `POST` / `PUT` / `DELETE` | `/api/rawatan/`, `/api/rawatan/:rawatan_id` | Urus rawatan (padam = soft-delete) | `rawatan:urus` |
| `GET` | `/api/pemantauan-risiko/` | Senarai pemantauan | `risiko:lihat` |
| `GET` | `/api/pemantauan-risiko/:risiko_id/{info,sejarah,sejarah-baru,tahap-rujukan}` | Butiran pemantauan | Semua |
| `POST` / `PUT` / `DELETE` | `/api/pemantauan-risiko/log`, `/api/pemantauan-risiko/log/:log_id` | Urus log pemantauan | `pemantauan:urus` |
| `PUT` | `/api/risiko/:id/pemantauan/log/:log_id` | Kemaskini log pemantauan | `pemantauan:urus` |

### Pindaan

| Kaedah | Endpoint | Penerangan | Akses |
|--------|----------|-----------|-------|
| `GET` | `/api/pindaan/risks-for-amendment` | Risiko yang boleh dipinda | `pindaan:urus` |
| `POST` | `/api/pindaan/:risk_id` | Mohon pindaan baru (Admin/Executive lulus terus) | `pindaan:urus` |
| `GET` | `/api/pindaan/` | Senarai permohonan pindaan | `pindaan:lihat` |
| `GET` | `/api/pindaan/stats` | Statistik pindaan | `pindaan:lulus` |
| `PUT` | `/api/pindaan/:id/approve` | Luluskan pindaan | `pindaan:lulus` |
| `PUT` | `/api/pindaan/:id/reject` | Tolak pindaan | `pindaan:lulus` |

### Lain-lain

| Kaedah | Endpoint | Penerangan | Akses |
|--------|----------|-----------|-------|
| `GET` | `/api/dashboard` | Statistik dashboard | `dashboard:lihat` |
| `GET` | `/api/laporan`, `/api/laporan/:risiko_id/data-penuh` | Data laporan | `laporan:jana` |
| `GET` | `/api/log_aktiviti` | Log aktiviti jejak audit (Staff/Ketua Subsidiari: syarikat sendiri) | `log:baca` |
| `DELETE` | `/api/log_aktiviti`, `/api/log_aktiviti/:id` | Padam log (soft-delete) | `log:padam` |
| `GET` | `/api/syarikat` | Senarai syarikat (ditapis mengikut peranan) | Semua |
| `GET` | `/api/tahun` | Senarai tahun | Semua |
| `GET` | `/api/bahagian` | Senarai bahagian | Semua |
| `POST` | `/api/bahagian` | Tambah bahagian | `rujukan:urus` (Admin, Executive, Ketua Subsidiari, Staff) |
| `GET` | `/api/roles` | Senarai peranan | `pengguna:urus` |
| `POST` | `/api/roles/flush-cache` | Kosongkan cache kebenaran (selepas ubah `peranan_kebenaran`) | `pengguna:urus` |
| `*` | `/api/notifikasi/*` | Notifikasi sendiri (senarai, baca, padam) | Semua |

"Semua" = mana-mana pengguna log masuk (`verifyToken` sahaja). Matriks
kebenaran per peranan: `docs/pipeline/01-auth-rbac.md`.

---

## Peranan & Kebenaran

| Peranan | Keterangan | Kebolehan Utama |
|---------|-----------|----------------|
| **Admin** | Pentadbir sistem | Penuh CRUD pada semua modul. Kelulusan pindaan. Urus pengguna. Laporan. |
| **Executive** | Eksekutif | Sama seperti Admin untuk kerja risiko & pindaan (termasuk lulus pindaan dan tambah data rujukan), kecuali urus pengguna dan padam log aktiviti. |
| **Staff** | Kakitangan | Daftar risiko. Lihat risiko syarikat sendiri sahaja. Mohon pindaan. |
| **Ketua Subsidiari** | Ketua subsidiari | Sama seperti Staff + kawalan ke atas subsidiari masing-masing. |
| **Viewer** | Pemerhati | Baca sahaja. Tiada keupayaan mengubah suai data. |

### Pengasingan Data

- **Admin & Executive:** Boleh melihat data merentasi **semua** subsidiari
- **Staff & Ketua Subsidiari:** Hanya boleh melihat data untuk **syarikat mereka sahaja**
- **Viewer:** Boleh melihat semua data (baca sahaja)

---

## Persediaan Pembangunan

### Prasyarat

- [Node.js](https://nodejs.org/) v18 atau lebih tinggi
- [PostgreSQL](https://www.postgresql.org/) v14 atau lebih tinggi
- [npm](https://www.npmjs.com/) atau [yarn](https://yarnpkg.com/)

### 1. Klon Repositori

```bash
git clone https://github.com/your-username/RiskManagementSystem.git
cd RiskManagementSystem
```

### 2. Persediaan Backend

```bash
cd risk_backend
npm install
```

B fail `.env` dalam folder `risk_backend`:

```env
# Server
PORT=5001

# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=UKMH_RMS

# JWT Secret
JWT_SECRET=your_super_secret_key_here
```

Jalankan migrasi pangkalan data:

```bash
npm run migrate
```

### 3. Persediaan Frontend

```bash
cd ../risk_frontend
npm install
```

---

## Arahan Menjalankan

### Mod Pembangunan

Buka **dua terminal** berasingan:

**Terminal 1 — Backend:**
```bash
cd risk_backend
npm run dev
# Server berjalan di http://localhost:5001
```

**Terminal 2 — Frontend:**
```bash
cd risk_frontend
npm run dev
# Aplikasi berjalan di http://localhost:5175
```

### Mod Pengeluaran

```bash
cd risk_frontend
npm run build

cd ../risk_backend
npm start
```

### Migrasi Pangkalan Data

```bash
cd risk_backend

npm run migrate          # Jalankan migrasi terkini
npm run migrate:rollback  # Undur migrasi terakhir
npm run migrate:status    # Semak status migrasi
```

### Purge Data Soft-Delete

Buang kekal `notifikasi` & `log_aktiviti` yang telah dipadam (soft-delete) lebih
365 hari. Lalai ialah pratonton (tiada perubahan):

```bash
cd risk_backend

npm run purge                                   # Pratonton
npm run purge -- --laksana --oleh=UKMH001        # Laksana (staf dengan pengguna:urus)
npm run purge -- --hari=730                     # Tukar tempoh simpanan (min 30)
```

### Format Kod (Backend)

```bash
cd risk_backend

npm run format         # Format semua fail .js dengan Prettier
npm run format:check   # Semak format (tanpa ubah fail)
```

---

## Panduan API

### Penyataan Autentikasi

Semua endpoint yang dilindungi memerlukan header `Authorization`:

```
Authorization: Bearer <JWT_TOKEN>
```

Token diperoleh melalui `POST /api/auth/login` dan disimpan dalam `localStorage` klien.

### Contoh Login

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "staff_id": "ADMIN001",
    "katalaluan": "password123"
  }'
```

**Respons Berjaya:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "nama": "Admin Utama",
    "peranan": "Admin",
    "peranan_id": 1,
    "pengguna_id": 1,
    "syarikat_id": 1,
    "perlu_tukar_katalaluan": false,
    "kebenaran": ["risiko:daftar", "risiko:lihat", "..."]
  }
}
```

JWT tidak membawa senarai `kebenaran`; klien mendapatkan kebenaran terkini
melalui `GET /api/users/me`. Token lama dicabut (`401`) apabila kata laluan,
peranan, ID staf atau syarikat pengguna berubah, atau akaun dinyahaktifkan.

Kitaran hayat akaun: akaun baharu dan akaun yang ditetapkan semula kata
laluannya menerima **kata laluan sementara** (`perlu_tukar_katalaluan: true`);
pengguna dihalakan ke `/tukar-katalaluan` dan backend menolak laluan lain
(`403`, `kod: "PERLU_TUKAR_KATALALUAN"`) sehingga kata laluan ditukar. Lima
percubaan gagal berturut-turut mengunci akaun selama 15 minit (`423`); akaun
tidak aktif menerima `403`. Polisi kata laluan: minimum 8 aksara, huruf +
nombor, tiada ruang kosong.

### Contoh Daftar Risiko

```bash
curl -X POST http://localhost:5001/api/risiko/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "tahun": 2026,
    "separuh_tahun": "S1",
    "syarikat_id": 1,
    "kategori": "Kewangan",
    "bahagian": "Perakaunan",
    "risiko "Kehilangan data kewangan akibat sistem gagal",
    "skor_kebarangkalian": 3,
    "skor_impak": 4,
    "punca_risiko": ["Kurang penyelenggaraan", "Ketiadaan backup"],
    "kesan_risiko": ["Kerugian kewangan", "Pelanggaran peraturan"]
  }'
```

### Skor Risiko

| Skor Kebarangkalian × Skor Impak | 1 | 2 | 3 | 4 | 5 |
|----------------------------------|---|---|---|---|---|
| **1** | R | R | R | R | S |
| **2** | R | R | R | S | S |
| **3** | R | R | S | S | ST |
| **4** | R | S | S | ST | ST |
| **5** | R | S | ST | ST | ST |

- **R** = Rendah (Hijau)
- **S** = Sederhana (Kuning)
- **T** = Tinggi (Oren)
- **ST** = Sangat Tinggi (Merah)

---

<div align="center">

Dibina dengan dedikasi untuk UKM Holdings.

</div>
