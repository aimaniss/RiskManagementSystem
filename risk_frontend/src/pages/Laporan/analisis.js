// Agregasi paparan Analisis Risiko di halaman Laporan (data dari GET /laporan/analitik).
// Tempoh = separuh tahun; kunci = tahun * 2 + (separuh - 1) supaya boleh
// dibandingkan secara berangka.

import { getRiskColor } from "@/constants/riskMatrix";

export const TAHAP = [
  { kod: "R", label: "Rendah" },
  { kod: "S", label: "Sederhana" },
  { kod: "T", label: "Tinggi" },
  { kod: "ST", label: "Sangat Tinggi" },
];
export const BELUM_DINILAI = "Belum Dinilai";
export const WARNA_BELUM_DINILAI = "#94a3b8";

export const SIRI_TAHAP = [
  ...TAHAP.map((t) => ({ kunci: t.label, label: `${t.label} (${t.kod})`, warna: getRiskColor(t.kod) })),
  { kunci: BELUM_DINILAI, label: BELUM_DINILAI, warna: WARNA_BELUM_DINILAI },
];

// Warna status (good / critical) untuk keberkesanan, sentiasa berlabel.
export const SIRI_KEBERKESANAN = [
  { kunci: "Berkesan", label: "Berkesan", warna: "#0ca30c" },
  { kunci: "Tidak Berkesan", label: "Tidak Berkesan", warna: "#d03b3b" },
];

// Palet kategori tetap (disahkan untuk penglihatan warna); warna mengikut
// syarikat, bukan kedudukan, jadi tapisan tidak mewarna semula siri.
const PALET_TERANG = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const PALET_GELAP = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
export const WARNA_LAIN = "#8a8a8a";
export const MAKS_SIRI = PALET_TERANG.length;

export const kunciTempoh = (tahun, separuh) =>
  tahun ? Number(tahun) * 2 + ((Number(separuh) || 1) - 1) : null;

export const labelTempoh = (kunci) => {
  const tahun = Math.floor(kunci / 2);
  return kunci % 2 === 0 ? `Jan–Jun ${tahun}` : `Jul–Dis ${tahun}`;
};

const labelTahap = (kod) => TAHAP.find((t) => t.kod === kod)?.label || BELUM_DINILAI;

export function warnaSyarikat(senaraiSyarikat, gelap) {
  const palet = gelap ? PALET_GELAP : PALET_TERANG;
  const peta = {};
  senaraiSyarikat.forEach((s, i) => {
    peta[s.syarikat_id] = i < MAKS_SIRI ? palet[i] : WARNA_LAIN;
  });
  return peta;
}

// Sediakan log per risiko (tersusun ikut tempoh) sekali sahaja.
export function sediakanData({ risiko = [], pemantauan = [], syarikat = [] }) {
  const logIkutRisiko = new Map();
  for (const log of pemantauan) {
    const k = kunciTempoh(log.tahun, log.separuh_tahun);
    if (k === null) continue;
    const senarai = logIkutRisiko.get(log.risiko_id) || [];
    senarai.push({ ...log, kunci: k });
    logIkutRisiko.set(log.risiko_id, senarai);
  }
  for (const senarai of logIkutRisiko.values()) {
    senarai.sort(
      (a, b) => a.kunci - b.kunci || String(a.tarikh_pemantauan).localeCompare(String(b.tarikh_pemantauan))
    );
  }
  const namaSyarikat = Object.fromEntries(syarikat.map((s) => [s.syarikat_id, s.nama_syarikat]));
  const senaraiRisiko = risiko.map((r) => ({
    ...r,
    kunci: kunciTempoh(r.tahun, r.separuh_tahun),
    nama_syarikat: namaSyarikat[r.syarikat_id] || "Tiada Syarikat",
    log: logIkutRisiko.get(r.id) || [],
  }));

  const semuaKunci = new Set();
  senaraiRisiko.forEach((r) => r.kunci !== null && semuaKunci.add(r.kunci));
  pemantauan.forEach((l) => {
    const k = kunciTempoh(l.tahun, l.separuh_tahun);
    if (k !== null) semuaKunci.add(k);
  });
  const tempoh = [];
  if (semuaKunci.size) {
    const min = Math.min(...semuaKunci);
    const max = Math.max(...semuaKunci);
    for (let k = min; k <= max; k++) tempoh.push(k);
  }
  const kategori = [...new Set(senaraiRisiko.map((r) => r.kategori).filter(Boolean))].sort();
  return { risiko: senaraiRisiko, tempoh, kategori, syarikat };
}

// Tahap risiko pada akhir tempoh `k`: log pemantauan terkini sehingga `k`,
// jika tiada, penilaian awal. `null` jika risiko belum didaftar pada `k`.
export function tahapPada(risiko, k) {
  if (risiko.kunci === null || risiko.kunci > k) return null;
  let skor = risiko.skor_awal;
  for (const log of risiko.log) {
    if (log.kunci > k) break;
    if (log.skor_risiko) skor = log.skor_risiko;
  }
  return labelTahap(skor);
}

const barisKosongTahap = () => Object.fromEntries(SIRI_TAHAP.map((s) => [s.kunci, 0]));

export function tapisRisiko(data, { syarikat, kategori }) {
  return data.risiko.filter(
    (r) =>
      (syarikat === "all" || String(r.syarikat_id) === String(syarikat)) &&
      (kategori === "all" || r.kategori === kategori)
  );
}

