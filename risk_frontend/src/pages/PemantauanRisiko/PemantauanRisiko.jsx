import { useState, useEffect, useCallback } from "react";
import api from "../../api/api";
import { Eye, Loader2, ChevronDown, ChevronRight, Filter, Activity, Search } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import EditPemantauan from "./EditPemantauan";
import { riskMatrix } from "../../constants/riskMatrix";
import RiskLevelProgress from "@/components/ui/risk-level-progress";

// =======================================================
// UTILITIES
// =======================================================
const getRiskData = (k, i) => {
    if (!k || !i) return { label: "Tiada Data", color: "#94a3b8" };
    const kk = Math.min(Math.max(parseInt(k), 1), 5);
    const ii = Math.min(Math.max(parseInt(i), 1), 5);
    return riskMatrix[kk]?.[ii] || { label: "-", color: "#94a3b8" };
};
const getSeparuhTahunLabel = (separuh) => separuh === 1 ? "Pertama" : separuh === 2 ? "Kedua" : "";

const RISK_LEVEL_COLORS = {
    "Rendah": "#22c55e",
    "Sederhana": "#eab308",
    "Tinggi": "#f97316",
    "Sangat Tinggi": "#ef4444",
    "Tiada Data": "#94a3b8",
};
const riskBadgeColor = (label) => RISK_LEVEL_COLORS[label] || "#94a3b8";

const STATUS_BADGE_VARIANTS = {
    "Buka": "outline",
    "Sedang Dilaksanakan": "default",
    "Pemantauan": "warning",
    "Selesai": "success",
    "Tutup": "secondary",
    "Tertunggak": "destructive",
};
const statusBadgeVariant = (status) => STATUS_BADGE_VARIANTS[status] || "secondary";

const KEBERKESANAN_STYLES = {
    berkesan: "bg-emerald-500/10 text-emerald-600",
    kurangberkesan: "bg-amber-500/10 text-amber-600",
    tidakberkesan: "bg-red-500/10 text-red-600",
};

