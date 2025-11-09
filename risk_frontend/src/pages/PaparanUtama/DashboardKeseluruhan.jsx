// Fail: DashboardKeseluruhan.jsx

import React from "react";
import "./DashboardKeseluruhan.css";
// Import ikon
import {
  File,
  RefreshCw,
  Eye,
  Check,
  CheckCircle2,
} from "lucide-react";
// Import logo
import ukmhLogo from "../../assets/images/Light Background/UKMH_light.png";

// 1. IMPORT SEMUA KOMPONEN CARTA
import TahapRisikoChart from "./TahapRisikoChart";
import KategoriRisikoChart from "./KategoriRisikoChart";
import JenisKawalanChart from "./JenisKawalanChart";

// <-- DIUBAH: Logik warna ditambah di sini -->
// Mapping Teks Penuh ke Warna dari riskMatrix anda
const riskColors = {
  'Sangat Tinggi': '#ef4444', // Merah (ST)
  'Tinggi': '#f97316',        // Oren (T)
  'Sederhana': '#eab308',      // Kuning/Emas (S)
  'Rendah': '#22c55e',        // Hijau (R)
};

// Fungsi helper untuk cipta lencana (badge)
const renderSkorBadge = (skorLabel) => {
  // 'skorLabel' kini ialah "Sangat Tinggi", "Tinggi", "Belum Dinilai", dll.

  // Jika label ialah "Belum Dinilai" (atau null/undefined)
  if (!skorLabel || skorLabel === "Belum Dinilai") {
    return (
      <span style={{ fontStyle: 'italic', color: '#6b7280', fontSize: '0.875rem' }}>
        Belum Dinilai
      </span>
    );
  }
  
  // Dapatkan warna, jika tidak jumpa guna kelabu
  const color = riskColors[skorLabel] || '#6b7280';
  
  // Stail (CSS) untuk lencana
  const badgeStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.6rem',
    borderRadius: '0.375rem',
    backgroundColor: color,
    color: '#ffffff', // Teks putih
    fontWeight: '600',
    fontSize: '0.875rem',
    textAlign: 'center',
    lineHeight: '1.25rem',
    whiteSpace: 'nowrap' // Elak teks terpotong
  };
  
  // Papar teks penuh dalam lencana
  return (
    <span style={badgeStyle}>
      {skorLabel} 
    </span>
  );
};
// <-- TAMAT BLOK PERUBAHAN -->


export default function DashboardKeseluruhan({
  data, // Semua data akan datang dari 'props' ini
}) {
  // === Data Dummy untuk 5 Kad Skor (gantikan dengan data.skor) ===
  const skorData = [
    {
      label: "Jumlah Risiko Buka",
      value: data?.skor?.jumlahBuka || 0, // Guna data sebenar
      icon: File,
      color: "#dc3545",
    },
    {
      label: "Sedang Dilaksanakan",
      value: data?.skor?.jumlahLaksana || 0, // Guna data sebenar
      icon: RefreshCw,
      color: "#ffc107",
    },
    {
      label: "Jumlah Risiko Pemantauan",
      value: data?.skor?.jumlahPantau || 0, // Guna data sebenar
      icon: Eye,
      color: "#0074c8",
    },
    {
      label: "Jumlah Risiko Selesai",
      value: data?.skor?.jumlahSelesai || 0, // Guna data sebenar
      icon: Check,
      color: "#17a2b8",
    },
    {
      label: "Jumlah Risiko Tutup",
      value: data?.skor?.jumlahTutup || 0, // Guna data sebenar
      icon: CheckCircle2,
      color: "#28a745",
    },
  ];

  // Guna data sebenar dari props, 'fallback' ke array kosong
  const topRisksData = data?.topRisks || [];

  return (
    <div className="dashboard-keseluruhan-layout">
      {/* Header (Logo dikekalkan, Tajuk dipermudahkan) */}
      <div className="dashboard-header">
        <div className="header-left-image">
          <div className="image-placeholder">
            <img src={ukmhLogo} alt="Logo UKMH" />
          </div>
          <div className="image-caption">Unit Pematuhan & Pengurusan Risiko</div>
        </div>
        <div className="header-right-title">
          <div className="comparison-title">Dashboard Pengurusan Risiko</div>
          <div className="current-status-title">Status Semasa</div>
        </div>
      </div>

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
            <TahapRisikoChart data={data?.tahapRisikoData} />
          </div>
        </div>

        {/* Carta 2: Kategori Risiko */}
        <div className="section-box">
          <h4 className="section-title-normal">Kategori Risiko</h4>
          <div className="chart-placeholder-wrapper">
            <KategoriRisikoChart data={data?.kategoriRisikoData} />
          </div>
        </div>

        {/* Carta 3: Jenis Kawalan */}
        <div className="section-box">
          <h4 className="section-title-normal">Jenis Kawalan</h4>
          <div className="chart-placeholder-wrapper">
            <JenisKawalanChart data={data?.jenisKawalanData} />
          </div>
        </div>
      </div>

      {/* --- 3. JADUAL RISIKO TERATAS --- */}
      <div className="table-container">
        <div className="section-box">
          <h4 className="section-title-normal">
            6 Risiko Teratas
          </h4>
          <div className="table-wrapper">
            <table className="top-risks-table">
              <thead>
                <tr>
                  <th>No Rujukan</th>
                  <th>Nama Risiko</th>
                  <th>Kategori</th>
                  <th>Bahagian/Unit</th>
                  <th>Tahap Risiko Terkini</th>
                </tr>
              </thead>
              <tbody>
                {topRisksData.length > 0 ? (
                  topRisksData.map((risk, index) => (
                    <tr key={index}>
                      <td>{risk.noRujukan}</td>
                      <td>{risk.nama}</td>
                      <td>{risk.kategori}</td>
                      <td>{risk.bahagian}</td>
                      {/* <-- DIUBAH: Guna fungsi 'renderSkorBadge' --> */}
                      <td>
                        {renderSkorBadge(risk.skor_risiko_terkini)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">Tiada risiko teratas ditemui.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}