# PROGRESS.md — Status & To-Do Terkini (Sistem Pengurusan Risiko)

> **WAJIB BACA dahulu** oleh mana-mana agen AI (opencode) sebelum mula kerja.
> Fail ini single source of truth untuk **status projek, kemajuan, dan to-do
> terkini**. Kemas kini fail ini setiap kali selesai / mula tugasan.
>
> Semua mesej **commit dalam Bahasa Inggeris** (lihat `AGENTS.md`).

---

## Status Keseluruhan

| Perkara | Status |
|---------|--------|
| Aplikasi teras (backend + frontend) | ✅ Berfungsi (production) |
| MCP `rms-boost` (imbas codebase) | ✅ Siap & didaftar |
| Agent `rms-architect` | ✅ Siap & didaftar |
| Playwright MCP (E2E) | ✅ Didaftar |
| Ujian E2E Playwright | ✅ 99/99 lulus (DB kosong + seed, dan salinan DB sebenar; juga dalam CI) |
| Dokumentasi pipeline (00–09) | ✅ Lengkap |
| Revamp seni bina v2 (Fasa 1–4, 6-7) | ✅ **Selesai & disahkan** |
| Revamp UI (penilaian/rawatan/pemantauan) | ✅ Selesai — halaman `/risiko/:id` (lih. `docs/pipeline/11-PLAN-ui-revamp.md` §8) |
| Pengurusan pengguna, Tetapan Sistem, Log Aktiviti | ✅ Selesai (migrasi 025–027) |
| CI (GitHub Actions) & Docker Compose | ✅ Selesai (`.github/workflows/ci.yml`, `docker-compose.yml`) |
| Lint | ✅ Frontend 0 ralat (5 amaran `exhaustive-deps`); backend ESLint 0 ralat |
| Work lanjutan P1–P3 | ✅ P1 selesai (auth, §2.5), §2.2, §1.5 & §2.1 selesai, Fasa 5 controllers; §2.4 (P3) berbaki — lih. `docs/pipeline/10-PLAN-lanjutan.md` |

📄 Pelan revamp: `docs/pipeline/09-PLAN-revamp.md` (status pelaksanaan di atas).
📄 Cadangan lanjutan: `docs/pipeline/10-PLAN-lanjutan.md`.

---

## To-Do Revamp v2 (siap semua)

### Fasa 1 — Transaksi DB
- [x] Bina `utils/transaksi.js` (helper `dalamTransaksi` BEGIN/COMMIT/ROLLBACK)
- [x] Wrap `rawatan.js` DELETE `/:rawatan_id` (3×UPDATE kini dalam transaksi)
- [x] Wrap `users.js` POST/PUT/DELETE (tulis + log aktiviti selepas COMMIT)
- [x] Wrap `bahagian.js` POST (SELECT+INSERT dengan `pg_advisory_xact_lock`)
- [x] Pastikan `catatAktiviti`/notifikasi dipanggil SELEPAS COMMIT

### Fasa 2 — Dasar Soft-Delete Menyeluruh
- [x] Migrasi 019: `is_deleted` + `deleted_at` pada `pengguna`, `notifikasi`;
      `deleted_at` pada 11 jadual lain (015)
- [x] Ganti `DELETE FROM pengguna` (users.js) → `UPDATE is_deleted=true`
- [x] Ganti `DELETE FROM notifikasi` (notifikasi.js) → soft-delete
- [x] Ganti `DELETE FROM log_aktiviti` (log_aktiviti.js) → soft-delete
      (termasuk DELETE julat tarikh)
- [x] Ganti `DELETE FROM pelan_tindakan_rawatan/kakitangan_rawatan`
      (risiko.js PUT kemaskini) → soft-delete kanak-kanak
- [x] Ganti `DELETE FROM PelanTindakanPemantauan/KakitanganPemantauan`
      (pemantauan.js PUT log) → soft-delete kanak-kanak
- [x] Filter `is_deleted = false` pada query pengguna/notifikasi/punca/kesan/
      dashboard/laporan yang tinggal
- [x] Pastikan `verifyToken` menapis pengguna `is_deleted=true`

### Fasa 3 — Role Matrix (kebenaran / peranan_kebenaran)
- [x] Migration seed 020: `kebenaran` (16 kebenaran) + `peranan_kebenaran`
- [x] Migration 021: `pindaan:lihat` (kebenaran ke-17, Admin+Executive)
- [x] Middleware `authorizeKebenaran(...)` dalam authMiddleware
- [x] Cache kebenaran per peranan (60s, elak query setiap request)
- [x] Gantikan `authorizeRoles(...)` pada semua route sensitif (grep = 0)

