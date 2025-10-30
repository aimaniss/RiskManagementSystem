import { useState } from "react";
import FilterModal from "./FilterModal.jsx";
// Import komponen dashboard anda
import DashboardKeseluruhan from "./DashboardKeseluruhan.jsx"; // Anda perlu cipta fail ini
import DashboardSubsidiari from "./DashboardSubsidiari.jsx";   // Anda perlu cipta fail ini
import "./PaparanUtama.css";

// Komponen Header Minimal yang memaparkan tajuk dan butang Filter
const MinimalHeader = ({ setShowModal }) => (
  <div className="minimal-header">
    <h2>Paparan Utama</h2>
    {/* Butang Filter untuk membuka Modal */}
    <button onClick={() => setShowModal(true)}>
      Filter
    </button>
  </div>
);

// Fungsi untuk memilih dan memaparkan dashboard yang betul
const DashboardRenderer = ({ filterValues }) => {
  // Logic: Jika subsidiari adalah "Semua Subsidiari" (nilai default), tunjuk Dashboard Keseluruhan
  // Jika tidak, tunjuk Dashboard Subsidiari

  if (filterValues.subsidiari === "Semua Subsidiari") {
    return <DashboardKeseluruhan filterValues={filterValues} />;
  } else {
    // Apabila subsidiari tertentu dipilih (cth: "UKMH Holdings", "UKMH Edutech", dsb.)
    return <DashboardSubsidiari filterValues={filterValues} />;
  }
};

export default function PaparanUtama() {
  const [filterValues, setFilterValues] = useState({
    // Perhatikan nilai default untuk 'subsidiari'
    subsidiari: "Semua Subsidiari", 
    tahunAsas: "2024",
    separuhAsas: "H1",
    tahunBanding: "2025",
    separuhBanding: "H2",
  });

  const [showModal, setShowModal] = useState(false);

  return (
    <div className="PaparanUtama">
      {/* 1. Header dan Butang Filter */}
      <MinimalHeader setShowModal={setShowModal} />

      {/* 2. Dashboard akan dipaparkan di bawah */}
      <div className="dashboard-content">
        <DashboardRenderer filterValues={filterValues} />
      </div>

      {/* 3. Modal Filter (Hanya dipaparkan jika showModal adalah true) */}
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