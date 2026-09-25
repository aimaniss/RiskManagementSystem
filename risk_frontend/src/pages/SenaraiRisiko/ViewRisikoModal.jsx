import { useState, useEffect } from "react";
import { X, BookOpen, Pencil, Trash2, ClipboardList, ChevronDown, ChevronRight } from "lucide-react";
import api from "../../api/api";
import TambahLogModal from "../PemantauanRisiko/TambahLogModal";
import KemaskiniPemantauanModal from "./KemaskiniPemantauan";
import PengenalpastianModal from "./PengenalpastianModal";
import PenilaianRisikoModal from "./PenilaianRisikoModal";
import KemaskiniRawatan from "./kemaskinirawatan";
import { getAuthUser } from "../../utils/auth";
import { getRiskMatrix, getRiskLevel } from "../../constants/riskMatrix";
import { parseListData, formatSeparuhTahun } from "../../utils/formatters";
import { usePanduan } from "../../hooks/usePanduan";
import ConfirmModal from "@/components/ui/confirm-modal";
import Toast from "@/components/ui/toast";
import RiskMatrixVisual from "@/components/ui/risk-matrix-visual";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import EmptyState from "@/components/ui/empty-state";
import LoadingSpinner from "@/components/ui/loading-spinner";

// Admin & Executive boleh edit semua bahagian risiko dari paparan ini
const PERANAN_PENUH = ["ADMIN", "EXECUTIVE"];

// ==========================================================
// PEMBANTANG PRESENTASI (tiada logik — paparan sahaja)
// ==========================================================

const TAHAP_BADGE_COLORS = {
  Rendah: "#22c55e",
  Sederhana: "#eab308",
  Tinggi: "#f97316",
  "Sangat Tinggi": "#ef4444",
};

const KEBERKESANAN_STYLES = {
  berkesan: "bg-emerald-500/10 text-emerald-600",
  kurangberkesan: "bg-amber-500/10 text-amber-600",
  tidakberkesan: "bg-red-500/10 text-red-600",
};

const STATUS_RISIKO_STYLES = {
  YA: "bg-red-500/10 text-red-600",
  TIDAK: "bg-emerald-500/10 text-emerald-600",
};

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

