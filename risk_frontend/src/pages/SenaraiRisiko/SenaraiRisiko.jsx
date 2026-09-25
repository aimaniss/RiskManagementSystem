import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Search, Eye, X, Filter, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { getAuthUser } from "../../utils/auth";
import { getRiskAbbreviation, getRiskColor } from "../../constants/riskMatrix";
import { formatSeparuhTahun } from "../../utils/formatters";
import { useRisks } from "../../hooks/useRisks";
import { useSyarikats } from "../../hooks/useSyarikats";
import api from "../../api/api";
import PageHeader from "@/components/ui/page-header";
import ConfirmModal from "@/components/ui/confirm-modal";
import Toast from "@/components/ui/toast";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const RISK_LEVEL_CHIPS = [
  { key: "Rendah", color: "#22c55e" },
  { key: "Sederhana", color: "#eab308" },
  { key: "Tinggi", color: "#f97316" },
  { key: "Sangat Tinggi", color: "#ef4444" },
];

function sortRisks(risks, sortKey, sortDir) {
  if (!sortKey) return risks;
  return [...risks].sort((a, b) => {
    let va = a[sortKey] ?? "";
    let vb = b[sortKey] ?? "";
    if (sortKey === "semasa_skor_kebarangkalian" || sortKey === "semasa_skor_impak" || sortKey === "skor_kebarangkalian" || sortKey === "skor_impak") {
      va = parseInt(va) || 0;
      vb = parseInt(vb) || 0;
    }
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
}

function RiskLevelBadge({ level }) {
  const abbr = getRiskAbbreviation(level);
  if (!level || !abbr) return <span>-</span>;

  return (
    <Badge className="border-none text-white" style={{ backgroundColor: getRiskColor(level) }}>
      {abbr}
    </Badge>
  );
}

function SenaraiRisiko() {
  const { risks, loading, refetch } = useRisks();
  const { syarikatList } = useSyarikats();
  const [search, setSearch] = useState("");
  const [syarikatFilter, setSyarikatFilter] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [separuhFilter, setSeparuhFilter] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState("no_rujukan");
  const [sortDir, setSortDir] = useState("asc");

  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);

  const authUser = getAuthUser();
  const userRole = authUser?.role || "";
  const userSyarikatId = authUser?.syarikatId || "";
  const isRestricted = ["STAFF", "KETUA SUBSIDIARI"].includes(userRole);

  const filteredRisks = useMemo(() => risks.filter(r => {
    const matchSearch = !search ||
      (r.no_rujukan || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.risiko || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.syarikat || "").toLowerCase().includes(search.toLowerCase());
    const matchSyarikat = isRestricted
      ? r.syarikat_id === userSyarikatId
      : !syarikatFilter || r.syarikat_id === parseInt(syarikatFilter);
    const matchTahun = !tahunFilter || r.tahun === parseInt(tahunFilter);
    const matchSeparuh = !separuhFilter || r.separuh_tahun === parseInt(separuhFilter);
    const matchKategori = !kategoriFilter || r.kategori === kategoriFilter;
    const matchStatus = !statusFilter || r.status_pemantauan === statusFilter;
    return matchSearch && matchSyarikat && matchTahun && matchSeparuh && matchKategori && matchStatus;
  }), [risks, search, syarikatFilter, tahunFilter, separuhFilter, kategoriFilter, statusFilter, isRestricted, userSyarikatId]);

  const sortedRisks = useMemo(() => sortRisks(filteredRisks, sortKey, sortDir), [filteredRisks, sortKey, sortDir]);

  const stats = useMemo(() => {
    const total = risks.length;
    const displayed = filteredRisks.length;
    const byLevel = { "Rendah": 0, "Sederhana": 0, "Tinggi": 0, "Sangat Tinggi": 0 };
    filteredRisks.forEach(r => {
      const level = r.tahap_risiko_semasa && r.tahap_risiko_semasa !== "Tiada Data" ? r.tahap_risiko_semasa : r.tahap_risiko;
      if (level && byLevel[level] !== undefined) byLevel[level]++;
    });
    return { total, displayed, byLevel };
  }, [risks, filteredRisks]);

  const handleDelete = id => {
    setConfirmAction(() => async () => {
      setConfirmAction(null);
      try { await api.delete(`/risiko/${id}`); refetch(); }
      catch (err) { console.error(err); setToast({ variant: "error", title: "Ralat", message: "Gagal padam risiko." }); }
    });
  };

  // Butiran dibuka sebagai halaman penuh (boleh dipautkan): /risiko/:id
  const handleViewRisk = (risk) => navigate(`/risiko/${risk.id}`);

  const clearFilters = () => {
    setSearch("");
    setSyarikatFilter("");
    setTahunFilter("");
    setSeparuhFilter("");
    setKategoriFilter("");
    setStatusFilter("");
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const activeFilterCount = [syarikatFilter, tahunFilter, separuhFilter, kategoriFilter, statusFilter].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0 || !!search;
  const uniqueYears = [...new Set(risks.map(r => r.tahun).filter(Boolean))].sort((a, b) => b - a);
  const uniqueKategori = [...new Set(risks.map(r => r.kategori).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set(risks.map(r => r.status_pemantauan).filter(Boolean))].sort();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Senarai Risiko"
        description="Semak dan urus semua risiko yang didaftarkan"
        actions={
          <Button asChild size="sm">
            <Link to="/DaftarRisiko">
              <Plus size={14} />
              Daftar Risiko
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 pr-9"
            placeholder="Cari no rujukan, risiko, syarikat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 ${showFilters ? "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" : "text-muted-foreground"}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={14} />
          Tapisan
          {hasFilters && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
              {activeFilterCount || 1}
            </span>
          )}
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Syarikat</Label>
            <Select value={isRestricted ? userSyarikatId : syarikatFilter} onChange={e => setSyarikatFilter(e.target.value)} disabled={isRestricted}>
              <option value="">Semua Syarikat</option>
              {syarikatList.map(s => <option key={s.syarikat_id} value={s.syarikat_id}>{s.nama_syarikat}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Tahun</Label>
            <Select value={tahunFilter} onChange={e => setTahunFilter(e.target.value)}>
              <option value="">Semua Tahun</option>
              {uniqueYears.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Term</Label>
            <Select value={separuhFilter} onChange={e => setSeparuhFilter(e.target.value)}>
              <option value="">Semua Term</option>
              <option value="1">Pertama (T1)</option>
              <option value="2">Kedua (T2)</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Kategori</Label>
            <Select value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value)}>
              <option value="">Semua Kategori</option>
              {uniqueKategori.map(k => <option key={k} value={k}>{k}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Status</Label>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="mt-auto gap-1 self-end text-xs text-muted-foreground hover:text-foreground" onClick={clearFilters}>
              <X size={12} /> Set Semula
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border bg-card px-4 py-3 min-w-[110px]">
          <p className="text-lg font-bold leading-tight text-foreground">
            {stats.displayed}
            {stats.displayed !== stats.total && (
              <span className="text-sm font-medium text-muted-foreground"> / {stats.total}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">Jumlah Ditapis</p>
        </div>
        {RISK_LEVEL_CHIPS.map(chip => (
          <div key={chip.key} className="flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chip.color }} />
            <div>
              <p className="text-lg font-bold leading-tight text-foreground">{stats.byLevel[chip.key]}</p>
              <p className="text-xs text-muted-foreground">{chip.key}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Memuat data risiko..." />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  { key: "no_rujukan", label: "No. Rujukan" },
                  { key: "risiko", label: "Penerangan Risiko" },
                  { key: "syarikat", label: "Syarikat" },
                  { key: "kategori", label: "Kategori" },
                  { key: "semasa_skor_kebarangkalian", label: "K" },
                  { key: "semasa_skor_impak", label: "I" },
                  { key: "tahap_risiko", label: "Tahap Risiko" },
                  { key: "status_risiko", label: "Status" },
                  { key: "tahun", label: "Sesi" },
                ].map(col => (
                  <TableHead key={col.key} onClick={() => handleSort(col.key)} className="cursor-pointer select-none">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === "asc" ? <ChevronUp size={13} className="inline ml-1" /> : <ChevronDown size={13} className="inline ml-1" />
                    )}
                  </TableHead>
                ))}
                <TableHead className="w-20 text-center">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRisks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32">
                    <EmptyState
                      icon={Search}
                      title="Tiada data risiko ditemui"
                      description={hasFilters ? "Tiada data sepadan dengan tapisan semasa." : "Tiada data risiko ditemui dalam sistem."}
                      actionLabel={hasFilters ? "Set Semula Tapisan" : undefined}
                      onAction={hasFilters ? clearFilters : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                sortedRisks.map((risk) => (
                  <TableRow key={risk.id} onClick={() => handleViewRisk(risk)} className="cursor-pointer">
                    <TableCell className="font-mono text-sm font-semibold whitespace-nowrap">{risk.no_rujukan || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={risk.risiko}>{risk.risiko || "-"}</TableCell>
                    <TableCell>{risk.singkatan_syarikat || risk.syarikat || "-"}</TableCell>
                    <TableCell>{risk.kategori || "-"}</TableCell>
                    <TableCell className="text-center font-semibold">{risk.semasa_skor_kebarangkalian || risk.skor_kebarangkalian || "-"}</TableCell>
                    <TableCell className="text-center font-semibold">{risk.semasa_skor_impak || risk.skor_impak || "-"}</TableCell>
                    <TableCell><RiskLevelBadge level={risk.tahap_risiko_semasa && risk.tahap_risiko_semasa !== "Tiada Data" ? risk.tahap_risiko_semasa : risk.tahap_risiko} /></TableCell>
                    <TableCell>
                      {(() => {
                        const latestLevel = risk.tahap_risiko_semasa && risk.tahap_risiko_semasa !== "Tiada Data" ? risk.tahap_risiko_semasa : risk.tahap_risiko;
                        const status = latestLevel && latestLevel !== "Rendah" && latestLevel !== "Tiada Data" ? "Ya" : "Tidak";
                        return <Badge variant={status === "Ya" ? "default" : "secondary"}>{status}</Badge>;
                      })()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {risk.tahun || "-"}{risk.separuh_tahun ? ` / ${formatSeparuhTahun(risk.separuh_tahun)}` : ""}
                    </TableCell>
                    <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => handleViewRisk(risk)}
                          title="Lihat"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(risk.id)}
                          title="Padam"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmModal
        open={confirmAction !== null}
        onOpenChange={(v) => { if (!v) setConfirmAction(null); }}
        title="Padam Risiko"
        description="Adakah anda pasti mahu padam risiko ini?"
        confirmText="Ya, Padam"
        variant="destructive"
        icon="destructive"
        onConfirm={() => { confirmAction?.(); }}
      />

      {toast && (
        <div className="fixed top-[64px] right-4 z-50 w-80">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}

export default SenaraiRisiko;
