// Polisi kata laluan — mesti sepadan dengan semakPolisiKatalaluan di
// risk_backend/utils/katalaluan.js (backend ialah penguat kuasa sebenar;
// senarai ini hanya untuk panduan langsung di borang).
export const SYARAT_KATALALUAN = [
  { label: "Sekurang-kurangnya 8 aksara", uji: (k) => k.length >= 8 },
  { label: "Mengandungi huruf", uji: (k) => /[A-Za-z]/.test(k) },
  { label: "Mengandungi nombor", uji: (k) => /[0-9]/.test(k) },
  { label: "Tiada ruang kosong", uji: (k) => k.length > 0 && !/\s/.test(k) },
];

export const katalaluanMematuhiPolisi = (katalaluan) =>
  katalaluan.length <= 72 && SYARAT_KATALALUAN.every((s) => s.uji(katalaluan));
