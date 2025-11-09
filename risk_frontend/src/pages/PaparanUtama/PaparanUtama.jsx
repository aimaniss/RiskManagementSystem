import { useState, useEffect } from "react";
import FilterModal from "./FilterModal.jsx";
import DashboardKeseluruhan from "./DashboardKeseluruhan.jsx";
import DashboardSubsidiari from "./DashboardSubsidiari.jsx";
import "./PaparanUtama.css";

// Header
const MinimalHeader = ({ setShowModal }) => (
  <div className="PaparanUtama-header">
    <h1>Paparan Utama</h1>
    <button onClick={() => setShowModal(true)}>Pilih Tapisan</button>
  </div>
);

// Render dashboard berdasarkan filter
const DashboardRenderer = ({ filterValues, data }) => {
  if (filterValues.subsidiari === "Semua Subsidiari") {
    return <DashboardKeseluruhan data={data} />;
  } else {
    return <DashboardSubsidiari data={data} />;
  }
};

export default function PaparanUtama() {
  const [filterValues, setFilterValues] = useState({
    subsidiari: "Semua Subsidiari",
  });
  const [showModal, setShowModal] = useState(false);

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Ambil token dari localStorage/sessionStorage
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Sila login semula. Token tidak ditemui.");

        const subsidiariQuery =
          filterValues.subsidiari === "Semua Subsidiari"
            ? "Semua"
            : filterValues.subsidiari;

        const response = await fetch(
          `/api/dashboard?subsidiari_id=${encodeURIComponent(subsidiariQuery)}`,
          {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`, // hantar token
            },
          }
        );

        if (response.status === 401) {
          throw new Error("401 Unauthorized. Sila login semula.");
        }

        if (!response.ok) {
          throw new Error(`Gagal memuatkan data: ${response.status}`);
        }

        const data = await response.json();
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
  }, [filterValues.subsidiari]);

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
        />
      )}
    </div>
  );
}