### Fasa 4 — Reflektor Frontend
- [x] Padan `useAuth.js` (helper `hasKebenaran`/`getKebenaran`) dengan matrix
      kebenaran tunggal + `MATRIX_KEBENARAN` fallback
- [x] `utils/auth.js` re-export lengkap (termasuk helper baharu)

### Fasa 5 — Clean-up Arkitektur
- [x] `tahun.js` dibetulkan (`daftar_risiko` → `risiko` + `is_deleted=false`)
- [x] Bcrypt untuk kata laluan (`utils/katalaluan.js` + authController/users;
      rehash-on-login untuk legasi plain-text)
- [x] Mesej ralat BM ditingkatkan (`risiko.js`, `auth`, `users`, `tahun`)
- [x] LOGIK → `controllers/` untuk `users`, `bahagian`, `auth`
- [x] Pindah penuh logik semua modul ke `controllers/` (11 controller baharu,
      48 handler; `routes/` hanya daftar) — 2026-09-25
- [x] Satukan matriks risiko server → `utils/matriksRisiko.js` (`kiraTahapRisiko`)
- [x] Ralat API seragam `{ error }` (10-PLAN §2.5)
- [x] Buang emoji/ikon & nota perubahan gaya AI dalam kod backend
- [x] Prettier untuk backend (`npm run format` / `format:check`)
- [⚠️] Normalkan nama jadual (`LogPemantauan`, dsb.) — **sengaja tidak dibuat**
      (had didokumenkan; 10-PLAN §2.4)

### Fasa 6 — Ujian E2E (Playwright)
- [x] Spec login per peranan (5 peranan) — `e2e/tests/01-login-peranan.spec.mjs`
- [x] Spec kebenaran (dibenarkan / ditolak) — `e2e/tests/02-kebenaran.spec.mjs`
- [x] Spec rollback transaksi — `e2e/tests/03-rollback-transaksi.spec.mjs`
- [x] Spec soft-delete — `e2e/tests/04-soft-delete.spec.mjs`
- [x] Spec P1 auth/session — `e2e/tests/05-p1-auth-session.spec.mjs`
- [x] Spec penerima notifikasi (§2.2) — `e2e/tests/06-penerima-notifikasi.spec.mjs`
- [x] Spec flush cache kebenaran (§1.5) — `e2e/tests/07-flush-cache-kebenaran.spec.mjs`
- [x] Spec purge soft-delete (§2.1) — `e2e/tests/08-purge-soft-delete.spec.mjs`
- [x] Config + README + root `package.json` scripts (`npm run test:e2e`)
- [x] **Jalankan** suite end-to-end penuh — 21/21 lulus pada 2026-09-25

### Fasa 7 — Dokumentasi
- [x] Kemas kini `docs/pipeline/09-PLAN-revamp.md` (status + kriteria selesai)
- [x] Kemas kini `docs/pipeline/01-auth-rbac.md` (matrix kebenaran + bcrypt)
- [x] Bina `docs/pipeline/10-PLAN-lanjutan.md` (aliran baharu & P1–P3)
- [x] Kemas kini `AGENTS.md` (kebenaran, transaksi, soft-delete, bcrypt, E2E)
- [x] Kemas kini fail `PROGRESS.md` ini

---

### P1 Auth/Session (selesai)
- [x] Migration 022: tambah `pengguna.token_dikemaskini_at`
- [x] `verifyToken` membandingkan claim token dengan DB dan menolak token lama
- [x] `GET /api/users/me` mengembalikan `kebenaran` terkini
- [x] Frontend refresh session pada mount, focus, dan setiap 60 saat
- [x] Password change memaksa log masuk semula; role/staff/syarikat change
      mencabut token
- [x] Spec P1 E2E: `e2e/tests/05-p1-auth-session.spec.mjs`

---

### Pengurusan Pengguna & Kitaran Hayat Akaun (selesai)
- [x] Migration 025: `perlu_tukar_katalaluan`, `is_aktif`, `percubaan_gagal`,
      `dikunci_hingga`, `log_masuk_terakhir`, `katalaluan_dikemaskini_at`
