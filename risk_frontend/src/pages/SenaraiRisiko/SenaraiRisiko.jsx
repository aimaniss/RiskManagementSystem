import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Trash2,
  Search,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  ListChecks,
} from "lucide-react";
import { getAuthUser } from "../../utils/auth";
import { getRiskAbbreviation, getRiskColor } from "../../constants/riskMatrix";
import { formatSeparuhTahun } from "../../utils/formatters";
import { useRisks } from "../../hooks/useRisks";
import { useBukaRisiko, useRisikoBerubah } from "@/hooks/useBukaRisiko";
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
import { cn } from "@/lib/utils";

const TAHAP = ["Rendah", "Sederhana", "Tinggi", "Sangat Tinggi"];
const SAIZ_HALAMAN = [10, 25, 50];

const tahapSemasa = (r) =>
  r.tahap_risiko_semasa && r.tahap_risiko_semasa !== "Tiada Data" ? r.tahap_risiko_semasa : r.tahap_risiko;

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
  const [tahapFilter, setTahapFilter] = useState("");
  const [sortKey, setSortKey] = useState("no_rujukan");
  const [sortDir, setSortDir] = useState("asc");
  const [had, setHad] = useState(SAIZ_HALAMAN[0]);
  // Halaman diikat pada tapisan & susunan semasa: bila berubah, kembali ke halaman 1
  const kunciPaparan = JSON.stringify([search, syarikatFilter, tahunFilter, separuhFilter, kategoriFilter, statusFilter, tahapFilter, sortKey, sortDir, had]);
  const [paging, setPaging] = useState({ kunci: kunciPaparan, halaman: 1 });

  const bukaRisiko = useBukaRisiko();
  useRisikoBerubah(refetch);
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);

  const authUser = getAuthUser();
  const userRole = authUser?.role || "";
  const userSyarikatId = authUser?.syarikatId || "";
  const isRestricted = ["STAFF", "KETUA SUBSIDIARI"].includes(userRole);

  // Kiraan tahap dikira sebelum tapisan tahap supaya kad lain tidak jadi sifar bila satu dipilih
  const risikoAsas = useMemo(() => risks.filter(r => {
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

  const filteredRisks = useMemo(
    () => (tahapFilter ? risikoAsas.filter((r) => tahapSemasa(r) === tahapFilter) : risikoAsas),
    [risikoAsas, tahapFilter]
  );

  const sortedRisks = useMemo(() => sortRisks(filteredRisks, sortKey, sortDir), [filteredRisks, sortKey, sortDir]);

  const bilHalaman = Math.max(1, Math.ceil(sortedRisks.length / had));
  const halaman = paging.kunci === kunciPaparan ? Math.min(paging.halaman, bilHalaman) : 1;
  const tukarHalaman = (h) => setPaging({ kunci: kunciPaparan, halaman: h });
  const mulaIndeks = (halaman - 1) * had;
  const risikoHalaman = sortedRisks.slice(mulaIndeks, mulaIndeks + had);

  const stats = useMemo(() => {
    const total = risks.length;
    const displayed = filteredRisks.length;
    const byLevel = { "Rendah": 0, "Sederhana": 0, "Tinggi": 0, "Sangat Tinggi": 0 };
    risikoAsas.forEach(r => {
      const level = tahapSemasa(r);
      if (level && byLevel[level] !== undefined) byLevel[level]++;
    });
    return { total, displayed, byLevel };
  }, [risks, risikoAsas, filteredRisks]);

  const handleDelete = id => {
    setConfirmAction(() => async () => {
      setConfirmAction(null);
      try { await api.delete(`/risiko/${id}`); refetch(); }
      catch (err) { console.error(err); setToast({ variant: "error", title: "Ralat", message: "Gagal padam risiko." }); }
    });
  };

  // Butiran dibuka sebagai modal di atas senarai (URL /risiko/:id kekal boleh dipautkan)
  const handleViewRisk = (risk) => bukaRisiko(risk.id);

  const clearFilters = () => {
    setSearch("");
    setSyarikatFilter("");
    setTahunFilter("");
    setSeparuhFilter("");
    setKategoriFilter("");
    setStatusFilter("");
    setTahapFilter("");
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const hasFilters =
    !!search || [syarikatFilter, tahunFilter, separuhFilter, kategoriFilter, statusFilter, tahapFilter].some(Boolean);
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

      {/* Ringkasan: jumlah + kiraan ikut tahap (klik untuk tapis) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="col-span-2 flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm sm:col-span-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ListChecks size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {hasFilters ? "Dipaparkan" : "Jumlah Risiko"}
            </p>
            <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
              {loading ? "..." : stats.displayed}
              {!loading && stats.displayed !== stats.total && (
                <span className="text-sm font-medium text-muted-foreground"> / {stats.total}</span>
              )}
            </p>
          </div>
        </div>
        {TAHAP.map((tahap) => {
          const dipilih = tahapFilter === tahap;
          return (
            <button
              key={tahap}
              type="button"
              aria-pressed={dipilih}
              title={dipilih ? "Klik untuk buang tapisan tahap" : `Tapis risiko ${tahap}`}
              onClick={() => setTahapFilter(dipilih ? "" : tahap)}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50",
                dipilih && "border-primary ring-1 ring-primary"
              )}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: getRiskColor(tahap) }}
              >
                {getRiskAbbreviation(tahap)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tahap}
                </span>
                <span className="mt-0.5 block text-xl font-bold tracking-tight text-foreground">
                  {loading ? "..." : stats.byLevel[tahap]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Tapisan: satu bar alat, sentiasa kelihatan */}
      <div className="grid grid-cols-2 items-center gap-2 rounded-xl border bg-card p-3 shadow-sm sm:flex sm:flex-wrap">
        <div className="relative col-span-2 min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Carian"
            className="h-9 pl-9"
            placeholder="Cari no rujukan, risiko, syarikat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {!isRestricted && (
          <Select aria-label="Syarikat" className="h-9 sm:w-48" value={syarikatFilter} onChange={e => setSyarikatFilter(e.target.value)}>
            <option value="">Semua syarikat</option>
            {syarikatList.map(s => <option key={s.syarikat_id} value={s.syarikat_id}>{s.nama_syarikat}</option>)}
          </Select>
        )}
        <Select aria-label="Tahun" className="h-9 sm:w-36" value={tahunFilter} onChange={e => setTahunFilter(e.target.value)}>
          <option value="">Semua tahun</option>
          {uniqueYears.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select aria-label="Separuh tahun" className="h-9 sm:w-48" value={separuhFilter} onChange={e => setSeparuhFilter(e.target.value)}>
          <option value="">Semua separuh tahun</option>
          <option value="1">Separuh Pertama</option>
          <option value="2">Separuh Kedua</option>
        </Select>
        <Select aria-label="Kategori" className="h-9 sm:w-44" value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value)}>
          <option value="">Semua kategori</option>
          {uniqueKategori.map(k => <option key={k} value={k}>{k}</option>)}
        </Select>
        <Select aria-label="Status" className="h-9 sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Semua status</option>
          {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground hover:text-foreground" onClick={clearFilters}>
            <X size={14} /> Set semula
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Memuat data risiko..." />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">Bil</TableHead>
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
                  <TableCell colSpan={11} className="h-32">
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
                risikoHalaman.map((risk, i) => (
                  <TableRow key={risk.id} onClick={() => handleViewRisk(risk)} className="cursor-pointer">
                    <TableCell className="text-center text-muted-foreground tabular-nums">{mulaIndeks + i + 1}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold whitespace-nowrap">{risk.no_rujukan || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={risk.risiko}>{risk.risiko || "-"}</TableCell>
                    <TableCell>{risk.singkatan_syarikat || risk.syarikat || "-"}</TableCell>
                    <TableCell>{risk.kategori || "-"}</TableCell>
                    <TableCell className="text-center font-semibold">{risk.semasa_skor_kebarangkalian || risk.skor_kebarangkalian || "-"}</TableCell>
                    <TableCell className="text-center font-semibold">{risk.semasa_skor_impak || risk.skor_impak || "-"}</TableCell>
                    <TableCell><RiskLevelBadge level={tahapSemasa(risk)} /></TableCell>
                    <TableCell>
                      {(() => {
                        const latestLevel = tahapSemasa(risk);
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

          {sortedRisks.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <div className="text-muted-foreground">
                {mulaIndeks + 1}–{Math.min(mulaIndeks + had, sortedRisks.length)} daripada {sortedRisks.length} risiko
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={had}
                  onChange={(e) => setHad(Number(e.target.value))}
                  className="h-8 w-[140px]"
                  aria-label="Rekod setiap halaman"
                >
                  {SAIZ_HALAMAN.map((n) => (
                    <option key={n} value={n}>
                      {n} / halaman
                    </option>
                  ))}
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => tukarHalaman(halaman - 1)}
                  disabled={halaman <= 1}
                  aria-label="Halaman sebelum"
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="whitespace-nowrap text-muted-foreground">
                  {halaman} / {bilHalaman}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => tukarHalaman(halaman + 1)}
                  disabled={halaman >= bilHalaman}
                  aria-label="Halaman seterusnya"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
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
