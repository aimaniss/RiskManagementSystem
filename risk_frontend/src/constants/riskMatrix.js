// Shared risk matrix constants and helper functions
// Used across all pages to avoid duplication

// Full risk matrix with all properties
// Each cell: { label, shortLabel, color, textColor, fullLabel }
export const riskMatrix = {
  1: {
    1: { label: "Rendah", shortLabel: "R", color: "#22c55e", textColor: "#ffffff", fullLabel: "Rendah" },
    2: { label: "Rendah", shortLabel: "R", color: "#22c55e", textColor: "#ffffff", fullLabel: "Rendah" },
    3: { label: "Sederhana", shortLabel: "S", color: "#eab308", textColor: "#854d0e", fullLabel: "Sederhana" },
    4: { label: "Sederhana", shortLabel: "S", color: "#eab308", textColor: "#854d0e", fullLabel: "Sederhana" },
    5: { label: "Tinggi", shortLabel: "T", color: "#f97316", textColor: "#ffffff", fullLabel: "Tinggi" },
  },
  2: {
    1: { label: "Rendah", shortLabel: "R", color: "#22c55e", textColor: "#ffffff", fullLabel: "Rendah" },
    2: { label: "Rendah", shortLabel: "R", color: "#22c55e", textColor: "#ffffff", fullLabel: "Rendah" },
    3: { label: "Sederhana", shortLabel: "S", color: "#eab308", textColor: "#854d0e", fullLabel: "Sederhana" },
    4: { label: "Sederhana", shortLabel: "S", color: "#eab308", textColor: "#854d0e", fullLabel: "Sederhana" },
    5: { label: "Tinggi", shortLabel: "T", color: "#f97316", textColor: "#ffffff", fullLabel: "Tinggi" },
  },
  3: {
    1: { label: "Rendah", shortLabel: "R", color: "#22c55e", textColor: "#ffffff", fullLabel: "Rendah" },
    2: { label: "Sederhana", shortLabel: "S", color: "#eab308", textColor: "#854d0e", fullLabel: "Sederhana" },
    3: { label: "Sederhana", shortLabel: "S", color: "#eab308", textColor: "#854d0e", fullLabel: "Sederhana" },
    4: { label: "Tinggi", shortLabel: "T", color: "#f97316", textColor: "#ffffff", fullLabel: "Tinggi" },
    5: { label: "Tinggi", shortLabel: "T", color: "#f97316", textColor: "#ffffff", fullLabel: "Tinggi" },
  },
  4: {
    1: { label: "Sederhana", shortLabel: "S", color: "#eab308", textColor: "#854d0e", fullLabel: "Sederhana" },
    2: { label: "Sederhana", shortLabel: "S", color: "#eab308", textColor: "#854d0e", fullLabel: "Sederhana" },
    3: { label: "Tinggi", shortLabel: "T", color: "#f97316", textColor: "#ffffff", fullLabel: "Tinggi" },
    4: { label: "Tinggi", shortLabel: "T", color: "#f97316", textColor: "#ffffff", fullLabel: "Tinggi" },
    5: { label: "Sangat Tinggi", shortLabel: "ST", color: "#ef4444", textColor: "#ffffff", fullLabel: "Sangat Tinggi" },
  },
  5: {
    1: { label: "Sederhana", shortLabel: "S", color: "#eab308", textColor: "#854d0e", fullLabel: "Sederhana" },
    2: { label: "Tinggi", shortLabel: "T", color: "#f97316", textColor: "#ffffff", fullLabel: "Tinggi" },
    3: { label: "Tinggi", shortLabel: "T", color: "#f97316", textColor: "#ffffff", fullLabel: "Tinggi" },
    4: { label: "Sangat Tinggi", shortLabel: "ST", color: "#ef4444", textColor: "#ffffff", fullLabel: "Sangat Tinggi" },
    5: { label: "Sangat Tinggi", shortLabel: "ST", color: "#ef4444", textColor: "#ffffff", fullLabel: "Sangat Tinggi" },
  },
};

// Get full risk data from matrix (returns { label, shortLabel, color, textColor, fullLabel })
export const getRiskMatrix = (k, i) => {
  const kk = parseInt(k);
  const ii = parseInt(i);
  if (!kk || !ii) return { label: "Tiada Data", shortLabel: "-", color: "#f1f5f9", textColor: "#334155", fullLabel: "Tiada Data" };
  return riskMatrix[kk]?.[ii] || { label: "Tiada Data", shortLabel: "-", color: "#f1f5f9", textColor: "#334155", fullLabel: "Tiada Data" };
};

