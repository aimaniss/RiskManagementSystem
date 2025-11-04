import { useState, useEffect } from "react";
import { X, BookOpen, Loader2, Trash2, PlusCircle, Pencil } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import "./EditPemantauan.css";
import api from "../../api/api";
import PanduanModal from "../Panduan/Panduan";
import TambahLogModal from "./TambahLogModal";

// (Komponen ListDisplay & utility functions kekal sama)
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
  const cleanedData = Array.isArray(data)
    ? data.filter((item) => {
        const text = getItemText(item);
        return text && text.trim() !== "-";
      })
    : [];

  if (cleanedData.length === 0)
    return <span style={{ color: "#64748b" }}>-</span>;

  return (
    <ul style={{ listStyleType: "none", paddingLeft: "0", margin: "0" }}>
      {cleanedData.map((item, index) => (
        <li key={index} className="pemantauan-list-item">
          <span className="pemantauan-data-inline">
            {`${index + 1}. ${getItemText(item)}`}
          </span>
        </li>
      ))}
    </ul>
  );
};

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

// KOMPONEN UTAMA EDIT PEMANTAUAN

export default function EditPemantauan({ isOpen, risk, onClose }) {
  const [isPanduanOpen, setIsPanduanOpen] = useState(false);
  const [isTambahLogModalOpen, setIsTambahLogModalOpen] = useState(false);
  const [logData, setLogData] = useState([]);
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [logToEdit, setLogToEdit] = useState(null);

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

  // --- Logik untuk dapatkan peranan (role) pengguna ---
  let userRole = null;
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const user = jwtDecode(token);
      userRole = user?.nama_peranan;
    }
  } catch (err) {
    console.error("Invalid token:", err);
  }
  
  // ⭐️ 1. PERUBAHAN BARU: Tentukan siapa yang boleh nampak lajur Tindakan
  const canViewTindakanColumn =
    userRole === "Admin" || userRole === "Executive" || userRole === "Staff";

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
        return b.separuh_tahun_pemantauan - a.separuh_tahun_pemantauan;
      });
      setLogData(sortedLog);
    } catch (err) {
      console.error("❌ Gagal fetch log pemantauan:", err);
      setLogData([]);
    } finally {
      setIsLoadingLog(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !risk?.id) return;

    const risikoId = risk.id;
    fetchLog(risikoId);

    const getRiskArray = (key1, key2) => {
      const arr = risk[key1] || risk[key2] || [];
      return Array.isArray(arr) ? arr : [];
    };

    const initialData = {
      risiko_id: risikoId,
      no_rujukan: risk.no_rujukan || "-",
      tahun: risk.tahun_asal || risk.tahun || "-",
      separuh_tahun: risk.separuh_tahun_asal || risk.separuh_tahun,
      nama_subsidiari: risk.nama_subsidiari || "-",
      kategori: risk.kategori || "-",
      bahagian: risk.bahagian || risk.bahagian_unit || "-",
      risiko: risk.risiko || "-",
      punca: getRiskArray("punca_risiko_data", "punca"),
      kesan: getRiskArray("kesan_risiko_data", "kesan"),
      skor_kebarangkalian:
        risk.skor_kebarangkalian_sebelum || risk.skor_kebarangkalian,
      skor_impak: risk.skor_impak_sebelum || risk.skor_impak,
      jenisKawalan: risk.jenis_kawalan || "-",
      tempohSiap: risk.tempoh_jangkaan_siap || "-",
      planTindakan: getRiskArray(
        "plan_tindakan",
        "rawatan_plan_tindakan"
      ),
      kakitanganBertanggungjawab: getRiskArray(
        "kakitangan_bertanggungjawab",
        "rawatan_kakitangan_bertanggungjawab"
      ),
      status_risiko: "",
      status_risiko_desc: "",
      justifikasi_pindaan_penilaian:
        risk.justifikasi_pindaan_penilaian || "-",
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
        statusDesc =
          "Risiko sedia terkawal, tiada tindakan rawatan mandatori.";
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

  const handleDeleteLog = async (logId) => {
    if (
      !window.confirm(
        "Adakah anda pasti mahu memadam rekod log pemantauan ini? Tindakan ini tidak boleh diundur."
      )
    ) {
      return;
    }
    setIsLoadingLog(true);
    try {
      await api.delete(`/pemantauan-risiko/log/${logId}`);
      await fetchLog(data.risiko_id);
      alert("✅ Rekod log berjaya dipadam!");
    } catch (err) {
      console.error("❌ Gagal memadam log:", err);
      alert(
        `Gagal memadam log. ${
          err.response?.data?.message || "Sila cuba lagi."
        }`
      );
    } finally {
      setIsLoadingLog(false);
    }
  };

  const handleEditLog = (logItem) => {
    setLogToEdit(logItem);
    setIsTambahLogModalOpen(true);
  };

  const handleLogSaved = () => {
    setIsTambahLogModalOpen(false);
    setLogToEdit(null);
    fetchLog(data.risiko_id);
  };

  const handleCloseLogModal = () => {
    setIsTambahLogModalOpen(false);
    setLogToEdit(null);
  };

  if (!isOpen) return null;

  return (
    <div className="pemantauan-modal-overlay">
      <div
        className="pemantauan-modal-container"
        style={{ maxWidth: "1200px", width: "95%" }}
      >
        <div className="pemantauan-box-header-main">
          <span>Maklumat Pemantauan</span>
          <button
            className="pemantauan-close-btn"
            onClick={onClose}
            aria-label="Tutup Borang"
          >
            <X size={16} />
          </button>
        </div>

        <div className="pemantauan-modal-body">
          {/* 1. Pengenalpastian Risiko (Gabungan) */}
          <div className="pemantauan-box">
            <div className="pemantauan-box-header pemantauan-risk-header">
              <span>Pengenalpastian Risiko</span>
              <button
                type="button"
                className="pemantauan-panduan-btn"
                onClick={() => setIsPanduanOpen(true)}
              >
                <BookOpen size={16} style={{ marginRight: "6px" }} />
                Panduan
              </button>
            </div>

            {/* Maklumat Asal Risiko */}
            <div
              className="pemantauan-flex-row"
              style={{ marginBottom: "20px" }}
            >
              <div className="pemantauan-flex-item">
                <span className="pemantauan-label-inline">No Rujukan:</span>
                <span className="pemantauan-data-inline">
                  {data.no_rujukan || "-"}
                </span>
              </div>
              <div className="pemantauan-flex-item">
                <span className="pemantauan-label-inline">
                  Tahun Didaftarkan:
                </span>
                <span className="pemantauan-data-inline">
                  {data.tahun || "-"}
                </span>
              </div>
              <div className="pemantauan-flex-item">
                <span className="pemantauan-label-inline">
                  Separuh Tahun Didaftarkan:
                </span>
                <span className="pemantauan-data-inline">
                  {formatSeparuhTahun(data.separuh_tahun)}
                </span>
              </div>
              <div className="pemantauan-flex-item">
                <span className="pemantauan-label-inline">Syarikat:</span>
                <span className="pemantauan-data-inline">
                  {data.nama_subsidiari || "-"}
                </span>
              </div>
            </div>

            {/* Maklumat Pengenalpastian */}
            <div
              className="pemantauan-flex-row"
              style={{
                marginBottom: "20px",
                borderTop: "1px solid #e5e7eb",
                paddingTop: "20px",
              }}
            >
              <div
                className="pemantauan-flex-item"
                style={{ flex: "2 1 300px" }}
              >
                <span className="pemantauan-label-inline">Risiko:</span>
                <span className="pemantauan-data-inline">
                  {data.risiko || "-"}
                </span>
              </div>
              <div className="pemantauan-flex-item">
                <span className="pemantauan-label-inline">
                  Kategori Risiko:
                </span>
                <span className="pemantauan-data-inline">
                  {data.kategori || "-"}
                </span>
              </div>
              <div className="pemantauan-flex-item">
                <span className="pemantauan-label-inline">Bahagian/Unit:</span>
                <span className="pemantauan-data-inline">
                  {data.bahagian || "-"}
                </span>
              </div>
            </div>
            <div className="pemantauan-flex-row pemantauan-list-section">
              <div
                className="pemantauan-flex-item"
                style={{ flex: "2 1 300px" }}
              >
                <span className="pemantauan-label-inline">Punca Risiko:</span>
                <ListDisplay data={data.punca} />
              </div>
              <div className="pemantauan-flex-item">
                <span className="pemantauan-label-inline">Kesan Risiko:</span>
                <ListDisplay data={data.kesan} />
              </div>
              <div className="pemantauan-flex-item"></div>
            </div>
          </div>

          {/* 2. Penilaian Risiko Awal (Kekal Sama) */}
          <div className="pemantauan-box">
            <div className="pemantauan-box-header">Penilaian Risiko Awal </div>
            <div className="pemantauan-flex-row pemantauan-score-row">
              <div className="pemantauan-score-card">
                <span className="pemantauan-score-label">
                  Skor Kebarangkalian
                </span>
                <span className="pemantauan-score-data">
                  {data.skor_kebarangkalian || "-"}
                </span>
              </div>
              <div className="pemantauan-score-card">
                <span className="pemantauan-score-label">Skor Impak</span>
                <span className="pemantauan-score-data">
                  {data.skor_impak || "-"}
                </span>
              </div>
              <div className="pemantauan-score-card">
                <span className="pemantauan-score-label">Skor Risiko</span>
                <span
                  className="pemantauan-score-data pemantauan-risk-score-text"
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

            <div
              className="pemantauan-flex-row"
              style={{ marginTop: "15px" }}
            >
              <div
                className="pemantauan-flex-item"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: "1 1 100%",
                }}
              >
                <span
                  className="pemantauan-label-inline"
                  style={{ fontWeight: "bold", marginBottom: "5px" }}
                >
                  Status Risiko:
                </span>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      fontWeight: "bold",
                      color:
                        data.status_risiko === "YA"
                          ? "#ef4444"
                          : data.status_risiko === "TIDAK"
                          ? "#10b981"
                          : "#475569",
                      minWidth: "70px",
                      textAlign: "center",
                      marginRight: "15px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor:
                        data.status_risiko === "YA"
                          ? "#f8717130"
                          : data.status_risiko === "TIDAK"
                          ? "#10b98130"
                          : "#e2e8f0",
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

            {/* Bahagian Pindaan Penilaian */}
            <div
              className="pemantauan-flex-row"
              style={{
                marginTop: "15px",
                borderTop: "1px solid #e2e8f0",
                paddingTop: "15px",
              }}
            >
              <div
                className="pemantauan-flex-item"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: "1 1 100%",
                }}
              >
                <span
                  className="pemantauan-label-inline"
                  style={{ fontWeight: "bold", marginBottom: "5px" }}
                >
                  Pindaan Penilaian:
                </span>
                <span
                  style={{
                    color: "#475569",
                    fontSize: "0.9rem",
                    whiteSpace: "pre-wrap",
                  }}
    