- [x] Polisi kata laluan (`semakPolisiKatalaluan`) + jana kata laluan sementara
- [x] Log masuk pertama / selepas reset wajib tukar kata laluan (backend + FE `/tukar-katalaluan`)
- [x] Kunci akaun 15 minit selepas 5 percubaan gagal (`423`)
- [x] Admin: reset kata laluan (`POST /users/:id/reset-katalaluan`), aktif/nyahaktif (`PATCH /users/:id/status`)
- [x] Revamp `UrusPengguna.jsx`: status, log masuk terakhir, tapisan status, dialog kata laluan sementara
- [x] Login: mesej ralat pelayan (dikunci/tidak aktif), panduan "Lupa kata laluan?"
- [x] Spec E2E `13-pengurusan-pengguna` (7 ujian)
- [ ] Pilihan: reset kata laluan layan diri melalui e-mel (perlu infrastruktur SMTP)

### Tetapan Sistem & Revamp Log Aktiviti (selesai)
- [x] Migration 027: kebenaran `tetapan:urus` (Admin → 18), `syarikat.is_aktif`,
      `bahagian.is_aktif`, jadual `senarai_rujukan` (seed `kategori_risiko`),
      normalisasi "Pematuhan/Perundangan"
- [x] API Tetapan Sistem: syarikat (tambah/sunting/nyahaktif), bahagian (tukar nama kaskad/nyahaktif), `/api/rujukan`
- [x] Kategori risiko dari DB (Daftar, Sunting, Pengenalpastian, Panduan, dashboard)
- [x] Halaman `/TetapanSistem` (tab Syarikat, Bahagian, Kategori Risiko)
- [x] Log aktiviti: tiada padam (jejak audit), paging server, tapisan jenis sebenar, carian, eksport CSV
- [x] Spec E2E `14-tetapan-sistem` (6 ujian); spec 01/04/10/12 dikemas kini
- [ ] Pilihan: jenis senarai rujukan lain (cth. kekerapan pemantauan) bila diperlukan

### Kestabilan & Deploy (selesai)
- [x] Peranan dikenal pasti ikut `nama_peranan`, bukan `peranan_id` (FE salah label Staff/Ketua pada DB baharu)
- [x] Sidebar ditapis ikut kebenaran (ganti 17 semakan nama peranan)
- [x] CI GitHub Actions: backend (format, lint, audit), frontend (lint, build, audit), E2E penuh pada Postgres kosong (`e2e/seed-ci.mjs`); ESLint backend ditambah
- [x] Docker Compose: Postgres 16 + backend (migrasi auto, pengguna bukan root, healthcheck) + frontend (nginx, proxy `/api`, fallback SPA); `.env.docker.example`; job CI bina imej; knexfile untuk `NODE_ENV=production`
- [x] `npm run cipta-pentadbir` — Admin pertama untuk DB baharu (kata laluan sementara)
- [x] Keselamatan: `helmet`, had kadar per IP (log masuk gagal 30/15 min, API 3000/15 min, boleh laras `.env`), `TRUST_PROXY`, buang 16 `console.log` nyahpepijat (termasuk yang mencetak data rawatan)

### Skema (selesai)
- [x] Migration 026: `logpemantauan.tarikh_pemantauan` boleh NULL (pemasangan baharu gagal lulus risiko)

---

## Revamp UI (selesai — `docs/pipeline/11-PLAN-ui-revamp.md`)

- [x] U0 — Setuju keputusan reka bentuk D1–D5 (bentuk paparan butiran, tab, stepper aliran, garis masa pemantauan, sunting dalam tab)
- [x] U1 — Satukan borang penilaian / rawatan / log pemantauan (7 fail → 3 komponen)
- [x] U2 — Paparan butiran risiko bertab + pengepala ringkasan (ganti skrol panjang)
- [x] U3 — Stepper aliran + tindakan seterusnya
- [x] U4 — Garis masa pemantauan + sunting dalam tab (tiada modal bersarang)
- [x] U5 — Halaman Rawatan & Pemantauan guna paparan butiran yang sama
- [x] U6 — Ujian UI Playwright aliran nilai → rawat → pantau + semakan telefon

---

## To-Do UX (dari walkthrough Playwright 2026-09-26)

Keutamaan tinggi (aliran rosak / hilang):
- [x] Staff & Ketua Subsidiari mohon pindaan dari tab Penilaian `/risiko/:id` ("Mohon Pindaan"); banner status menunggu/ditolak (`pindaan_terkini`); satu permohonan terbuka (`409`)
- [x] "Ulasan Pelulus" dinamakan semula "Sebab Penolakan" (wajib jika tolak, tidak digunakan untuk lulus); ralat pelayan dipaparkan
- [x] Selepas daftar berjaya, terus ke halaman risiko baharu dengan mesej no. rujukan
- [x] Notifikasi: `**tebal**` lama dipapar sebagai tebal; klik membuka rekod (`risiko_id` dalam `GET /notifikasi`) atau Senarai Tugasan bagi pelulus; "diluluskan oleh <nama>" bukan "Admin"

