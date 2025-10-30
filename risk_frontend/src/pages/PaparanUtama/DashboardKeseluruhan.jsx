import React from "react";
import "./DashboardKeseluruhan.css";
// TUKAR: Import ikon dari lucide-react
import {
  BarChart3,
  AlertOctagon,
  AlertTriangle,
  MinusCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ===== DATA DUMMY (DIKEMAS KINI) =====
const DUMMY_DATA = {
  // Data untuk Carta Pai (2 Tempoh)
  dataJenisKawalan: {
    prev: { kurang: 65, terima: 27 },
    current: { kurang: 50, terima: 45 },
  },
  dataStatusPemantauan: {
    prev: { buka: 31, sedangDilaksanakan: 27, tutup: 27 },
    current: { buka: 20, sedangDilaksanakan: 40, tutup: 35 },
  },

  // --- Data untuk Kategori Risiko (Jadual) (STRUKTUR DIUBAH) ---
  dataKategoriRisiko: [
    {
      subsidiari: "UKM DAGANG (UKMD)",
      prev: { values: [1, 7, 1, 1], total: 10 },
      current: { values: [2, 5, 2, 2], total: 11 }, // Data rekaan
    },
    {
      subsidiari: "UKM REAL ESTATE",
      prev: { values: [3, 9, 6, 2], total: 20 },
      current: { values: [4, 8, 5, 3], total: 20 }, // Data rekaan
    },
  ],
  // Lagenda untuk carta di atas
  kategoriRisikoLegend: [
    { label: "Kewangan", color: "#f8b195" },
    { label: "Operasi", color: "#f67280" },
    { label: "Pematuhan", color: "#c06c84" },
    { label: "Strategik", color: "#6c5b7b" },
  ],

  // Data untuk Pemantapan Risiko (Carta Bar)
  dataPemantapanRisiko: {
    categories: ["R", "S", "T", "ST", "Tiada"],
    prevData: {
      label: "H1 2024",
      values: [15, 7, 0, 82, 31],
      color: "#0074c8",
    },
    currentData: {
      label: "H1 2025",
      values: [12, 8, 2, 112, 35],
      color: "#d9534f",
    },
  },

  // --- Data untuk Status Pemantauan Subsidiari (STRUKTUR DIUBAH) ---
  dataStatusSubsidiari: [
    {
      subsidiari: "UKM DAGANG (UKMD)",
      prev: { values: [5, 12, 4], total: 21 },
      current: { values: [3, 10, 8], total: 21 }, // Data rekaan
    },
    {
      subsidiari: "UKM REAL ESTATE",
      prev: { values: [8, 6, 10], total: 24 },
      current: { values: [10, 5, 9], total: 24 }, // Data rekaan
    },
    {
      subsidiari: "UKM KESIHATAN",
      prev: { values: [2, 7, 7], total: 16 },
      current: { values: [1, 9, 6], total: 16 }, // Data rekaan
    },
  ],
  statusColors: ["#dc3545", "#ffc107", "#28a745"], // Buka, Sedang, Tutup
};
// =======================================================

// TUKAR: Data Sukatan Risiko kini mengandungi Ikon Lucide dan Warna
const DATA_SUKATAN_RISIKO = {
  rowHeaders: [
    "SUKUAN KEDUA - KEEMPAT 2024 (APR - DIS)",
    "PENILAIAN RISIKO",
    "SEPARUH TAHUN PERTAMA 2025 (JAN-JUN)",
  ],
  columns: [
    {
      label: "Jumlah Risiko",
      icon: BarChart3,
      color: "#6b7280", // Warna neutral
      values: [82, 112, 112],
    },
    {
      label: "Sangat tinggi [ST]",
      icon: AlertOctagon,
      color: "#ef4444",
      values: [0, 15, 2],
    },
    {
      label: "Tinggi [T]",
      icon: AlertTriangle,
      color: "#f97316",
      values: [7, 61, 8],
    },
    {
      label: "Sederhana [S]",
      icon: MinusCircle,
      color: "#eab308",
      values: [15, 30, 12],
    },
    {
      label: "Rendah [R]",
      icon: CheckCircle2,
      color: "#22c55e",
      values: [31, 6, 35],
    },
    {
      label: "Tiada Skor",
      icon: XCircle,
      color: "#6b7280", // Warna neutral
      values: [29, 0, 55],
    },
  ],
};
// =================================================================

export default function DashboardKeseluruhan({
  filterValues = { subsidiari: "Semua", tahunAsas: 2025, separuhAsas: "H1" },
}) {
  const { tahunAsas, separuhAsas } = filterValues;
  const baseYear = tahunAsas;
  const prevYear = tahunAsas - 1;
  const halfText = separuhAsas === "H1" ? "JAN-JUN" : "JUL-DIS";

  // --- Data untuk Lagenda Skor Risiko (BAHARU) ---
  const skorRisikoLegendData = [
    { short: "R", long: "Rendah", color: "#22c55e" },
    { short: "S", long: "Sederhana", color: "#eab308" },
    { short: "T", long: "Tinggi", color: "#f97316" },
    { short: "ST", long: "Sangat Tinggi", color: "#ef4444" },
    { short: "Tiada", long: "Tiada Skor", color: "#6b7280" },
  ];

  // --- LOGIK JENIS KAWALAN ---
  const totalJenisKawalan_Prev =
    DUMMY_DATA.dataJenisKawalan.prev.kurang +
    DUMMY_DATA.dataJenisKawalan.prev.terima;
  const terimaPercent_Prev = (
    (DUMMY_DATA.dataJenisKawalan.prev.terima / totalJenisKawalan_Prev) *
    100
  ).toFixed(0);
  const totalJenisKawalan_Current =
    DUMMY_DATA.dataJenisKawalan.current.kurang +
    DUMMY_DATA.dataJenisKawalan.current.terima;
  const terimaPercent_Current = (
    (DUMMY_DATA.dataJenisKawalan.current.terima / totalJenisKawalan_Current) *
    100
  ).toFixed(0);

  // --- LOGIK STATUS PEMANTAUAN ---
  const totalStatus_Prev =
    DUMMY_DATA.dataStatusPemantauan.prev.buka +
    DUMMY_DATA.dataStatusPemantauan.prev.sedangDilaksanakan +
    DUMMY_DATA.dataStatusPemantauan.prev.tutup;
  const percentBuka_Prev = (
    (DUMMY_DATA.dataStatusPemantauan.prev.buka / totalStatus_Prev) *
    100
  ).toFixed(0);
  const percentSedang_Prev = (
    (DUMMY_DATA.dataStatusPemantauan.prev.sedangDilaksanakan /
      totalStatus_Prev) *
    100
  ).toFixed(0);
  const totalStatus_Current =
    DUMMY_DATA.dataStatusPemantauan.current.buka +
    DUMMY_DATA.dataStatusPemantauan.current.sedangDilaksanakan +
    DUMMY_DATA.dataStatusPemantauan.current.tutup;
  const percentBuka_Current = (
    (DUMMY_DATA.dataStatusPemantauan.current.buka / totalStatus_Current) *
    100
  ).toFixed(0);
  const percentSedang_Current = (
    (DUMMY_DATA.dataStatusPemantauan.current.sedangDilaksanakan /
      totalStatus_Current) *
    100
  ).toFixed(0);

  // --- LOGIK UNTUK CARTA BARU ---
  const pemantapanMax = Math.max(
    ...DUMMY_DATA.dataPemantapanRisiko.prevData.values,
    ...DUMMY_DATA.dataPemantapanRisiko.currentData.values
  );

  return (
    <div className="dashboard-keseluruhan-layout">
      {/* Header (Dikekalkan) */}
      <div className="dashboard-header">
        <div className="header-left-image">
          <div className="image-placeholder">
            <span className="img-icon">🖼️</span>
          </div>
          <div className="image-caption">Unit Pematuhan & Pengurusan Risiko</div>
        </div>
        <div className="header-right-title">
          <div className="comparison-title">Perbandingan Separuh Tahun </div>
          <div className="comparison-years">
            H1 {prevYear} <span className="vs">vs</span> H1 {baseYear}
          </div>
        </div>
      </div>

      {/* ===== GRID SUSUN ATUR BARU ===== */}
      <div className="dashboard-grid-layout">
        
        {/* --- ROW 1 (GABUNGAN) --- */}
        <div className="section-box section-kuantitatif">
          <h4 className="section-title-normal">SUKATAN RISIKO SEMASA</h4>
          <div className="sukatan-risiko-grid">
            <div className="sukatan-header-col">
              <div className="sukatan-header-spacer"></div>
              {DATA_SUKATAN_RISIKO.rowHeaders.map((label, index) => (
                <div key={index} className="sukatan-row-header">
                  {label}
                </div>
              ))}
            </div>
            <div className="sukatan-data-cols-wrapper">
              {DATA_SUKATAN_RISIKO.columns.map((col, colIndex) => {
                const IconComponent = col.icon; // Ambil komponen ikon
                return (
                  <div key={colIndex} className="sukatan-data-col">
                    <div className="sukatan-icon-box">
                      {/* TUKAR: Papar ikon Lucide */}
                      <IconComponent
                        style={{ color: col.color }}
                        className="sukatan-icon"
                      />
                    </div>
                    {col.values.map((value, valIndex) => (
                      <div key={valIndex} className="sukatan-data-box">
                        {value}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* --- TUKAR: LAGENDA KINI DI DALAM KAD YANG SAMA --- */}
          <div className="lagenda-container-sukatan">
            {DATA_SUKATAN_RISIKO.columns.map((item, i) => {
              const IconComponent = item.icon;
              return (
                <div className="lagenda-item-sukatan" key={i}>
                  <IconComponent
                    style={{ color: item.color }}
                    className="lagenda-icon-sukatan"
                  />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Kad Lagenda yang asal telah DIBUANG */}
        
        {/* --- ROW 2 --- */}
        <div className="section-box section-jenis-kawalan">
          <h4 className="section-title-normal">JENIS KAWALAN</h4>
          <div className="pie-comparison-wrapper">
            <div className="pie-chart-container">
              <h5 className="pie-chart-title">H1 {prevYear}</h5>
              <div
                className="chart-pie-ring"
                style={{
                  background: `conic-gradient(#ff8c00 0% ${terimaPercent_Prev}%, #7f8c8d 0% 100%)`,
                }}
              ></div>
              <div className="b-legend-row">
                <span className="legend-item kurang">
                  Kurang ({DUMMY_DATA.dataJenisKawalan.prev.kurang})
                </span>
                <span className="legend-item terima">
                  Terima ({DUMMY_DATA.dataJenisKawalan.prev.terima})
                </span>
              </div>
            </div>
            <div className="pie-chart-container">
              <h5 className="pie-chart-title">H1 {baseYear}</h5>
              <div
                className="chart-pie-ring"
                style={{
                  background: `conic-gradient(#ff8c00 0% ${terimaPercent_Current}%, #7f8c8d 0% 100%)`,
                }}
              ></div>
              <div className="b-legend-row">
                <span className="legend-item kurang">
                  Kurang ({DUMMY_DATA.dataJenisKawalan.current.kurang})
                </span>
                <span className="legend-item terima">
                  Terima ({DUMMY_DATA.dataJenisKawalan.current.terima})
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="section-box section-kategori-risiko-jadual">
          <h4 className="section-title-normal">KATEGORI RISIKO (JADUAL)</h4>
          <div className="f-table-container">
            {DUMMY_DATA.dataKategoriRisiko.map((item, i) => (
              <div key={i} className="f-row">
                <span className="f-label">{item.subsidiari}</span>
                <div className="f-bar-comparison-wrapper">
                  <div className="f-bar-wrapper-with-label">
                    <span className="comparison-bar-label">H1 {prevYear}</span>
                    <div className="f-bar-wrapper">
                      {item.prev.values.map((v, j) => (
                        <div
                          key={j}
                          className="f-bar-segment"
                          style={{
                            width: `${(v / item.prev.total) * 100}%`,
                            backgroundColor: DUMMY_DATA.kategoriRisikoLegend[j].color,
                          }}
                        >
                          {v > 0 && v}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="f-bar-wrapper-with-label">
                    <span className="comparison-bar-label">H1 {baseYear}</span>
                    <div className="f-bar-wrapper">
                      {item.current.values.map((v, j) => (
                        <div
                          key={j}
                          className="f-bar-segment"
                          style={{
                            width: `${(v / item.current.total) * 100}%`,
                            backgroundColor: DUMMY_DATA.kategoriRisikoLegend[j].color,
                          }}
                        >
                          {v > 0 && v}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="f-legend-container">
            {DUMMY_DATA.kategoriRisikoLegend.map((item, i) => (
              <div key={i} className="f-legend-item">
                <span
                  className="f-legend-color-box"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- ROW 3 --- */}
        <div className="section-box section-pemantauan">
          <h4 className="section-title-normal">PEMANTAUAN RISIKO</h4>
          <p className="g-subtitle">Perbandingan Risiko ({prevYear} vs {baseYear})</p>
          <div className="pemantapan-chart-container">
            <div className="pemantapan-chart-wrapper">
              {DUMMY_DATA.dataPemantapanRisiko.categories.map((cat, i) => (
                <div key={cat} className="pemantapan-bar-group">
                  <div className="pemantapan-bar-wrapper">
                    <div
                      className="pemantapan-bar prev"
                      style={{
                        height: `${(DUMMY_DATA.dataPemantapanRisiko.prevData.values[i] / pemantapanMax) * 100}%`,
                      }}
                    >
                      {DUMMY_DATA.dataPemantapanRisiko.prevData.values[i]}
                    </div>
                  </div>
                  <div className="pemantapan-bar-wrapper">
                    <div
                      className="pemantapan-bar current"
                      style={{
                        height: `${(DUMMY_DATA.dataPemantapanRisiko.currentData.values[i] / pemantapanMax) * 100}%`,
                      }}
                    >
                      {DUMMY_DATA.dataPemantapanRisiko.currentData.values[i]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pemantapan-xaxis-labels">
              {DUMMY_DATA.dataPemantapanRisiko.categories.map((cat) => (
                <span key={cat}>{cat}</span>
              ))}
            </div>
          </div>
          <div className="g-legend-bottom">
            <span className="legend-item-box prev">
              {DUMMY_DATA.dataPemantapanRisiko.prevData.label}
            </span>
            <span className="legend-item-box current">
              {DUMMY_DATA.dataPemantapanRisiko.currentData.label}
            </span>
          </div>
          
          {/* --- TUKAR: SKOR RISIKO KINI DENGAN WARNA --- */}
          <div className="g-bottom-section">
            <div className="g-skor-risiko">
              <h5>SKOR RISIKO</h5>
              <div className="skor-risiko-legend-container">
                {skorRisikoLegendData.map((item) => (
                  <div key={item.short} className="skor-risiko-item">
                    <span
                      className="skor-risiko-box"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.short}
                    </span>
                    <span className="skor-risiko-label">{item.long}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* --- TAMAT PERUBAHAN SKOR RISIKO --- */}

        </div>
        
        {/* --- ROW 4 --- */}
        <div className="section-box section-status-pemantauan-pai">
          <h4 className="section-title-normal">STATUS PEMANTAUAN</h4>
          <div className="pie-comparison-wrapper">
            <div className="pie-chart-container">
              <h5 className="pie-chart-title">H1 {prevYear}</h5>
              <div
                className="chart-pie-ring"
                style={{
                  background: `conic-gradient(
                    #dc3545 0% ${percentBuka_Prev}%,
                    #ffc107 ${percentBuka_Prev}% ${
                      parseFloat(percentBuka_Prev) +
                      parseFloat(percentSedang_Prev)
                    }%,
                    #28a745 0% 100%
                  )`,
                }}
              ></div>
              <div className="d-legend-row">
                <span className="legend-item buka">Buka ({DUMMY_DATA.dataStatusPemantauan.prev.buka})</span>
                <span className="legend-item sedang">Sedang ({DUMMY_DATA.dataStatusPemantauan.prev.sedangDilaksanakan})</span>
                <span className="legend-item tutup">Tutup ({DUMMY_DATA.dataStatusPemantauan.prev.tutup})</span>
              </div>
            </div>
            <div className="pie-chart-container">
              <h5 className="pie-chart-title">H1 {baseYear}</h5>
              <div
                className="chart-pie-ring"
                style={{
                  background: `conic-gradient(
                    #dc3545 0% ${percentBuka_Current}%,
                    #ffc107 ${percentBuka_Current}% ${
                      parseFloat(percentBuka_Current) +
                      parseFloat(percentSedang_Current)
                    }%,
                    #28a745 0% 100%
                  )`,
                }}
              ></div>
              <div className="d-legend-row">
                <span className="legend-item buka">Buka ({DUMMY_DATA.dataStatusPemantauan.current.buka})</span>
                <span className="legend-item sedang">Sedang ({DUMMY_DATA.dataStatusPemantauan.current.sedangDilaksanakan})</span>
                <span className="legend-item tutup">Tutup ({DUMMY_DATA.dataStatusPemantauan.current.tutup})</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="section-box section-bar-status-pemantauan">
          <h4 className="section-title-normal">STATUS PEMANTAUAN SUBSIDIARI</h4>
          <div className="subsidiari-bar-container">
            {DUMMY_DATA.dataStatusSubsidiari.map((item, i) => (
              <div key={i} className="subsidiari-bar-row">
                <span className="subsidiari-bar-label">{item.subsidiari}</span>
                <div className="subsidiari-bar-comparison-wrapper">
                  <div className="subsidiari-bar-wrapper-with-label">
                    <span className="comparison-bar-label">H1 {prevYear}</span>
                    <div className="subsidiari-bar-wrapper">
                      {item.prev.values.map((v, j) => (
                        <div
                          key={j}
                          className="subsidiari-bar-segment"
                          style={{
                            width: `${(v / item.prev.total) * 100}%`,
                            backgroundColor: DUMMY_DATA.statusColors[j],
                          }}
                        >
                          {v > 0 && v}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="subsidiari-bar-wrapper-with-label">
                    <span className="comparison-bar-label">H1 {baseYear}</span>
                    <div className="subsidiari-bar-wrapper">
                      {item.current.values.map((v, j) => (
                        <div
                          key={j}
                          className="subsidiari-bar-segment"
                          style={{
                            width: `${(v / item.current.total) * 100}%`,
                            backgroundColor: DUMMY_DATA.statusColors[j],
                          }}
                        >
                          {v > 0 && v}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="d-legend-row-horizontal">
            <span className="legend-item buka">Buka</span>
            <span className="legend-item sedang">Sedang</span>
            <span className="legend-item tutup">Tutup</span>
          </div>
        </div>
      
      </div> {/* ===== TAMAT GRID SUSUN ATUR BARU ===== */}
    </div>
  );
}