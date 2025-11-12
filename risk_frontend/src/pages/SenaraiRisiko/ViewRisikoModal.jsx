import { useState, useEffect } from "react";
import { X, BookOpen, Loader2, Pencil, Trash2 } from "lucide-react"; 
import { jwtDecode } from "jwt-decode";
import "./ViewRisikoModal.css";
import api from "../../api/api";
import PanduanModal from "../Panduan/Panduan";
import TambahLogModal from "../PemantauanRisiko/TambahLogModal";
import KemaskiniPemantauanModal from "./KemaskiniPemantauan";
import PengenalpastianModal from "./PengenalpastianModal";
import PenilaianRisikoModal from "./PenilaianRisikoModal";
import KemaskiniRawatan from "./KemaskiniRawatan"; 

// ==========================================================
// ✅ HELPER FUNCTION - Parse Semicolon Separated String
// ==========================================================
const parseListData = (dataString) => {
  if (!dataString || dataString === "-" || dataString.trim() === "") {
    return [];
  }
  
  return dataString.split(';')
    .map(item => item.trim())
    .filter(item => item !== "" && item !== "-");
};

// ==========================================================
// ✅ LIST DISPLAY COMPONENT - FIXED VERSION
// ==========================================================
const ListDisplay = ({ data, isLogContext = false }) => {
  const getItemText = (item) => {
    if (typeof item === "string") return item;
    if (item?.punca) return item.punca;
    if (item?.kesan) return item.kesan;
    if (item?.punca_text) return item.punca_text;
    if (item?.kesan_text) return item.kesan_text;
    if (item?.nama_punca) return item.nama_punca;
    if (item?.nama_kesan) return item.nama_kesan;
    if (item?.butiran_punca) return item.butiran_punca;
    if (item?.butiran_kesan) return item.butiran_kesan;
    if (item?.butiran_aktiviti) return item.butiran_aktiviti;
    if (item?.butiran_kakitangan) return item.butiran_kakitangan;
    if (item?.butiran_log) return item.butiran_log;
    if (item?.text) return item.text;
    return "-";
  };
  
  // ✅ Handle both array and string (semicolon-separated)
  let cleanedData = [];
  
  if (typeof data === "string") {
    // Parse semicolon-separated string
    cleanedData = parseListData(data);
  } else if (Array.isArray(data)) {
    // Filter array items
    cleanedData = data.filter((item) => {
      const text = getItemText(item);
      return text && text.trim() !== "-";
    });
  }

  if (cleanedData.length === 0)
    return <span style={{ color: "#64748b" }}>-</span>;

  // ✅ Show numbered list only if more than 1 item
  if (cleanedData.length === 1) {
    const itemText = typeof cleanedData[0] === "string" ? cleanedData[0] : getItemText(cleanedData[0]);
    return <span className="viewrisiko-data-inline">{itemText}</span>;
  }

  return (
    <ul style={{ listStyleType: "none", paddingLeft: "0", margin: "0" }}>
      {cleanedData.map((item, index) => {
        const itemText = typeof item === "string" ? item : getItemText(item);
        return (
          <li key={index} className="viewrisiko-list-item">
            <span className="viewrisiko-data-inline">
              {`${index + 1}. ${itemText}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

// ==========================================================
// RISK MATRIX CONSTANTS
// ==========================================================
const riskMatrix = {
  1: {
    1: { label: "R", color: "#22c55e" },
    2: { label: "R", color: "#22c55e" },
    3: { label: "S", color: "#eab308" },
    4: { label: "S", color: "#eab308" },
    5: { label: "T", color: "#f97316" },
  },
  2: {
    1: { label: "R", color: "#22c55e" },
    2: { label: "R", color: "#22c55e" },
    3: { label: "S", color: "#eab308" },
    4: { label: "S", color: "#eab308" },
    5: { label: "T", color: "#f97316" },
  },
  3: {
    1: { label: "R", color: "#22c55e" },
    2: { label: "S", color: "#eab308" },
    3: { label: "S", color: "#eab308" },
    4: { label: "T", color: "#f97316" },
    5: { label: "T", color: "#f97316" },
  },
  4: {
    1: { label: "S", color: "#eab308" },
    2: { label: "S", color: "#eab308" },
    3: { label: "T", color: "#f97316" },
    4: { label: "T", color: "#f97316" },
    5: { label: "ST", color: "#ef4444" },
  },
  5: {
    1: { label: "S", color: "#eab308" },
    2: { label: "T", color: "#f97316" },
    3: { label: "T", color: "#f97316" },
    4: { label: "ST", color: "#ef4444" },
    5: { label: "ST", color: "#ef4444" },
  },
};

const getRiskMatrix = (k, i) =>
  riskMatrix[k]?.[i] || { label: "", color: "#f1f5f9" };
const getRiskLevel = (k, i) => getRiskMatrix(k, i).label;

const formatSeparuhTahun = (value) => {
  const num = parseInt(value);
  if (num === 1) return "Pertama";
  if (num === 2) return "Kedua";
  return "-";
};

// ==========================================================
// MAIN COMPONENT: ViewRisikoModal
// ==========================================================
export default function ViewRisikoModal({ isOpen, risk, onClose }) {
  const [isPanduanOpen, setIsPanduanOpen] = useState(false);
  const [logData, setLogData] = useState([]);
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logToView, setLogToView] = useState(null);
  
  const [isEditLogModalOpen, setIsEditLogModalOpen] = useState(false);
  const [logToEdit, setLogToEdit] = useState(null);
  
  const [isPengenalpastianModalOpen, setIsPengenalpastianModalOpen] = useState(false);
  const [isPenilaianModalOpen, setIsPenilaianModalOpen] = useState(false);
  const [isRawatanModalOpen, setIsRawatanModalOpen] = useState(false);
  
  const [userRole, setUserRole] = useState(null); 
  const [needsRefresh, setNeedsRefresh] = useState(false);
  
  const [data, setData] = useState({
    risiko_id: null,
    planTindakan: [],
    kakitanganBertanggungjawab: [],
    jenisKawalan: "",
    tempohSiap: "",
    punca: [],
    kesan: [],
    skor_kebarangkalian: null,
    skor_impak: null,
    tahap_risiko: "",
    no_rujukan: "",
    tahun: "",
    separuh_tahun: null,
    nama_subsidiari: "",
    kategori: "",
    bahagian: "",
    risiko: "",
    status_risiko: "",
    status_risiko_desc: "",
    justifikasi_pindaan_penilaian: "",
  });

  const [riskColor, setRiskColor] = useState("#f1f5f9");

  useEffect(() => {
    const token = localStorage.getItem('token'); 
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const roleMapping = {
          1: "ADMIN",
          2: "EXECUTIVE",
          3: "KETUA SUBSIDIARI",
          4: "STAFF",
          5: "VIEWER",
        };
        const role = roleMapping[decoded.peranan_id] || "";
        setUserRole(role); 
      } catch (error) {
        console.error("❌ Invalid token", error);
        localStorage.removeItem("token");
        setUserRole(null);
      }
    }
  }, []);

  const hasPenilaianData = () => {
    const k = parseInt(data.skor_kebarangkalian);
    const i = parseInt(data.skor_impak);
    return !isNaN(k) && !isNaN(i) && k > 0 && i > 0;
  };

  const hasRawatanData = () => {
    const hasJenisKawalan = data.jenisKawalan && data.jenisKawalan !== "-" && data.jenisKawalan.trim() !== "";
    const hasPlanTindakan = Array.isArray(data.planTindakan) && data.planTindakan.length > 0;
    const hasTempohSiap = data.tempohSiap && data.tempohSiap !== "-" && data.tempohSiap.trim() !== "";
    const hasKakitangan = Array.isArray(data.kakitanganBertanggungjawab) && data.kakitanganBertanggungjawab.length > 0;
    
    return hasJenisKawalan || hasPlanTindakan || hasTempohSiap || hasKakitangan;
  };

  const hasLogData = () => {
    return logData.length > 0;
  };

  const fetchLog = async (risikoId) => {
    if (!risikoId) return;
    setIsLoadingLog(true);
    try {
      const response = await api.get(`/pemantauan-risiko/${risikoId}/sejarah`);
      const logArray = response.data || [];
      const sortedLog = logArray.sort((a, b) => {
        if (b.tahun_pemantauan !== a.tahun_pemantauan) {
          return b.tahun_pemantauan - a.tahun_pemantauan;
        }
        if (b.separuh_tahun_pemantauan !== a.separuh_tahun_pemantauan) {
          return b.separuh_tahun_pemantauan - a.separuh_tahun_pemantauan;
        }
        return new Date(b.tarikh_kemaskini || b.tarikh_pemantauan) - new Date(a.tarikh_kemaskini || a.tarikh_pemantauan);
      });
      setLogData(sortedLog);
    } catch (err) {
      console.error("❌ Gagal fetch log pemantauan:", err);
      setLogData([]);
    } finally {
      setIsLoadingLog(false);
    }
  };

  const fetchRiskDetails = async (risikoId) => {
    if (!risikoId) return;
    
    try {
      const res = await api.get(`/risiko`);
      const updatedRisk = res.data.find(r => r.id === risikoId);
      
      if (updatedRisk) {
        // ✅ PEMBETULAN: Better array conversion with parseListData
        const getRiskArray = (key1, key2) => {
          const val = updatedRisk[key1] || updatedRisk[key2];
          
          if (Array.isArray(val)) {
            return val;
          }
          
          // ✅ Parse semicolon-separated string
          if (typeof val === 'string' && val.trim() !== '' && val.trim() !== '-') {
            const parsed = parseListData(val);
            return parsed.length > 0 ? parsed.map(item => ({ text: item })) : [];
          }
          
          return [];
        };

        const initialData = {
          risiko_id: risikoId,
          no_rujukan: updatedRisk.no_rujukan || "-",
          tahun: updatedRisk.tahun_asal || updatedRisk.tahun || "-",
          separuh_tahun: updatedRisk.separuh_tahun_asal || updatedRisk.separuh_tahun,
          nama_subsidiari: updatedRisk.subsidiari || updatedRisk.nama_subsidiari || "-", 
          kategori: updatedRisk.kategori || "-",
          bahagian: updatedRisk.bahagian || updatedRisk.bahagian_unit || "-",
          risiko: updatedRisk.risiko || "-",
          punca: getRiskArray("punca_risiko_data", "punca"),
          kesan: getRiskArray("kesan_risiko_data", "kesan"),
          skor_kebarangkalian: updatedRisk.skor_kebarangkalian_sebelum || updatedRisk.skor_kebarangkalian,
          skor_impak: updatedRisk.skor_impak_sebelum || updatedRisk.skor_impak,
          jenisKawalan: updatedRisk.jenis_kawalan || "-",
          tempohSiap: updatedRisk.tempoh_jangkaan_siap_tindakan || updatedRisk.tempoh_jangkaan_siap || "-",
          planTindakan: getRiskArray("pelan_tindakan", "rawatan_plan_tindakan"),
          kakitanganBertanggungjawab: getRiskArray("kakitangan_bertanggungjawab", "rawatan_kakitangan_bertanggungjawab"),
          status_risiko: "",
          status_risiko_desc: "",
          justifikasi_pindaan_penilaian: updatedRisk.pindaan_penilaian || updatedRisk.justifikasi_pindaan_penilaian || "-",
        };

        setData(initialData);
      }
    } catch (err) {
      console.error("❌ Gagal fetch updated risk details:", err);
    }
  };

  useEffect(() => {
    if (!isOpen || !risk?.id) return;

    const risikoId = risk.id;
    fetchLog(risikoId);

    // ✅ PEMBETULAN: Better array conversion with parseListData
    const getRiskArray = (key1, key2) => {
      const val = risk[key1] || risk[key2];

      if (Array.isArray(val)) {
        return val;
      }
      
      // ✅ Parse semicolon-separated string
      if (typeof val === 'string' && val.trim() !== '' && val.trim() !== '-') {
        const parsed = parseListData(val);
        return parsed.length > 0 ? parsed.map(item => ({ text: item })) : [];
      }
      
      return [];
    };

    const initialData = {
      risiko_id: risikoId,
      no_rujukan: risk.no_rujukan || "-",
      tahun: risk.tahun_asal || risk.tahun || "-",
      separuh_tahun: risk.separuh_tahun_asal || risk.separuh_tahun,
      nama_subsidiari: risk.subsidiari || risk.nama_subsidiari || "-", 
      kategori: risk.kategori || "-",
      bahagian: risk.bahagian || risk.bahagian_unit || "-",
      risiko: risk.risiko || "-",
      punca: getRiskArray("punca_risiko_data", "punca"),
      kesan: getRiskArray("kesan_risiko_data", "kesan"),
      skor_kebarangkalian: risk.skor_kebarangkalian_sebelum || risk.skor_kebarangkalian,
      skor_impak: risk.skor_impak_sebelum || risk.skor_impak,
      jenisKawalan: risk.jenis_kawalan || "-",
      tempohSiap: risk.tempoh_jangkaan_siap_tindakan || risk.tempoh_jangkaan_siap || "-",
      planTindakan: getRiskArray("pelan_tindakan", "rawatan_plan_tindakan"),
      kakitanganBertanggungjawab: getRiskArray("kakitangan_bertanggungjawab", "rawatan_kakitangan_bertanggungjawab"),
      status_risiko: "",
      status_risiko_desc: "",
      justifikasi_pindaan_penilaian: risk.pindaan_penilaian || risk.justifikasi_pindaan_penilaian || "-",
    };

    setData(initialData);
  }, [isOpen, risk]);

  useEffect(() => {
    const kAwal = parseInt(data.skor_kebarangkalian);
    const iAwal = parseInt(data.skor_impak);
    let tahapRisiko = "-";
    let warnaRisiko = "#f1f5f9";
    let status = "-";
    let statusDesc = "-";

    if (kAwal >= 1 && kAwal <= 5 && iAwal >= 1 && iAwal <= 5) {
      const { label, color } = getRiskMatrix(kAwal, iAwal);
      tahapRisiko = label;
      warnaRisiko = color;

      if (label === "R") {
        status = "TIDAK";
        statusDesc = "Risiko sedia terkawal, tiada tindakan rawatan mandatori.";
      } else {
        status = "YA";
        statusDesc = "Risiko memerlukan tindakan segera dan rekod rawatan.";
      }
    }

    setRiskColor(warnaRisiko);
    setData((prev) => ({
      ...prev,
      tahap_risiko: tahapRisiko,
      status_risiko: status,
      status_risiko_desc: statusDesc,
    }));
  }, [data.skor_kebarangkalian, data.skor_impak]);

  const handleViewLog = (logItem) => {
    setLogToView(logItem);
    setIsLogModalOpen(true);
  };

  const handleCloseLogModal = () => {
    setIsLogModalOpen(false);
    setLogToView(null);
  };

  const handleEditLog = (logItem, e) => {
    e.stopPropagation();
    setLogToEdit(logItem);
    setIsEditLogModalOpen(true);
  };

  const handleCloseEditLogModal = () => {
    setIsEditLogModalOpen(false);
    setLogToEdit(null);
  };
  
  const handleDeleteLog = async (logItem, e) => {
    e.stopPropagation();
    if (window.confirm(`Adakah anda pasti mahu memadam log pemantauan untuk tahun ${logItem.tahun_pemantauan} - Separuh ${formatSeparuhTahun(logItem.separuh_tahun_pemantauan)}? Tindakan ini tidak boleh diundur.`)) {
      try {
        await api.delete(`/pemantauan-risiko/log/${logItem.log_id}`);
        alert("✅ Log berjaya dipadam!");
        fetchLog(data.risiko_id);
        setNeedsRefresh(true);
      } catch (error) {
        console.error("❌ Gagal memadam log:", error);
        alert("⚠️ Gagal memadam log. Sila cuba lagi.");
      }
    }
  };

  const handleEditPengenalpastian = () => {
    console.log("🔧 Edit Pengenalpastian Risiko clicked");
    setIsPengenalpastianModalOpen(true);
  };

  const handleEditPenilaian = () => {
    console.log("🔧 Edit Penilaian Risiko clicked");
    setIsPenilaianModalOpen(true);
  };

  const handleEditRawatan = () => {
    console.log("🔧 Edit Rawatan Risiko clicked");
    setIsRawatanModalOpen(true);
  };

  const handleClosePengenalpastian = (isSuccess) => {
    setIsPengenalpastianModalOpen(false);
    if (isSuccess) {
      console.log("✅ Pengenalpastian dikemaskini - refresh data");
      fetchRiskDetails(data.risiko_id);
      setNeedsRefresh(true);
    }
  };

  const handleClosePenilaian = (isSuccess) => {
    setIsPenilaianModalOpen(false);
    if (isSuccess) {
      console.log("✅ Penilaian dikemaskini - refresh data");
      fetchRiskDetails(data.risiko_id);
      setNeedsRefresh(true);
    }
  };

  const handleCloseRawatan = (isSuccess) => {
    setIsRawatanModalOpen(false);
    if (isSuccess) {
      console.log("✅ Rawatan dikemaskini - refresh data");
      fetchRiskDetails(data.risiko_id);
      setNeedsRefresh(true);
    }
  };

  const handleMainModalClose = () => {
    onClose(needsRefresh);
  };
  
  if (!isOpen) return null;

  return (
    <div className="viewrisiko-modal-overlay">
      <div
        className="viewrisiko-modal-container"
        style={{ maxWidth: "1200px", width: "95%" }}
      >
        <div className="viewrisiko-box-header-main">
          <span>Maklumat Perincian Risiko</span>
          <button
            className="viewrisiko-close-btn"
            onClick={handleMainModalClose}
            aria-label="Tutup Borang"
          >
            <X size={16} />
          </button>
        </div>

        <div className="viewrisiko-modal-body">
          {/* 1. Pengenalpastian Risiko */}
          <div className="viewrisiko-box">
            <div className="viewrisiko-box-header viewrisiko-risk-header">
              <span>Pengenalpastian Risiko</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {userRole === "ADMIN" && (
                  <button
                    type="button"
                    className="viewrisiko-edit-section-btn"
                    onClick={handleEditPengenalpastian}
                    title="Edit Pengenalpastian Risiko"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="viewrisiko-panduan-btn"
                  onClick={() => setIsPanduanOpen(true)}
                >
                  <BookOpen size={16} style={{ marginRight: "6px" }} />
                  Panduan
                </button>
              </div>
            </div>

            <div className="viewrisiko-flex-row" style={{ marginBottom: "20px" }}>
              <div className="viewrisiko-flex-item">
                <span className="viewrisiko-label-inline">No Rujukan:</span>
                <span className="viewrisiko-data-inline">{data.no_rujukan || "-"}</span>
              </div>
              <div className="viewrisiko-flex-item">
                <span className="viewrisiko-label-inline">Tahun Didaftarkan:</span>
                <span className="viewrisiko-data-inline">{data.tahun || "-"}</span>
              </div>
              <div className="viewrisiko-flex-item">
                <span className="viewrisiko-label-inline">Separuh Tahun Didaftarkan:</span>
                <span className="viewrisiko-data-inline">{formatSeparuhTahun(data.separuh_tahun)}</span>
              </div>
              <div className="viewrisiko-flex-item">
                <span className="viewrisiko-label-inline">Syarikat:</span>
                <span className="viewrisiko-data-inline">{data.nama_subsidiari || "-"}</span>
              </div>
            </div>

            <div className="viewrisiko-flex-row" style={{ marginBottom: "20px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
              <div className="viewrisiko-flex-item" style={{ flex: "2 1 300px" }}>
                <span className="viewrisiko-label-inline">Risiko:</span>
                <span className="viewrisiko-data-inline">{data.risiko || "-"}</span>
              </div>
              <div className="viewrisiko-flex-item">
                <span className="viewrisiko-label-inline">Kategori Risiko:</span>
                <span className="viewrisiko-data-inline">{data.kategori || "-"}</span>
              </div>
              <div className="viewrisiko-flex-item">
                <span className="viewrisiko-label-inline">Bahagian/Unit:</span>
                <span className="viewrisiko-data-inline">{data.bahagian || "-"}</span>
              </div>
            </div>
            <div className="viewrisiko-flex-row viewrisiko-list-section">
              <div className="viewrisiko-flex-item" style={{ flex: "2 1 300px" }}>
                <span className="viewrisiko-label-inline">Punca Risiko:</span>
                <ListDisplay data={data.punca} />
              </div>
              <div className="viewrisiko-flex-item">
                <span className="viewrisiko-label-inline">Kesan Risiko:</span>
                <ListDisplay data={data.kesan} />
              </div>
              <div className="viewrisiko-flex-item"></div>
            </div>
          </div>

          {/* 2. Penilaian Risiko Awal */}
          {hasPenilaianData() && (
            <div className="viewrisiko-box">
              <div className="viewrisiko-box-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Penilaian Risiko</span>
                {userRole === "ADMIN" && (
                  <button
                    type="button"
                    className="viewrisiko-edit-section-btn"
                    onClick={handleEditPenilaian}
                    title="Edit Penilaian Risiko"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
              <div className="viewrisiko-flex-row viewrisiko-score-row">
                <div className="viewrisiko-score-card">
                  <span className="viewrisiko-score-label">Skor Kebarangkalian</span>
                  <span className="viewrisiko-score-data">{data.skor_kebarangkalian || "-"}</span>
                </div>
                <div className="viewrisiko-score-card">
                  <span className="viewrisiko-score-label">Skor Impak</span>
                  <span className="viewrisiko-score-data">{data.skor_impak || "-"}</span>
                </div>
                <div className="viewrisiko-score-card">
                  <span className="viewrisiko-score-label">Tahap Risiko</span>
                  <span
                    className="viewrisiko-score-data viewrisiko-risk-score-text"
                    style={{
                      backgroundColor: riskColor,
                      color: riskColor === "#f1f5f9" ? "#475569" : "#ffffff",
                    }}
                    data-level={data.tahap_risiko}
                  >
                    {data.tahap_risiko || "-"}
                  </span>
                </div>
              </div>

              <div className="viewrisiko-flex-row" style={{ marginTop: "15px" }}>
                <div className="viewrisiko-flex-item" style={{ display: "flex", flexDirection: "column", flex: "1 1 100%" }}>
                  <span className="viewrisiko-label-inline" style={{ fontWeight: "bold", marginBottom: "5px" }}>
                    Status Risiko:
                  </span>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: data.status_risiko === "YA" ? "#ef4444" : data.status_risiko === "TIDAK" ? "#10b981" : "#475569",
                        minWidth: "70px",
                        textAlign: "center",
                        marginRight: "15px",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor: data.status_risiko === "YA" ? "#f8717130" : data.status_risiko === "TIDAK" ? "#10b98130" : "#e2e8f0",
                      }}
                    >
                      {data.status_risiko || "-"}
                    </span>
                    <span style={{ color: "#475569", fontSize: "0.9rem" }}>
                      {data.status_risiko_desc || "Skor risiko tiada."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="viewrisiko-flex-row" style={{ marginTop: "15px", borderTop: "1px solid #e2e8f0", paddingTop: "15px" }}>
                <div className="viewrisiko-flex-item" style={{ display: "flex", flexDirection: "column", flex: "1 1 100%" }}>
                  <span className="viewrisiko-label-inline" style={{ fontWeight: "bold", marginBottom: "5px" }}>
                    Pindaan Penilaian:
                  </span>
                  <span style={{ color: "#475569", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
                    {data.justifikasi_pindaan_penilaian || "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Rawatan Risiko */}
          {hasRawatanData() && (
            <div className="viewrisiko-box">
              <div className="viewrisiko-box-header viewrisiko-monitoring-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Rawatan Risiko</span>
                {userRole === "ADMIN" && (
                  <button
                    type="button"
                    className="viewrisiko-edit-section-btn"
                    onClick={handleEditRawatan}
                    title="Edit Rawatan Risiko"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
              <div className="viewrisiko-flex-row" style={{ padding: "18px 16px" }}>
                <div className="viewrisiko-flex-item">
                  <div className="viewrisiko-data-line-block">
                    <span className="viewrisiko-label-mon">Jenis Kawalan:</span>
                    <span className="viewrisiko-data-mon">{data.jenisKawalan || "Tiada Data Rawatan"}</span>
                  </div>
                  <div className="viewrisiko-data-line-block">
                    <span className="viewrisiko-label-mon">Pelan Tindakan:</span>
                    <ListDisplay data={data.planTindakan} />
                  </div>
                </div>
                <div className="viewrisiko-flex-item">
                  <div className="viewrisiko-data-line-block">
                    <span className="viewrisiko-label-mon">Tempoh Jangkaan Siap Tindakan:</span>
                    <span className="viewrisiko-data-mon">{data.tempohSiap || "-"}</span>
                  </div>
                  <div className="viewrisiko-data-line-block">
                    <span className="viewrisiko-label-mon">Kakitangan Bertanggungjawab:</span>
                    <ListDisplay data={data.kakitanganBertanggungjawab} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. LOG SEJARAH PEMANTAUAN */}
          {!isLoadingLog && hasLogData() && (
            <div className="viewrisiko-box">
              <div className="viewrisiko-box-header viewrisiko-log-header">
                <span>Pemantauan Risiko</span>
              </div>
              <div style={{ padding: "4px" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="viewrisiko-log-table">
                    <thead>
                      <tr>
                        <th>Tahun</th>
                        <th>Separuh Tahun</th>
                        <th>Pelan Tindakan</th>
                        <th>Kekerapan Pemantauan</th>
                        <th>Kakitangan Bertanggungjawab</th>
                        <th>Skor Kebarangkalian</th>
                        <th>Skor Impak</th>
                        <th>Tahap Risiko</th>
                        <th>Keberkesanan</th>
                        <th>Status Pemantauan</th>
                        <th>Kelulusan</th>
                        <th>Catatan</th>
                        <th>Pindaan Keberkesanan</th>
                        {userRole === "ADMIN" && <th>Tindakan</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {logData.map((log, index) => {
                        const k_selepas = log.skor_kebarangkalian_selepas;
                        const i_selepas = log.skor_impak_selepas;
                        const tahap_risiko = log.skor_risiko_pemantauan || getRiskLevel(k_selepas, i_selepas);
                        const { color } = getRiskMatrix(k_selepas, i_selepas);
                        const sem_tahun_text = formatSeparuhTahun(log.separuh_tahun_pemantauan);
                        const pelanTindakanLog = Array.isArray(log.pelan_tindakan_log) ? log.pelan_tindakan_log : [];
                        const kakitanganLog = Array.isArray(log.kakitangan_log) ? log.kakitangan_log : [];
                        return (
                          <tr 
                            key={log.log_id || index}
                            className="viewrisiko-log-row-clickable"
                            onClick={() => handleViewLog(log)}
                          >
                            <td data-label="TAHUN">{log.tahun_pemantauan || "-"}</td>
                            <td data-label="SEPARUH TAHUN">{sem_tahun_text}</td>
                            <td data-label="PELAN TINDAKAN"><ListDisplay data={pelanTindakanLog} /></td>
                            <td data-label="KEKERAPAN AUDIT">{log.kekerapan_pemantauan || "-"}</td>
                            <td data-label="BERTANGGUNGJAWAB"><ListDisplay data={kakitanganLog} /></td>
                            <td data-label="K'KALIAN">{k_selepas || "-"}</td>
                            <td data-label="IMPAK SKOR">{i_selepas || "-"}</td>
                            <td
                              data-label="TAHAP RISIKO"
                              style={{
                                backgroundColor: color,
                                color: color === "#f1f5f9" ? "#475569" : "white",
                                fontWeight: "bold",
                              }}
                            >
                              {tahap_risiko || "-"}
                            </td>
                            <td data-label="KEBERKESANAN">
                              <span className={`viewrisiko-keberkesanan-tag ${log.keberkesanan?.toLowerCase() || "tiada"}`}>
                                {log.keberkesanan || "-"}
                              </span>
                            </td>
                            <td data-label="STATUS">{log.status_pemantauan || "-"}</td>
                            <td data-label="KELULUSAN">{log.no_bil_kelulusan || "-"}</td>
                            <td data-label="CATATAN" style={{ maxWidth: "200px", whiteSpace: "normal" }}>
                              {log.catatan || "-"}
                            </td>
                            <td data-label="PINDAAN KEBERKESANAN" style={{ maxWidth: "200px", whiteSpace: "normal" }}>
                              {log.justifikasi_pindaan_pemantauan || "-"}
                            </td>
                            
                            {userRole === "ADMIN" && (
                              <td data-label="TINDAKAN" onClick={(e) => e.stopPropagation()}>
                                <div className="viewrisiko-action-buttons">
                                  <button
                                    className="viewrisiko-btn-edit"
                                    onClick={(e) => handleEditLog(log, e)}
                                    title="Kemaskini Log"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    className="viewrisiko-btn-delete"
                                    onClick={(e) => handleDeleteLog(log, e)}
                                    title="Padam Log"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {isPanduanOpen && (
          <PanduanModal
            isOpen={isPanduanOpen}
            onClose={() => setIsPanduanOpen(false)}
          />
        )}

        {isLogModalOpen && (
          <TambahLogModal
            isOpen={isLogModalOpen}
            onClose={handleCloseLogModal}
            risikoId={data.risiko_id}
            onSaveSuccess={null}
            logDataToEdit={logToView}
            mode="papar"
          />
        )}
        
        {isEditLogModalOpen && (
          <KemaskiniPemantauanModal
            isOpen={isEditLogModalOpen}
            onClose={handleCloseEditLogModal}
            risikoId={data.risiko_id}
            onSaveSuccess={() => {
              fetchLog(data.risiko_id);
              setNeedsRefresh(true);
              handleCloseEditLogModal();
            }}
            logDataToEdit={logToEdit}
            userRole={userRole}
          />
        )}

        {isPengenalpastianModalOpen && (
          <PengenalpastianModal
            isOpen={isPengenalpastianModalOpen}
            onClose={handleClosePengenalpastian}
            initialData={{
              risiko_id: data.risiko_id,
              no_rujukan: data.no_rujukan,
              tahun: data.tahun,
              separuh_tahun: data.separuh_tahun,
              subsidiari_id: risk?.subsidiari_id,
              subsidiari: data.nama_subsidiari,
              kategori: data.kategori,
              bahagian_unit: data.bahagian,
              bahagian: data.bahagian,
              risiko: data.risiko,
              punca: Array.isArray(data.punca) 
                ? data.punca.map(p => typeof p === 'string' ? p : (p.punca || p.text || ""))
                : [],
              kesan: Array.isArray(data.kesan)
                ? data.kesan.map(k => typeof k === 'string' ? k : (k.kesan || k.text || ""))
                : [],
              skor_kebarangkalian: data.skor_kebarangkalian,
              skor_impak: data.skor_impak,
              skor_risiko: data.tahap_risiko,
              status_risiko: data.status_risiko,
              tahap_risiko: data.tahap_risiko,
            }}
          />
        )}

        {isPenilaianModalOpen && (
          <PenilaianRisikoModal
            isOpen={isPenilaianModalOpen}
            onClose={handleClosePenilaian}
            initialData={{
              risiko_id: data.risiko_id,
              no_rujukan: data.no_rujukan,
              tahun: data.tahun,
              separuh_tahun: data.separuh_tahun,
              subsidiari_id: risk?.subsidiari_id,
              subsidiari: data.nama_subsidiari,
              kategori: data.kategori,
              bahagian_unit: data.bahagian,
              bahagian: data.bahagian,
              risiko: data.risiko,
              punca: data.punca,
              kesan: data.kesan,
              skor_kebarangkalian: data.skor_kebarangkalian,
              skor_impak: data.skor_impak,
              skor_risiko: data.tahap_risiko,
              status_risiko: data.status_risiko,
              tahap_risiko: data.tahap_risiko,
            }}
          />
        )}

        {isRawatanModalOpen && (
          <KemaskiniRawatan
            isOpen={isRawatanModalOpen}
            onClose={handleCloseRawatan}
            risk={{
              risiko_id: data.risiko_id,
              rawatan_id: risk?.rawatan_id || null,
              plan_tindakan: data.planTindakan,
              jenis_kawalan: data.jenisKawalan,
              tempoh_jangkaan_siap: data.tempohSiap,
              kakitangan_bertanggungjawab: data.kakitanganBertanggungjawab,
            }}
          />
        )}
      </div>
    </div>
  );
}