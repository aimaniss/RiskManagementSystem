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

// NOTA: Recharts akan diimport di sini nanti, cth:
// import { PieChart, BarChart, ... } from 'recharts';

// ===== DATA SUKATAN RISIKO =====
const DATA_SUKATAN_RISIKO_CONFIG = {
  columns: [
    {
      label: "Jumlah Risiko",
      icon: BarChart3,
      color: "#6b7280",
    },
    {
      label: "Sangat tinggi [ST]",
      icon: AlertOctagon,
      color: "#ef4444",
    },
    {
      label: "Tinggi [T]",
      icon: AlertTriangle,
      color: "#f97316",
    },
    {
      label: "Sederhana [S]",
      icon: MinusCircle,
      color: "#eab308",
    },
    {
      label: "Rendah [R]",
      icon: CheckCircle2,
      color: "#22c55e",
    },
    {
      label: "Tiada Skor",
      icon: XCircle,
      color: "#6b7280",
    },
  ],
};

const KATEGORI_RISIKO_LEGEND_CONFIG = [
  { label: "Kewangan", color: "#f8b195" },
  { label: "Operasi", color: "#f67280" },
  { label: "Pematuhan", color: "#c06c84" },
  { label: "Strategik", color: "#6c5b7b" },
];

const SKOR_RISIKO_LEGEND_CONFIG = [
  { short: "R", long: "Rendah", color: "#22c55e" },
  { short: "S", long: "Sederhana", color: "#eab308" },
  { short: "T", long: "Tinggi", color: "#f97316" },
  { short: "ST", long: "Sangat Tinggi", color: "#ef4444" },
  { short: "Tiada", long: "Tiada Skor", color: "#6b7280" },
];

const STATUS_SUBSIDIARI_COLORS = [
  "#dc3545", // Buka (Merah)
  "#ffc107", // Sedang Dilaksanakan (Kuning)
  "#0074c8", // Pemantauan (Biru)
  "#17a2b8", // Selesai (Teal)
  "#28a745", // Tutup (Hijau)
];
// =================================================================

/**
 * Komponen Papan Pemuka yang menerima data sebagai props.
 * ... (penerangan props)
 */
