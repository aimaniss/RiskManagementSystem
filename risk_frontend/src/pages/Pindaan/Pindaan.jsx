import { useState, useEffect, useMemo } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../../api/api";
import { FilePenLine, ShieldAlert, ShieldCheck, Archive } from "lucide-react";

// Komponen modular
import StatusBadge from "./StatusBadge";
import MohonPindaanModal from "./MohonPindaanModal";
import PindaanFormModal from "./PindaanFormModal";
import PindaanDetailsModal from "./PindaanDetailsModal";

// Gaya CSS
import "./PindaanRisiko.css";

// --- MATRIKS RISIKO ---
const riskMatrix = {
  1: {1:{label:"R", color:"#22c55e"},2:{label:"R", color:"#22c55e"},3:{label:"S", color:"#eab308"},4:{label:"S", color:"#eab308"},5:{label:"T", color:"#f97316"}},
  2: {1:{label:"R", color:"#22c55e"},2:{label:"R", color:"#22c55e"},3:{label:"S", color:"#eab308"},4:{label:"S", color:"#eab308"},5:{label:"T", color:"#f97316"}},
  3: {1:{label:"R", color:"#22c55e"},2:{label:"S", color:"#eab308"},3:{label:"S", color:"#eab308"},4:{label:"T", color:"#f97316"},5:{label:"T", color:"#f97316"}},
  4: {1:{label:"S", color:"#eab308"},2:{label:"S", color:"#eab308"},3:{label:"T", color:"#f97316"},4:{label:"T", color:"#f97316"},5:{label:"ST", color:"#ef4444"}},
  5: {1:{label:"S", color:"#eab308"},2:{label:"T", color:"#f97316"},3:{label:"T", color:"#f97316"},4:{label:"ST", color:"#ef4444"},5:{label:"ST", color:"#ef4444"}},
};