// Get risk level label (full label like "Rendah", "Sederhana", etc.)
export const getRiskLevel = (k, i) => getRiskMatrix(k, i).label;

// Get risk short form (R, S, T, ST)
export const getRiskAbbreviation = (label) => {
  switch (label) {
    case "Rendah": return "R";
    case "Sederhana": return "S";
    case "Tinggi": return "T";
    case "Sangat Tinggi": return "ST";
    default: return "";
  }
};

// Get risk color from level label
export const getRiskColor = (label) => {
  const colorMap = {
    "Rendah": "#22c55e",
    "Sederhana": "#eab308",
    "Tinggi": "#f97316",
    "Sangat Tinggi": "#ef4444",
    "R": "#22c55e",
    "S": "#eab308",
    "T": "#f97316",
    "ST": "#ef4444",
    "Tiada Data": "#9ca3af",
  };
  return colorMap[label] || "#94a3b8";
};

// PDF-specific risk styles (different colors for PDF output)
export const getRiskStylesPDF = (level) => {
  const styles = { halign: 'center' };
  switch (level) {
    case 'ST': styles.fillColor = '#FF0000'; styles.textColor = '#FFFFFF'; break;
    case 'T': styles.fillColor = '#FFA500'; styles.textColor = '#000000'; break;
    case 'S': styles.fillColor = '#FFFF00'; styles.textColor = '#000000'; break;
    case 'R': styles.fillColor = '#92D050'; styles.textColor = '#000000'; break;
    default: break;
  }
  return styles;
};

// Risk level ordering for comparisons
export const TAHAP_RISIKO_ORDER = {
  "R": 1, "Rendah": 1,
  "S": 2, "Sederhana": 2,
  "T": 3, "Tinggi": 3,
  "ST": 4, "Sangat Tinggi": 4,
  "Tiada Data": 0,
};

// Kebarangkalian (Likelihood) descriptions
export const KebarangkalianData = {
  5: "Hampir Pasti",
  4: "Kemungkinan Tinggi",
  3: "Berpeluang Untuk Berlaku",
  2: "Kemungkinan Rendah",
  1: "Hampir Tiada Kemungkinan",
};

// Impak (Impact) descriptions
export const ImpakData = {
  5: "Sangat Besar",
  4: "Besar",
  3: "Ketara",
  2: "Boleh Diukur",
  1: "Tidak Ketara",
};

// Skor Kebarangkalian descriptions for dropdowns
export const SKOR_KEBARANGKALIAN_DESC = [
  { value: 1, label: "1 - Hampir Tiada Kemungkinan" },
  { value: 2, label: "2 - Kemungkinan Rendah" },
  { value: 3, label: "3 - Berpeluang Untuk Berlaku" },
  { value: 4, label: "4 - Kemungkinan Tinggi" },
  { value: 5, label: "5 - Hampir Pasti" },
];

// Skor Impak descriptions for dropdowns
export const SKOR_IMPAK_DESC = [
  { value: 1, label: "1 - Tidak Ketara" },
  { value: 2, label: "2 - Boleh Diukur" },
  { value: 3, label: "3 - Ketara" },
  { value: 4, label: "4 - Besar" },
  { value: 5, label: "5 - Sangat Besar" },
];

// Keberkesanan mapping
export const KEBERKESANAN_MAPPING = {
  "Ya": "Berkesan (Menurun atau Kekal)",
  "Tidak": "Tidak Berkesan (Meningkat)",
};

// Helper: get color by risk level label (searches matrix)
export const getColorByTahapRisikoLabel = (label) => {
  if (label === "Tiada Data" || !label) return "#f1f5f9";
  for (const k in riskMatrix) {
    for (const i in riskMatrix[k]) {
      if (riskMatrix[k][i].label === label || riskMatrix[k][i].shortLabel === label) {
        return riskMatrix[k][i].color;
      }
    }
  }
  return "#f1f5f9";
};

// Helper: calculate risk from likelihood & impact and return full result
export const calculateRisk = (skorKebarangkalian, skorImpak) => {
  const k = parseInt(skorKebarangkalian);
  const i = parseInt(skorImpak);
  if (k && i) {
    const data = getRiskMatrix(k, i);
    return {
      ...data,
      skorRisiko: data.shortLabel,
      tahapRisiko: data.label,
      statusRisiko: data.label === "Rendah" ? "Tidak" : "Ya",
      riskColor: data.color,
    };
  }
  return {
    label: "", shortLabel: "", color: "#f1f5f9", textColor: "#64748b", fullLabel: "",
    skorRisiko: "", tahapRisiko: "", statusRisiko: "", riskColor: "#f1f5f9",
  };
};
