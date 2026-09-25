# 11 — PLAN Revamp UI: Penilaian, Rawatan & Pemantauan

> **Status: 📋 Dirancang (2026-09-25)** — belum dimulakan. Keputusan reka bentuk
> (§4) perlu dipersetujui sebelum Fasa U1. Permintaan pengguna: UI perlu
> mengikut aliran kerja sebenar; tumpuan pada **penilaian, rawatan dan
> pemantauan**, terutamanya **modal butiran risiko yang terlalu sesak**.

---

## 1. Masalah semasa (diaudit dari kod)

### 1.1 Modal butiran risiko terlalu sesak

`src/pages/SenaraiRisiko/ViewRisikoModal.jsx` (≈1,000 baris) memaparkan
**empat bahagian dalam satu skrol panjang** dalam modal `max-w-4xl`,
`max-h-[92vh]`:

1. Pengenalpastian Risiko — medan asas + punca + kesan
2. Penilaian Risiko — skor kebarangkalian × impak, tahap, justifikasi
3. Rawatan Risiko — jenis kawalan, tempoh, pelan tindakan, kakitangan
4. Pemantauan Risiko — ringkasan (kekerapan, status, sesi terkini) + senarai
   semua kad log, setiap satu dengan butang edit/padam

Kesan: pengguna perlu skrol jauh untuk sampai ke pemantauan (bahagian yang
paling kerap dikemas kini); semua bahagian sama berat secara visual; butang
edit tersebar di setiap bahagian; modal edit dibuka **di atas** modal ini
(modal bersarang) sehingga konteks hilang.

### 1.2 Borang bertindih merentas modul

Aliran yang sama dilaksanakan beberapa kali dengan UI berbeza:

| Aliran | Fail (baris) | Dibuka dari |
|--------|--------------|-------------|
| Penilaian | `RawatanRisiko/PenilaianModal.jsx` (286), `SenaraiRisiko/PenilaianRisikoModal.jsx` (243) | Rawatan Risiko, butiran risiko |
| Rawatan | `RawatanRisiko/EditRawatan.jsx` (454), `SenaraiRisiko/kemaskinirawatan.jsx` (342) | Rawatan Risiko, butiran risiko |
| Pemantauan | `PemantauanRisiko/TambahLogModal.jsx` (664), `PemantauanRisiko/EditPemantauan.jsx` (666), `SenaraiRisiko/KemaskiniPemantauan.jsx` (609) | Pemantauan Risiko, butiran risiko |

≈3,300 baris untuk tiga aliran; pembetulan pepijat perlu dibuat di beberapa
tempat (cth. item senarai kosong pemantauan — lihat 10-PLAN §2.7) dan
tingkah laku boleh berbeza bergantung dari mana borang dibuka.

### 1.3 Aliran tidak kelihatan

Kitar hayat risiko adalah berperingkat — **Daftar → Lulus → Nilai → Rawat →
Pantau (berulang setiap separuh tahun) → Pindaan** — tetapi UI tidak
menunjukkan di peringkat mana sesuatu risiko berada atau tindakan seterusnya.

---

## 2. Matlamat

1. Modal/halaman butiran risiko mudah dibaca: satu fokus pada satu masa.
2. UI mengikut aliran: jelas peringkat semasa & tindakan seterusnya.
3. Satu komponen borang untuk setiap aliran (penilaian, rawatan, log
   pemantauan), digunakan semula di semua modul.
4. Tiada perubahan API (backend sudah diuji — spec 11/12); perubahan UI
   sahaja.
5. Kekalkan RBAC sedia ada (butang ikut `hasKebenaran` / `PERANAN_PENUH`).

## 3. Skop

**Dalam skop:** butiran risiko (`ViewRisikoModal`), borang penilaian, rawatan
& log pemantauan, halaman Rawatan Risiko & Pemantauan Risiko.

**Luar skop (buat masa ini):** Daftar Risiko, Pindaan, Laporan, Dashboard,
Urus Pengguna.

## 4. Keputusan reka bentuk (perlu dipersetujui)

| # | Soalan | Pilihan | Cadangan |
|---|--------|---------|----------|
| D1 | Bentuk paparan butiran | (a) Modal bertab, (b) Drawer/Sheet sisi kanan bertab, (c) Halaman penuh `/risiko/:id` | **(c) Halaman penuh** — ruang cukup, boleh dipautkan (URL), tiada modal bersarang; atau (b) jika mahu kekal dalam senarai |
| D2 | Susunan maklumat | Tab: Ringkasan · Penilaian · Rawatan · Pemantauan · Sejarah | Tab + **pengepala ringkasan tetap** (No. Rujukan, syarikat, tahap risiko semasa, status kelulusan, peringkat aliran) |
| D3 | Paparan aliran | Stepper Daftar → Lulus → Nilai → Rawat → Pantau | Stepper dalam pengepala, peringkat semasa ditonjolkan + butang "tindakan seterusnya" |
| D4 | Log pemantauan | Senarai kad penuh / garis masa ringkas + butiran bila diklik | **Garis masa ringkas** (sesi, skor, status) — butiran & edit dalam panel, bukan modal atas modal |
| D5 | Edit | Modal bersarang / sunting dalam tab | **Sunting dalam tab** (mod lihat ↔ mod edit) |

## 5. Fasa pelaksanaan

| Fasa | Kerja | Kriteria selesai |
|------|-------|------------------|
| **U0** | Setuju keputusan D1–D5; lakar wireframe ringkas (skrin utama sahaja) | Keputusan direkod dalam dokumen ini |
| **U1** | Satukan borang: `BorangPenilaian`, `BorangRawatan`, `BorangLogPemantauan` dalam `src/components/risiko/` — gantikan 7 fail di §1.2 | Semua pintu masuk guna komponen sama; tiada perubahan tingkah laku; build + E2E lulus |
| **U2** | Paparan butiran baharu (ikut D1/D2) dengan tab + pengepala ringkasan; buang skrol panjang | Setiap tab muat tanpa skrol berlebihan pada 1366×768 |
| **U3** | Stepper aliran + "tindakan seterusnya" (D3) | Peringkat dikira dari data sedia ada (status_kelulusan, ada penilaian/rawatan/log) |
| **U4** | Garis masa pemantauan + sunting dalam tab (D4/D5); buang modal bersarang | Tiada modal dibuka di atas modal |
| **U5** | Kemas halaman Rawatan Risiko & Pemantauan Risiko supaya membuka paparan butiran yang sama | Satu cara untuk melihat/menyunting risiko |
| **U6** | Ujian UI Playwright untuk aliran nilai → rawat → pantau melalui UI (bukan API sahaja) + semakan paparan telefon | Spec UI baharu lulus; tiada skrol mendatar pada lebar telefon |

## 6. Risiko & mitigasi

- **Regresi tingkah laku borang** semasa penyatuan (U1) — ujian API spec 11
  melindungi backend; tambah ujian UI (U6) sebelum membuang fail lama.
- **Perubahan kebiasaan pengguna** — kekalkan label & istilah BM sedia ada;
  perubahan susun atur sahaja.
- **Skop merebak** — Daftar Risiko & Pindaan kekal luar skop sehingga U6 siap.

## 7. Rujukan

- Aliran backend: `02-risiko.md`, `03-rawatan.md`, `04-pemantauan.md`
- Pengasingan syarikat & ujian aliran tulis: `10-PLAN-lanjutan.md` §2.7,
  `e2e/tests/11-aliran-tulis.spec.mjs`, `12-isolasi-syarikat.spec.mjs`
