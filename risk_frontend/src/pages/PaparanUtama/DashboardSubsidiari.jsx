// Fail: DashboardSubsidiari.jsx

import React from "react";
import "./DashboardSubsidiari.css";
import { File, RefreshCw, Eye, Check, CheckCircle2 } from "lucide-react";

// IMPORT CARTA
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


export default function DashboardSubsidiari({ data }) {
  // Kad Skor
  const skorData = [
    { label: "Jumlah Risiko Buka", value: data?.skor?.jumlahBuka || 0, icon: File, color: "#dc3545" },
    { label: "Sedang Dilaksanakan", value: data?.skor?.jumlahLaksana || 0, icon: RefreshCw, color: "#ffc107" },
    { label: "Jumlah Risiko Pemantauan", value: data?.skor?.jumlahPantau || 0, icon: Eye, color: "#0074c8" },
    { label: "Jumlah Risiko Selesai", value: data?.skor?.jumlahSelesai || 0, icon: Check, color: "#17a2b8" },
    { label: "Jumlah Risiko Tutup", value: data?.skor?.jumlahTutup || 0, icon: CheckCircle2, color: "#28a745" },
  ];

  const topRisksData = data?.topRisks || [];

  return (
    <div className="dashboard-subsidiari-layout">
      {/* Header */}
      <div className="dashboard-subsidiari-header">
      <div className="dashboard-subsidiari-header-left">
        <div className="dashboard-subsidiari-image-placeholder">
        <img 
          src={data?.logoUrl || "path/ke/logo/default.png"} 
          alt={data?.namaSubsidiari || "Logo Subsidiari"} 
        />
        </div>
      </div>
      <div className="dashboard-subsidiari-header-right">
        <div className="dashboard-subsidiari-title-main">Dashboard Pengurusan Risiko</div>
        <div className="dashboard-subsidiari-title-sub">
        {data?.namaSubsidiari || "Status Subsidiari"}
        </div> 
      </div>
      </div>

      {/* Kad Skor */}
      <div className="dashboard-subsidiari-scorecard-container">
      {skorData.map((item, index) => {
        const IconComponent = item.icon;
        return (
        <div key={index} className="dashboard-subsidiari-scorecard-box">
          <div className="dashboard-subsidiari-scorecard-icon">
          <IconComponent style={{ color: item.color }} />
          </div>
          <div className="dashboard-subsidiari-scorecard-content">
          <div className="dashboard-subsidiari-scorecard-value">{item.value}</div>
          <div className="dashboard-subsidiari-scorecard-label">{item.label}</div>
          </div>
        </div>
        );
      })}
      </div>

      {/* Grid Carta */}
      <div className="dashboard-subsidiari-charts-grid">
      <div className="dashboard-subsidiari-section-box">
        <h4 className="dashboard-subsidiari-section-title">Tahap Risiko</h4>
        <div className="dashboard-subsidiari-chart-wrapper">
        <TahapRisikoChart data={data?.tahapRisikoData} />
        </div>
      </div>
      <div className="dashboard-subsidiari-section-box">
        <h4 className="dashboard-subsidiari-section-title">Kategori Risiko</h4>
        <div className="dashboard-subsidiari-chart-wrapper">
        <KategoriRisikoChart data={data?.kategoriRisikoData} />
        </div>
      </div>
      <div className="dashboard-subsidiari-section-box">
        <h4 className="dashboard-subsidiari-section-title">Jenis Kawalan</h4>
        <div className="dashboard-subsidiari-chart-wrapper">
        <JenisKawalanChart data={data?.jenisKawalanData} />
        </div>
      </div>
      </div>

      {/* Jadual */}
      <div className="dashboard-subsidiari-table-container">
      <div className="dashboard-subsidiari-section-box">
        <h4 className="dashboard-subsidiari-section-title">Senarai Risiko Teratas (Kritikal & "Buka")</h4>
        <div className="dashboard-subsidiari-table-wrapper">
        <table className="dashboard-subsidiari-table">
          <thead>
          <tr>
            <th>No Rujukan</th> <th>Nama Risiko</th> <th>Kategori</th> <th>Bahagian/Unit</th>
            <th>Skor Risiko Terkini</th>
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
            <tr><td colSpan="5">Tiada risiko teratas ditemui.</td></tr>
          )}
          </tbody>
        </table>
        </div>
      </div>
      </div>
    </div>
  );
}