Konsistensi & kejelasan:
- [x] "Pinda" di halaman butiran kini melalui `POST /pindaan` (justifikasi wajib, direkodkan, lulus terus bagi pelulus); pindaan diluluskan mengemas kini `status_risiko`
- [x] Modal lama Senarai Tugasan & Pindaan diganti `PanelKelulusan` (drawer) + satu `BorangPindaan` di tab Pindaan; 15 fail modal/CSS lama dibuang
- [x] Borang pindaan: blok Keberkesanan hanya bila log terkini ada skor
- [x] Borang Daftar: tanda `*`, label dikaitkan, contoh placeholder
- [x] Log masuk: placeholder "contoh: UKMH001", label dikaitkan, `autoComplete`
- [x] Pengepala papar nama pengguna + "PERANAN · syarikat"
- [x] Menu Laporan untuk Executive (`pindaan:lulus`)

Aksesibiliti & telefon:
- [x] Label dikaitkan: Daftar Risiko, Log Masuk, borang penilaian/pindaan
- [x] Borang pindaan lama dibuang; `BorangPindaan` berlabel penuh
- [x] Loceng notifikasi ialah `<button>` dengan `aria-label` & `aria-expanded`
- [x] Telefon: label kad statistik dibalut (tidak dipotong)
- [x] Telefon: Penilaian & Rawatan dan Pemantauan guna paparan kad
- [ ] Telefon: jadual Senarai Risiko & Senarai Tugasan masih perlu skrol mendatar

---

## Log Kemajuan