function PindaanRisiko() {
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserSubsidiariId, setCurrentUserSubsidiariId] = useState(null);
  const [allRisks, setAllRisks] = useState([]);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [loadingAmendments, setLoadingAmendments] = useState(true);
  const [amendmentsError, setAmendmentsError] = useState(null);
  const [subsidiariList, setSubsidiariList] = useState([]);
  
  // State untuk penapis
  const [filterStatus, setFilterStatus] = useState("Menunggu Kelulusan");
  const [filterSubsidiari, setFilterSubsidiari] = useState("Semua"); 

  // State untuk Kad Statistik (Admin)
  const [amendmentStats, setAmendmentStats] = useState({
    menunggu: 0,
    diluluskan: 0,
    ditolak: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // State Modal
  const [isPindaanModalOpen, setIsPindaanModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSelectRiskModalOpen, setIsSelectRiskModalOpen] = useState(false);
  const [selectedRiskForPindaan, setSelectedRiskForPindaan] = useState(null);
  const [selectedAmendment, setSelectedAmendment] = useState(null);

  // --- Decode token & load data awal ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    let role = null;
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
        userId = decoded.id;
        userSubsId = decoded.subsidiari_id;

        if (role !== "Admin" && role !== "Executive") {
          role = "Unauthorized";
        }
      } catch (err) {
        console.error("❌ Token tidak sah", err);
        role = "Unauthorized";
      }
    } else {
      role = "Unauthorized";
    }

    setCurrentUserRole(role);
    setCurrentUserId(userId);
    setCurrentUserSubsidiariId(userSubsId);

    if (role === "Admin" || role === "Executive") {
      fetchAmendments(role, userId, filterStatus, filterSubsidiari);
      fetchSubsidiariList();
      if (role === "Admin") {
        fetchAmendmentStats(); // Hanya Admin memuatkan statistik
      }
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

  // Fungsi BARU untuk memuatkan data statistik
  const fetchAmendmentStats = async () => {
    setLoadingStats(true);
    try {
      // Andaikan endpoint ini wujud
      const res = await api.get("/pindaan/stats"); 
      setAmendmentStats({
        menunggu: res.data.menunggu || 0,
        diluluskan: res.data.diluluskan || 0,
        ditolak: res.data.ditolak || 0,
      });
    } catch (err) {
      console.error("Gagal fetch statistik pindaan:", err);
    } finally {
      setLoadingStats(false);
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

  const fetchAmendments = async (role, userId, statusFilter, subsidiariFilter) => {
    setLoadingAmendments(true);
    setAmendmentsError(null);
    try {
      const params = {};
      if (statusFilter !== "Semua") params.status = statusFilter;
      
      if (role === "Admin" && subsidiariFilter !== "Semua") {
        params.subsidiari_id = subsidiariFilter;
      }

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

  // useEffect untuk memuat semula data apabila penapis berubah
  useEffect(() => {
    if (currentUserRole === "Admin" || currentUserRole === "Executive") {
      fetchAmendments(currentUserRole, currentUserId, filterStatus, filterSubsidiari);
    }
  }, [filterStatus, filterSubsidiari, currentUserRole]); 

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
      // Muat semula data
      fetchAmendments(currentUserRole, currentUserId, filterStatus, filterSubsidiari);
      if (currentUserRole === "Admin") {
        fetchAmendmentStats(); // Muat semula statistik
      }
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
      // Muat semula data
      fetchAmendments(currentUserRole, currentUserId, filterStatus, filterSubsidiari);
      if (currentUserRole === "Admin") {
        fetchAmendmentStats(); // Muat semula statistik
      }
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
    if (riskMatrix[k] && riskMatrix[k][i]) {
      return riskMatrix[k][i].label; // R, S, T, atau ST
    }
    return "-"; 
  };

  const calculateRiskColor = (skorK, skorI) => {
    const k = parseInt(skorK);
    const i = parseInt(skorI);
    if (riskMatrix[k] && riskMatrix[k][i]) {
      return riskMatrix[k][i].color; // Kod warna
    }
    return "#f1f5f9"; 
  };

  if (currentUserRole === null)
    return <div className="pindaan-container">⏳ Memeriksa kebenaran akses...</div>;
  if (currentUserRole === "Unauthorized")
    return <div className="pindaan-container">🚫 Anda tidak dibenarkan mengakses halaman ini.</div>;

  return (
    <div className="pindaan-container pindaan-risiko-wrapper">
      <h1 className="pindaan-header">Pindaan</h1>

      {/* --- KAD STATISTIK (HANYA ADMIN) --- */}
      {currentUserRole === 'Admin' && (
        <StatsCardSection stats={amendmentStats} loading={loadingStats} />
      )}

      {/* --- SEKSYEN SENARAI PINDAAN --- */}
      <AmendmentsListSection
        userRole={currentUserRole}
        currentUserId={currentUserId}
        // Props Penapis
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterSubsidiari={filterSubsidiari}
        setFilterSubsidiari={setFilterSubsidiari}
        subsidiariList={subsidiariList}
        // Props Jadual
        loading={loadingAmendments}
        error={amendmentsError}
        amendments={amendments}
        handleViewDetails={handleViewDetails}
        // Props Butang
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

// --- Komponen Kad Statistik (BARU) ---
function StatsCardSection({ stats, loading }) {
  const cardData = [
    {
      title: "Menunggu Kelulusan",
      value: stats.menunggu,
      icon: <ShieldAlert size={24} className="stats-icon stats-icon-menunggu" />,
      colorClass: "stats-card-menunggu",
    },
    {
      title: "Diluluskan",
      value: stats.diluluskan,
      icon: <ShieldCheck size={24} className="stats-icon stats-icon-diluluskan" />,
      colorClass: "stats-card-diluluskan",
    },
    {
      title: "Ditolak / Arkib",
      value: stats.ditolak,
      icon: <Archive size={24} className="stats-icon stats-icon-ditolak" />,
      colorClass: "stats-card-ditolak",
    },
  ];

  return (
    <div className="stats-card-container">
      {cardData.map((card) => (
        <div key={card.title} className={`stats-card ${card.colorClass}`}>
          <div className="stats-card-icon-bg">
            {card.icon}
          </div>
          <div className="stats-card-content">
            <span className="stats-card-title">{card.title}</span>
            <span className="stats-card-value">
              {loading ? "..." : card.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}


// --- Komponen Senarai Pindaan ---
function AmendmentsListSection({
  userRole,
  currentUserId,
  // Props Penapis
  filterStatus,
  setFilterStatus,
  filterSubsidiari,
  setFilterSubsidiari,
  subsidiariList,
  // Props Jadual
  loading,
  error,
  amendments,
  handleViewDetails,
  // Props Butang
  onMohonPindaanClick,
  isMohonPindaanLoading,
}) {
  const filteredForExecutive = useMemo(() => {
    if (userRole === "Executive" && currentUserId) {
      return amendments.filter((a) => a.pemohon_id === currentUserId);
    }
    return amendments;
  }, [amendments, userRole, currentUserId]);

  const columnCount = userRole === "Admin" ? 6 : 5;

  return (
    <div className="pindaan-box">
      <div className="pindaan-box-header">
        <h2 className="pindaan-subheader">
          {userRole === "Executive"
            ? "Sejarah Permohonan Pindaan Saya"
            : "Senarai Permohonan Untuk Kelulusan"}
        </h2>
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

      {/* Bekas Penapis - kini mengandungi kedua-dua penapis */}
      <div className="filters-wrapper">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="form-select"
        >
          <option value="Menunggu Kelulusan">Menunggu Kelulusan</option>
          <option value="Diluluskan">Diluluskan</option>
          <option value="Ditolak">Ditolak</option>
          <option value="Semua">Semua Status</option>
        </select>
        
        {userRole === "Admin" && (
          <select
            value={filterSubsidiari}
            onChange={(e) => setFilterSubsidiari(e.target.value)}
            className="form-select"
          >
            <option value="Semua">Semua Subsidiari</option>
            {subsidiariList.map((subs) => (
              <option key={subs.id} value={subs.id}>
                {subs.nama}
              </option>
            ))}
          </select>
        )}
      </div>

      <table className="pindaan-table">
        <thead>
          <tr>
            <th>Bil.</th>
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
            filteredForExecutive.map((amend, index) => (
              <tr key={amend.id}>
                <td>{index + 1}</td>
                <td>{amend.no_rujukan || amend.risiko?.no_rujukan || "N/A"}</td>
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