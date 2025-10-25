import { useState, useEffect, useMemo } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../../api/api";
import { FilePenLine } from "lucide-react";

// Komponen modular
import StatusBadge from "./StatusBadge";
import MohonPindaanModal from "./MohonPindaanModal";
import PindaanFormModal from "./PindaanFormModal";
import PindaanDetailsModal from "./PindaanDetailsModal";

// Gaya CSS
import "./PindaanRisiko.css";

function PindaanRisiko() {
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("Pengguna Semasa");
  const [currentUserSubsidiariId, setCurrentUserSubsidiariId] = useState(null);
  const [allRisks, setAllRisks] = useState([]);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [loadingAmendments, setLoadingAmendments] = useState(true);
  const [amendmentsError, setAmendmentsError] = useState(null);
  const [subsidiariList, setSubsidiariList] = useState([]);
  const [filterStatus, setFilterStatus] = useState("Menunggu Kelulusan");
  const [isPindaanModalOpen, setIsPindaanModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSelectRiskModalOpen, setIsSelectRiskModalOpen] = useState(false);
  const [selectedRiskForPindaan, setSelectedRiskForPindaan] = useState(null);
  const [selectedAmendment, setSelectedAmendment] = useState(null);

  // --- Decode token & load data awal ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    let role = null;
    let userName = "Pengguna Tidak Dikenali";
    let userId = null;
    let userSubsId = null;

    if (token) {
      try {
        const decoded = jwtDecode(token);
        const roleMapping = {
          1: "Admin",
          2: "Executive",
          3: "Ketua Subsidiari",
          4: "Staff",
        };
        role = roleMapping[decoded.peranan_id] || "Unauthorized";
        userName = decoded.nama || `Pengguna #${decoded.id}`;
        userId = decoded.id;
        userSubsId = decoded.subsidiari_id;

        if (role !== "Admin" && role !== "Executive") {
          role = "Unauthorized";
          console.warn("Akses Dihalang.");
        }
      } catch (err) {
        console.error("❌ Token tidak sah", err);
        role = "Unauthorized";
      }
    } else {
      role = "Unauthorized";
    }

    setCurrentUserRole(role);
    setCurrentUserName(userName);
    setCurrentUserId(userId);
    setCurrentUserSubsidiariId(userSubsId);

    if (role === "Admin" || role === "Executive") {
      fetchAmendments(role, userId, filterStatus);
      fetchSubsidiariList();
    } else {
      setLoadingAmendments(false);
    }
  }, []);

  // --- API Functions ---
  const fetchSubsidiariList = async () => {
    try {
      const res = await api.get("/subsidiari");
      setSubsidiariList(res.data || []);
    } catch (err) {
      console.error("Gagal fetch subsidiari:", err);
    }
  };

  const fetchAllRisks = async () => {
    setLoadingRisks(true);
    setAllRisks([]);
    try {
      const response = await api.get("/risiko");
      const risksWithDetails = response.data.map((r) => ({
        ...r,
        tahap_risiko: calculateTahapRisiko(
          r.skor_kebarangkalian,
          r.skor_impak
        ),
        risk_color: calculateRiskColor(r.skor_kebarangkalian, r.skor_impak),
      }));
      setAllRisks(risksWithDetails || []);
    } catch (err) {
      console.error("Gagal memuatkan senarai risiko:", err);
      alert("⚠️ Gagal memuatkan senarai risiko.");
    } finally {
      setLoadingRisks(false);
    }
  };

  const fetchAmendments = async (role, userId, statusFilter) => {
    setLoadingAmendments(true);
    setAmendmentsError(null);
    try {
      const params = {};
      if (statusFilter !== "Semua") params.status = statusFilter;
      const response = await api.get("/pindaan", { params });
      setAmendments(response.data || []);
    } catch (err) {
      console.error("Gagal memuatkan senarai pindaan:", err);
      setAmendmentsError("Gagal memuatkan data. Sila cuba lagi.");
      setAmendments([]);
    } finally {
      setLoadingAmendments(false);
    }
  };

  useEffect(() => {
    if (currentUserRole === "Admin") {
      fetchAmendments(currentUserRole, currentUserId, filterStatus);
    }
  }, [filterStatus, currentUserRole]);

  // --- Handlers ---
  const handlePindaanSubmitted = async (justifikasi, perubahanDicadang) => {
    const risikoId = selectedRiskForPindaan.risiko_id || selectedRiskForPindaan.id;
    if (!risikoId) return alert("⚠️ ID Risiko tidak sah.");
    const payload = {
      risiko_id: risikoId,
      justifikasi,
      perubahan: perubahanDicadang,
      autoApprove: currentUserRole === "Admin",
    };
    try {
      await api.post("/pindaan", payload);
      alert(
        `Permohonan Pindaan ${
          currentUserRole === "Admin" ? "dicipta dan diluluskan" : "berjaya dihantar"
        }!`
      );
      setIsPindaanModalOpen(false);
      setSelectedRiskForPindaan(null);
      fetchAmendments(currentUserRole, currentUserId, filterStatus);
    } catch (err) {
      console.error("Gagal hantar permohonan:", err.response?.data || err);
      alert(
        `⚠️ Gagal hantar permohonan: ${
          err.response?.data?.message || "Sila cuba lagi."
        }`
      );
    }
  };

  const handleViewDetails = (amendment) => {
    setSelectedAmendment(amendment);
    setIsDetailsModalOpen(true);
  };

  const handleApprovalAction = async (id, action, komen) => {
    const endpoint =
      action === "meluluskan"
        ? `/pindaan/${id}/approve`
        : `/pindaan/${id}/reject`;
    const payload = { komen_pelulus: komen };
    try {
      await api.put(endpoint, payload);
      alert(`Permohonan #${id} berjaya ${action}.`);
      setIsDetailsModalOpen(false);
      fetchAmendments(currentUserRole, currentUserId, filterStatus);
    } catch (err) {
      console.error(`Gagal ${action} permohonan:`, err.response?.data || err);
      alert(
        `⚠️ Gagal ${action} permohonan: ${
          err.response?.data?.message || "Sila cuba lagi."
        }`
      );
    }
  };

  const handleRiskSelected = (risk) => {
    setSelectedRiskForPindaan(risk);
    setIsSelectRiskModalOpen(false);
    setIsPindaanModalOpen(true);
  };

  // --- Fungsi Bantuan ---
  const calculateTahapRisiko = (skorK, skorI) => {
    const k = parseInt(skorK);
    const i = parseInt(skorI);
    if (!k || !i) return "-";
    if (k * i >= 16) return "Sangat Tinggi";
    if (k * i >= 10) return "Tinggi";
    if (k * i >= 5) return "Sederhana";
    return "Rendah";
  };

  const calculateRiskColor = (skorK, skorI) => {
    const k = parseInt(skorK);
    const i = parseInt(skorI);
    if (!k || !i) return "#f1f5f9";
    if (k * i >= 16) return "#ef4444";
    if (k * i >= 10) return "#f97316";
    if (k * i >= 5) return "#eab308";
    return "#22c55e";
  };

  if (currentUserRole === null)
    return <div className="pindaan-container">⏳ Memeriksa kebenaran akses...</div>;
  if (currentUserRole === "Unauthorized")
    return <div className="pindaan-container">🚫 Anda tidak dibenarkan mengakses halaman ini.</div>;

  return (
    // Tambah kelas 'pindaan-risiko-wrapper' untuk skop CSS
    <div className="pindaan-container pindaan-risiko-wrapper">
      <h1 className="pindaan-header">Pindaan</h1>

      <AmendmentsListSection
        userRole={currentUserRole}
        currentUserId={currentUserId}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        loading={loadingAmendments}
        error={amendmentsError}
        amendments={amendments}
        handleViewDetails={handleViewDetails}
        // Props untuk butang mohon pindaan
        onMohonPindaanClick={() => {
          fetchAllRisks();
          setIsSelectRiskModalOpen(true);
        }}
        isMohonPindaanLoading={loadingRisks}
      />

      {/* --- Modals --- */}
      {isSelectRiskModalOpen && (
        <MohonPindaanModal
          isOpen={isSelectRiskModalOpen}
          onClose={() => setIsSelectRiskModalOpen(false)}
          risks={allRisks}
          subsidiariList={subsidiariList}
          userRole={currentUserRole}
          userSubsidiariId={currentUserSubsidiariId}
          onRiskSelect={handleRiskSelected}
          customClass="modal-pilih-risiko"
        />
      )}

      {isPindaanModalOpen && selectedRiskForPindaan && (
        <PindaanFormModal
          isOpen={isPindaanModalOpen}
          risk={selectedRiskForPindaan}
          userRole={currentUserRole}
          onClose={() => setIsPindaanModalOpen(false)}
          onPindaanSubmitted={handlePindaanSubmitted}
        />
      )}

      {isDetailsModalOpen && selectedAmendment && (
        <PindaanDetailsModal
          isOpen={isDetailsModalOpen}
          amendment={selectedAmendment}
          userRole={currentUserRole}
          onClose={() => setIsDetailsModalOpen(false)}
          onAction={handleApprovalAction}
        />
      )}
    </div>
  );
}

