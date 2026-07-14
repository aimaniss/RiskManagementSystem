import { useState, useEffect } from "react";

import api from "../../api/api.js";

import FilterModal from "./FilterModal.jsx";
import DashboardKeseluruhan from "./DashboardKeseluruhan.jsx";
import DashboardSyarikat from "./DashboardSyarikat.jsx";
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
// 🟦 Pemilih Dashboard (All/Syarikat)
// ================================
const DashboardRenderer = ({ filterValues, data, currentUser }) => {
  const adminRoles = [1, 2]; 
  const isAdmin = adminRoles.includes(currentUser?.peranan_id);

  if (filterValues.syarikat === "Semua Syarikat" && isAdmin) {
    return <DashboardKeseluruhan data={data} />;
  } else {
    return <DashboardSyarikat data={data} />;
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

  const [syarikatOptions, setSyarikatOptions] = useState([]);
  const [syarikatLoading, setSyarikatLoading] = useState(true);
  
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

  // ----- DIBETULKAN: Ambil senarai syarikat menggunakan 'api' -----
  useEffect(() => {
    const fetchSyarikat = async () => {
      if (!token) return; 
      try {
        setSyarikatLoading(true);
        const res = await api.get("/syarikat");
        setSyarikatOptions(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("❌ Ralat ambil syarikat:", err);
        setError(err.response?.data?.error || "Gagal memuatkan senarai syarikat.");
        setSyarikatOptions([]);
      } finally {
        setSyarikatLoading(false);
      }
    };

    fetchSyarikat();
  }, [token]);

  // Tetapkan filter default berdasarkan peranan pengguna
  useEffect(() => {
    if (isUserLoading || syarikatLoading || !currentUser || syarikatOptions.length === 0) {
      return;
    }

    const adminRoles = [1, 2]; 
    const isAdmin = adminRoles.includes(currentUser.peranan_id);

    if (isAdmin) {
      setFilterValues({
        syarikat: "Semua Syarikat",
        syarikatId: "Semua",
        syarikatName: "Semua Syarikat",
      });
    } else {
      const userSyarikat = syarikatOptions.find(
        (s) => s.syarikat_id === currentUser.syarikat_id
      );

      if (userSyarikat) {
        setFilterValues({
          syarikat: userSyarikat.nama_syarikat,
          syarikatId: userSyarikat.syarikat_id,
          syarikatName: userSyarikat.nama_syarikat,
        });
      } else {
        setError(`Syarikat ID ${currentUser.syarikat_id} tidak ditemui.`);
      }
    }
  }, [currentUser, syarikatOptions, isUserLoading, syarikatLoading]);

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
        
        let finalSyarikatId = filterValues.syarikatId;

        if (!isAdmin && filterValues.syarikatId === "Semua") {
           finalSyarikatId = currentUser.syarikat_id;
        }

        const syarikatQuery =
          finalSyarikatId === "Semua"
            ? "Semua"
            : encodeURIComponent(finalSyarikatId);

        const res = await api.get(`/dashboard?syarikat_id=${syarikatQuery}`);
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

  if (isUserLoading || syarikatLoading || !filterValues) {
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
          syarikatOptions={syarikatOptions}
          currentUser={currentUser} 
        />
      )}
    </div>
  );
}