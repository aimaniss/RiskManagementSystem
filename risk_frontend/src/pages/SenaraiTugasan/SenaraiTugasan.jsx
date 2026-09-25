import { useState, useEffect, useMemo } from "react";
import { Search, CheckCircle, XCircle, ClipboardList, Clock } from "lucide-react";
import api from "../../api/api";
import { formatSeparuhTahun } from "../../utils/formatters";
import PanelKelulusan from "@/components/risiko/PanelKelulusan";
import Toast from "@/components/ui/toast";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import PageHeader from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

function SenaraiTugasan() {
  const [risks, setRisks] = useState([]);
  const [amendments, setAmendments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [risksRes, amendmentsRes] = await Promise.all([
        api.get("/risiko", { params: { tugasan: "true" } }),
        api.get("/pindaan", { params: { tugasan: "true" } }),
      ]);

      const riskItems = risksRes.data.map((r) => ({
        _type: "risiko",
        _id: r.id,
        _rujukan: r.no_rujukan,
        _description: r.risiko,
        _syarikat: r.syarikat || r.singkatan_syarikat || "\u2014",
        _sesi: `${r.tahun || "\u2014"} / ${formatSeparuhTahun(r.separuh_tahun)}`,
        _date: r.created_at,
        _didaftarkanOleh: r.didaftarkan_oleh || "\u2014",
        _raw: r,
      }));

      const amendmentItems = amendmentsRes.data.map((a) => ({
        _type: "pindaan",
        _id: a.pindaan_id,
        _rujukan: a.no_rujukan_pindaan || `#${a.pindaan_id}`,
        _description: `${a.no_rujukan} · ${a.risiko || ""}`,
        _syarikat: a.nama_syarikat || a.singkatan_syarikat || "\u2014",
        _sesi: "\u2014",
        _date: a.created_at,
        _didaftarkanOleh: a.nama_pemohon || "\u2014",
        _raw: a,
      }));

      setRisks(riskItems);
      setAmendments(amendmentItems);
    } catch (err) {
      console.error("Gagal muatkan senarai tugasan:", err);
    } finally {
      setLoading(false);
    }
  };

  const allItems = useMemo(() => {
    return [...risks, ...amendments].sort(
      (a, b) => new Date(b._date || 0) - new Date(a._date || 0)
    );
  }, [risks, amendments]);

  const filteredItems = useMemo(() => {
    let result = [...allItems];
    if (typeFilter) {
      result = result.filter((i) => i._type === typeFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          (i._rujukan && i._rujukan.toLowerCase().includes(q)) ||
          (i._description && i._description.toLowerCase().includes(q)) ||
          (i._syarikat && i._syarikat.toLowerCase().includes(q)) ||
          (i._didaftarkanOleh && i._didaftarkanOleh.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allItems, typeFilter, search]);

  const formatTime = (dateStr) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleOpenDetail = (item) => setSelectedItem(item);
  const handleCloseDetail = () => setSelectedItem(null);

  const handleActionComplete = (mesej) => {
    setSelectedItem(null);
    setToast({ variant: "success", title: mesej });
    fetchData();
  };

  const statCards = [
    { label: "Menunggu Kelulusan", value: allItems.length, icon: Clock },
    { label: "Risiko Baru", value: risks.length, icon: ClipboardList },
    { label: "Pindaan", value: amendments.length, icon: ClipboardList },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader title="Senarai Tugasan" description="Risiko baru dan pindaan yang menunggu kelulusan anda" />
        <LoadingSpinner text="Memuatkan senarai tugasan..." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Senarai Tugasan" description="Risiko baru dan pindaan yang menunggu kelulusan anda" />

      <div className="grid grid-cols-3 gap-4 mb-5">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold tracking-tight mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Cari no. rujukan, risiko, syarikat..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 w-[150px]">
          <option value="">Semua Jenis</option>
          <option value="risiko">Risiko Baru</option>
          <option value="pindaan">Pindaan</option>
        </Select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Rujukan</TableHead>
              <TableHead>Penerangan</TableHead>
              <TableHead>Syarikat</TableHead>
              <TableHead>Sesi</TableHead>
              <TableHead>Didaftarkan Oleh</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Tarikh</TableHead>
              <TableHead className="text-center">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    icon={ClipboardList}
                    title="Tiada tugasan"
                    description="Tiada risiko baru atau pindaan yang menunggu kelulusan pada masa ini."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item, idx) => (
                <TableRow key={`${item._type}-${item._id || idx}`}>
                  <TableCell>
                    <span className="font-mono text-xs font-medium">{item._rujukan}</span>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate" title={item._description}>{item._description}</TableCell>
                  <TableCell>{item._syarikat}</TableCell>
                  <TableCell className="whitespace-nowrap">{item._sesi}</TableCell>
                  <TableCell>{item._didaftarkanOleh}</TableCell>
                  <TableCell>
                    <Badge variant={item._type === "risiko" ? "default" : "warning"}>
                      {item._type === "risiko" ? "Risiko Baru" : "Pindaan"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{formatTime(item._date)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-accent transition-colors"
                        onClick={() => handleOpenDetail(item)}
                      >
                        Semak
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PanelKelulusan
        item={selectedItem && { jenis: selectedItem._type, data: selectedItem._raw }}
        onTutup={handleCloseDetail}
        onSelesai={handleActionComplete}
      />
      {toast && (
        <div className="fixed right-4 top-[64px] z-50 w-[320px]">
          <Toast variant={toast.variant} title={toast.title} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}

export default SenaraiTugasan;