function ChipList({ data }) {
  const items = Array.isArray(data)
    ? data.map(getItemText).filter((t) => t && t.trim() !== "-")
    : [];

  if (items.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="flex flex-wrap">
      {items.map((text, index) => (
        <span
          key={index}
          className="mr-1.5 mb-1.5 inline-block rounded-lg bg-muted px-3 py-1.5 text-[13px] leading-snug text-foreground"
        >
          {text}
        </span>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-baseline gap-x-3 sm:grid-cols-[150px_1fr]">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

function LogEntryCard({ log, userRole, handleViewLog, handleEditLog, handleDeleteLog }) {
  const [expanded, setExpanded] = useState(false);
  const k_selepas = log.skor_kebarangkalian_selepas;
  const i_selepas = log.skor_impak_selepas;
  const tahap_risiko = log.skor_risiko_pemantauan || getRiskLevel(k_selepas, i_selepas);
  const { color } = getRiskMatrix(k_selepas, i_selepas);
  const isNaColor = color === "#f1f5f9";
  const sem_tahun_text = formatSeparuhTahun(log.separuh_tahun_pemantauan);
  const pelanTindakanLog = Array.isArray(log.pelan_tindakan_log) ? log.pelan_tindakan_log : [];
  const kakitanganLog = Array.isArray(log.kakitangan_log) ? log.kakitangan_log : [];
  const pelanTindakanText = pelanTindakanLog.map(getItemText).filter(Boolean).join("; ");
  const keberkesananKey = (log.keberkesanan || "").toLowerCase().replace(/\s+/g, "");
  const kelulusanText = log.no_bil_kelulusan || "";
  const pindaanText = log.justifikasi_pindaan_pemantauan || "";

  return (
    <div className="rounded-lg border border-border bg-muted/30 transition-colors hover:bg-muted/50">
      <div
        className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
          <div>
            <p className="text-sm font-medium text-foreground">
              {log.tahun_pemantauan || "-"} {sem_tahun_text ? `· ${sem_tahun_text}` : ""}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {pelanTindakanText ? pelanTindakanText.substring(0, 60) + (pelanTindakanText.length > 60 ? "..." : "") : "Tiada pelan tindakan"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {k_selepas && i_selepas && (
            <Badge
              className={isNaColor ? "bg-muted text-muted-foreground" : "text-white"}
              style={isNaColor ? undefined : { backgroundColor: color }}
            >
              {k_selepas}×{i_selepas} {tahap_risiko}
            </Badge>
          )}
          <Badge variant="outline" className={
            log.status_pemantauan === "YA"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
              : log.status_pemantauan === "TIDAK"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
              : ""
          }>
            {log.status_pemantauan || "-"}
          </Badge>
          {PERANAN_PENUH.includes(userRole) && (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={(e) => handleEditLog(log, e)} title="Kemaskini Log">
                <Pencil size={13} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={(e) => handleDeleteLog(log, e)} title="Padam Log">
                <Trash2 size={13} />
              </Button>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Skor Kebarangkalian × Impak</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{k_selepas && i_selepas ? `${k_selepas} × ${i_selepas}` : "-"}</span>
                {tahap_risiko && (
                  <Badge className={isNaColor ? "bg-muted text-muted-foreground" : "text-white"} style={isNaColor ? undefined : { backgroundColor: color }}>
                    {tahap_risiko}
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status & Keberkesanan</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{log.status_pemantauan || "-"}</span>
                {log.keberkesanan && (
                  <span className={`text-xs font-medium ${KEBERKESANAN_STYLES[keberkesananKey] || "text-muted-foreground"}`}>{log.keberkesanan}</span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pelan Tindakan</p>
              {pelanTindakanLog.length > 0 ? (
                <ul className="list-inside list-disc space-y-0.5 text-sm text-foreground">
                  {pelanTindakanLog.map((pt, idx) => (<li key={idx}>{getItemText(pt)}</li>))}
                </ul>
              ) : (<p className="text-sm text-muted-foreground">-</p>)}
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Kakitangan Bertanggungjawab</p>
              {kakitanganLog.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {kakitanganLog.map((orang, idx) => (
                    <span key={idx} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">{getItemText(orang)}</span>
                  ))}
                </div>
              ) : (<p className="text-sm text-muted-foreground">-</p>)}
            </div>
          </div>
          {log.catatan && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Catatan</p>
              <p className="text-sm text-foreground">{log.catatan}</p>
            </div>
          )}
          {(kelulusanText || pindaanText) && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {kelulusanText && <span>Kelulusan: <span className="text-foreground">{kelulusanText}</span></span>}
              {pindaanText && <span>Pindaan: <span className="text-foreground">{pindaanText}</span></span>}
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => handleViewLog(log)}>
              Papar Penuh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({ number, title, actions, children }) {
  return (
    <Card className="overflow-hidden rounded-xl">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
          {number}
        </span>
        <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
        <div className="ml-auto flex items-center gap-1.5">{actions}</div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold text-foreground" title={value}>{value}</p>
    </div>
  );
}

const formatTarikh = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString("ms-MY", { day: "2-digit", month: "short", year: "numeric" });
};

// ==========================================================
// MAIN COMPONENT: ViewRisikoModal
// ==========================================================
export default function ViewRisikoModal({ isOpen, risk, onClose }) {
  const [logData, setLogData] = useState([]);
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logToView, setLogToView] = useState(null);
  
  const [isEditLogModalOpen, setIsEditLogModalOpen] = useState(false);
  const [logToEdit, setLogToEdit] = useState(null);
  
  const [isPengenalpastianModalOpen, setIsPengenalpastianModalOpen] = useState(false);
  const [isPenilaianModalOpen, setIsPenilaianModalOpen] = useState(false);
  const [isRawatanModalOpen, setIsRawatanModalOpen] = useState(false);
  
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmFn, setConfirmFn] = useState(null);
  const [toast, setToast] = useState(null);
  const authUser = getAuthUser();
  const userRole = authUser?.role || null;
  const { openPanduan, PanduanTrigger, PanduanRenderer } = usePanduan();
  
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
    nama_syarikat: "",
    kategori: "",
    bahagian: "",
    risiko: "",
    status_risiko: "",
    status_risiko_desc: "",
    justifikasi_pindaan_penilaian: "",
  });

  const [riskColor, setRiskColor] = useState("#f1f5f9");

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
          nama_syarikat: updatedRisk.syarikat || updatedRisk.nama_syarikat || "-", 
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
      nama_syarikat: risk.syarikat || risk.nama_syarikat || "-", 
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

      if (label === "Rendah") {
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
    const deleteAction = async () => {
      setShowConfirm(false);
      try {
        await api.delete(`/pemantauan-risiko/log/${logItem.log_id}`);
        setToast({ variant: "success", title: "Log Dipadam", message: "Log berjaya dipadam!" });
        fetchLog(data.risiko_id);
        setNeedsRefresh(true);
      } catch (error) {
        console.error("❌ Gagal memadam log:", error);
        setToast({ variant: "error", title: "Gagal Memadam", message: "Gagal memadam log. Sila cuba lagi." });
      }
    };
    setConfirmFn(() => deleteAction);
    setShowConfirm(true);
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

  const latestLog = logData[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* ===== HEADER ===== */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Perincian Risiko
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold leading-tight text-foreground">
                {data.no_rujukan || "-"}
              </h2>
              {data.kategori && data.kategori !== "-" && (
                <Badge variant="secondary" className="font-medium">
                  {data.kategori}
                </Badge>
              )}
              {data.tahap_risiko && data.tahap_risiko !== "-" && (
                <Badge
                  className="border-transparent text-white"
                  style={{
                    backgroundColor: TAHAP_BADGE_COLORS[data.tahap_risiko] || "#94a3b8",
                  }}
                >
                  {data.tahap_risiko}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMainModalClose}
            aria-label="Tutup Borang"
            className="shrink-0"
          >
            <X />
          </Button>
        </div>

        {/* ===== BODY ===== */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-background p-5">
          {/* 1. Pengenalpastian Risiko */}
          <SectionCard
            number="1"
            title="Pengenalpastian Risiko"
            actions={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-primary hover:bg-primary/10"
                  onClick={openPanduan}
                >
                  <BookOpen />
                  Panduan
                </Button>
                {PERANAN_PENUH.includes(userRole) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10"
                    onClick={handleEditPengenalpastian}
                    title="Edit Pengenalpastian Risiko"
                  >
                    <Pencil />
                  </Button>
                )}
              </>
            }
          >
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="No Rujukan">{data.no_rujukan || "-"}</Field>
              <Field label="Syarikat">{data.nama_syarikat || "-"}</Field>
              <Field label="Tahun Didaftarkan">{data.tahun || "-"}</Field>
              <Field label="Separuh Tahun">
                {formatSeparuhTahun(data.separuh_tahun)}
              </Field>
              <Field label="Kategori Risiko">{data.kategori || "-"}</Field>
              <Field label="Bahagian/Unit">{data.bahagian || "-"}</Field>

              <div className="sm:col-span-2">
                <dt className="mb-1.5 text-[13px] text-muted-foreground">Risiko</dt>
                <dd className="rounded-lg border-l-2 border-primary bg-muted/40 px-4 py-3 text-[15px] font-medium leading-relaxed text-foreground">
                  {data.risiko || "-"}
                </dd>
              </div>

              <div>
                <dt className="mb-1 text-[13px] text-muted-foreground">Punca Risiko</dt>
                <dd>
                  <ChipList data={data.punca} />
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[13px] text-muted-foreground">Kesan Risiko</dt>
                <dd>
                  <ChipList data={data.kesan} />
                </dd>
              </div>
            </dl>
          </SectionCard>

          {/* 2. Penilaian Risiko Awal */}
          {hasPenilaianData() && (
            <SectionCard
              number="2"
              title="Penilaian Risiko"
              actions={
                PERANAN_PENUH.includes(userRole) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10"
                    onClick={handleEditPenilaian}
                    title="Edit Penilaian Risiko"
                  >
                    <Pencil />
                  </Button>
                )
              }
            >
              <div className="flex flex-col gap-6 lg:flex-row">
                {/* Skor + status di kiri */}
                <div className="min-w-0 flex-1 space-y-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-3.5 text-center">
                      <span className="text-xs font-semibold text-muted-foreground">Skor Kebarangkalian</span>
                      <span className="text-2xl font-extrabold leading-none text-foreground">
                        {data.skor_kebarangkalian || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-3.5 text-center">
                      <span className="text-xs font-semibold text-muted-foreground">Skor Impak</span>
                      <span className="text-2xl font-extrabold leading-none text-foreground">
                        {data.skor_impak || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-3.5 text-center">
                      <span className="text-xs font-semibold text-muted-foreground">Tahap Risiko</span>
                      <span
                        data-level={data.tahap_risiko}
                        className="mt-0.5 inline-flex items-center rounded-md px-3 py-1 text-sm font-bold shadow-sm"
                        style={{
                          backgroundColor: riskColor,
                          color: riskColor === "#f1f5f9" ? "#475569" : "#ffffff",
                        }}
                      >
                        {data.tahap_risiko || "-"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[13px] text-muted-foreground">Status Risiko</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-bold ${
                          STATUS_RISIKO_STYLES[data.status_risiko] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {data.status_risiko || "-"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {data.status_risiko_desc || "Skor risiko tiada."}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="mb-1 text-[13px] text-muted-foreground">Pindaan Penilaian</p>
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {data.justifikasi_pindaan_penilaian || "-"}
                    </p>
                  </div>
                </div>

                {/* Matriks risiko aktif di kanan */}
                <div className="flex shrink-0 flex-col items-center gap-3 lg:border-l lg:border-border lg:pl-6">
                  <p className="text-[13px] font-semibold text-muted-foreground">
                    Kedudukan pada Matriks Risiko
                  </p>
                  <RiskMatrixVisual kebarangkalian={data.skor_kebarangkalian} impak={data.skor_impak} />
                </div>
              </div>
            </SectionCard>
          )}

          {/* 3. Rawatan Risiko */}
          {hasRawatanData() && (
            <SectionCard
              number="3"
              title="Rawatan Risiko"
              actions={
                PERANAN_PENUH.includes(userRole) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10"
                    onClick={handleEditRawatan}
                    title="Edit Rawatan Risiko"
                  >
                    <Pencil />
                  </Button>
                )
              }
            >
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <p className="mb-1.5 text-[13px] text-muted-foreground">Jenis Kawalan</p>
                    <span className="inline-block rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
                      {data.jenisKawalan || "Tiada Data Rawatan"}
                    </span>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[13px] text-muted-foreground">Pelan Tindakan</p>
                    <ChipList data={data.planTindakan} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="mb-1.5 text-[13px] text-muted-foreground">Tempoh Jangkaan Siap Tindakan</p>
                    <p className="break-words text-sm font-medium text-foreground">{data.tempohSiap || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[13px] text-muted-foreground">Kakitangan Bertanggungjawab</p>
                    <ChipList data={data.kakitanganBertanggungjawab} />
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* 4. LOG SEJARAH PEMANTAUAN */}
          <SectionCard
            number="4"
            title="Pemantauan Risiko"
            actions={
              hasLogData() && !isLoadingLog ? (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {logData.length} rekod
                </span>
              ) : null
            }
          >
            {isLoadingLog ? (
              <LoadingSpinner text="Memuatkan sejarah pemantauan..." />
            ) : !hasLogData() ? (
              <EmptyState
                icon={ClipboardList}
                title="Tiada Rekod Pemantauan"
                description="Belum ada log pemantauan yang direkodkan untuk risiko ini."
              />
            ) : (
              <>
                {/* Strip ringkasan pemantauan terkini */}
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatBlock
                    label="Kekerapan Pemantauan"
                    value={latestLog?.kekerapan_pemantauan || "-"}
                  />
                  <StatBlock
                    label="Status Pemantauan"
                    value={latestLog?.status_pemantauan || "-"}
                  />
                  <StatBlock
                    label="Sesi Terkini"
                    value={
                      latestLog
                        ? `${latestLog.tahun_pemantauan || "-"}${latestLog.separuh_tahun_pemantauan != null ? ` · ${formatSeparuhTahun(latestLog.separuh_tahun_pemantauan)}` : ""}`
                        : "-"
                    }
                  />
                  <StatBlock
                    label="Kemaskini Terakhir"
                    value={formatTarikh(latestLog?.tarikh_kemaskini || latestLog?.tarikh_pemantauan)}
                  />
                </div>

                {/* Log entries — card-based layout */}
                <div className="space-y-3">
                  {logData.map((log, index) => (
                    <LogEntryCard
                      key={log.log_id || index}
                      log={log}
                      userRole={userRole}
                      handleViewLog={handleViewLog}
                      handleEditLog={handleEditLog}
                      handleDeleteLog={handleDeleteLog}
                    />
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        </div>

        {PanduanRenderer}

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
              syarikat_id: risk?.syarikat_id,
              syarikat: data.nama_syarikat,
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
              syarikat_id: risk?.syarikat_id,
              syarikat: data.nama_syarikat,
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

      <ConfirmModal
        open={showConfirm}
        onOpenChange={setShowConfirm}
        icon="warning"
        variant="warning"
        title="Padam Log Pemantauan"
        description="Adakah anda pasti mahu memadam log ini? Tindakan ini tidak boleh diundur."
        confirmText="Ya, Padam"
        cancelText="Batal"
        onConfirm={() => confirmFn?.()}
      />

      {toast && (
        <Toast
          variant={toast.variant}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
          autoClose={4000}
        />
      )}
    </div>
  );
}
