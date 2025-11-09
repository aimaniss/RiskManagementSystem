import React from "react";
// Import fail CSS baru
import "./DashboardSubsidiari.css"; 
// Import ikon untuk 5 status
import {
  File, // Buka
  RefreshCw, // Sedang Dilaksanakan
  Eye, // Pemantauan
  Check, // Selesai
  CheckCircle2, // Tutup
} from "lucide-react";

// NOTA: Tiada lagi import logo di sini

/**
 * Komponen Papan Pemuka untuk Subsidiari.
 * Tiada lagi filter kategori.
 */
export default function DashboardSubsidiari({
  data, // Data (termasuk logoUrl) akan datang dari 'props' ini
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
    <div className="dashboard-subsidiari-layout">
      {/* Header */}
      <div className="dashboard-subsidiari-header">
        <div className="dashboard-subsidiari-header-left">
          <div className="dashboard-subsidiari-image-placeholder">
            {/* TUKAR: 
              - 'src' kini menggunakan data.logoUrl dari props.
              - 'alt' kini menggunakan data.namaSubsidiari (andaian) 
              - 'fallback' (?) ditambah jika logoUrl tiada.
            */}
            <img 
              src={data?.logoUrl || "path/ke/logo/default.png"} 
              alt={data?.namaSubsidiari || "Logo Subsidiari"} 
            />
          </div>
          {/* Kapsyen telah dibuang seperti permintaan sebelum ini */}
        </div>
        <div className="dashboard-subsidiari-header-right">
          <div className="dashboard-subsidiari-title-main">Dashboard Pengurusan Risiko</div>
          {/* TUKAR: Tajuk ini kini dinamik dari data */}
          <div className="dashboard-subsidiari-title-sub">
            {data?.namaSubsidiari || "Status Subsidiari"}
          </div> 
        </div>
      </div>

      {/* --- FILTER BAR TELAH DIBUANG --- */}

      {/* ===== SUSUN ATUR BARU (FYP) ===== */}

      {/* --- 1. KAD SKOR (VERSI 5 KAD) --- */}
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

      {/* --- 2. GRID CARTA (KINI 3 CARTA) --- */}
      <div className="dashboard-subsidiari-charts-grid">
        {/* Carta 1: Tahap Risiko */}
        <div className="dashboard-subsidiari-section-box">
          <h4 className="dashboard-subsidiari-section-title">Tahap Risiko</h4>
          <div className="dashboard-subsidiari-chart-wrapper">
            <div className="dashboard-subsidiari-chart-placeholder">
              [Carta Bar/Donut Recharts untuk Tahap Risiko]
            </div>
          </div>
        </div>

        {/* Carta 2: Kategori Risiko */}
        <div className="dashboard-subsidiari-section-box">
          <h4 className="dashboard-subsidiari-section-title">Kategori Risiko</h4>
          <div className="dashboard-subsidiari-chart-wrapper">
            <div className="dashboard-subsidiari-chart-placeholder">
              [Carta Bar Recharts untuk Kategori]
            </div>
          </div>
        </div>

        {/* Carta 3: Jenis Kawalan */}
        <div className="dashboard-subsidiari-section-box">
          <h4 className="dashboard-subsidiari-section-title">Jenis Kawalan</h4>
          <div className="dashboard-subsidiari-chart-wrapper">
            <div className="dashboard-subsidiari-chart-placeholder">
              [Carta Pai Recharts untuk Jenis Kawalan]
            </div>
          </div>
        </div>
        
      </div>

      {/* --- 3. JADUAL RISIKO TERATAS --- */}
      <div className="dashboard-subsidiari-table-container">
        <div className="dashboard-subsidiari-section-box">
          <h4 className="dashboard-subsidiari-section-title">
            Senarai Risiko Teratas (Kritikal & "Buka")
          </h4>
          <div className="dashboard-subsidiari-table-wrapper">
            <table className="dashboard-subsidiari-table">
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