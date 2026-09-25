import { useState, useEffect } from "react";
import { Filter } from "lucide-react";

import api from "../../api/api.js";

import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";

import FilterModal from "./FilterModal.jsx";
import DashboardKeseluruhan from "./DashboardKeseluruhan.jsx";
import DashboardSyarikat from "./DashboardSyarikat.jsx";

// Peranan yang melihat semua syarikat di papan pemuka (ikut nama, bukan ID)
const PERANAN_SEMUA_SYARIKAT = ["Admin", "Executive"];

// ================================
// Pemilih Dashboard (All/Syarikat)
// ================================
const DashboardRenderer = ({ filterValues, data, currentUser }) => {
  const isAdmin = PERANAN_SEMUA_SYARIKAT.includes(currentUser?.nama_peranan);

  if (filterValues.syarikat === "Semua Syarikat" && isAdmin) {
    return <DashboardKeseluruhan data={data} />;
  } else {
    return <DashboardSyarikat data={data} />;
  }
};

// ================================
// Komponen Utama
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

  // ----- Ambil data pengguna -----
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setError("Token tidak ditemui. Sila login semula.");
        setIsUserLoading(false);
        return;
      }
      try {
        const res = await api.get("/users/me");
        setCurrentUser(res.data);
      } catch (err) {
        console.error("Ralat ambil pengguna:", err);
        setError(err.response?.data?.error || "Gagal mendapatkan data pengguna.");
      } finally {
        setIsUserLoading(false);
      }
    };
    fetchCurrentUser();
  }, [token]);

  // ----- Ambil senarai syarikat -----
  useEffect(() => {
    const fetchSyarikat = async () => {
      if (!token) return;
      try {
        setSyarikatLoading(true);
        const res = await api.get("/syarikat");
        setSyarikatOptions(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Ralat ambil syarikat:", err);
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
    const isAdmin = PERANAN_SEMUA_SYARIKAT.includes(currentUser.nama_peranan);

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

  // ----- Ambil data dashboard -----
  useEffect(() => {
    if (!filterValues || !token) {
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const isAdmin = PERANAN_SEMUA_SYARIKAT.includes(currentUser?.nama_peranan);

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
      <div className="space-y-4">
        <PageHeader title="Paparan Utama" />
        <LoadingSpinner text="Menetapkan paparan untuk anda..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Paparan Utama"
        description={
          filterValues ? `Paparan: ${filterValues.syarikatName}` : undefined
        }
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Filter size={14} />
            Pilih Tapisan
          </Button>
        }
      />

      {isLoading && <LoadingSpinner text="Memuatkan paparan utama..." />}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {!isLoading && !error && dashboardData && (
        <DashboardRenderer
          filterValues={filterValues}
          data={dashboardData}
          currentUser={currentUser}
        />
      )}

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
