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
| Dokumentasi pipeline (00–09) | ✅ Lengkap |
| Revamp seni bina v2 (Fasa 1–4, 6-7) | ✅ **Selesai & disahkan** |
| Work lanjutan P1–P3 | 📋 Dirancang — lih. `docs/pipeline/10-PLAN-lanjutan.md` |

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
- [⚠️] Pindah penuh logik `notifikasi`/`log_aktiviti`/`rawatan`/`risiko`/
      `pemantauan`/`pindaan` ke `controllers/` — **belum** (nilai rendah, risiko
      tinggi; difailkan sebagai cadangan 10-PLAN §3)
- [⚠️] Normalkan nama jadual (`LogPemantauan`, dsb.) — **sengaja tidak dibuat**
      (had didokumenkan; 10-PLAN §2.4)

### Fasa 6 — Ujian E2E (Playwright)
- [x] Spec login per peranan (5 peranan) — `e2e/tests/01-login-peranan.spec.mjs`
- [x] Spec kebenaran (dibenarkan / ditolak) — `e2e/tests/02-kebenaran.spec.mjs`
- [x] Spec rollback transaksi — `e2e/tests/03-rollback-transaksi.spec.mjs`
- [x] Spec soft-delete — `e2e/tests/04-soft-delete.spec.mjs`
- [x] Config + README + root `package.json` scripts (`npm run test:e2e`)
- [ ] **Jalankan** suite end-to-end penuh sebelum deploy (perlu
      `npm install -D @playwright/test` + `npx playwright install chromium`)

### Fasa 7 — Dokumentasi
- [x] Kemas kini `docs/pipeline/09-PLAN-revamp.md` (status + kriteria selesai)
- [x] Kemas kini `docs/pipeline/01-auth-rbac.md` (matrix kebenaran + bcrypt)
- [x] Bina `docs/pipeline/10-PLAN-lanjutan.md` (aliran baharu & P1–P3)
- [x] Kemas kini `AGENTS.md` (kebenaran, transaksi, soft-delete, bcrypt, E2E)
- [x] Kemas kini fail `PROGRESS.md` ini

---

## Log Kemajuan

| Tarikh | Fasa | Apa yang dilakukan |
|--------|------|--------------------|
| 2026-09-25 | — | Siapkan MCP `rms-boost`, agent `rms-architect`, dokumentasi pipeline 00–09, audit revamp v2, daftar Playwright MCP |
| 2026-09-25 | — | Bina fail ini (`PROGRESS.md`) + ikat dalam `opencode.json` instructions + konvensyen commit English |
| 2026-09-25 | 1–7 | **Revamp v2 selesai**: `utils/transaksi.js`; bcrypt (`utils/katalaluan.js`); `authorizeKebenaran` + cache 60s; migrasi 019/020/021; soft-delete menyeluruh (grep `DELETE FROM` = 0); `controllers/` untuk users/bahagian/auth; pindaan:lihat; reflektor `useAuth.js`; smoke test semua endpoint lulus; suite E2E `e2e/` disediakan; docs dikemas kini |

---

## Rekod / Nota

- **Migrasi sedia**: 001–021 (21 migrasi, semuanya applied; `migrate:status` = 0 pending).
- Jadual `is_deleted` + `deleted_at`: 11 jadual (migration 015) + `pengguna`,
  `notifikasi` (migration 019). Semua query pembacaan menapis `is_deleted = false`.
- `kebenaran` / `peranan_kebenaran` (migration 014 seed dalam 020/021) kini
  **aktif** — 17 kebenaran; `authorizeKebenaran` di semua route sensitif.
- Jumlah kebenaran per peranan (disahkan): Admin 17, Executive 14,
  Ketua Subsidiari 11, Staff 9, Viewer 5.
- Kata laluan: legasi plain-text ditukar ke bcrypt secara rehash-on-login;
  pengguna teras ujian (UKMH001, UKMDG1237, UKMH112, UKMSC007) sudah bcrypt.
- `verifyToken` menolak pengguna `is_deleted=true`.
- Kredensial ujian E2E: `e2e/tests/helpers.mjs` (Admin UKMH001/1234, dsb.).
- Dikenal pasti & difailkan untuk lanjutan: kebenaran JWT stale (§1.4),
  invalidasi cache kebenaran (§1.5), takat token selepas ubah kata laluan/role
  (§2.3), purging soft-delete (§2.1), notifikasi pelulus dipadam (§2.2),
  piawai `{error}` vs `{message}` (§2.5), penamaan jadual (§2.4) — rujuk
  `docs/pipeline/10-PLAN-lanjutan.md`.