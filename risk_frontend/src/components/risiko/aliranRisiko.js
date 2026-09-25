// Peringkat aliran risiko: Daftar → Lulus → Nilai → Rawat → Pantau.
// Dikira daripada data sedia ada sahaja (tiada medan "peringkat" di DB).

const adaSkor = (k, i) => Boolean(parseInt(k, 10) && parseInt(i, 10));

/**
 * @param {object} risiko   GET /risiko/:id
 * @param {object|null} rawatan  GET /risiko/:id/rawatan (null jika tiada)
 * @param {object[]} logs   GET /pemantauan-risiko/:id/sejarah
 * @returns {{ steps: {kunci,label,status}[], semasa: string|null }}
 *   status: "completed" | "active" | "pending"; `semasa` = kunci peringkat aktif
 */
export function kiraAliran(risiko, rawatan, logs) {
  const lulus = risiko.status_kelulusan === "Diluluskan" || !risiko.status_kelulusan;
  const ditolak = risiko.status_kelulusan === "Ditolak";
  const dinilai = adaSkor(risiko.skor_kebarangkalian, risiko.skor_impak);
  // Risiko rendah tidak memerlukan rawatan mandatori
  const rendah = risiko.status_risiko === "Tidak" || risiko.skor_risiko === "R";
  const dirawat = Boolean(rawatan) || (dinilai && rendah);
  const dipantau = logs.some((l) => adaSkor(l.skor_kebarangkalian_selepas, l.skor_impak_selepas));

  const selesai = { daftar: true, lulus, nilai: dinilai, rawat: dirawat, pantau: dipantau };
  const label = {
    daftar: "Daftar",
    lulus: ditolak ? "Ditolak" : "Lulus",
    nilai: "Nilai",
    rawat: rendah && !rawatan ? "Rawat (pilihan)" : "Rawat",
    pantau: "Pantau",
  };

  let semasa = null;
  const steps = Object.keys(selesai).map((kunci) => {
    if (selesai[kunci]) return { kunci, label: label[kunci], status: "completed" };
    if (!semasa) {
      semasa = kunci;
      return { kunci, label: label[kunci], status: "active" };
    }
    return { kunci, label: label[kunci], status: "pending" };
  });
  return { steps, semasa };
}

export const susunLogTerkini = (logs) =>
  [...logs].sort(
    (a, b) =>
      b.tahun_pemantauan - a.tahun_pemantauan ||
      b.separuh_tahun_pemantauan - a.separuh_tahun_pemantauan ||
      new Date(b.tarikh_kemaskini || b.tarikh_pemantauan) - new Date(a.tarikh_kemaskini || a.tarikh_pemantauan)
  );
