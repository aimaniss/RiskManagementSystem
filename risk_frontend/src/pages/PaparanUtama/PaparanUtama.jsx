import { useState, useEffect } from "react";
import FilterModal from "./FilterModal.jsx";
import DashboardKeseluruhan from "./DashboardKeseluruhan.jsx";
import DashboardSubsidiari from "./DashboardSubsidiari.jsx";
import "./PaparanUtama.css";

// Komponen Header telah dibetulkan untuk sepadan dengan CSS anda
const MinimalHeader = ({ setShowModal }) => (
  // TUKAR: Guna className dari fail CSS anda
  <div className="PaparanUtama-header">
    {/* TUKAR: Guna h1 untuk sepadan dengan CSS anda */}
    <h1>Paparan Utama</h1>
    
    {/* TUKAR: Nama butang & stail (dari CSS) */}
    <button onClick={() => setShowModal(true)}>
      Pilih Tapisan
    </button>
  </div>
);

// Fungsi ini kini menghantar data yang betul ke dashboard
const DashboardRenderer = ({ filterValues, data }) => {
  
  // Nota: 'data' ialah data yang dimuatkan oleh useEffect di PaparanUtama
  
  if (filterValues.subsidiari === "Semua Subsidiari") {
    // Hantar data yang dimuatkan ke DashboardKeseluruhan
    return <DashboardKeseluruhan data={data} />;
  } else {
    // Hantar data yang dimuatkan ke DashboardSubsidiari
    return <DashboardSubsidiari data={data} />;
  }
};

export default function PaparanUtama() {
  
  // TUKAR: State dipermudahkan. Hanya 'subsidiari' diperlukan.
  const [filterValues, setFilterValues] = useState({
    subsidiari: "Semua Subsidiari", 
  });

  const [showModal, setShowModal] = useState(false);
  
  // TAMBAH: State untuk menyimpan data dashboard yang telah dimuatkan
  const [dashboardData, setDashboardData] = useState(null);

  // TAMBAH: Logik untuk memuatkan data apabila filter berubah
  useEffect(() => {
    // Ini adalah simulasi 'fetch' data dari database
    console.log(`Memuatkan data untuk: ${filterValues.subsidiari}`);
    
    // Logik Sebenar Anda:
    // 1. Panggil API (fetch) berdasarkan filterValues.subsidiari
    // 2. setDashboardData(data_dari_api)
    
    // --- Simulasi Data Dummy ---
    if (filterValues.subsidiari === "Semua Subsidiari") {
      // Data dummy untuk Keseluruhan
      setDashboardData({
        skor: { jumlahBuka: 12, jumlahLaksana: 18, jumlahPantau: 5, jumlahSelesai: 10, jumlahTutup: 15 },
        topRisks: [
          { noRujukan: "R001", nama: "Isu server down", kategori: "Operasi", bahagian: "Unit IT" },
          { noRujukan: "R002", nama: "Kekurangan dana", kategori: "Kewangan", bahagian: "Unit Kewangan" },
        ],
        // ...data carta lain
      });
    } else {
      // Data dummy untuk Subsidiari (cth: Subsidiari A)
      setDashboardData({
        skor: { jumlahBuka: 3, jumlahLaksana: 2, jumlahPantau: 1, jumlahSelesai: 0, jumlahTutup: 5 },
        topRisks: [
          { noRujukan: "S-A-001", nama: "Isu server cawangan", kategori: "Operasi", bahagian: "IT Cawangan" },
        ],
        // ...data carta lain
      });
    }
    // --- Tamat Simulasi ---

  }, [filterValues.subsidiari]); // 'useEffect' ini berjalan setiap kali 'subsidiari' berubah

  return (
    <div className="PaparanUtama">
      {/* 1. Header dan Butang "Pilih Tapisan" */}
      <MinimalHeader setShowModal={setShowModal} />

      {/* 2. Dashboard akan dipaparkan di bawah */}
      <div className="dashboard-content">
        {/* Hantar 'data' yang telah dimuatkan ke renderer */}
        <DashboardRenderer filterValues={filterValues} data={dashboardData} />
      </div>

      {/* 3. Modal Filter */}
      {showModal && (
        <FilterModal
          filterValues={filterValues}
          setFilterValues={setFilterValues}
          setShowModal={setShowModal}
        />
      )}
    </div>
  );
}