export function profilIkutTempoh(risiko, tempoh) {
  return tempoh.map((k) => {
    const baris = { nama: labelTempoh(k), ...barisKosongTahap() };
    for (const r of risiko) {
      const t = tahapPada(r, k);
      if (t) baris[t]++;
    }
    return baris;
  });
}

function profilIkut(risiko, k, kumpulan) {
  const peta = new Map();
  for (const r of risiko) {
    const t = tahapPada(r, k);
    if (!t) continue;
    const nama = kumpulan(r);
    if (!peta.has(nama)) peta.set(nama, { nama, ...barisKosongTahap() });
    peta.get(nama)[t]++;
  }
  const jumlah = (b) => SIRI_TAHAP.reduce((s, x) => s + b[x.kunci], 0);
  return [...peta.values()].sort((a, b) => jumlah(b) - jumlah(a));
}

export const profilIkutSyarikat = (risiko, k) => profilIkut(risiko, k, (r) => r.nama_syarikat);
export const profilIkutKategori = (risiko, k) => profilIkut(risiko, k, (r) => r.kategori || "Tiada Kategori");

// Risiko baharu ikut tempoh, satu siri per syarikat. Syarikat selepas slot
// palet ke-8 dilipat ke "Lain-lain".
export function baharuIkutSyarikat(risiko, tempoh, senaraiSyarikat, warna) {
  const siri = [];
  const kunciSiri = {};
  senaraiSyarikat.forEach((s, i) => {
    const kunci = i < MAKS_SIRI ? s.nama_syarikat : "Lain-lain";
    kunciSiri[s.syarikat_id] = kunci;
    if (!siri.find((x) => x.kunci === kunci)) {
      siri.push({ kunci, label: kunci, warna: i < MAKS_SIRI ? warna[s.syarikat_id] : WARNA_LAIN });
    }
  });
  const ada = new Set();
  const baris = tempoh.map((k) => {
    const b = { nama: labelTempoh(k) };
    siri.forEach((s) => (b[s.kunci] = 0));
    for (const r of risiko) {
      if (r.kunci !== k) continue;
      const kunci = kunciSiri[r.syarikat_id] || "Lain-lain";
      b[kunci] = (b[kunci] || 0) + 1;
      ada.add(kunci);
    }
    return b;
  });
  return { baris, siri: siri.filter((s) => ada.has(s.kunci)) };
}

export function keberkesananIkutTempoh(risiko, tempoh) {
  return tempoh.map((k) => {
    const b = { nama: labelTempoh(k), Berkesan: 0, "Tidak Berkesan": 0 };
    for (const r of risiko) {
      for (const log of r.log) {
        if (log.kunci !== k) continue;
        if (log.keberkesanan === "Ya") b.Berkesan++;
        else if (log.keberkesanan === "Tidak") b["Tidak Berkesan"]++;
      }
    }
    return b;
  });
}

export function ringkasan(risiko, kDari, kHingga) {
  const kiraTinggi = (k) =>
    risiko.filter((r) => ["Tinggi", "Sangat Tinggi"].includes(tahapPada(r, k))).length;
  const jumlah = risiko.filter((r) => tahapPada(r, kHingga)).length;
  const tinggi = kiraTinggi(kHingga);
  const tinggiSebelum = kiraTinggi(kHingga - 1);
  const baharu = risiko.filter((r) => r.kunci !== null && r.kunci >= kDari && r.kunci <= kHingga).length;
  let berkesan = 0;
  let dinilai = 0;
  for (const r of risiko) {
    for (const log of r.log) {
      if (log.kunci < kDari || log.kunci > kHingga) continue;
      if (log.keberkesanan === "Ya") berkesan++;
      if (log.keberkesanan === "Ya" || log.keberkesanan === "Tidak") dinilai++;
    }
  }
  return {
    jumlah,
    tinggi,
    perubahanTinggi: tinggi - tinggiSebelum,
    baharu,
    kadarBerkesan: dinilai ? Math.round((berkesan / dinilai) * 100) : null,
    dinilai,
  };
}

// Donut: taburan tahap pada satu baris profil (biasanya tempoh akhir)
export const taburanTahap = (baris) =>
  baris
    ? SIRI_TAHAP.map((s) => ({ nama: s.label, kunci: s.kunci, nilai: baris[s.kunci] || 0, fill: s.warna })).filter(
        (x) => x.nilai > 0
      )
    : [];

export const TREND_AKTIF = "Risiko aktif";
export const TREND_TINGGI = "Tinggi & Sangat Tinggi";

// Kawasan: jumlah risiko aktif & bilangan Tinggi/Sangat Tinggi setiap tempoh
export const trendRisiko = (profil) =>
  profil.map((b) => ({
    nama: b.nama,
    [TREND_AKTIF]: SIRI_TAHAP.reduce((s, x) => s + (b[x.kunci] || 0), 0),
    [TREND_TINGGI]: (b.Tinggi || 0) + (b["Sangat Tinggi"] || 0),
  }));

export const BILANGAN = "Bilangan risiko";

// Radar: jumlah risiko setiap kategori
export const jumlahIkutKategori = (profilKategori) =>
  profilKategori.map((b) => ({
    nama: b.nama,
    [BILANGAN]: SIRI_TAHAP.reduce((s, x) => s + (b[x.kunci] || 0), 0),
  }));
