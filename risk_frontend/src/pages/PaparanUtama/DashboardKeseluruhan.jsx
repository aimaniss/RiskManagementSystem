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

// NOTA: Recharts akan diimport di sini nanti, cth:
// import { PieChart, BarChart, ... } from 'recharts';

/**
 * Komponen Papan Pemuka FYP yang lebih ringkas.
 * Ia hanya menerima 'data' semasa, bukan untuk perbandingan.
 */
export default function DashboardKeseluruhan({
  data, // Semua data akan datang dari 'props' ini (cth: data.skor, data.tahapRisiko, dll)
  selectedKategori,
  onKategoriChange,
  kategoriOptions = [], // Sebaiknya, hantar 4 kategori ini sebagai props
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

  // === TUKAR: Data Dummy Jadual guna 4 kategori anda ===
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
          {/* --- PERUBAHAN DI SINI --- */}
          <div className="image-placeholder">
            {/* Gantikan 'src' dengan path logo anda */}
            <img src="path/ke/logo-anda-1811x579.png" alt="Logo Unit" />
          </div>
          {/* Teks kini akan dipaparkan di bawah oleh CSS */}
          <div className="image-caption">Unit Pematuhan & Pengurusan Risiko</div>
          {/* --- TAMAT PERUBAHAN --- */}
        </div>
        <div className="header-right-title">
          <div className="comparison-title">Dashboard Pengurusan Risiko</div>
          <div className="current-status-title">Status Semasa</div>
        </div>
      </div>

      {/* Filter Bar Versi FYP */}
      <div className="dashboard-filter-bar">
        <label htmlFor="kategori-filter">Pilih Kategori Risiko:</label>
        <select
          id="kategori-filter"
          value={selectedKategori}
          onChange={(e) => onKategoriChange(e.target.value)}
        >
          <option value="semua">Tunjuk Semua</option>
          {/* Jika anda hantar 'kategoriOptions' sebagai props, ia akan guna props itu */}
          {kategoriOptions.map((kat) => (
            <option key={kat.value} value={kat.value}>
              {kat.label}
            </option>
          ))}
          
          {/* TUKAR: Data Dummy Filter guna 4 kategori anda */}
          {/* Ini hanya akan muncul jika 'kategoriOptions' kosong */}
          {kategoriOptions.length === 0 && (
            <>
              <option value="strategik">Strategik</option>
              <option value="operasi">Operasi</option>
              <option value="pematuhan">Pematuhan / Perundangan</option>
              <option value="kewangan">Kewangan</option>
            </>
          )}
        </select>
      </div>

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
        {/* Carta 1: Tahap Risiko (YANG INI PENTING) */}
        <div className="section-box">
          <h4 className="section-title-normal">Tahap Risiko</h4>
          <div className="chart-placeholder-wrapper">
            <div className="chart-placeholder">
              [Carta Bar/Donut Recharts untuk Tahap Risiko (Tinggi, Sederhana,
              Rendah)]
              {/* Cth: <Recharts... data={data.tahapRisikoData} /> */}
            </div>
          </div>
        </div>

        {/* Carta 2: Kategori Risiko */}
        <div className="section-box">
          <h4 className="section-title-normal">Kategori Risiko</h4>
          <div className="chart-placeholder-wrapper">
            <div className="chart-placeholder">
              [Carta Bar Recharts untuk Kategori (Strategik, Operasi, Pematuhan, Kewangan)]
              {/* Cth: <Recharts... data={data.kategoriRisikoData} /> */}
            </div>
          </div>
        </div>

        {/* Carta 3: Jenis Kawalan */}
        <div className="section-box">
          <h4 className="section-title-normal">Jenis Kawalan</h4>
          <div className="chart-placeholder-wrapper">
            <div className="chart-placeholder">
              [Carta Pai Recharts untuk Jenis Kawalan (Cth: Kurang Berkesan vs
              Berkesan)]
              {/* Cth: <Recharts... data={data.jenisKawalanData} /> */}
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
                  <tr key={index}> {/* Selamat jika noRujukan tidak unik */}
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

      {/* ===== TAMAT SUSUN ATUR BARU ===== */}
    </div>
  );
}