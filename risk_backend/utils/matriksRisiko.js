// Matriks risiko 5x5 (kebarangkalian x impak) -> label R/S/T/ST.
// Mesti sepadan dengan risk_frontend/src/constants/riskMatrix.js.
const MATRIKS_RISIKO = {
  1: { 1: "R", 2: "R", 3: "S", 4: "S", 5: "T" },
  2: { 1: "R", 2: "R", 3: "S", 4: "S", 5: "T" },
  3: { 1: "R", 2: "S", 3: "S", 4: "T", 5: "T" },
  4: { 1: "S", 2: "S", 3: "T", 4: "T", 5: "ST" },
  5: { 1: "S", 2: "T", 3: "T", 4: "ST", 5: "ST" },
};

/**
 * Kira tahap risiko (R/S/T/ST) daripada skor kebarangkalian & impak (1–5).
 * @returns {string|null} label, atau null jika skor tidak sah
 */
export const kiraTahapRisiko = (kebarangkalian, impak) => {
  const k = parseInt(kebarangkalian, 10);
  const i = parseInt(impak, 10);
  if (k >= 1 && k <= 5 && i >= 1 && i <= 5) return MATRIKS_RISIKO[k][i];
  return null;
};

/**
 * "Perlu rawatan" (risiko.status_risiko) daripada tahap risiko: Rendah tidak
 * memerlukan rawatan. Sepadan dengan calculateRisk() di klien.
 * @returns {"Ya"|"Tidak"|null}
 */
export const statusRawatan = (tahap) => (tahap ? (tahap === "R" ? "Tidak" : "Ya") : null);
