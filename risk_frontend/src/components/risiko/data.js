// Logik data (tanpa JSX) untuk borang & halaman butiran risiko
import { hasKebenaran } from "@/utils/auth";
import { formatSeparuhTahun } from "@/utils/formatters";

export const bersihkanSenarai = (senarai) =>
  (senarai || []).map((s) => String(s ?? "").trim()).filter(Boolean);

/** Tukar data senarai API (tatasusunan / rentetan "a; b") kepada tatasusunan teks */
export const keSenarai = (nilai) => {
  if (Array.isArray(nilai)) {
    return nilai
      .map((x) =>
        typeof x === "string"
          ? x
          : x?.butiran_aktiviti || x?.butiran_kakitangan || x?.text || x?.punca || x?.kesan || ""
      )
      .filter(Boolean);
  }
  if (typeof nilai === "string" && nilai.trim() && nilai.trim() !== "-") {
    return nilai
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

export const adaPenilaian = (r) =>
  Number(r?.skor_kebarangkalian) > 0 && Number(r?.skor_impak) > 0;

export const adaRawatan = (r) => Boolean(r?.rawatan_id || (r?.jenis_kawalan && r.jenis_kawalan !== "-"));

const STATUS_PEMANTAUAN_TAMAT = ["Selesai", "Tutup"];

/**
 * Peringkat aliran kerja risiko: Daftar -> Kelulusan -> Penilaian -> Rawatan
 * -> Pemantauan. Dikira daripada data sedia ada (tiada medan baharu).
 * Setiap peringkat: status "selesai" | "semasa" | "belum" | "ditolak".
 * Log pemantauan "Buka" dicipta automatik semasa kelulusan, jadi pemantauan
 * dianggap bermula selepas rawatan wujud.
 */
export const kiraPeringkat = (risiko, logs = []) => {
  const kelulusan = risiko?.status_kelulusan;
  const diluluskan = !kelulusan || kelulusan === "Diluluskan";
  const dinilai = adaPenilaian(risiko);
  const dirawat = adaRawatan(risiko);
  const logTerkini = logs[0];
  const pemantauanTamat =
    dirawat && logTerkini && STATUS_PEMANTAUAN_TAMAT.includes(logTerkini.status_pemantauan);

  const peringkat = [
    { id: "daftar", label: "Daftar", status: "selesai" },
    {
      id: "kelulusan",
      label: "Kelulusan",
      status: kelulusan === "Ditolak" ? "ditolak" : diluluskan ? "selesai" : "semasa",
    },
    { id: "penilaian", label: "Penilaian", status: dinilai ? "selesai" : "belum" },
    { id: "rawatan", label: "Rawatan", status: dirawat ? "selesai" : "belum" },
    { id: "pemantauan", label: "Pemantauan", status: pemantauanTamat ? "selesai" : "belum" },
  ];

  // Peringkat pertama yang belum selesai ialah peringkat semasa
  if (diluluskan) {
    const semasa = peringkat.find((p) => p.status === "belum");
    if (semasa) semasa.status = "semasa";
  }
  return peringkat;
};

// Admin & Executive (pemegang pindaan:lulus) boleh meminda terus semua bahagian;
// peranan lain meminda melalui aliran Pindaan.
export const bolehPindaTerus = () => hasKebenaran("pindaan:lulus");

/**
 * Tindakan seterusnya untuk pengguna semasa, atau null jika tiada.
 * Kebenaran sepadan dengan route backend.
 */
export const tindakanSeterusnya = (risiko, peringkat) => {
  const semasa = peringkat.find((p) => p.status === "semasa");
  if (!semasa) return null;
  switch (semasa.id) {
    case "kelulusan":
      return {
        teks: "Menunggu kelulusan risiko",
        tab: null,
        boleh: false,
      };
    case "penilaian":
      return {
        teks: "Buat penilaian risiko",
        tab: "penilaian",
        boleh: hasKebenaran("risiko:nilai", "rawatan:urus"),
      };
    case "rawatan":
      return { teks: "Tambah rawatan risiko", tab: "rawatan", boleh: hasKebenaran("rawatan:urus") };
    case "pemantauan":
      return {
        teks: "Rekod log pemantauan",
        tab: "pemantauan",
        boleh: hasKebenaran("pemantauan:urus"),
      };
    default:
      return null;
  }
};

/**
 * Payload penuh PUT /api/risiko/:id. Endpoint menulis semula semua medan
 * (termasuk syarikatId & punca/kesan), jadi nilai sedia ada mesti dihantar
 * semula bersama perubahan.
 */
export const payloadKemaskiniRisiko = (risiko, perubahan = {}) => ({
  noRujukan: risiko.no_rujukan,
  tahun: risiko.tahun,
  separuhTahun: risiko.separuh_tahun,
  syarikatId: risiko.syarikat_id,
  kategori: risiko.kategori,
  bahagian: risiko.bahagian,
  risiko: risiko.risiko,
  punca: keSenarai(risiko.punca),
  kesan: keSenarai(risiko.kesan),
  skorKebarangkalian: risiko.skor_kebarangkalian ?? null,
  skorImpak: risiko.skor_impak ?? null,
  skorRisiko: risiko.skor_risiko ?? null,
  statusRisiko: risiko.status_risiko,
  ...perubahan,
});

// Jenis kawalan kekal tetap: dashboard & laporan mengira ikut nilai ini
export const JENIS_KAWALAN = [
  {
    nilai: "Elak",
    label:
      "Elak – Berhenti menjalankan aktiviti / program atau mengubah objektif aktiviti yang boleh menyebabkan risiko",
  },
  { nilai: "Kurang", label: "Kurang – Mengurangkan kebarangkalian dan impak risiko" },
  { nilai: "Pindah", label: "Pindah – Pindahkan risiko" },
  { nilai: "Terima", label: "Terima – Menerima risiko" },
];

// Status pemantauan: logik dashboard & aliran bergantung pada nilai ini
export const STATUS_PEMANTAUAN = ["Buka", "Sedang Dilaksanakan", "Pemantauan", "Selesai", "Tutup"];

/** Saiz halaman senarai kerja risiko */
export const SAIZ_HALAMAN = 20;

/** Pilihan "2026 · Kedua" daripada senarai rekod, terkini dahulu. Nilai: "2026-2". */
export function pilihanSesi(rekod, ambil) {
  const set = new Map();
  for (const r of rekod) {
    const [tahun, separuh] = ambil(r);
    if (!tahun) continue;
    const kunci = `${tahun}-${separuh || ""}`;
    set.set(kunci, { kunci, tahun: Number(tahun), separuh: Number(separuh) || 0 });
  }
  return [...set.values()]
    .sort((a, b) => b.tahun - a.tahun || b.separuh - a.separuh)
    .map((s) => ({
      nilai: s.kunci,
      label: s.separuh ? `${s.tahun} · ${formatSeparuhTahun(s.separuh)}` : String(s.tahun),
    }));
}

/**
 * Peringkat aliran kerja bagi risiko yang diluluskan (bentuk rekod
 * GET /pemantauan-risiko): penilaian → rawatan → pemantauan → selesai.
 * Risiko yang ditutup dikira selesai walaupun peringkat awal tidak lengkap.
 */
export const peringkatAliran = (r) => {
  if (["Selesai", "Tutup"].includes(r.status_pemantauan_terkini)) return "selesai";
  if (!(Number(r.skor_kebarangkalian_awal) > 0 && Number(r.skor_impak_awal) > 0)) return "penilaian";
  if (!r.ada_rawatan) return "rawatan";
  return "pemantauan";
};
