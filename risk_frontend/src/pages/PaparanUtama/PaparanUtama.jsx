import { useState, useEffect } from "react";

import api from "../../api/api.js";

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
const DashboardRenderer = ({ filterValues, data, currentUser }) => {
  const adminRoles = [1, 2]; 
  const isAdmin = adminRoles.includes(currentUser?.peranan_id);

  if (filterValues.subsidiari === "Semua Subsidiari" && isAdmin) {
    return <DashboardKeseluruhan data={data} />;
  } else {
    return <DashboardSubsidiari data={data} />;
  }
};

// ================================
// 🟦 Komponen Utama
// ================================
export default function PaparanUtama() {
  const [filterValues, setFilterValues] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [subsidiariOptions, setSubsidiariOptions] = useState([]);
  const [subsidiariLoading, setSubsidiariLoading] = useState(true);
  
  const token = localStorage.getItem("token");

  // ----- DIBETULKAN: Ambil data pengguna menggunakan 'api' -----
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setError("Token tidak ditemui. Sila login semula.");
        setIsUserLoading(false);
        return;
      }
      try {
        // Menggunakan api.get() yang automatik ketuk port 5001 dan bawa Token
        const res = await api.get("/users/me");
        setCurrentUser(res.data);
      } catch (err) {
        console.error("❌ Ralat ambil pengguna:", err);
        setError(err.response?.data?.error || "Gagal mendapatkan data pengguna.");
      } finally {
        setIsUserLoading(false);
      }
    };
    fetchCurrentUser();
  }, [token]);

  // ----- DIBETULKAN: Ambil senarai subsidiari menggunakan 'api' -----
  useEffect(() => {
    const fetchSubsidiari = async () => {
      if (!token) return; 
      try {
        setSubsidiariLoading(true);
        const res = await api.get("/subsidiari");
        setSubsidiariOptions(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("❌ Ralat ambil subsidiari:", err);
        setError(err.response?.data?.error || "Gagal memuatkan senarai subsidiari.");
        setSubsidiariOptions([]);
      } finally {
        setSubsidiariLoading(false);
      }
    };

    fetchSubsidiari();
  }, [token]);

  // Tetapkan filter default berdasarkan peranan pengguna
  useEffect(() => {
    if (isUserLoading || subsidiariLoading || !currentUser || subsidiariOptions.length === 0) {
      return;
    }

    const adminRoles = [1, 2]; 
    const isAdmin = adminRoles.includes(currentUser.peranan_id);

    if (isAdmin) {
      setFilterValues({
        subsidiari: "Semua Subsidiari",
        subsidiariId: "Semua",
        subsidiariName: "Semua Subsidiari",
      });
    } else {
      const userSubsidiary = subsidiariOptions.find(
        (s) => s.subsidiari_id === currentUser.subsidiari_id
      );

      if (userSubsidiary) {
        setFilterValues({
          subsidiari: userSubsidiary.nama_subsidiari,
          subsidiariId: userSubsidiary.subsidiari_id,
          subsidiariName: userSubsidiary.nama_subsidiari,
        });
      } else {
        setError(`Subsidiari ID ${currentUser.subsidiari_id} tidak ditemui.`);
      }
    }
  }, [currentUser, subsidiariOptions, isUserLoading, subsidiariLoading]);

  // ----- DIBETULKAN: Ambil data dashboard menggunakan 'api' -----
  useEffect(() => {
    if (!filterValues || !token) {
      return; 
    }

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const adminRoles = [1, 2];
        const isAdmin = adminRoles.includes(currentUser?.peranan_id);
        
        let finalSubsidiariId = filterValues.subsidiariId;

        if (!isAdmin && filterValues.subsidiariId === "Semua") {
           finalSubsidiariId = currentUser.subsidiari_id;
        }

        const subsidiariQuery =
          finalSubsidiariId === "Semua"
            ? "Semua"
            : encodeURIComponent(finalSubsidiariId);

        const res = await api.get(`/dashboard?subsidiari_id=${subsidiariQuery}`);
        setDashboardData(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || "Gagal memuatkan data dashboard.");
        setDashboardData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [filterValues, token, currentUser]); 

  if (isUserLoading || subsidiariLoading || !filterValues) {
    return (
      <div className="PaparanUtama">
        <MinimalHeader setShowModal={() => {}} />
        <div className="dashboard-content">
          <div>Menetapkan paparan untuk anda...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="PaparanUtama">
      <MinimalHeader setShowModal={setShowModal} />

      <div className="dashboard-content">
        {isLoading && <div>Memuatkan data dashboard...</div>}
        {error && <div className="dashboard-error">Ralat: {error}</div>}
        {!isLoading && !error && dashboardData && (
          <DashboardRenderer
            filterValues={filterValues}
            data={dashboardData}
            currentUser={currentUser} 
          />
        )}
      </div>

      {showModal && (
        <FilterModal
          filterValues={filterValues}
          setFilterValues={setFilterValues}
          setShowModal={setShowModal}
          subsidiariOptions={subsidiariOptions}
          currentUser={currentUser} 
        />
      )}
    </div>
  );
}