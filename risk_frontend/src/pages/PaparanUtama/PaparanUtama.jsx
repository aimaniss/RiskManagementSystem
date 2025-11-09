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
// ----- DIUBAH SUAI: Terima `currentUser` untuk semakan peranan -----
const DashboardRenderer = ({ filterValues, data, currentUser }) => {
  // Hanya 'ADMIN' (ID 1) dan 'EXECUTIVE' (ID 2) boleh lihat "Semua"
  const adminRoles = [1, 2]; 
  const isAdmin = adminRoles.includes(currentUser?.peranan_id);

  if (filterValues.subsidiari === "Semua Subsidiari" && isAdmin) {
    return <DashboardKeseluruhan data={data} />;
  } else {
    // Pengguna biasa akan sentiasa melihat dashboard subsidiari
    // (walaupun filter mereka "Semua", ia akan kembali ke subsidiari mereka)
    return <DashboardSubsidiari data={data} />;
  }
};

// ================================
// 🟦 Komponen Utama
// ================================
export default function PaparanUtama() {
  // ----- DIUBAH SUAI: `filterValues` bermula sebagai `null` sehingga data pengguna dimuatkan -----
  const [filterValues, setFilterValues] = useState(null);
  
  // ----- BARU: State untuk data pengguna -----
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [subsidiariOptions, setSubsidiariOptions] = useState([]);
  const [subsidiariLoading, setSubsidiariLoading] = useState(true);
  
  const token = localStorage.getItem("token");

  // ----- BARU: Ambil data pengguna semasa (seperti dalam Navbar) -----
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setError("Token tidak ditemui. Sila login semula.");
        setIsUserLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Gagal mendapatkan data pengguna.");
        const userData = await res.json();
        setCurrentUser(userData);
      } catch (err) {
        console.error("❌ Ralat ambil pengguna:", err);
        setError(err.message);
      } finally {
        setIsUserLoading(false);
      }
    };
    fetchCurrentUser();
  }, [token]);

  // Ambil senarai subsidiari untuk dropdown
  useEffect(() => {
    const fetchSubsidiari = async () => {
      if (!token) return; // Tunggu token
      try {
        setSubsidiariLoading(true);
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
        setError(err.message); // Tetapkan ralat jika gagal
        setSubsidiariOptions([]);
      } finally {
        setSubsidiariLoading(false);
      }
    };

    fetchSubsidiari();
  }, [token]);

  // ----- BARU: Tetapkan filter default berdasarkan peranan pengguna -----
  useEffect(() => {
    // Jangan jalankan sehingga kedua-dua data pengguna dan subsidiari dimuatkan
    if (isUserLoading || subsidiariLoading || !currentUser || subsidiariOptions.length === 0) {
      return;
    }

    const adminRoles = [1, 2]; // 1: ADMIN, 2: EXECUTIVE
    const isAdmin = adminRoles.includes(currentUser.peranan_id);

    if (isAdmin) {
      // Admin/Executive bermula dengan "Semua Subsidiari"
      setFilterValues({
        subsidiari: "Semua Subsidiari",
        subsidiariId: "Semua",
        subsidiariName: "Semua Subsidiari",
      });
    } else {
      // Pengguna lain bermula dengan subsidiari mereka sendiri
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
        // Fallback jika subsidiari pengguna tidak ditemui (jarang berlaku)
        setError(`Subsidiari ID ${currentUser.subsidiari_id} tidak ditemui.`);
      }
    }
  }, [currentUser, subsidiariOptions, isUserLoading, subsidiariLoading]);


  // Ambil data dashboard bila filter berubah
  useEffect(() => {
    // ----- DIUBAH SUAI: Jangan fetch sehingga filterValues ditetapkan -----
    if (!filterValues || !token) {
      return; 
    }

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Pastikan pengguna biasa tidak boleh 'memaksa' query "Semua"
        const adminRoles = [1, 2];
        const isAdmin = adminRoles.includes(currentUser?.peranan_id);
        
        let finalSubsidiariId = filterValues.subsidiariId;

        if (!isAdmin && filterValues.subsidiariId === "Semua") {
           // Jika bukan admin tapi filter "Semua", paksa guna ID subsidiari pengguna
           finalSubsidiariId = currentUser.subsidiari_id;
        }

        const subsidiariQuery =
          finalSubsidiariId === "Semua"
            ? "Semua"
            : encodeURIComponent(finalSubsidiariId);

        // PENTING: API anda di backend (/api/dashboard) 
        // JUGA MESTI mengesahkan peranan pengguna jika 'subsidiariQuery=Semua' diminta.
        // Jangan bergantung pada frontend sahaja untuk keselamatan.

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
  }, [filterValues, token, currentUser]); // Tambah currentUser sebagai kebergantungan

  // ----- DIUBAH SUAI: Tunjukkan status muat data pengguna/filter -----
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
            currentUser={currentUser} // Hantar data pengguna ke renderer
          />
        )}
      </div>

      {showModal && (
        <FilterModal
          filterValues={filterValues}
          setFilterValues={setFilterValues}
          setShowModal={setShowModal}
          subsidiariOptions={subsidiariOptions}
          // ----- BARU: Hantar maklumat peranan ke modal -----
          currentUser={currentUser} 
        />
      )}
    </div>
  );
}