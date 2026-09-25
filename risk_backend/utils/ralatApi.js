// utils/ralatApi.js — Ralat API seragam untuk controller.
// Ralat 4xx yang dilontar sendiri (statusCode) memulangkan mesejnya; selainnya
// mesej umum sahaja supaya butiran teknikal tidak terdedah (spec 09).

export const ralat = (statusCode, mesej) => Object.assign(new Error(mesej), { statusCode });

export const hantarRalat = (res, err, mesejLalai, label) => {
  if (err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err.code === "23505") {
    return res.status(409).json({ error: "Rekod dengan nama ini sudah wujud." });
  }
  console.error(`Ralat ${label}:`, err);
  return res.status(500).json({ error: mesejLalai });
};

// Nilai boolean ketat untuk medan status (elak "false" string dianggap benar)
export const bacaBoolean = (nilai) => {
  if (typeof nilai !== "boolean") throw ralat(400, "Nilai is_aktif (true/false) diperlukan.");
  return nilai;
};