| Tarikh | Fasa | Apa yang dilakukan |
|--------|------|--------------------|
| 2026-09-26 | UI butiran | **Butiran risiko sebagai modal** di atas halaman asal (URL `/risiko/:id` kekal; pautan terus/muat semula guna Senarai Risiko sebagai latar; `hooks/useBukaRisiko.js`; senarai latar dimuat semula selepas simpan; klik luar tidak menutup). **Ringkasan** disusun semula: baris label:nilai sejajar dua lajur, huraian risiko, Punca/Kesan bernombor, Diluluskan/Ditolak oleh & pada. **Sejarah** jadi garis masa ikut tarikh dengan ikon jenis aktiviti (no. rujukan berulang dibuang). **Panduan**: kekal reka bentuk asal, warna ikut token tema (cerah & gelap), matriks & tahap ikut `riskMatrix.js`, butang `Button`; butang Panduan outline. Dialog: butang tutup seragam ("Tutup"). Spec 15 +2 ujian modal — E2E **99/99** pada DB kosong & salinan DB sebenar |
| 2026-09-26 | Pindaan & aliran | **Sejarah pindaan**: tab Pindaan di `/risiko/:id` (`GET /pindaan/risiko/:id`, +spec 12) & halaman Pindaan bertab "Menunggu Kelulusan / Sejarah" (`?status=Sejarah`, lajur diproses oleh/tarikh). **No. rujukan `PIN-YYYY-NNNN`** (migrasi 029: nombor rekod lama + indeks unik; dijana dalam transaksi dengan kunci advisori; dalam notifikasi). **Revamp UI pindaan**: satu `BorangPindaan` (penilaian + keberkesanan, justifikasi, ringkasan) di tab Pindaan; dialog `PilihRisikoPindaan`; `PanelKelulusan` (drawer) untuk Senarai Tugasan & Pindaan; 15 fail modal lama dibuang. **Penilaian & Rawatan / Pemantauan**: jalur aliran bersama `AliranKerjaRisiko` (1 Perlu Dinilai → 2 Perlu Rawatan → 3 Dalam Pemantauan → 4 Selesai, berkiraan & boleh diklik), jadual padat + kad telefon + paging; Pemantauan tahap awal → terkini + trend. **Drawer seragam** (`SheetHeader`/`SheetBody`/`SheetFooter`, penuh lebar telefon, bar simpan melekat). Pepijat: `/rawatan/with-status`, `/pemantauan-risiko` & `/pindaan/risks-for-amendment` tidak menapis risiko dipadam/belum lulus. `UKMH_RMS` dimigrasi ke 029 (backup `UKMH_RMS_backup_20260926b`) — E2E **98/98** pada DB kosong & salinan DB sebenar |
| 2026-09-26 | UX | **Pembaikan UX dari walkthrough**: Staff/Ketua Subsidiari mohon pindaan dari tab Penilaian (butang "Mohon Pindaan"); "Pinda" oleh pelulus kini melalui `POST /pindaan` (justifikasi wajib, direkodkan); `GET /risiko/:id` + `pindaan_terkini` (banner menunggu/ditolak); permohonan kedua semasa menunggu → `409`; pindaan diluluskan mengemas kini `status_risiko`; `GET /notifikasi` + `risiko_id`, klik notifikasi membuka rekod, `**tebal**` lama dipapar, "diluluskan oleh <nama>"; daftar risiko terus ke `/risiko/:id` (respons + `no_rujukan`); modal Senarai Tugasan: "Sebab Penolakan", nama syarikat, pautan butiran, `role=dialog`/Escape; label & `*` borang Daftar/Log Masuk; loceng `<button>`; pengepala nama pengguna; menu Laporan untuk Executive; kad statistik telefon dibalut. `UKMH_RMS` dimigrasi ke 028 (backup `UKMH_RMS_backup_20260926`). Spec 17 → 9 ujian; spec 02/13/15 dikemas kini — E2E **94/94** pada DB kosong & salinan DB sebenar |
| 2026-09-26 | UI E2E | Branch cloud `claude/boleh-edit-terus-ke-vrrcbj` di-merge (fast-forward); migrasi 025–027 diuji pada salinan `UKMH_RMS` (data kekal). **Spec 17** `17-ui-aliran-penuh` (7 ujian): Staff log masuk & daftar dari borang → Executive lulus/tolak dari Senarai Tugasan → penilaian → pindaan Staff lulus (Executive) / tolak (Admin) → Executive mohon dari halaman Pindaan (lulus terus). Pepijat dibetulkan: borang Daftar Risiko menghantar `syarikat` bukan `syarikatId` (daftar melalui UI gagal `403` untuk Staff sejak refactor controller); migration 028 `risiko.status_risiko` boleh NULL (pemasangan baharu gagal `500` semasa daftar). To-Do UX ditambah — E2E **92/92** pada DB kosong & salinan DB sebenar |
| 2026-09-25 | Laporan | **Dashboard analitik Laporan**: tab Analitik (lalai) + Jana Laporan PDF; `GET /api/laporan/analitik` (skop syarikat untuk Staff/Ketua Subsidiari, +spec 12); carta perbandingan separuh tahun, syarikat, risiko baharu ikut syarikat, keberkesanan & kategori dengan petunjuk warna, tooltip, paparan jadual, tapisan (syarikat/kategori/julat separuh tahun) dan skrin penuh; palet syarikat disahkan (CVD). Jadual Jana Laporan dikemaskan (lencana tahap berlabel, kategori, butang "Jana PDF"). PDF: warna tahap risiko dikembalikan (satu-satunya warna, berlabel) + jadual petunjuk; setiap log jadi satu jadual 7 lajur sejajar, pindaan sebagai baris jadual. `PageHeader` betul dalam mod gelap. Spec 16 — E2E **85/85** |
| 2026-09-25 | Laporan | **PDF laporan rasmi**: hitam-putih (tiada blok warna; tahap risiko sebagai teks tebal "Sangat Tinggi (ST)"), fon Times, pengepala rasmi (logo, tajuk berpusat, garisan berkembar, no. rujukan & tarikh), klasifikasi "SULIT" dan kaki muka surat pada setiap halaman. Betulkan lebar lajur jadual yang diabaikan (`cellWidth: '20%'` tidak disokong jspdf-autotable → kini mm) |
| 2026-09-25 | Merge | Gabung `main` (`6c63adf`, revamp UI selari dengan nama fail sama) ke branch: 10 konflik diselesaikan dengan mengekalkan versi yang diuji (spec 15); `dapatkanRisiko` & route/import `/risiko/:id` berganda (backend gagal mula jika digabung terus) dibuang; medan `sebab_ditolak_risiko`, `tarikh_kelulusan`, `diluluskan_oleh` dari versi `main` dimasukkan ke query & tab Ringkasan; penambahbaikan `status-stepper` dikekalkan; 4 fail tidak digunakan (`SenaraiInput`, `aliranRisiko`, `paparan`, `pilihan`) dibuang — E2E **83/83** pada DB kosong |
| 2026-09-25 | UI U0–U6 | **Revamp UI butiran risiko**: halaman penuh `/risiko/:id` (pengepala ringkasan, stepper Daftar→Kelulusan→Penilaian→Rawatan→Pemantauan + tindakan seterusnya, tab Ringkasan/Penilaian/Rawatan/Pemantauan/Sejarah, sunting dalam tab, garis masa log + panel sisi); 4 borang bersatu `src/components/risiko/` ganti 10 fail modal (−4,755 baris); Senarai Risiko/Rawatan/Pemantauan buka halaman ini; `GET /api/risiko/:id` (+spec 12) & `status_kelulusan` dalam respons; susun atur responsif (menu luncur < 1024px). Pepijat dibetulkan: sunting pengenalpastian & pinda penilaian sentiasa gagal (`syarikat` vs `syarikatId`), penguncian medan log ikut kebenaran. Spec 15 (5 ujian UI) — E2E **83/83** pada DB kosong |
| 2026-09-25 | Kestabilan | Peranan ikut nama (bukan `peranan_id`), sidebar ikut kebenaran; `helmet` + had kadar IP + buang `console.log`; CI GitHub Actions (lint/build/audit/Docker/E2E pada Postgres kosong, `e2e/seed-ci.mjs`); Docker Compose + `npm run cipta-pentadbir` — E2E **78/78** |
| 2026-09-25 | Tetapan | **Tetapan Sistem + revamp Log Aktiviti**: migration 027 (`tetapan:urus` Admin sahaja → Admin 18 kebenaran; `is_aktif` syarikat/bahagian; `senarai_rujukan` + seed 4 kategori; betulkan ejaan "Pematuhan/Perundangan" yang dikira "Lain-lain" di dashboard). API: syarikat POST/PUT/PATCH status (409 jika ada pengguna aktif), bahagian PUT (tukar nama dikaskad ke `risiko.bahagian`)/PATCH status, `/api/rujukan` (tukar nama dikaskad ke `risiko.kategori`); GET senarai pulang aktif sahaja, `?semua=true` untuk tetapan. Kategori di 4 skrin FE + dashboard kini dari DB (`useSenaraiRujukan`). Log aktiviti: **endpoint padam dibuang** (jejak audit), paging `{data, jumlah}`, tapisan jenis sebenar (`/jenis`, ganti senarai mock), carian, julat tarikh zon MY, **eksport CSV** (dilindungi suntikan formula, dicatat dalam log); `LEFT JOIN syarikat` (pengguna tanpa syarikat dahulu hilang). FE: halaman `/TetapanSistem` (3 tab), `LogAktiviti.jsx` ditulis semula. Spec 14 (6) + 01/04/10/12 dikemas kini — E2E **74/74** |
| 2026-09-25 | Skema | Migration 026: buang `NOT NULL` pada `logpemantauan.tarikh_pemantauan` — migrasi 010 tidak sepadan dengan DB sebenar; pada DB baharu, lulus risiko (log pemantauan awal) & tambah log gagal `500`. Tiada nilai lalai (elak ubah susunan "log terkini"). Suite E2E penuh pada DB baharu dari migrasi: **68/68 lulus** |
| 2026-09-25 | Pengguna | **Kitaran hayat akaun**: migration 025; akaun baharu/reset guna kata laluan sementara (jana crypto, dipapar sekali) + **wajib tukar** pada log masuk (`verifyToken` hadkan kepada `/users/me`, `/auth/tukar-katalaluan`, `/auth/logout`; `403 PERLU_TUKAR_KATALALUAN`); `tukar-katalaluan` pulang token baharu; polisi kata laluan (8+, huruf+nombor); kunci 15 min selepas 5 gagal (`423`); aktif/nyahaktif (login `403` hanya selepas kata laluan sah; token `401`); pentadbir tak boleh reset/nyahaktif/tukar peranan sendiri; Staff/Ketua Subsidiari wajib syarikat. FE: halaman `/tukar-katalaluan`, `UrusPengguna` diolah semula (lajur "Kata Laluan" dibuang; status/log masuk terakhir/ringkasan/reset/nyahaktif), Login papar mesej pelayan + panduan lupa kata laluan. Betulkan import `./Navbar.css` & `./KemaskiniRawatan` (huruf besar/kecil — build gagal di Linux). Spec 13 **7/7**; spec 04 guna kata laluan patuh polisi. Suite tempatan 48 lulus / 2 gagal sedia ada (`logpemantauan.tarikh_pemantauan NOT NULL` — dibetulkan migration 026) |
| 2026-09-25 | — | Siapkan MCP `rms-boost`, agent `rms-architect`, dokumentasi pipeline 00–09, audit revamp v2, daftar Playwright MCP |
| 2026-09-25 | — | Bina fail ini (`PROGRESS.md`) + ikat dalam `opencode.json` instructions + konvensyen commit English |
| 2026-09-25 | 1–7 | **Revamp v2 selesai**: `utils/transaksi.js`; bcrypt (`utils/katalaluan.js`); `authorizeKebenaran` + cache 60s; migrasi 019/020/021; soft-delete menyeluruh (grep `DELETE FROM` = 0); `controllers/` untuk users/bahagian/auth; pindaan:lihat; reflektor `useAuth.js`; smoke test semua endpoint lulus; suite E2E `e2e/` disediakan; docs dikemas kini |
| 2026-09-25 | 6 | Jalankan suite E2E penuh: **21/21 lulus**; tambah `/health`, betulkan kontrak respons login, env transaksi, lifecycle pool DB, dan fixture FK log aktiviti |
| 2026-09-25 | P1 | Tambah migration 022 `token_dikemaskini_at`; `/users/me` kini sumber kebenaran UI; session refresh pada mount/focus/60s; token lama dicabut selepas role/password/staff/syarikat berubah; spec P1 E2E — suite **21/21 lulus** |
| 2026-09-25 | 5 / §2.5 | **Ralat seragam** `{ error }` (±80 respons BE + 7 halaman FE). **Refactor BE**: 48 handler dari 11 `routes/*.js` dipindah ke `controllers/*Controller.js` (salinan AST), matriks risiko 4 salinan → `utils/matriksRisiko.js`, buang kod mati. Pengesahan: 180/180 respons GET identik vs HEAD (5 peranan), lint `no-undef` bersih, E2E 21/21, build FE lulus |
| 2026-09-25 | FE | **Lint frontend 49 → 0 ralat**: 3 modal (penilaian ×2, pengenalpastian) memanggil hook selepas `if (!isOpen) return null` (pepijat terpendam — crash jika dirender tanpa syarat) → dipindah selepas hook; buang import/pemboleh ubah tidak digunakan, fungsi mati `ComparisonView`, NBSP `StatusBadge`; `vite.config.js` guna globals Node. Build + E2E 61/61. **Rancang revamp UI** → `docs/pipeline/11-PLAN-ui-revamp.md` |
| 2026-09-25 | Keselamatan | **Audit bacaan**: `laporan/:id/data-penuh` (semakan controller rosak — guna `req.user.nama_syarikat` yang tiada) → `hadSyarikat`; `log_aktiviti` ditapis syarikat untuk Staff/Ketua Subsidiari (dahulu nampak 4 syarikat); `check-no-rujukan` hanya `{ exists }` (dahulu rekod penuh). Notifikasi, dashboard & senarai disemak selamat. Spec 12 +3 ujian — E2E **61/61** |
| 2026-09-25 | Keselamatan | **IDOR syarikat ditutup**: 11 endpoint tulis + 7 bacaan ikut ID tiada semakan syarikat (Ketua Subsidiari boleh padam risiko syarikat lain, dsb.) → middleware `hadSyarikat` (`middleware/aksesSyarikat.js`) pada route. Spec 11 (aliran tulis penuh, 17 ujian) & spec 12 (isolasi, 4 ujian). Turut: tambah log pemantauan kini terima item string/objek & langkau baris kosong (dahulu 500 / simpan baris kosong); mesej audit padam log kini No. Rujukan (dahulu UUID dilabel "Risiko ID") — E2E **58/58** |
| 2026-09-25 | Dasar | **Executive = Admin** (kecuali `pengguna:urus`/`log:padam`): migration 024 beri `rujukan:urus` kepada Executive, Ketua Subsidiari & Staff (15/12/10) — sebelum ini butang "Tambah Bahagian" dipapar kepada mereka tetapi API tolak 403; pindaan lulus-terus & notifikasi ikut kebenaran `pindaan:lulus` (bukan `"Admin"`); Executive boleh tapis pindaan ikut syarikat; UI Pindaan (statistik, tapisan, lajur Pemohon) & 4 butang edit dalam `ViewRisikoModal` kini untuk Admin & Executive; matriks `01-auth-rbac.md` dijana semula dari DB (baris `rujukan:urus` salah); spec 10 — E2E **37/37** |
| 2026-09-25 | Keselamatan | `npm audit fix` (tanpa `--force`, tiada naik taraf major): backend 4 → 0, frontend 18 → 0 (termasuk 1 critical `tar`). Langsung: multer 2.1.1→2.4.0, axios 1.16.1→1.20.0, react-router-dom 7.15.1→7.18.4, vite 7.3.3→7.3.6, postcss 8.5.14→8.5.28; hanya lockfile berubah. Pengesahan: build FE lulus, lint FE tidak berubah (49/9 sedia ada), E2E **33/33** dengan server baharu, muat naik multipart (multer) disahkan di DB |
| 2026-09-25 | Keselamatan | Migration 023: rehash 5 kata laluan plain-text → bcrypt + isi `token_dikemaskini_at` (lalai `NOW()`; semua pengguna log masuk semula sekali); tutup 37 kebocoran `err.message` dalam respons 5xx (buang cawangan debug SQL pindaan; tambah `console.error` yang tiada); spec 09 pengawal regresi — E2E **33/33** |
| 2026-09-25 | §2.1 | `npm run purge` (`scripts/purge.js`): buang kekal `notifikasi`/`log_aktiviti` soft-delete > 365 hari; pratonton lalai, `--laksana --oleh` (pengguna:urus), transaksi + log audit; betulkan kebocoran sambungan `config/db.js` (`pool.connect()` tanpa release); spec 08 — E2E **30/30**. Tambah peraturan AGENTS: jangan hardcode kunci API/rahsia di FE |
| 2026-09-25 | §1.5 | `POST /api/roles/flush-cache` (`pengguna:urus`) + `kosongkanCacheKebenaran()` + log aktiviti; spec 07 (kebenaran baharu hanya berkuat kuasa selepas flush; matriks dipulihkan) — E2E **27/27** |
| 2026-09-25 | §2.2 | Penerima notifikasi ikut **kebenaran** (`dapatkanPenerimaIkutKebenaran`) + fallback pentadbir; betulkan bug Executive (`pindaan:lulus`) tidak dimaklumkan permohonan pindaan baru; buang 9 komen sejarah yang tertinggal; spec 06 — E2E **25/25** |
| 2026-09-25 | 5 | **Kemas kod BE**: buang semua emoji (±110 baris) & nota "DIKEMASKINI/Kekal Sama", buang SQL mati dikomen di dashboard; pasang Prettier 3 + `.prettierrc.json` + skrip `format`/`format:check`, format semua fail `.js`. Pengesahan: 180/180 respons GET identik vs HEAD, E2E 21/21 |
| 2026-09-25 | 7 | Audit docs selepas revamp/P1: kemas kini `00-general.md` (authorizeKebenaran, `/health`, controllers), `08-pengguna-notifikasi-log.md` (kebenaran per route, soft-delete, `/users/me` + pencabutan token), `01-auth-rbac.md` (interceptor 401, nota `NULL` revision), `09` (migrasi 022), root `README.md` (respons login, endpoint auth, 22 migrasi) |

