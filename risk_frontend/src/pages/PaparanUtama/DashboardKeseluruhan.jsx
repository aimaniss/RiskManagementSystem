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
            {/* GANTI PLACEHOLDER */}
            <TahapRisikoChart data={data?.tahapRisikoData} />
          </div>
        </div>

        {/* Carta 2: Kategori Risiko */}
        <div className="section-box">
          <h4 className="section-title-normal">Kategori Risiko</h4>
          <div className="chart-placeholder-wrapper">
            {/* GANTI PLACEHOLDER */}
            <KategoriRisikoChart data={data?.kategoriRisikoData} />
          </div>
        </div>

        {/* Carta 3: Jenis Kawalan */}
        <div className="section-box">
          <h4 className="section-title-normal">Jenis Kawalan</h4>
          <div className="chart-placeholder-wrapper">
            {/* GANTI PLACEHOLDER */}
            <JenisKawalanChart data={data?.jenisKawalanData} />
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
                {topRisksData.length > 0 ? (
                  topRisksData.map((risk, index) => (
                    <tr key={index}>
                      <td>{risk.noRujukan}</td>
                    <td>{risk.nama}</td>
                      <td>{risk.kategori}</td>
                      <td>{risk.bahagian}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">Tiada risiko teratas ditemui.</td>
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