// =======================================================
// Komponen Bar Kad Risiko
// =======================================================
function RiskCard({ item, onEdit }) {
    const [expanded, setExpanded] = useState(false);
    const d = item;

    const { label: skorDaftarLabel } = getRiskData(
        parseInt(d.skor_kebarangkalian_sebelum) || 0,
        parseInt(d.skor_impak_sebelum) || 0
    );

    const currentRiskLevel = d.tahap_risiko === "Tiada Data" || !d.tahap_risiko
        ? skorDaftarLabel
        : d.tahap_risiko;

    const pelanTindakanList = Array.isArray(d.pelan_tindakan_pemantauan)
        ? d.pelan_tindakan_pemantauan.filter(Boolean)
        : [];

    return (
        <Card className="overflow-hidden transition-all hover:shadow-md">
            {/* Header row — always visible */}
            <div
                className="flex cursor-pointer flex-wrap items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center pt-0.5">
                    {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-semibold text-foreground">{d.no_rujukan}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{d.tahun_asal || d.tahun || "-"} {getSeparuhTahunLabel(d.separuh_tahun_asal || d.separuh_tahun)}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground line-clamp-1">{d.risiko}</p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{d.nama_syarikat || "-"}</span>
                        {d.kategori_risiko && (
                            <span className="rounded bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">{d.kategori_risiko}</span>
                        )}
                    </div>
                </div>

                {/* Status — di tengah, sebelum indicator */}
                <Badge
                    variant={statusBadgeVariant(d.status_pemantauan_terkini)}
                    className="shrink-0 px-2.5 py-0.5 text-[11px] font-semibold"
                >
                    {d.status_pemantauan_terkini || "-"}
                </Badge>

                {/* Indicator Sebelum → Selepas + butang — di hujung kanan */}
                <div className="flex shrink-0 items-center gap-3">
                    <RiskLevelProgress
                        sebelumLabel={skorDaftarLabel}
                        selepasLabel={currentRiskLevel}
                        className="w-56"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); onEdit(d); }}
                        title="Lihat/Kemaskini Pemantauan"
                    >
                        <Eye size={14} />
                    </Button>
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {/* Pengenalpastian */}
                        <div className="space-y-1.5">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pengenalpastian</p>
                            <div className="space-y-1 text-sm">
                                <p><span className="text-muted-foreground">Syarikat: </span><span className="text-foreground">{d.nama_syarikat || "-"}</span></p>
                                <p><span className="text-muted-foreground">Kategori: </span><span className="text-foreground">{d.kategori_risiko || "-"}</span></p>
                                <p><span className="text-muted-foreground">Tahun Asal: </span><span className="text-foreground">{d.tahun_asal || d.tahun || "-"} ({getSeparuhTahunLabel(d.separuh_tahun_asal || d.separuh_tahun)})</span></p>
                            </div>
                        </div>

                            {/* Pemantauan */}
                            <div className="space-y-1.5">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pemantauan</p>
                                <div className="space-y-1 text-sm">
                                    {d.tahun_pemantauan && (
                                        <p><span className="text-muted-foreground">Sesi: </span><span className="text-foreground">{d.tahun_pemantauan} ({getSeparuhTahunLabel(d.separuh_tahun_pemantauan)})</span></p>
                                    )}
                                    {d.catatan && (
                                        <p><span className="text-muted-foreground">Catatan: </span><span className="text-foreground">{d.catatan}</span></p>
                                    )}
                                </div>
                                <RiskLevelProgress
                                    sebelumLabel={skorDaftarLabel}
                                    selepasLabel={currentRiskLevel}
                                    className="mt-2"
                                />
                        </div>

                        {/* Pelan Tindakan */}
                        <div className="space-y-1.5">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pelan Tindakan</p>
                            {pelanTindakanList.length > 0 ? (
                                <ol className="list-inside list-decimal space-y-0.5 text-sm text-foreground">
                                    {pelanTindakanList.map((plan, idx) => (
                                        <li key={idx}>{plan}</li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="text-sm text-muted-foreground">Tiada pelan tindakan</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}

// =======================================================
// Komponen Modal Penapis Tarikh (Dialog)
// =======================================================
const DateFilterModal = ({ isOpen, onClose, allData, currentTahun, currentSeparuh, onApplyFilter }) => {
    const [tahun, setTahun] = useState(currentTahun || "");
    const [separuh, setSeparuh] = useState(currentSeparuh || "");

    const uniqueTahun = [...new Set(allData
        .map(d => d.tahun_asal || d.tahun)
        .filter(t => t)
        .map(t => String(t))
    )].sort((a, b) => parseInt(b) - parseInt(a));

    const handleApply = () => {
        onApplyFilter(tahun, separuh);
    };

    const handleReset = () => {
        setTahun("");
        setSeparuh("");
        onApplyFilter("", "");
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tapis Tahun &amp; Separuh Tahun</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Tahun Asal</Label>
                        <Select value={tahun} onChange={e => setTahun(e.target.value)}>
                            <option value="">-- Semua Tahun --</option>
                            {uniqueTahun.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Separuh Tahun</Label>
                        <Select value={separuh} onChange={e => setSeparuh(e.target.value)}>
                            <option value="">-- Semua Separuh Tahun --</option>
                            <option value="1">Pertama</option>
                            <option value="2">Kedua</option>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" size="sm" onClick={handleReset}>Set Semula</Button>
                    <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
                    <Button size="sm" onClick={handleApply}>Tapis Data</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// =======================================================
// Komponen Detail Pemantauan (Sheet)
// =======================================================
function PemantauanDetailSheet({ isOpen, onClose, data }) {
    if (!data) return null;

    const { label: skorDaftarLabel } = getRiskData(
        parseInt(data.skor_kebarangkalian_sebelum) || 0,
        parseInt(data.skor_impak_sebelum) || 0
    );
    const { label: tahapRisikoTerkini, color: riskColorTerkini } = getRiskData(
        parseInt(data.skor_kebarangkalian_terkini) || 0,
        parseInt(data.skor_impak_terkini) || 0
    );

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-2">
                    <SheetTitle className="pr-8">{data.no_rujukan || "Detail Pemantauan"}</SheetTitle>
                    <SheetDescription className="line-clamp-1">{data.risiko}</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    {/* Risk badges */}
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Penilaian Risiko</span>
                        <div className="mt-2 flex items-center gap-3">
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground mb-1">Sebelum</p>
                                <Badge className="border-transparent text-white px-2 py-1" style={{ backgroundColor: riskBadgeColor(skorDaftarLabel) }}>
                                    {skorDaftarLabel} ({data.skor_kebarangkalian_sebelum || "-"} × {data.skor_impak_sebelum || "-"})
                                </Badge>
                            </div>
                            <ChevronRight size={14} className="text-muted-foreground mt-3" />
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground mb-1">Terkini</p>
                                <Badge className="border-transparent text-white px-2 py-1" style={{ backgroundColor: riskColorTerkini }}>
                                    {tahapRisikoTerkini} ({data.skor_kebarangkalian_terkini || "-"} × {data.skor_impak_terkini || "-"})
                                </Badge>
                            </div>
                            <div className="mt-3">
                                <Badge variant={statusBadgeVariant(data.status_pemantauan_terkini)}>
                                    {data.status_pemantauan_terkini || "-"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Pengenalpastian */}
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pengenalpastian</span>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                            <div>
                                <p className="text-[11px] text-muted-foreground">Syarikat</p>
                                <p className="text-sm font-medium text-foreground">{data.nama_syarikat || "-"}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground">Kategori</p>
                                <p className="text-sm font-medium text-foreground">{data.kategori_risiko || "-"}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground">Tahun Asal</p>
                                <p className="text-sm font-medium text-foreground">{data.tahun_asal || data.tahun || "-"} ({getSeparuhTahunLabel(data.separuh_tahun_asal || data.separuh_tahun)})</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground">Status</p>
                                <Badge variant={statusBadgeVariant(data.status_pemantauan_terkini)} className="mt-0.5 text-[10px]">{data.status_pemantauan_terkini || "-"}</Badge>
                            </div>
                        </div>
                    </div>

                    {/* Pemantauan */}
                    {data.tahun_pemantauan && (
                        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pemantauan</span>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                                <div>
                                    <p className="text-[11px] text-muted-foreground">Tahun Sesi</p>
                                    <p className="text-sm font-medium text-foreground">{data.tahun_pemantauan}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-muted-foreground">Separuh Tahun</p>
                                    <p className="text-sm font-medium text-foreground">{getSeparuhTahunLabel(data.separuh_tahun_pemantauan)}</p>
                                </div>
                            </div>
                            {data.catatan && (
                                <div className="mt-2">
                                    <p className="text-[11px] text-muted-foreground">Catatan</p>
                                    <p className="text-sm font-medium text-foreground">{data.catatan}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pelan Tindakan */}
                    {Array.isArray(data.pelan_tindakan_pemantauan) && data.pelan_tindakan_pemantauan.filter(Boolean).length > 0 && (
                        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pelan Tindakan</span>
                            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-foreground">
                                {data.pelan_tindakan_pemantauan.filter(Boolean).map((plan, idx) => (
                                    <li key={idx}>{plan}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

// =======================================================
// Komponen Utama
// =======================================================
function PemantauanRisiko() {
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [syarikatFilter, setSyarikatFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("");
    const [riskLevelFilter, setRiskLevelFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [syarikatList, setSyarikatList] = useState([]);
    const [kategoriList, setKategoriList] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRiskForEdit, setSelectedRiskForEdit] = useState(null);

    const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
    const [selectedFilterTahun, setSelectedFilterTahun] = useState("");
    const [selectedFilterSeparuh, setSelectedFilterSeparuh] = useState("");

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/pemantauan-risiko");
            const rawData = res.data;

            const uniqueKategori = [...new Set(rawData.map(d => d.kategori_risiko).filter(k => k))].sort();
            setKategoriList(uniqueKategori);

            const processedData = rawData.map(d => {
                const { label: skorDaftarLabel, color: skorDaftarColor } = getRiskData(
                    parseInt(d.skor_kebarangkalian_sebelum) || 0,
                    parseInt(d.skor_impak_sebelum) || 0
                );
                const { label: tahapRisikoTerkini, color: riskColorTerkini } = getRiskData(
                    parseInt(d.skor_kebarangkalian_terkini) || 0,
                    parseInt(d.skor_impak_terkini) || 0
                );

                return {
                    ...d,
                    id: d.id,
                    risiko_id: d.id,
                    tahun_asal: d.tahun,
                    separuh_tahun_asal: d.separuh_tahun,
                    skor_kebarangkalian_sebelum: d.skor_kebarangkalian_sebelum,
                    skor_impak_sebelum: d.skor_impak_sebelum,
                    tahap_risiko_daftar: skorDaftarLabel,
                    risk_color_daftar: skorDaftarColor,
                    tahun_pemantauan: d.tahun_pemantauan,
                    separuh_tahun_pemantauan: d.separuh_tahun_pemantauan,
                    pelan_tindakan_pemantauan: Array.isArray(d.pelan_tindakan_terkini)
                        ? d.pelan_tindakan_terkini.filter(p => p)
                        : [],
                    status_pemantauan_terkini: d.status_pemantauan_terkini || "",
                    catatan: d.catatan,
                    skor_kebarangkalian_terkini: d.skor_kebarangkalian_terkini,
                    skor_impak_terkini: d.skor_impak_terkini,
                    tahap_risiko: tahapRisikoTerkini,
                    risk_color: riskColorTerkini,
                };
            });

            setData(processedData);
        } catch (err) {
            console.error("❌ Ralat memuat data pemantauan risiko:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleApplyDateFilter = (tahun, separuh) => {
        setSelectedFilterTahun(tahun);
        setSelectedFilterSeparuh(separuh);
        setIsDateFilterModalOpen(false);
    };

    const fetchSyarikatList = useCallback(async () => {
        try {
            const res = await api.get("/syarikat");
            if (Array.isArray(res.data)) {
                setSyarikatList(res.data);
            }
        } catch (err) {
            console.error("❌ Ralat memuat senarai syarikat:", err);
        }
    }, []);

    const handleCloseModal = () => { setIsModalOpen(false); setSelectedRiskForEdit(null); fetchData(); };

    const handleEdit = async (risikoSenarai) => {
        try {
            const res = await api.get(`/rawatan/${risikoSenarai.risiko_id}`);
            const fullRiskData = res.data;

            const dataUntukModal = {
                ...risikoSenarai,
                ...fullRiskData,
                punca_risiko_data: Array.isArray(fullRiskData.punca) ? fullRiskData.punca : [],
                kesan_risiko_data: Array.isArray(fullRiskData.kesan) ? fullRiskData.kesan : [],
                skor_kebarangkalian_sebelum: fullRiskData.skor_kebarangkalian,
                skor_impak_sebelum: fullRiskData.skor_impak,
            };

            setSelectedRiskForEdit(dataUntukModal);
            setIsModalOpen(true);
        } catch (err) {
            console.error(`Ralat memuat data risiko lengkap ${risikoSenarai.risiko_id}:`, err);
        }
    };

    const handleRefreshData = useCallback(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        fetchSyarikatList();
        fetchData();
    }, [fetchData, fetchSyarikatList]);

    const filteredData = data.filter(d => {
        const searchLower = searchTerm.toLowerCase();
        const matchSearch = !searchTerm ||
            (d.no_rujukan && d.no_rujukan.toLowerCase().includes(searchLower)) ||
            (d.risiko && d.risiko.toLowerCase().includes(searchLower)) ||
            (d.nama_syarikat && d.nama_syarikat.toLowerCase().includes(searchLower));

        const matchSyarikat = !syarikatFilter || d.nama_syarikat === syarikatFilter;

        const isFilteringByDate = selectedFilterTahun || selectedFilterSeparuh;
        let matchTahunSeparuh = true;
        if (isFilteringByDate) {
            const filterTahun = d.tahun_asal || d.tahun;
            const filterSeparuh = d.separuh_tahun_asal || d.separuh_tahun;
            const tahunMatch = !selectedFilterTahun || String(filterTahun) === selectedFilterTahun;
            const separuhMatch = !selectedFilterSeparuh || String(filterSeparuh) === selectedFilterSeparuh;
            matchTahunSeparuh = tahunMatch && separuhMatch;
        }

        const matchKategori = !kategoriFilter || d.kategori_risiko === kategoriFilter;
        const matchStatus = !statusFilter || d.status_pemantauan_terkini === statusFilter;

        const currentRiskLevel = d.tahap_risiko === "Tiada Data" || !d.tahap_risiko
            ? d.tahap_risiko_daftar
            : d.tahap_risiko;
        const matchRiskLevel = !riskLevelFilter || currentRiskLevel === riskLevelFilter;

        return matchSearch && matchSyarikat && matchTahunSeparuh && matchKategori && matchStatus && matchRiskLevel;
    });

    const totalRisiko = filteredData.length;
    const statusCounts = filteredData.reduce((acc, d) => {
        const status = d.status_pemantauan_terkini || "";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    const dateFilterButtonText = selectedFilterTahun || selectedFilterSeparuh
        ? `Asal: ${selectedFilterTahun || 'Semua Tahun'} (${getSeparuhTahunLabel(parseInt(selectedFilterSeparuh)) || 'Semua Separuh'})`
        : "Tahun & Separuh Tahun";
    const isDateFilterActive = Boolean(selectedFilterTahun || selectedFilterSeparuh);

    const activeFilterCount = [syarikatFilter, kategoriFilter, riskLevelFilter, statusFilter, isDateFilterActive ? "1" : ""].filter(Boolean).length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Pemantauan Risiko"
                description="Pantau status dan tahap risiko terkini bagi risiko yang telah dirawat."
            />

            {/* Ringkasan ringkas — satu baris nipis */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">Jumlah Risiko: <span className="font-bold text-foreground">{totalRisiko}</span></span>
                <span className="text-muted-foreground">Tertunggak: <span className="font-bold text-red-600">{statusCounts["Tertunggak"] || 0}</span></span>
                <span className="text-muted-foreground">Dalam Pemantauan: <span className="font-bold text-amber-600">{(statusCounts["Pemantauan"] || 0) + (statusCounts["Sedang Dilaksanakan"] || 0)}</span></span>
                <span className="text-muted-foreground">Selesai / Tutup: <span className="font-bold text-emerald-600">{(statusCounts["Selesai"] || 0) + (statusCounts["Tutup"] || 0)}</span></span>
            </div>

            {/* Penapis */}
            <Card>
                <div className="flex flex-wrap items-center gap-3 p-4">
                    <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Cari No Rujukan / Risiko / Syarikat..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Select className="w-full sm:w-44" value={syarikatFilter} onChange={e => setSyarikatFilter(e.target.value)}>
                        <option value="">-- Semua Syarikat --</option>
                        {syarikatList.map(s => (
                            <option key={s.syarikat_id} value={s.nama_syarikat}>{s.nama_syarikat}</option>
                        ))}
                    </Select>

                    <Button
                        variant={isDateFilterActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsDateFilterModalOpen(true)}
                        className="gap-1.5"
                    >
                        <Filter size={14} />
                        {dateFilterButtonText}
                    </Button>

                    <Select className="w-full sm:w-48" value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value)}>
                        <option value="">-- Semua Kategori Risiko --</option>
                        {kategoriList.map(kategori => (
                            <option key={kategori} value={kategori}>{kategori}</option>
                        ))}
                    </Select>

                    <Select className="w-full sm:w-44" value={riskLevelFilter} onChange={e => setRiskLevelFilter(e.target.value)}>
                        <option value="">-- Semua Tahap Risiko --</option>
                        <option value="Sangat Tinggi">Sangat Tinggi</option>
                        <option value="Tinggi">Tinggi</option>
                        <option value="Sederhana">Sederhana</option>
                        <option value="Rendah">Rendah</option>
                        <option value="Tiada Data">Tiada Data</option>
                    </Select>

                    <Select className="w-full sm:w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">-- Semua Status --</option>
                        <option value="Buka">Buka</option>
                        <option value="Sedang Dilaksanakan">Sedang Dilaksanakan</option>
                        <option value="Pemantauan">Pemantauan</option>
                        <option value="Selesai">Selesai</option>
                        <option value="Tutup">Tutup</option>
                    </Select>

                    {activeFilterCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSyarikatFilter("");
                                setKategoriFilter("");
                                setRiskLevelFilter("");
                                setStatusFilter("");
                                setSelectedFilterTahun("");
                                setSelectedFilterSeparuh("");
                                setSearchTerm("");
                            }}
                            className="text-destructive hover:text-destructive"
                        >
                            Set Semula ({activeFilterCount})
                        </Button>
                    )}
                </div>
            </Card>

            {/* Senarai Risiko — Card-based */}
            <div className="space-y-3">
                {loading ? (
                    <Card className="flex items-center justify-center py-16">
                        <LoadingSpinner text="Memuatkan data pemantauan..." size="sm" />
                    </Card>
                ) : filteredData.length > 0 ? (
                    filteredData.map((d, i) => (
                        <RiskCard key={d.id} item={d} index={i} onEdit={handleEdit} />
                    ))
                ) : (
                    <Card className="flex items-center justify-center py-16">
                        <EmptyState icon={Activity} title="Tiada data dijumpai" description="Tiada rekod pemantauan yang sepadan dengan penapis anda." />
                    </Card>
                )}
            </div>

            {/* Modal Edit Pemantauan */}
            {isModalOpen && selectedRiskForEdit && (
                <EditPemantauan
                    isOpen={isModalOpen}
                    risk={selectedRiskForEdit}
                    onClose={handleCloseModal}
                    onSave={handleRefreshData}
                />
            )}

            {/* Modal Filter Tarikh */}
            {isDateFilterModalOpen && (
                <DateFilterModal
                    isOpen={isDateFilterModalOpen}
                    onClose={() => setIsDateFilterModalOpen(false)}
                    allData={data}
                    currentTahun={selectedFilterTahun}
                    currentSeparuh={selectedFilterSeparuh}
                    onApplyFilter={handleApplyDateFilter}
                />
            )}
        </div>
    );
}

export default PemantauanRisiko;
