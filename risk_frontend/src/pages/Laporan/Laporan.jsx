import { createElement, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, FileText, Search } from "lucide-react";
import ReportOptionsModal from "./ReportOptionsModal";
import LogPreviewModal from "./LogPreviewModal";
import AnalitikLaporan from "./AnalitikLaporan";

import api from "../../api/api";
import { getRiskColor } from "../../constants/riskMatrix";
import { TAHAP } from "./analitik";

import PageHeader from "@/components/ui/page-header";
import Toast from "@/components/ui/toast";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const PAPARAN = [
  { id: "analitik", label: "Analitik", ikon: BarChart3 },
  { id: "pdf", label: "Jana Laporan PDF", ikon: FileText },
];

const WARNA_TEKS_TAHAP = { S: "#422006" };

function LencanaSkor({ kod }) {
  const tahap = TAHAP.find((t) => t.kod === kod);
  if (!tahap) {
    return <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">Belum dinilai</span>;
  }
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: getRiskColor(kod), color: WARNA_TEKS_TAHAP[kod] || "#ffffff" }}
    >
      {tahap.label} ({kod})
    </span>
  );
}

const labelSeparuh = (s) => (Number(s) === 2 ? "Jul–Dis" : "Jan–Jun");

export default function LaporanRisiko() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paparan = searchParams.get("paparan") === "pdf" ? "pdf" : "analitik";

  const [loading, setLoading] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [filters, setFilters] = useState({
    subsidiary: "all",
    tahun: "all",
    separuhTahun: "all",
    search: "",
  });
  const [risks, setRisks] = useState([]);
  const [toast, setToast] = useState(null);

  const [isLogOptionsOpen, setIsLogOptionsOpen] = useState(false);
  const [isLogPreviewOpen, setIsLogPreviewOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);

  useEffect(() => {
    api
      .get("/syarikat")
      .then((res) => setSubsidiaries(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSubsidiaries([]));
  }, []);

  useEffect(() => {
    if (paparan !== "pdf") return;
    let batal = false;
    setLoading(true);
    const params = {};
    if (filters.subsidiary !== "all") params.subsidiary = filters.subsidiary;
    if (filters.tahun !== "all") params.tahun = filters.tahun;
    if (filters.separuhTahun !== "all") params.separuhTahun = filters.separuhTahun;
    api
      .get("/laporan", { params })
      .then((res) => !batal && setRisks(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        if (batal) return;
        setRisks([]);
        setToast({
          variant: "error",
          title: "Ralat",
          message: err.response?.data?.error || "Gagal memuatkan senarai risiko.",
        });
      })
      .finally(() => !batal && setLoading(false));
    return () => {
      batal = true;
    };
  }, [paparan, filters.subsidiary, filters.tahun, filters.separuhTahun]);

  const risikoDitapis = useMemo(() => {
    const cari = filters.search.trim().toLowerCase();
    if (!cari) return risks;
    return risks.filter(
      (r) =>
        (r.risiko || "").toLowerCase().includes(cari) || (r.no_rujukan || "").toLowerCase().includes(cari)
    );
  }, [risks, filters.search]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((s) => ({ ...s, [name]: value }));
  }

  async function handleOpenReportModal(riskHeader) {
    setLoadingModal(true);
    try {
      const res = await api.get(`/laporan/${riskHeader.id}/data-penuh`);
      setSelectedRisk(res.data);
      setIsLogOptionsOpen(true);
    } catch (err) {
      setToast({
        variant: "error",
        title: "Ralat",
        message: err.response?.data?.error || "Gagal memuatkan data penuh risiko.",
      });
    } finally {
      setLoadingModal(false);
    }
  }

  function handleShowLogPreview(risk, range) {
    setSelectedRisk(risk);
    setSelectedRange(range);
    setIsLogOptionsOpen(false);
    setIsLogPreviewOpen(true);
  }

  function handleCloseModals() {
    setIsLogOptionsOpen(false);
    setIsLogPreviewOpen(false);
    setSelectedRisk(null);
    setSelectedRange(null);
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = [0, 1, 2, 3, 4].map((n) => currentYear - n);

  return (
    <div>
      <PageHeader title="Laporan" description="Analitik perbandingan risiko dan penjanaan laporan PDF" />

      <div role="tablist" aria-label="Paparan laporan" className="mb-5 inline-flex rounded-lg border bg-card p-1">
        {PAPARAN.map(({ id, label, ikon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={paparan === id}
            onClick={() => setSearchParams(id === "analitik" ? {} : { paparan: id }, { replace: true })}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              paparan === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {createElement(ikon, { className: "h-4 w-4" })}
            {label}
          </button>
        ))}
      </div>

      {paparan === "analitik" ? (
        <AnalitikLaporan />
      ) : (
        <>
          {loadingModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/70">
              <LoadingSpinner text="Memuatkan Data Laporan..." />
            </div>
          )}

          <Card className="mb-4 rounded-xl">
            <CardContent className="p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_10rem_12rem_1.3fr]">
                <div className="space-y-1.5">
                  <Label htmlFor="filter-syarikat">Syarikat</Label>
                  <Select id="filter-syarikat" name="subsidiary" value={filters.subsidiary} onChange={handleFilterChange}>
                    <option value="all">Semua Syarikat</option>
                    {subsidiaries.map((s) => (
                      <option key={s.syarikat_id} value={s.syarikat_id}>
                        {s.nama_syarikat}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-tahun">Tahun Daftar</Label>
                  <Select id="filter-tahun" name="tahun" value={filters.tahun} onChange={handleFilterChange}>
                    <option value="all">Semua Tahun</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-separuh-tahun">Separuh Tahun Daftar</Label>
                  <Select
                    id="filter-separuh-tahun"
                    name="separuhTahun"
                    value={filters.separuhTahun}
                    onChange={handleFilterChange}
                  >
                    <option value="all">Semua</option>
                    <option value="1">Pertama (Jan–Jun)</option>
                    <option value="2">Kedua (Jul–Dis)</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-cari">Cari</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="filter-cari"
                      type="text"
                      name="search"
                      className="pl-8"
                      placeholder="Risiko atau no. rujukan..."
                      value={filters.search}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs text-muted-foreground">
              <span>
                {loading ? "Memuatkan..." : `${risikoDitapis.length} risiko`} · hanya risiko yang telah mempunyai
                rawatan
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[960px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12 text-center">Bil</TableHead>
                    <TableHead className="w-36">No. Rujukan</TableHead>
                    <TableHead className="min-w-[260px]">Risiko</TableHead>
                    <TableHead className="w-44">Syarikat</TableHead>
                    <TableHead className="w-28">Tempoh Daftar</TableHead>
                    <TableHead className="w-36">Tahap Risiko Terkini</TableHead>
                    <TableHead className="w-36">Status Pemantauan</TableHead>
                    <TableHead className="w-32 text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32">
                        <LoadingSpinner text="Memuatkan data..." />
                      </TableCell>
                    </TableRow>
                  ) : risikoDitapis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32">
                        <EmptyState
                          icon={FileText}
                          title="Tiada data risiko ditemui"
                          description="Tiada risiko yang mempunyai rawatan bagi tapisan yang dipilih."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    risikoDitapis.map((r, index) => (
                      <TableRow key={r.id} className="align-top">
                        <TableCell className="text-center tabular-nums text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs font-semibold">
                          {r.no_rujukan}
                        </TableCell>
                        <TableCell>
                          <p className="line-clamp-2 text-sm text-foreground" title={r.risiko}>
                            {r.risiko}
                          </p>
                          {r.kategori_risiko && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{r.kategori_risiko}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{r.nama_syarikat || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {r.tahun}
                          <span className="block text-xs text-muted-foreground">{labelSeparuh(r.separuh_tahun)}</span>
                        </TableCell>
                        <TableCell>
                          <LencanaSkor kod={r.skor_risiko_terkini} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.status_pemantauan_terkini || (
                            <span className="text-muted-foreground">Belum dipantau</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            title="Jana Laporan"
                            onClick={() => handleOpenReportModal(r)}
                            disabled={loadingModal}
                          >
                            <FileText className="h-4 w-4" />
                            Jana PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {isLogOptionsOpen && selectedRisk && (
        <ReportOptionsModal
          risk={selectedRisk}
          onClose={handleCloseModals}
          logs={selectedRisk.logs || []}
          onShowPreview={handleShowLogPreview}
        />
      )}

      {isLogPreviewOpen && selectedRisk && selectedRange && (
        <LogPreviewModal risk={selectedRisk} range={selectedRange} onClose={handleCloseModals} />
      )}

      {toast && (
        <div className="fixed top-[64px] right-4 z-50 w-80">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
