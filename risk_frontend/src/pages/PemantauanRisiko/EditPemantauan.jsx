import { useState, useEffect } from "react";
import { X, BookOpen, Trash2, PlusCircle, Pencil, Activity, ClipboardList, CalendarDays, ChevronRight, TrendingUp } from "lucide-react";
import ConfirmModal from "@/components/ui/confirm-modal";
import Toast from "@/components/ui/toast";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import RiskMatrixVisual from "@/components/ui/risk-matrix-visual";
import api from "../../api/api";
import TambahLogModal from "./TambahLogModal";
import ListDisplay from "../../components/ListDisplay";
import { getRiskMatrix, getRiskAbbreviation, getRiskColor } from "../../constants/riskMatrix";
import { formatSeparuhTahun } from "../../utils/formatters";
import { usePanduan } from "../../hooks/usePanduan";
import { jwtDecode } from "jwt-decode";

const STATUS_STYLES = {
  "Buka": "bg-muted text-muted-foreground",
  "Sedang Dilaksanakan": "bg-primary/10 text-primary",
  "Pemantauan": "bg-warning/10 text-warning",
  "Selesai": "bg-success/10 text-success",
  "Tutup": "bg-secondary text-secondary-foreground",
  "Tertunggak": "bg-destructive/10 text-destructive",
};
const statusBadgeClass = (status) => `inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[status] || "bg-muted text-muted-foreground"}`;

const resolveTahapRisiko = (log) => {
  const k = log?.skor_kebarangkalian_selepas;
  const i = log?.skor_impak_selepas;
  if (k && i) {
    const m = getRiskMatrix(k, i);
    return { label: m.label, short: m.shortLabel, color: m.color, textColor: m.textColor };
  }
  const raw = log?.skor_risiko_pemantauan;
  const short = ["R", "S", "T", "ST"].includes(raw) ? raw : getRiskAbbreviation(raw) || "-";
  return { label: raw || "Tiada Data", short, color: getRiskColor(raw), textColor: "#ffffff" };
};

const getKeberkesananBadgeClass = (value) => {
  const v = (value || "").toLowerCase();
  if (v.startsWith("ya")) return "bg-success/10 text-success";
  if (v.includes("kurang")) return "bg-warning/10 text-warning";
  if (v.includes("tidak")) return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
};

