import { useState, useEffect } from "react";
import FilterModal from "./FilterModal.jsx";
import DashboardKeseluruhan from "./DashboardKeseluruhan.jsx";
import DashboardSubsidiari from "./DashboardSubsidiari.jsx";
import "./PaparanUtama.css";

// ================================
// 🟦 Komponen Header Ringkas
// ================================
const MinimalHeader = ({ setShowModal }) => (
  <div className="PaparanUtama-header">
    <h1>Paparan Utama</h1>
    <button onClick={() => setShowModal(true)}>Pilih Tapisan</button>
  </div>
);

// ================================
// 🟦 Pemilih Dashboard (All/Subsidiari)
// ================================
const DashboardRenderer = ({ filterValues, data }) => {
  if (filterValues.subsidiari === "Semua Subsidiari") {
    return <DashboardKeseluruhan data={data} />;
  } else {
    return <DashboardSubsidiari data={data} />;
  }
};

// ================================
// 🟦 Komponen Utama
// ================================
export default function PaparanUtama() {
  const [filterValues, setFilterValues] = useState({
    subsidiari: "Semua Subsidiari",
    subsidiariId: "Semua",
    subsidiariName: "Semua Subsidiari",
  });

  const [showModal, setShowModal] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [subsidiariOptions, setSubsidiariOptions] = useState([]);
  const [subsidiariLoading, setSubsidiariLoading] = useState(true);

  // Ambil senarai subsidiari untuk dropdown
  useEffect(() => {
    const fetchSubsidiari = async () => {
      try {
        setSubsidiariLoading(true);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token tidak ditemui. Sila login semula.");

        const res = await fetch("/api/subsidiari", {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (res.status === 401) throw new Error("401 Unauthorized. Sila login semula.");
        if (!res.ok) throw new Error(`Gagal ambil subsidiari: ${res.status}`);

        const data = await res.json();
        setSubsidiariOptions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Ralat ambil subsidiari:", err);
        setSubsidiariOptions([]);
      } finally {
        setSubsidiariLoading(false);
      }
    };

    fetchSubsidiari();
  }, []);

  // Ambil data dashboard bila filter berubah
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Sila login semula. Token tidak ditemui.");

        const subsidiariQuery =
          filterValues.subsidiariId === "Semua"
            ? "Semua"
            : encodeURIComponent(filterValues.subsidiariId);

        const res = await fetch(`/api/dashboard?subsidiari_id=${subsidiariQuery}`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (res.status === 401) throw new Error("401 Unauthorized. Sila login semula.");
        if (!res.ok) throw new Error(`Gagal memuatkan data: ${res.status}`);

        const data = await res.json();
        setDashboardData(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
        setDashboardData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [filterValues.subsidiariId]);

  return (
    <div className="PaparanUtama">
      <MinimalHeader setShowModal={setShowModal} />

      <div className="dashboard-content">
        {isLoading && <div>Memuatkan data dashboard...</div>}
        {error && <div className="dashboard-error">Ralat: {error}</div>}
        {!isLoading && !error && dashboardData && (
          <DashboardRenderer filterValues={filterValues} data={dashboardData} />
        )}
      </div>

      {showModal && (
        <FilterModal
          filterValues={filterValues}
          setFilterValues={setFilterValues}
          setShowModal={setShowModal}
          subsidiariOptions={subsidiariOptions}
        />
      )}
    </div>
  );
}