>
                  {data.justifikasi_pindaan_penilaian || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Rawatan Risiko (Kekal Sama) */}
          <div className="pemantauan-box">
            <div className="pemantauan-box-header pemantauan-monitoring-header">
              Rawatan Risiko
            </div>
            <div
              className="pemantauan-flex-row"
              style={{ padding: "18px 16px" }}
            >
              <div className="pemantauan-flex-item">
                <div className="pemantauan-data-line-block">
                  <span className="pemantauan-label-mon">Jenis Kawalan:</span>
                  <span className="pemantauan-data-mon">
                    {data.jenisKawalan || "Tiada Data Rawatan"}
                  </span>
                </div>
                <div className="pemantauan-data-line-block">
                  <span className="pemantauan-label-mon">Pelan Tindakan:</span>
                  <ListDisplay data={data.planTindakan} />
                </div>
              </div>
              <div className="pemantauan-flex-item">
                <div className="pemantauan-data-line-block">
                  <span className="pemantauan-label-mon">
                    Tempoh Jangkaan Siap Tindakan:
                  </span>
                  <span className="pemantauan-data-mon">
                    {data.tempohSiap || "-"}
                  </span>
                </div>
                <div className="pemantauan-data-line-block">
                  <span className="pemantauan-label-mon">
                    Kakitangan Bertanggungjawab:
                  </span>
                  <ListDisplay data={data.kakitanganBertanggungjawab} />
                </div>
              </div>
            </div>
          </div>

          {/* 4. PAPARAN LOG SEJARAH PEMANTAUAN (⭐️ DIKEMASKINI ⭐️) */}
          <div className="pemantauan-box">
            <div className="pemantauan-box-header pemantauan-log-header">
              <span>Log Sejarah Pemantauan Risiko</span>
              
              {/* Butang 'Tambah Log' (Hanya Admin & Executive) */}
              {(userRole === "Admin" || userRole === "Executive") && (
                <button
                  type="button"
                  className="pemantauan-add-log-btn"
                  onClick={() => {
                    setLogToEdit(null);
                    setIsTambahLogModalOpen(true);
                  }}
                >
                  <PlusCircle size={16} style={{ marginRight: "6px" }} />
                  Tambah Log Pemantauan
                </button>
              )}
            </div>
            <div style={{ padding: "4px" }}>
              {isLoadingLog ? (
                <div style={{ textAlign: "center", padding: "50px" }}>
                  <Loader2 size={32} className="spin" />
                  <p>Memuatkan Log Pemantauan...</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="log-pemantauan-table">
                    <thead>
                      <tr>
                        <th>Tahun</th>
                        <th>Separuh Tahun</th>
                        <th>Pelan Tindakan</th>
                        <th>Kekerapan Pemantauan</th>
                        <th>Kakitangan Bertanggungjawab</th>
                        <th>Skor Kebarangkalian</th>
                        <th>Skor Impak</th>
                        <th>Skor Risiko</th>
                        <th>Keberkesanan</th>
                        <th>Status Pemantauan</th>
                        <th>Kelulusan </th>
                        <th>Catatan</th>
                        <th>Pindaan Keberkesanan</th>
                        {/* ⭐️ 2. PERUBAHAN BARU: Sembunyikan header 'Tindakan' */}
                        {canViewTindakanColumn && <th>Tindakan</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {logData.length > 0 ? (
                        logData.map((log, index) => {
                          const k_selepas = log.skor_kebarangkalian_selepas;
                          const i_selepas = log.skor_impak_selepas;
                          const tahap_risiko =
                            log.skor_risiko_pemantauan ||
                            getRiskLevel(k_selepas, i_selepas);
                          const { color } = getRiskMatrix(k_selepas, i_selepas);
                          const sem_tahun_text = formatSeparuhTahun(
                            log.separuh_tahun_pemantauan
                          );
                          const pelanTindakanLog = Array.isArray(
                            log.pelan_tindakan_log
                          )
                            ? log.pelan_tindakan_log
                            : [];
                          const kakitanganLog = Array.isArray(
                            log.kakitangan_log
                          )
                            ? log.kakitangan_log
                            : [];
                          return (
                            <tr key={log.log_id || index}>
                              <td data-label="TAHUN">
                                {log.tahun_pemantauan || "-"}
                              </td>
                              <td data-label="SEPARUH TAHUN">
                                {sem_tahun_text}
                              </td>
                              <td data-label="PELAN TINDAKAN">
                                <ListDisplay data={pelanTindakanLog} />
                              </td>
                              <td data-label="KEKERAPAN AUDIT">
                                {log.kekerapan_pemantauan || "-"}
                              </td>
                              <td data-label="BERTANGGUNGJAWAB">
                                <ListDisplay data={kakitanganLog} />
                              </td>
                              <td data-label="K'KALIAN">{k_selepas || "-"}</td>
                              <td data-label="IMPAK SKOR">{i_selepas || "-"}</td>
                              <td
                                data-label="TAHAP RISIKO"
                                style={{
                                  backgroundColor: color,
                                  color:
                                    color === "#f1f5f9" ? "#475569" : "white",
                                  fontWeight: "bold",
                                }}
                              >
                                {tahap_risiko || "-"}
                              </td>
                              <td data-label="KEBERKESANAN">
                                <span
                                  className={`pemantauan-keberkesanan-tag ${
                                    log.keberkesanan?.toLowerCase() || "tiada"
                                  }`}
                                >
                                  {log.keberkesanan || "-"}
                                </span>
                              </td>
                              <td data-label="STATUS">
                                {log.status_pemantauan || "-"}
                              </td>
                              <td data-label="KELULUSAN">
                                {log.no_bil_kelulusan || "-"}
                              </td>
                              <td
                                data-label="CATATAN"
                                style={{
                                  maxWidth: "200px",
                                  whiteSpace: "normal",
                                }}
                              >
                                {log.catatan || "-"}
                              </td>
                              <td
                                data-label="PINDAAN KEBERKESANAN"
                                style={{
                                  maxWidth: "200px",
                                  whiteSpace: "normal",
                                }}
                              >
                                {log.justifikasi_pindaan_pemantauan || "-"}
                              </td>
                              
                              {/* ⭐️ 3. PERUBAHAN BARU: Sembunyikan keseluruhan sel 'Tindakan' */}
                              {canViewTindakanColumn && (
                                <td
                                  data-label="TINDAKAN"
                                  style={{ whiteSpace: "nowrap" }}
                                >
                                  {/* Butang 'Edit Log' (Admin, Exec, Staff) */}
                                  {(userRole === "Admin" ||
                                    userRole === "Executive" ||
                                    userRole === "Staff") && (
                                    <button
                                      type="button"
                                      onClick={() => handleEditLog(log)}
                                      className="pemantauan-button-circle rawatan-button-edit"
                                      style={{
                                        backgroundColor: "#eab308",
                                        color: "white",
                                        border: "none",
                                        marginRight: "5px",
                                      }}
                                      aria-label="Edit Log"
                                      disabled={isLoadingLog}
                                    >
                                      <Pencil size={16} />
                                    </button>
                                  )}

                                  {/* Butang 'Delete Log' (Hanya Admin & Executive) */}
                                  {(userRole === "Admin" ||
                                    userRole === "Executive") && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLog(log.log_id)}
                                      className="pemantauan-button-circle rawatan-button-remove"
                                      style={{
                                        backgroundColor: "#ef4444",
                                        color: "white",
                                        border: "none",
                                      }}
                                      aria-label="Padam Log"
                                      disabled={isLoadingLog}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          {/* ⭐️ 4. PERUBAHAN BARU: Kemas kini colSpan */}
                          <td
                            colSpan={canViewTindakanColumn ? 14 : 13} 
                            style={{ textAlign: "center", color: "#64748b" }}
                          >
                            Tiada rekod log pemantauan yang direkodkan lagi.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Panduan */}
        {isPanduanOpen && (
          <PanduanModal
            isOpen={isPanduanOpen}
            onClose={() => setIsPanduanOpen(false)}
          />
        )}

        {/* Modal Tambah/Edit Log Pemantauan */}
        {isTambahLogModalOpen && (
          <TambahLogModal
            isOpen={isTambahLogModalOpen}
            onClose={handleCloseLogModal}
            risikoId={data.risiko_id}
            onSaveSuccess={handleLogSaved}
            logDataToEdit={logToEdit}
          />
        )}
      </div>
    </div>
  );
}