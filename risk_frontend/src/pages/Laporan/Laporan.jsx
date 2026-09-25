import { useState, useEffect } from "react";
import ReportOptionsModal from "./ReportOptionsModal";
import LogPreviewModal from "./LogPreviewModal";

import api from "../../api/api";
import { getRiskColor } from "../../constants/riskMatrix";
import { formatSeparuhTahun } from "../../utils/formatters";
import { FileText } from "lucide-react";

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

export default function LaporanRisiko() {
  const [loading, setLoading] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false); 
  const [subsidiaries, setSubsidiaries] = useState([]);
  
  const [filters, setFilters] = useState({
    subsidiary: 'all',
    tahun: 'all', 
    separuhTahun: 'all',
    search: '',
  });

  const [risks, setRisks] = useState([]);
  const [toast, setToast] = useState(null);

  const [isLogOptionsOpen, setIsLogOptionsOpen] = useState(false);
  const [isLogPreviewOpen, setIsLogPreviewOpen] = useState(false);
  
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);

  const renderSeparuhTahun = (val) => {
    return formatSeparuhTahun(val);
  };

  useEffect(() => {
    fetchSubsidiaries();
  }, []);

  useEffect(() => {
    fetchRisks();
  }, [filters.subsidiary, filters.tahun, filters.separuhTahun]);

  async function fetchSubsidiaries() {
    try {
      const defaultOption = { syarikat_id: 'all', nama_syarikat: 'Semua Syarikat' };
      const res = await api.get("/syarikat"); 
      const data = Array.isArray(res.data) ? res.data : [];
      setSubsidiaries([defaultOption, ...data]);
      
    } catch (err) {
      console.error("❌ Gagal fetch syarikat:", err);
      setSubsidiaries([
        { syarikat_id: 'all', nama_syarikat: 'Semua Syarikat' },
        { syarikat_id: '1', nama_syarikat: 'UKM HOLDINGS SDN. BHD.' },
        { syarikat_id: '2', nama_syarikat: 'Syarikat B' },
      ]);
    }
  }

  async function fetchRisks() {
    setLoading(true);
    try {
      const params = {
        subsidiary: filters.subsidiary,
        tahun: filters.tahun,
        separuhTahun: filters.separuhTahun,
      };
      
      if (params.subsidiary === 'all') delete params.subsidiary;
      if (params.tahun === 'all') delete params.tahun;
      if (params.separuhTahun === 'all') delete params.separuhTahun;

      const res = await api.get("/laporan", { params });
      const data = Array.isArray(res.data) ? res.data : [];
      setRisks(data); 

    } catch (err) {
      console.error("❌ Gagal fetch risiko:", err);
      setRisks([]); 
      setToast({ variant: "error", title: "Ralat", message: err.response?.data?.error || err.message || 'Gagal memuatkan senarai risiko' });
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((s) => ({ ...s, [name]: value }));
  }

  async function handleOpenReportModal(riskHeader) {
    setLoadingModal(true); 
    try {
      const res = await api.get(`/laporan/${riskHeader.id}/data-penuh`);
      const dataPenuh = res.data; 
      
      setSelectedRisk(dataPenuh); 
      setIsLogOptionsOpen(true);
      
    } catch (err) {
      console.error("❌ Gagal fetch data penuh laporan:", err);
      setToast({ variant: "error", title: "Ralat", message: err.response?.data?.error || err.message || 'Gagal memuatkan data penuh risiko' });
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
  const yearOptions = [
    { value: 'all', label: 'Semua Tahun' },
    { value: currentYear, label: currentYear },
    { value: currentYear - 1, label: currentYear - 1 },
    { value: currentYear - 2, label: currentYear - 2 },
    { value: currentYear - 3, label: currentYear - 3 },
  ];

  return (
    <div>
      <PageHeader title="Laporan" description="Jana dan muat turun laporan risiko" />

      {loadingModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/70">
          <LoadingSpinner text="Memuatkan Data Laporan..." />
        </div>
      )}

      {/* Penapis */}
      <Card className="rounded-xl mb-5">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="filter-syarikat">Syarikat</Label>
              <Select id="filter-syarikat" name="subsidiary" value={filters.subsidiary} onChange={handleFilterChange}>
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
                {yearOptions.map(y => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-separuh-tahun">Separuh Tahun Daftar</Label>
              <Select id="filter-separuh-tahun" name="separuhTahun" value={filters.separuhTahun} onChange={handleFilterChange}>
                <option value="all">Semua</option>
                <option value="1">Pertama (Jan-Jun)</option>
                <option value="2">Kedua (Jul-Dis)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-cari">Cari</Label>
              <Input
                id="filter-cari"
                type="text"
                name="search"
                placeholder="Cari risiko atau no rujukan..."
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jadual */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Bil</TableHead>
              <TableHead>No. Rujukan</TableHead>
              <TableHead>Risiko</TableHead>
              <TableHead>Tahun & Separuh Tahun Daftar</TableHead>
              <TableHead>Syarikat</TableHead>
              <TableHead className="text-center">Tahap Risiko</TableHead>
              <TableHead>Status Pemantauan</TableHead>
              <TableHead className="text-center">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32">
                  <LoadingSpinner text="Memuatkan data..." />
                </TableCell>
              </TableRow>
            ) : risks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32">
                  <EmptyState
                    icon={FileText}
                    title="Tiada data risiko ditemui"
                    description="Tiada data risiko ditemui dengan parameter yang dipilih."
                  />
                </TableCell>
              </TableRow>
            ) : (
              risks
                  .filter((r) => 
                    (r.risiko || '').toLowerCase().includes(filters.search.toLowerCase()) ||
                    (r.no_rujukan || '').toLowerCase().includes(filters.search.toLowerCase())
                  )
                  .map((r, index) => {
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold whitespace-nowrap">{r.no_rujukan}</TableCell>
                        <TableCell>{r.risiko}</TableCell> 
                        <TableCell className="whitespace-nowrap">
                          <span>{r.tahun}</span>
                          <br />
                          <span className="text-xs text-muted-foreground">{renderSeparuhTahun(r.separuh_tahun)}</span>
                        </TableCell>
                        <TableCell>{r.nama_syarikat}</TableCell>

                        <TableCell className="text-center">
                          <span
                            className="inline-flex items-center justify-center min-w-[36px] h-6 px-2.5 rounded-full text-[11px] font-semibold"
                            style={{ 
                              backgroundColor: getRiskColor(r.skor_risiko_terkini),
                              color: r.skor_risiko_terkini === 'S' ? '#333' : 'white'
                            }}
                          >
                            {r.skor_risiko_terkini || '-'}
                          </span>
                        </TableCell>

                        <TableCell>{r.status_pemantauan_terkini}</TableCell>

                        <TableCell className="text-center">
                          <Button 
                            variant="ghost"
                            size="icon"
                            title="Jana Laporan" 
                            onClick={() => handleOpenReportModal(r)} 
                            disabled={loadingModal} 
                            className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                          >
                            <FileText />
                          </Button>
                        </TableCell>
                    </TableRow>
                    );
                  })
              )
            }
          </TableBody>
        </Table>
      </div>

      {isLogOptionsOpen && selectedRisk && (
        <ReportOptionsModal
          risk={selectedRisk}
          onClose={handleCloseModals}
          logs={selectedRisk.logs || []} 
          onShowPreview={handleShowLogPreview}
        />
      )}

      {isLogPreviewOpen && selectedRisk && selectedRange && (
        <LogPreviewModal
          risk={selectedRisk}
          range={selectedRange}
          onClose={handleCloseModals}
        />
      )}

      {toast && (
        <div className="fixed top-[64px] right-4 z-50 w-80">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
