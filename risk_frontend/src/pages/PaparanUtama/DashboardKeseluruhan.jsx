import React from "react";
import "./DashboardKeseluruhan.css";
// Import ikon untuk 5 status
import {
  File, // Buka
  RefreshCw, // Sedang Dilaksanakan
  Eye, // Pemantauan
  Check, // Selesai
  CheckCircle2, // Tutup
} from "lucide-react";

// TUKAR: Import logo anda dari folder assets
// Nota: Kita guna '/' untuk 'import path', walaupun dalam Windows
import ukmhLogo from "../../assets/images/Light Background/UKMH_light.png";

/**
 * Komponen Papan Pemuka FYP yang lebih ringkas.
 * Tiada lagi filter kategori.
 */
export default function DashboardKeseluruhan({
  data, // Semua data akan datang dari 'props' ini
}) {
  // === Data Dummy untuk 5 Kad Skor (gantikan dengan data.skor) ===
  const skorData = [
    {
      label: "Jumlah Risiko Buka",
      value: data?.skor?.jumlahBuka || 12,
      icon: File,
      color: "#dc3545", // Merah
    },
    {
      label: "Sedang Dilaksanakan",
      value: data?.skor?.jumlahLaksana || 18,
      icon: RefreshCw,
      color: "#ffc107", // Kuning
    },
    {
      label: "Jumlah Risiko Pemantauan",
      value: data?.skor?.jumlahPantau || 5,
      icon: Eye,
      color: "#0074c8", // Biru
    },
    {
      label: "Jumlah Risiko Selesai",
      value: data?.skor?.jumlahSelesai || 10,
      icon: Check,
      color: "#17a2b8", // Teal
    },
    {
      label: "Jumlah Risiko Tutup",
      value: data?.skor?.jumlahTutup || 15,
      icon: CheckCircle2,
      color: "#28a745", // Hijau
    },
  ];

  // === Data Dummy untuk Jadual ===
  const topRisksData = data?.topRisks || [
    { noRujukan: "R001", nama: "Isu server down", kategori: "Operasi", bahagian: "Unit IT" },
    { noRujukan: "R002", nama: "Kekurangan dana", kategori: "Kewangan", bahagian: "Unit Kewangan" },
    { noRujukan: "R003", nama: "Gagal patuhi akta", kategori: "Pematuhan / Perundangan", bahagian: "Unit Undang-Undang" },
    { noRujukan: "R004", nama: "Sasaran jualan tidak capai", kategori: "Strategik", bahagian: "Unit Pemasaran" },
  ];

  return (
    <div className="dashboard-keseluruhan-layout">
      {/* Header (Logo dikekalkan, Tajuk dipermudahkan) */}
      <div className="dashboard-header">
        <div className="header-left-image">
          <div className="image-placeholder">
            {/* TUKAR: Guna pemboleh ubah logo yang diimport */}
            <img src={ukmhLogo} alt="Logo UKMH" />
          </div>
          <div className="image-caption">Unit Pematuhan & Pengurusan Risiko</div>
        </div>
        <div className="header-right-title">
          <div className="comparison-title">Dashboard Pengurusan Risiko</div>
          <div className="current-status-title">Status Semasa</div>
        </div>
      </div>

      {/* --- FILTER BAR TELAH DIBUANG --- */}

      {/* ===== SUSUN ATUR BARU (FYP) ===== */}

      {/* --- 1. KAD SKOR (VERSI 5 KAD) --- */}
      <div className="scorecard-container-5">
        {skorData.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div key={index} className="scorecard-box">
              <div className="scorecard-icon">
                <IconComponent style={{ color: item.color }} />
              </div>
              <div className="scorecard-content">
                <div className="scorecard-value">{item.value}</div>
                <div className="scorecard-label">{item.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- 2. GRID CARTA (KINI 3 CARTA) --- */}
      <div className="charts-grid-container">
        {/* Carta 1: Tahap Risiko */}
        <div className="section-box">
          <h4 className="section-title-normal">Tahap Risiko</h4>
          <div className="chart-placeholder-wrapper">
            <div className="chart-placeholder">
              [Carta Bar/Donut Recharts untuk Tahap Risiko]
            </div>
          </div>
        </div>

        {/* Carta 2: Kategori Risiko */}
        <div className="section-box">
          <h4 className="section-title-normal">Kategori Risiko</h4>
          <div className="chart-placeholder-wrapper">
            <div className="chart-placeholder">
              [Carta Bar Recharts untuk Kategori]
            </div>
          </div>
        </div>

        {/* Carta 3: Jenis Kawalan */}
        <div className="section-box">
          <h4 className="section-title-normal">Jenis Kawalan</h4>
          <div className="chart-placeholder-wrapper">
            <div className="chart-placeholder">
              [Carta Pai Recharts untuk Jenis Kawalan]
            </div>
          </div>
        </div>
        
      </div>

      {/* --- 3. JADUAL RISIKO TERATAS --- */}
      <div className="table-container">
        <div className="section-box">
          <h4 className="section-title-normal">
            Senarai Risiko Teratas (Kritikal & "Buka")
          </h4>
          <div className="table-wrapper">
            <table className="top-risks-table">
              <thead>
                <tr>
                  <th>No Rujukan</th>
                  <th>Nama Risiko</th>
                  <th>Kategori</th>
                  <th>Bahagian/Unit</th>
                </tr>
              </thead>
              <tbody>
                {topRisksData.map((risk, index) => (
                  <tr key={index}>
                    <td>{risk.noRujukan}</td>
                    <td>{risk.nama}</td>
                    <td>{risk.kategori}</td>
                    <td>{risk.bahagian}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}