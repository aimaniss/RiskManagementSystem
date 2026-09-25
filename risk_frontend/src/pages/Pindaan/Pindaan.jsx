import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../../api/api";
import { FilePenLine, ShieldAlert, ShieldCheck, Archive, Eye } from "lucide-react";

import PilihRisikoPindaan from "./PilihRisikoPindaan";
import PanelKelulusan from "@/components/risiko/PanelKelulusan";

import Toast from "@/components/ui/toast";
import LoadingSpinner from "@/components/ui/loading-spinner";
import AlertBanner from "@/components/ui/alert-banner";
import EmptyState from "@/components/ui/empty-state";
import PageHeader from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

import { hasKebenaran } from "../../utils/auth";
import { formatDate } from "../../utils/formatters";
import { cn } from "@/lib/utils";
import { stateLatar, useRisikoBerubah } from "@/hooks/useBukaRisiko";

/**
 * Halaman Pindaan (pindaan:lihat): permohonan menunggu kelulusan & sejarah
 * keputusan. Mohon pindaan memilih risiko lalu membuka borang di tab Pindaan
 * halaman butiran; semakan & kelulusan melalui PanelKelulusan.
 */
function PindaanRisiko() {
  const [amendments, setAmendments] = useState([]);
  const [loadingAmendments, setLoadingAmendments] = useState(true);
  const [amendmentsError, setAmendmentsError] = useState(null);
  const [syarikatList, setSyarikatList] = useState([]);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState("Menunggu Kelulusan");
  const [filterSyarikat, setFilterSyarikat] = useState("Semua");
  const [amendmentStats, setAmendmentStats] = useState({ menunggu: 0, diluluskan: 0, ditolak: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [pilihRisikoBuka, setPilihRisikoBuka] = useState(false);
  const [dipilih, setDipilih] = useState(null);

  const canViewPage = hasKebenaran("pindaan:lihat");

  const fetchAmendmentStats = useCallback(async () => {
    setLoadingStats(true);
    try {
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
  }, []);

  const fetchAmendments = useCallback(async () => {
    setLoadingAmendments(true);
    setAmendmentsError(null);
    try {
      const params = { status: filterStatus };
      if (filterSyarikat !== "Semua") params.syarikat_id = filterSyarikat;
      const response = await api.get("/pindaan", { params });
      setAmendments(response.data || []);
    } catch (err) {
      console.error("Gagal memuatkan senarai pindaan:", err);
      setAmendmentsError("Gagal memuatkan data. Sila cuba lagi.");
      setAmendments([]);
    } finally {
      setLoadingAmendments(false);
    }
  }, [filterStatus, filterSyarikat]);

  useEffect(() => {
    if (!canViewPage) return;
    api
      .get("/syarikat")
      .then((res) => setSyarikatList(res.data || []))
      .catch((err) => console.error("Gagal fetch syarikat:", err));
    fetchAmendmentStats();
  }, [canViewPage, fetchAmendmentStats]);

  useEffect(() => {
    if (canViewPage) fetchAmendments();
  }, [canViewPage, fetchAmendments]);

  // Pindaan dibuat dalam modal butiran risiko di atas halaman ini
  useRisikoBerubah(() => {
    fetchAmendments();
    fetchAmendmentStats();
  });

  const selepasProses = (mesej) => {
    setDipilih(null);
    setToast({ variant: "success", title: "Berjaya", message: mesej });
    fetchAmendments();
    fetchAmendmentStats();
  };

  if (!canViewPage)
    return (
      <div>
        <PageHeader title="Pindaan" description="Permohonan pindaan rekod risiko" />
        <AlertBanner
          variant="warning"
          title="Akses Ditolak"
          description="Mohon pindaan dari tab Pindaan pada halaman risiko berkenaan."
        />
      </div>
    );

  return (
    <div>
      <PageHeader
        title="Pindaan"
        description="Permohonan pindaan skor risiko: semak, luluskan atau tolak, dan lihat sejarah keputusan."
        actions={
          <Button onClick={() => setPilihRisikoBuka(true)}>
            <FilePenLine />
            Mohon Pindaan
          </Button>
        }
      />

      <StatsCardSection stats={amendmentStats} loading={loadingStats} onPilih={setFilterStatus} />

      <AmendmentsListSection
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterSyarikat={filterSyarikat}
        setFilterSyarikat={setFilterSyarikat}
        syarikatList={syarikatList}
        stats={amendmentStats}
        loading={loadingAmendments}
        error={amendmentsError}
        amendments={amendments}
        handleViewDetails={(p) => setDipilih(p)}
      />

      <PilihRisikoPindaan buka={pilihRisikoBuka} onTutup={() => setPilihRisikoBuka(false)} />
      <PanelKelulusan
        item={dipilih && { jenis: "pindaan", data: dipilih }}
        onTutup={() => setDipilih(null)}
        onSelesai={selepasProses}
      />

      {toast && (
        <div className="fixed top-[64px] right-4 z-50 max-w-sm">
          <Toast
            variant={toast.variant}
            title={toast.title}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}

// --- Komponen Kad Statistik ---
function StatsCardSection({ stats, loading, onPilih }) {
  const cardData = [
    {
      title: "Menunggu Kelulusan",
      status: "Menunggu Kelulusan",
      value: stats.menunggu,
      icon: ShieldAlert,
      chipClass: "bg-warning/10 text-warning",
    },
    {
      title: "Diluluskan",
      status: "Diluluskan",
      value: stats.diluluskan,
      icon: ShieldCheck,
      chipClass: "bg-success/10 text-success",
    },
    {
      title: "Ditolak",
      status: "Ditolak",
      value: stats.ditolak,
      icon: Archive,
      chipClass: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
      {cardData.map((card) => (
        <Card
          key={card.title}
          className={cn("rounded-xl", onPilih && "cursor-pointer transition-colors hover:border-primary/50")}
          onClick={onPilih ? () => onPilih(card.status) : undefined}
          role={onPilih ? "button" : undefined}
          tabIndex={onPilih ? 0 : undefined}
          onKeyDown={onPilih ? (e) => e.key === "Enter" && onPilih(card.status) : undefined}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.chipClass}`}>
              <card.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">{card.title}</p>
              <p className="text-xl font-bold tracking-tight mt-0.5">
                {loading ? "..." : card.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


// --- Komponen Senarai Pindaan ---
const STATUS_SEJARAH = ["Sejarah", "Diluluskan", "Ditolak"];

const varianStatus = (status) =>
  ({ Diluluskan: "success", Ditolak: "destructive", "Menunggu Kelulusan": "warning" })[status] ||
  "outline";

function AmendmentsListSection({
  filterStatus,
  setFilterStatus,
  filterSyarikat,
  setFilterSyarikat,
  syarikatList,
  stats,
  loading,
  error,
  amendments,
  handleViewDetails,
}) {
  const lokasi = useLocation();
  const tab = STATUS_SEJARAH.includes(filterStatus) ? "sejarah" : "menunggu";
  const columnCount = tab === "sejarah" ? 7 : 6;
  const tabs = [
    { id: "menunggu", label: "Menunggu Kelulusan", kiraan: stats.menunggu, status: "Menunggu Kelulusan" },
    { id: "sejarah", label: "Sejarah", kiraan: stats.diluluskan + stats.ditolak, status: "Sejarah" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b">
        <div className="flex gap-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setFilterStatus(t.status)}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span className="rounded-full bg-muted px-1.5 text-[11px] text-foreground">{t.kiraan}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {tab === "sejarah" && (
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 w-[170px]"
              aria-label="Tapis mengikut keputusan"
            >
              <option value="Sejarah">Semua keputusan</option>
              <option value="Diluluskan">Diluluskan</option>
              <option value="Ditolak">Ditolak</option>
            </Select>
          )}
          <Select
            value={filterSyarikat}
            onChange={(e) => setFilterSyarikat(e.target.value)}
            className="h-9 w-[210px]"
            aria-label="Tapis mengikut syarikat"
          >
            <option value="Semua">Semua Syarikat</option>
            {syarikatList.map((subs) => (
              <option key={subs.syarikat_id} value={subs.syarikat_id}>
                {subs.nama_syarikat}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Pindaan</TableHead>
              <TableHead>Risiko</TableHead>
              <TableHead>Syarikat</TableHead>
              <TableHead>Pemohon</TableHead>
              <TableHead>Status</TableHead>
              {tab === "sejarah" && <TableHead>Diproses</TableHead>}
              <TableHead className="text-center">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-32">
                  <LoadingSpinner text="Memuatkan data..." size="sm" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-32">
                  <AlertBanner variant="error" title="Ralat" description={error} />
                </TableCell>
              </TableRow>
            ) : amendments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-32">
                  <EmptyState
                    icon={FilePenLine}
                    title={tab === "menunggu" ? "Tiada permohonan menunggu" : "Tiada sejarah pindaan"}
                    description={
                      tab === "menunggu"
                        ? "Semua permohonan telah diproses. Lihat tab Sejarah untuk keputusan lepas."
                        : "Tiada permohonan pindaan yang telah diproses."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              amendments.map((amend) => (
                <TableRow key={amend.pindaan_id}>
                  <TableCell className="font-mono text-sm font-semibold whitespace-nowrap">
                    {amend.no_rujukan_pindaan || `#${amend.pindaan_id}`}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <Link
                      to={`/risiko/${amend.risiko_id}?tab=pindaan`}
                      state={stateLatar(lokasi)}
                      className="font-mono text-xs font-semibold text-primary hover:underline"
                    >
                      {amend.no_rujukan}
                    </Link>
                    <div className="truncate text-sm" title={amend.risiko}>
                      {amend.risiko || "-"}
                    </div>
                  </TableCell>
                  <TableCell>{amend.nama_syarikat || "-"}</TableCell>
                  <TableCell>
                    <div>{amend.nama_pemohon || "-"}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(amend.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={varianStatus(amend.status_permohonan)}>{amend.status_permohonan}</Badge>
                  </TableCell>
                  {tab === "sejarah" && (
                    <TableCell>
                      <div>{amend.nama_pelulus || "-"}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {amend.tarikh_diproses ? formatDate(amend.tarikh_diproses) : "-"}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <Button
                      onClick={() => handleViewDetails(amend)}
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      <Eye size={13} /> Lihat
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default PindaanRisiko;