export default function EditPemantauan({ isOpen, risk, onClose }) {
  const { openPanduan, PanduanTrigger, PanduanRenderer } = usePanduan();
  const [isTambahLogModalOpen, setIsTambahLogModalOpen] = useState(false);
  const [logData, setLogData] = useState([]);
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [logToEdit, setLogToEdit] = useState(null);

  const [modalMode, setModalMode] = useState("tambah");

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmFn, setConfirmFn] = useState(null);
  const [toast, setToast] = useState(null);

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
      nama_syarikat: risk.nama_syarikat || "-",
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
          " Risiko tidak memerlukan tindakan segera.";
      } else {
        status = "YA";
        statusDesc = "Risiko memerlukan tindakan segera ";
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

  const handleDeleteLog = (logId) => {
    setConfirmFn(() => async () => {
      setShowConfirm(false);
      setIsLoadingLog(true);
      try {
        await api.delete(`/pemantauan-risiko/log/${logId}`);
        await fetchLog(data.risiko_id);
        setToast({ variant: "success", title: "Berjaya", message: "Rekod log berjaya dipadam!" });
      } catch (err) {
        console.error("❌ Gagal memadam log:", err);
        setToast({ variant: "error", title: "Gagal", message: `Gagal memadam log. ${err.response?.data?.error || "Sila cuba lagi."}` });
      } finally {
        setIsLoadingLog(false);
      }
    });
    setShowConfirm(true);
  };

  const handleEditLog = (logItem) => {
    setLogToEdit(logItem);
    setModalMode("edit");
    setIsTambahLogModalOpen(true);
  };

  const handleViewLog = (logItem) => {
    setLogToEdit(logItem);
    setModalMode("papar");
    setIsTambahLogModalOpen(true);
  };

  const handleLogSaved = () => {
    setIsTambahLogModalOpen(false);
    setLogToEdit(null);
    setModalMode("tambah");
    fetchLog(data.risiko_id);
  };

  const handleCloseLogModal = () => {
    setIsTambahLogModalOpen(false);
    setLogToEdit(null);
    setModalMode("tambah");
  };

  if (!isOpen) return null;

  const renderInfoField = (label, value) => (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  );

  const renderListBlock = (label, listData) => (
    <div className="min-w-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">
        <ListDisplay data={listData} />
      </div>
    </div>
  );

  const renderSectionHeading = (title, action = null) => (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
      <span className="h-px grow bg-border" />
      {action}
    </div>
  );

  return (
    <>
      <style>{`@keyframes prmFadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-[prmFadeIn_.18s_ease-out]">
        <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl animate-[prmFadeIn_.22s_ease-out]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ClipboardList size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-[15px] font-semibold leading-tight text-foreground">Maklumat Pemantauan</h2>
                <p className="truncate text-xs text-muted-foreground">
                  {data.no_rujukan}{data.tahun ? ` · ${data.tahun}` : ""}
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Tutup Borang" className="h-8 w-8 shrink-0 rounded-lg">
              <X />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">

            <section className="space-y-3">
              {renderSectionHeading(
                "Pengenalpastian Risiko",
                <button
                  type="button"
                  onClick={openPanduan}
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <BookOpen size={14} />
                  Panduan
                </button>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                {renderInfoField("No Rujukan", data.no_rujukan || "-")}
                {renderInfoField("Tahun Didaftarkan", data.tahun || "-")}
                {renderInfoField("Separuh Tahun Didaftarkan", formatSeparuhTahun(data.separuh_tahun))}
                {renderInfoField("Syarikat", data.nama_syarikat || "-")}
              </dl>

              <div className="grid grid-cols-1 gap-4 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="min-w-0 sm:col-span-1 lg:col-span-1">
                  <span className="text-xs font-medium text-muted-foreground">Kategori Risiko</span>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{data.kategori || "-"}</p>
                </div>
                <div className="min-w-0 sm:col-span-1 lg:col-span-1">
                  <span className="text-xs font-medium text-muted-foreground">Bahagian/Unit</span>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{data.bahagian || "-"}</p>
                </div>
                <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                  <span className="text-xs font-medium text-muted-foreground">Risiko</span>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{data.risiko || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-border pt-3 sm:grid-cols-2">
                {renderListBlock("Punca Risiko", data.punca)}
                {renderListBlock("Kesan Risiko", data.kesan)}
              </div>
            </section>

            <section className="space-y-3">
              {renderSectionHeading("Penilaian Risiko")}
              <div className="rounded-lg border border-border bg-accent/60 p-3">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <dl className="grid flex-1 grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white/70 p-3 text-center ring-1 ring-border">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Skor Kebarangkalian</dt>
                      <dd className="mt-1 text-xl font-bold text-foreground">{data.skor_kebarangkalian || "-"}</dd>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3 text-center ring-1 ring-border">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Skor Impak</dt>
                      <dd className="mt-1 text-xl font-bold text-foreground">{data.skor_impak || "-"}</dd>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3 text-center ring-1 ring-border">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tahap Risiko</dt>
                      <dd className="mt-1">
                        <span
                          className={`inline-flex h-7 min-w-[56px] items-center justify-center rounded-md px-2.5 text-xs font-bold uppercase ${
                            riskColor === "#f1f5f9" ? "text-slate-500" : "text-white"
                          }`}
                          style={{ backgroundColor: riskColor }}
                        >
                          {data.tahap_risiko || "-"}
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <RiskMatrixVisual
                    compact
                    kebarangkalian={data.skor_kebarangkalian}
                    impak={data.skor_impak}
                    className="shrink-0 self-center"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-medium text-muted-foreground">Status Risiko:</span>
                <span
                  className={`inline-flex h-6 items-center justify-center rounded-md px-2.5 text-xs font-bold ${
                    data.status_risiko === "YA"
                      ? "bg-destructive/10 text-destructive"
                      : data.status_risiko === "TIDAK"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {data.status_risiko || "-"}
                </span>
                <span className="text-sm text-muted-foreground">{data.status_risiko_desc || "Skor risiko tiada."}</span>
              </div>

              <div className="border-t border-border pt-3">
                <span className="text-xs font-medium text-muted-foreground">Pindaan Penilaian</span>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {data.justifikasi_pindaan_penilaian || "-"}
                </p>
              </div>
            </section>

            <section className="space-y-3">
              {renderSectionHeading("Rawatan Risiko")}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Jenis Kawalan</span>
                    <p className="mt-0.5 text-sm font-medium text-foreground">{data.jenisKawalan || "Tiada Data Rawatan"}</p>
                  </div>
                  {renderListBlock("Pelan Tindakan", data.planTindakan)}
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Tempoh Jangkaan Siap Tindakan</span>
                    <p className="mt-0.5 text-sm font-medium text-foreground">{data.tempohSiap || "-"}</p>
                  </div>
                  {renderListBlock("Kakitangan Bertanggungjawab", data.kakitanganBertanggungjawab)}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              {renderSectionHeading(
                "Sejarah Pemantauan",
                (userRole === "Admin" || userRole === "Executive") && (
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => {
                      setLogToEdit(null);
                      setModalMode("tambah");
                      setIsTambahLogModalOpen(true);
                    }}
                  >
                    <PlusCircle />
                    Tambah Pemantauan
                  </Button>
                )
              )}

              {isLoadingLog ? (
                <LoadingSpinner text="Memuatkan Pemantauan..." size="md" />
              ) : logData.length === 0 ? (
                <EmptyState icon={Activity} title="Tiada rekod pemantauan" description="Tiada rekod pemantauan yang direkodkan lagi." />
              ) : (
                <div className="space-y-4">
                  {/* Trend strip */}
                  {logData.length > 1 && (
                    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-muted-foreground" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trend Tahap Risiko Semasa ke Semasa</span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {[...logData].reverse().map((log, idx) => {
                          const info = resolveTahapRisiko(log);
                          return (
                            <div key={log.log_id || idx} className="flex flex-wrap items-center gap-1.5">
                              {idx > 0 && <ChevronRight size={14} className="text-muted-foreground/60" />}
                              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5">
                                <span
                                  className={`inline-flex h-5 min-w-[24px] items-center justify-center rounded px-1 text-[10px] font-bold ${
                                    info.textColor === "#ffffff" ? "text-white" : "text-slate-800"
                                  }`}
                                  style={{ backgroundColor: info.color }}
                                >
                                  {info.short}
                                </span>
                                <span className="text-[9px] font-medium text-muted-foreground">
                                  {log.tahun_pemantauan || "-"} {formatSeparuhTahun(log.separuh_tahun_pemantauan)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Timeline kad */}
                  <ol className="relative space-y-4 border-l-2 border-border pl-5">
                    {logData.map((log, index) => {
                      const info = resolveTahapRisiko(log);
                      const isLatest = index === 0;
                      const isAdmin = userRole === 'Admin';
                      const isExecutive = userRole === 'Executive';
                      const isStaff = userRole === 'Staff';

                      const showEditButton = isAdmin || (isLatest && (isExecutive || isStaff));
                      const showDeleteButton = isAdmin || (isLatest && isExecutive);

                      const pelanTindakanLog = Array.isArray(log.pelan_tindakan_log) ? log.pelan_tindakan_log : [];
                      const kakitanganLog = Array.isArray(log.kakitangan_log) ? log.kakitangan_log : [];

                      return (
                        <li key={log.log_id || index} className="relative">
                          <span
                            className="absolute -left-[26px] top-4 h-3 w-3 rounded-full border-2 border-background"
                            style={{ backgroundColor: info.color }}
                          />
                          <div
                            className={`cursor-pointer rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
                              isLatest ? "border-primary/40 bg-card ring-1 ring-primary/20" : "border-border bg-card"
                            }`}
                            onClick={() => handleViewLog(log)}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                  <CalendarDays size={14} className="text-muted-foreground" />
                                  {log.tahun_pemantauan || "-"} ({formatSeparuhTahun(log.separuh_tahun_pemantauan)})
                                </span>
                                {isLatest && (
                                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                    Terkini
                                  </span>
                                )}
                                <span className={statusBadgeClass(log.status_pemantauan)}>
                                  {log.status_pemantauan || "-"}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {showEditButton && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    aria-label="Kemas Kini Log"
                                    className="h-8 gap-1 text-primary"
                                    onClick={(e) => { e.stopPropagation(); handleEditLog(log); }}
                                  >
                                    <Pencil size={13} />
                                    Kemas Kini
                                  </Button>
                                )}
                                {showDeleteButton && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Padam Log"
                                    className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.log_id); }}
                                  >
                                    <Trash2 />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
                              <div className="min-w-0">
                                <span className="text-[11px] font-medium text-muted-foreground">Skor Kebarangkalian</span>
                                <p className="mt-0.5 text-sm font-semibold text-foreground">{log.skor_kebarangkalian_selepas || "-"}</p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-[11px] font-medium text-muted-foreground">Skor Impak</span>
                                <p className="mt-0.5 text-sm font-semibold text-foreground">{log.skor_impak_selepas || "-"}</p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-[11px] font-medium text-muted-foreground">Tahap Risiko</span>
                                <p className="mt-0.5">
                                  <span
                                    className={`inline-flex h-6 min-w-[40px] items-center justify-center rounded-md px-2 text-xs font-bold ${
                                      info.textColor === "#ffffff" ? "text-white" : "text-slate-800"
                                    }`}
                                    style={{ backgroundColor: info.color }}
                                  >
                                    {info.label || "-"}
                                  </span>
                                </p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-[11px] font-medium text-muted-foreground">Keberkesanan</span>
                                <p className="mt-0.5">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getKeberkesananBadgeClass(log.keberkesanan)}`}>
                                    {log.keberkesanan || "-"}
                                  </span>
                                </p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-[11px] font-medium text-muted-foreground">Kekerapan</span>
                                <p className="mt-0.5 truncate text-sm font-medium text-foreground">{log.kekerapan_pemantauan || "-"}</p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-[11px] font-medium text-muted-foreground">No. Kelulusan</span>
                                <p className="mt-0.5 truncate text-sm font-medium text-foreground">{log.no_bil_kelulusan || "-"}</p>
                              </div>
                            </div>

                            {(pelanTindakanLog.length > 0 || kakitanganLog.length > 0) && (
                              <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
                                {pelanTindakanLog.length > 0 && (
                                  <div className="min-w-0">
                                    <span className="text-xs font-medium text-muted-foreground">Pelan Tindakan</span>
                                    <div className="mt-1">
                                      <ListDisplay data={pelanTindakanLog} />
                                    </div>
                                  </div>
                                )}
                                {kakitanganLog.length > 0 && (
                                  <div className="min-w-0">
                                    <span className="text-xs font-medium text-muted-foreground">Kakitangan Bertanggungjawab</span>
                                    <div className="mt-1">
                                      <ListDisplay data={kakitanganLog} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {(log.catatan || log.justifikasi_pindaan_pemantauan) && (
                              <div className="mt-3 space-y-2 border-t border-border pt-3">
                                {log.catatan && (
                                  <p className="text-sm leading-relaxed text-foreground">
                                    <span className="text-xs font-medium text-muted-foreground">Catatan: </span>
                                    {log.catatan}
                                  </p>
                                )}
                                {log.justifikasi_pindaan_pemantauan && (
                                  <p className="text-sm leading-relaxed text-muted-foreground">
                                    <span className="text-xs font-medium text-muted-foreground">Pindaan Keberkesanan: </span>
                                    {log.justifikasi_pindaan_pemantauan}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </section>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-white px-5 py-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>

        {PanduanRenderer}

        {isTambahLogModalOpen && (
          <TambahLogModal
            isOpen={isTambahLogModalOpen}
            onClose={handleCloseLogModal}
            risikoId={data.risiko_id}
            onSaveSuccess={handleLogSaved}
            logDataToEdit={logToEdit}
            mode={modalMode}
            userRole={userRole}
          />
        )}

        <ConfirmModal
          open={showConfirm}
          onOpenChange={setShowConfirm}
          icon="warning"
          variant="warning"
          title="Padam Rekod Log"
          description="Adakah anda pasti mahu memadam rekod log pemantauan ini? Tindakan ini tidak boleh diundur."
          confirmText="Ya"
          onConfirm={() => confirmFn?.()}
        />

        {toast && (
          <div className="fixed top-[64px] right-4 z-[60] max-w-sm">
            <Toast variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
          </div>
        )}
      </div>
    </>
  );
}
