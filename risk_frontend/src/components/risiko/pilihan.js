// Pemalar & utiliti (bukan komponen) untuk borang risiko.

export const KATEGORI_RISIKO = ["Operasi", "Kewangan", "Strategik", "Pematuhan / Perundangan"];

export const JENIS_KAWALAN = [
  { nilai: "Terima", label: "Terima – Menerima risiko" },
  { nilai: "Kurang", label: "Kurang – Mengurangkan kebarangkalian dan impak risiko" },
  { nilai: "Pindah", label: "Pindah – Pindahkan risiko" },
  {
    nilai: "Elak",
    label: "Elak – Berhenti menjalankan aktiviti atau mengubah objektif yang menyebabkan risiko",
  },
];

export const STATUS_PEMANTAUAN = ["Buka", "Sedang Dilaksanakan", "Pemantauan", "Selesai", "Tutup"];

// Senarai pilihan + nilai semasa jika tiada dalam senarai (elak nilai lama hilang senyap)
export const denganNilaiSemasa = (senarai, semasa) =>
  semasa && !senarai.includes(semasa) ? [...senarai, semasa] : senarai;

export const bersihkanSenarai = (senarai) =>
  (senarai || []).map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);

export const mesejRalat = (err, lalai) => err?.response?.data?.error || lalai;