export default function DashboardKeseluruhan({
  filterValues = { subsidiari: "Semua", tahunAsas: 2025, separuhAsas: 1 },
  data, // Semua data akan datang dari 'props' ini
}) {
  const { tahunAsas, separuhAsas } = filterValues;
  const baseYear = tahunAsas;
  const prevYear = tahunAsas - 1;

  // Logik untuk menukar 1/2 kepada teks
  const baseHalfLabel = separuhAsas === 1 ? "Separuh Pertama" : "Separuh Kedua";

  // Cipta header baris yang dinamik berdasarkan filter
  const sukatanRowHeaders = [
    `${baseHalfLabel} ${prevYear}`, // Cth: "Separuh Pertama 2024"
    `${baseHalfLabel} ${baseYear}`,  // Cth: "Separuh Pertama 2025"
  ];

  // --- SEMUA LOGIK PENGIRAAN MANUAL DIKELUARKAN ---

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
            {baseHalfLabel} {prevYear} <span className="vs">vs</span> {baseHalfLabel} {baseYear}
          </div>
        </div>
      </div>

      {/* ===== GRID SUSUN ATUR BARU ===== */}
      <div className="dashboard-grid-layout">
        
        {/* --- ROW 1 (GABUNGAN) --- */}
        <div className="section-box section-kuantitatif">
          <h4 className="section-title-normal"></h4>
          <div className="sukatan-risiko-grid">
            <div className="sukatan-header-col">
              <div className="sukatan-header-spacer"></div>
              
              {/* Guna 'sukatanRowHeaders' (dinamik) */}
              {sukatanRowHeaders.map((label, index) => (
                <div key={index} className="sukatan-row-header">
                  {label}
                </div>
              ))}
            </div>
            <div className="sukatan-data-cols-wrapper">
              {DATA_SUKATAN_RISIKO_CONFIG.columns.map((col, colIndex) => {
                const IconComponent = col.icon;
                
                // Jangkaan 'values' kini ada 2 item [0, 0]
                // const values = data?.sukatanRisiko?.[colIndex] || [0, 0];
                
                return (
                  <div key={colIndex} className="sukatan-data-col">
                    <div className="sukatan-icon-box">
                      <IconComponent
                        style={{ color: col.color }}
                        className="sukatan-icon"
                      />
                    </div>
                    
                    {/* Gantikan ini dengan data sebenar dari props */}
                    <div className="sukatan-data-box">
                      {/* {values[0]} */} ?
                    </div>
                    <div className="sukatan-data-box">
                      {/* {values[1]} */} ?
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
          
          {/* --- Lagenda --- */}
          <div className="lagenda-container-sukatan">
            {DATA_SUKATAN_RISIKO_CONFIG.columns.map((item, i) => {
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
        
        {/* --- ROW 2 --- */}
        <div className="section-box section-jenis-kawalan">
          <h4 className="section-title-normal">JENIS KAWALAN</h4>
          <div className="pie-comparison-wrapper">
            
            {/* Gantikan ini dengan <PieChart> Recharts */}
            <div className="pie-chart-container">
              <h5 className="pie-chart-title">{baseHalfLabel} {prevYear}</h5>
              <div className="chart-placeholder">
                [Carta Pai Recharts {baseHalfLabel} {prevYear} Di Sini]
              </div>
            </div>
            
            {/* Gantikan ini dengan <PieChart> Recharts */}
            <div className="pie-chart-container">
              <h5 className="pie-chart-title">{baseHalfLabel} {baseYear}</h5>
              <div className="chart-placeholder">
                [Carta Pai Recharts {baseHalfLabel} {baseYear} Di Sini]
              </div>
            </div>
            
          </div>
        </div>
        
        <div className="section-box section-kategori-risiko-jadual">
          <h4 className="section-title-normal">KATEGORI RISIKO (JADUAL)</h4>
          
          {/* Gantikan ini dengan <BarChart layout="vertical"> Recharts */}
          <div className="f-table-container">
            <div className="chart-placeholder" style={{ minHeight: "150px" }}>
              [Carta Bar Bertindih Recharts Di Sini]
            </div>
            {/* Logik asal untuk 'map' data Kategori Risiko akan diubah 
              untuk menyediakan data kepada satu komponen <BarChart> Recharts
            */}
          </div>

          <div className="f-legend-container">
            {KATEGORI_RISIKO_LEGEND_CONFIG.map((item, i) => (
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
          
          {/* Gantikan ini dengan <BarChart> Recharts */}
          <div className="pemantapan-chart-container">
            <div className="chart-placeholder" style={{ minHeight: "200px" }}>
              [Carta Bar (Grouped) Recharts Di Sini]
            </div>
          </div>
          
          <div className="g-legend-bottom">
            <span className="legend-item-box prev">
              {baseHalfLabel} {prevYear}
            </span>
            <span className="legend-item-box current">
              {baseHalfLabel} {baseYear}
            </span>
          </div>
          
          <div className="g-bottom-section">
            <div className="g-skor-risiko">
              <h5>SKOR RISIKO</h5>
              <div className="skor-risiko-legend-container">
                {SKOR_RISIKO_LEGEND_CONFIG.map((item) => (
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
        </div>
        
        {/* --- ROW 4 --- */}
        <div className="section-box section-status-pemantauan-pai">
          <h4 className="section-title-normal">STATUS PEMANTAUAN</h4>
          <div className="pie-comparison-wrapper">

            {/* Gantikan ini dengan <PieChart> Recharts */}
            <div className="pie-chart-container">
              <h5 className="pie-chart-title">{baseHalfLabel} {prevYear}</h5>
              <div className="chart-placeholder">
                [Carta Pai Recharts {baseHalfLabel} {prevYear} Di Sini]
              </div>
            </div>

            {/* Gantikan ini dengan <PieChart> Recharts */}
            <div className="pie-chart-container">
              <h5 className="pie-chart-title">{baseHalfLabel} {baseYear}</h5>
              <div className="chart-placeholder">
                [Carta Pai Recharts {baseHalfLabel} {baseYear} Di Sini]
              </div>
            </div>

          </div>
        </div>
        
        <div className="section-box section-bar-status-pemantauan">
          <h4 className="section-title-normal">STATUS PEMANTAUAN SUBSIDIARI</h4>
          
          {/* Gantikan ini dengan <BarChart layout="vertical"> Recharts */}
          <div className="subsidiari-bar-container">
            <div className="chart-placeholder" style={{ minHeight: "150px" }}>
              [Carta Bar Bertindih Recharts Di Sini]
            </div>
          </div>

          <div className="d-legend-row-horizontal">
            <span className="legend-item buka">Buka</span>
            <span className="legend-item sedang-laksana">Sedang Dilaksanakan</span>
            <span className="legend-item pemantauan">Pemantauan</span>
            <span className="legend-item selesai">Selesai</span>
            <span className="legend-item tutup">Tutup</span>
          </div>
        </div>
      
      </div> {/* ===== TAMAT GRID SUSUN ATUR BARU ===== */}
    </div>
  );
}