---

## Rekod / Nota

- **Migrasi sedia**: 001–029 (29 migrasi; 029 = no. rujukan pindaan `PIN-YYYY-NNNN`; 025 = status akaun pengguna, 026 = `tarikh_pemantauan` boleh NULL, 027 = Tetapan Sistem, 028 = `status_risiko` boleh NULL — jalankan `npm run migrate` kemudian `POST /api/roles/flush-cache`).
- Jadual `is_deleted` + `deleted_at`: 11 jadual (migration 015) + `pengguna`,
  `notifikasi` (migration 019). Semua query pembacaan menapis `is_deleted = false`.
- `kebenaran` / `peranan_kebenaran` (migration 014 seed dalam 020/021) kini
  **aktif** — 18 kebenaran; `authorizeKebenaran` di semua route sensitif.
- Jumlah kebenaran per peranan (disahkan): Admin 18, Executive 15,
  Ketua Subsidiari 12, Staff 10, Viewer 5.
- Dasar: Executive = Admin untuk kerja risiko/pindaan; hanya `pengguna:urus`, `tetapan:urus` &
  `log:padam` kekal Admin. `rujukan:urus` (tambah bahagian) untuk semua
  pendaftar risiko: Admin, Executive, Ketua Subsidiari, Staff.
- Kata laluan: **semua** bcrypt (migration 023 menukar baki plain-text).
  Semua pengguna ada `token_dikemaskini_at` (lalai `NOW()`). Reset oleh
  pentadbir menjana kata laluan sementara (migration 025); polisi min 8 aksara,
  huruf + nombor.
- `verifyToken` menolak pengguna `is_deleted=true` dan token lama melalui
  `token_dikemaskini_at`.
- Kredensial ujian E2E: `e2e/tests/helpers.mjs` (Admin UKMH001/1234, dsb.).
- Suite E2E Playwright: **99/99 lulus** pada 2026-09-26 (spec 01–17).
- `npm audit`: **0 kerentanan** di backend & frontend (2026-09-25).
- `npm run build` frontend lulus (termasuk Linux, selepas betulkan import
  huruf besar/kecil); `npm run lint` 0 error, 9 warning sedia ada.
- Dikenal pasti & difailkan untuk lanjutan: penamaan jadual (§2.4) — rujuk
  `docs/pipeline/10-PLAN-lanjutan.md`.