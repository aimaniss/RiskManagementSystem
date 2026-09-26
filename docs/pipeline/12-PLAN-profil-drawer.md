# PLAN — Profil Pengguna, Urus Pengguna & Drawer

Kemas kini UI bagi menu profil (klik gambar di navbar), modal **Kemaskini Profil**,
modal **Tambah/Edit Pengguna**, dan semua kandungan drawer (`Sheet`). Setiap fasa
= satu commit (`feat:` / `fix:` / `style:`), diuji E2E penuh pada `rms_test`.

Status: 📋 dirancang → 🔄 sedang → ✅ siap

## Masalah semasa (semakan 2026-09-26)

| Bahagian | Masalah |
|----------|---------|
| Menu profil | Ikon lalai besar, butang biru penuh lebar sebagai satu-satunya tindakan, tiada Log Keluar, tiada sokongan papan kekunci (Escape) / `aria` |
| Modal Kemaskini Profil | Modal CSS tersuai (bukan `Dialog`), butang fail pelayar "Choose File No file chosen" (Bahasa Inggeris), medan baca-sahaja kelihatan boleh disunting, medan kata laluan sempit & ikon mata di luar kotak, label "Staff ID", polisi kata laluan tidak disemak secara langsung |
| Modal Tambah/Edit Pengguna | Butang fail pelayar Bahasa Inggeris, pratonton gambar dengan ikon padam terapung, semua medan satu lajur panjang |
| Drawer (`Sheet`) | Lencana/tajuk rapat dengan butang tutup, cincin fokus muncul pada butang tutup ketika dibuka, gaya label/nilai berbeza antara drawer (Log Aktiviti, Pemantauan, Kelulusan) |
| Backend muat naik | `multer()` tanpa had saiz/jenis — sebarang fail sebarang saiz disimpan ke `pengguna.gambar_profil` |

## Fasa

### P1 — Had muat naik gambar profil (backend) — `fix(pengguna)` ✅
- [x] `middleware/muatNaikGambar.js` (`muatNaikGambarProfil`): `multer({ limits: { fileSize: 2 MB }, fileFilter: image/png|jpeg|webp })`, dipakai 3 route dalam `routes/users.js`
- [x] Ralat multer dipulangkan sebagai `400 { error: "..." }` (BM), bukan 500
- [x] E2E: muat naik fail bukan imej / > 2 MB ditolak (spec 13)

### P2 — Komponen dikongsi: Avatar & PemilihGambar — `feat(ui)`
- [ ] `components/ui/avatar.jsx`: gambar atau inisial nama (bukan ikon lalai), saiz sm/md/lg
- [ ] `components/PemilihGambar.jsx`: pratonton bulat + butang "Pilih gambar"/"Tukar" & "Buang"
      (input fail tersembunyi, teks BM), semakan jenis & saiz ≤ 2 MB di klien
- [ ] Guna Avatar dalam senarai Urus Pengguna

### P3 — Menu profil navbar — `feat(navbar)`
- [ ] Pencetus: Avatar + nama/peranan (butang sebenar, `aria-haspopup`, `aria-expanded`)
- [ ] Panel: Avatar, nama, ID staf, lencana peranan · syarikat; item menu
      "Kemaskini profil" & "Log keluar" (merah); tutup dengan Escape / klik luar

### P4 — Modal Kemaskini Profil — `feat(profil)`
- [ ] Tukar kepada komponen `Dialog` (tema cerah/gelap, Escape, fokus)
- [ ] Bahagian: Gambar profil (PemilihGambar) · Maklumat akaun (senarai label:nilai, bukan input) ·
      Tukar kata laluan (pilihan) dengan ikon mata dalam medan & senarai semak polisi langsung
- [ ] Buang CSS modal lama dalam `navbar.css`

### P5 — Modal Tambah/Edit Pengguna — `feat(pengguna)`
- [ ] PemilihGambar menggantikan input fail pelayar
- [ ] Susun atur dua lajur (ID Staf + Nama; Peranan + Syarikat) pada skrin ≥ sm, satu lajur pada telefon
- [ ] Bahagian bertajuk & ralat seragam

### P6 — Drawer (`Sheet`) seragam — `style(ui)`
- [ ] `sheet.jsx`: ruang tajuk tidak bertindih butang tutup, tiada cincin fokus automatik ketika dibuka,
      `SheetSection` (tajuk bahagian seragam)
- [ ] Komponen `SenaraiMedan`/`BarisMedan` dikongsi untuk pasangan label:nilai
- [ ] Guna dalam drawer Log Aktiviti, Log Pemantauan (TabPemantauan) & Panel Kelulusan

### P7 — Ujian & dokumentasi — `docs`
- [ ] E2E penuh lulus; kemas kini `PROGRESS.md`, `08-pengguna-notifikasi-log.md`