// --- Komponen Senarai Pindaan ---
function AmendmentsListSection({
  userRole,
  currentUserId,
  filterStatus,
  setFilterStatus,
  loading,
  error,
  amendments,
  handleViewDetails,
  // Props baru diterima
  onMohonPindaanClick,
  isMohonPindaanLoading,
}) {
  const filteredForExecutive = useMemo(() => {
    if (userRole === "Executive" && currentUserId) {
      return amendments.filter((a) => a.pemohon_id === currentUserId);
    }
    return amendments;
  }, [amendments, userRole, currentUserId]);

  // Tentukan bilangan lajur berdasarkan peranan (Admin=6, Executive=5)
  const columnCount = userRole === "Admin" ? 6 : 5;

  return (
    <div className="pindaan-box">
      {/* Header baru untuk tajuk dan butang */}
      <div className="pindaan-box-header">
        <h2 className="pindaan-subheader">
          {userRole === "Executive"
            ? "Sejarah Permohonan Pindaan Saya"
            : "Senarai Permohonan Untuk Kelulusan"}
        </h2>

        {/* Butang "Mohon Pindaan" kini di sini */}
        <button
          onClick={onMohonPindaanClick}
          className="btn btn-primary"
          disabled={isMohonPindaanLoading}
        >
          {isMohonPindaanLoading ? "Memuatkan Risiko..." : (
            <>
              <FilePenLine size={18} /> Mohon Pindaan
            </>
          )}
        </button>
      </div>

      {userRole === "Admin" && (
        <div className="filter-container">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select"
          >
            <option value="Menunggu Kelulusan">Menunggu Kelulusan</option>
            <option value="Diluluskan">Diluluskan</option>
            <option value="Ditolak">Ditolak</option>
            <option value="Semua">Semua</option>
          </select>
        </div>
      )}

      <table className="pindaan-table">
        <thead>
          <tr>
            {/* Header lajur kini bersyarat */}
            <th>ID</th>
            <th>No Rujukan</th>
            {userRole === "Admin" && <th>Pemohon</th>}
            <th>Tarikh Mohon</th>
            <th>Status</th>
            <th>Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              {/* colSpan kini dinamik */}
              <td colSpan={columnCount} className="table-message">
                ⏳ Memuatkan data...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={columnCount} className="table-message table-message-error">
                ⚠️ {error}
              </td>
            </tr>
          ) : filteredForExecutive.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="table-message">
                🚫 Tiada data.
              </td>
            </tr>
          ) : (
            filteredForExecutive.map((amend) => (
              <tr key={amend.id}>
                <td>{amend.id}</td>
                <td>{amend.no_rujukan || amend.risiko?.no_rujukan || "N/A"}</td>

                {/* Data lajur 'Pemohon' kini bersyarat */}
                {userRole === "Admin" && (
                  <td>{amend.pemohon_nama || amend.pemohon?.nama || "N/A"}</td>
                )}

                <td>
                  {new Date(amend.tarikh_mohon).toLocaleDateString("ms-MY")}
                </td>
                <td>
                  <StatusBadge status={amend.status} />
                </td>
                <td>
                  <button
                    onClick={() => handleViewDetails(amend)}
                    className="btn btn-sm btn-info"
                  >
                    Lihat
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default PindaanRisiko;