import { useState, useMemo, useEffect, useCallback } from "react";
import api from "../../api/api";
import {
  Calendar, UserCog, Building, Eye,
  Plus, FilePenLine, Trash2, Send, CheckCircle, XCircle, AlertCircle,
  Filter, Inbox, ChevronDown, ChevronRight, Search, Clock,
} from "lucide-react";
import { formatDate } from "../../utils/formatters";
import PageHeader from "@/components/ui/page-header";
import ConfirmModal from "@/components/ui/confirm-modal";
import Toast from "@/components/ui/toast";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import AlertBanner from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

// ===================================================================
// Data 'mock' (Aktiviti)
// ===================================================================
const mockSenaraiAktiviti = ["Tambah", "Lulus", "Kemaskini", "Padam", "Tolak", "Permohonan"];

// ===================================================================
// Helper
// ===================================================================
const getAktivitiTeks = (aktiviti) => {
  if (!aktiviti) return "Lain-lain";
  const upper = aktiviti.toUpperCase();
  if (upper.includes("LULUS")) return "Lulus";
  if (upper.includes("TAMBAH")) return "Tambah";
  if (upper.includes("KEMASKINI")) return "Kemaskini";
  if (upper.includes("TOLAK")) return "Tolak";
  if (upper.includes("PADAM")) return "Padam";
  if (upper.includes("PERMOHONAN") || upper.includes("PINDAAN") || upper.includes("MOHON")) return "Permohonan";
  return "Lain-lain";
};

const ACTIVITI_ICON_MAP = {
  Tambah: Plus,
  Lulus: CheckCircle,
  Kemaskini: FilePenLine,
  Padam: Trash2,
  Tolak: XCircle,
  Permohonan: Send,
};

// ===================================================================
// AktivitiTag
// ===================================================================
function AktivitiTag({ aktiviti, size = "default" }) {
  const teks = getAktivitiTeks(aktiviti);
  const Ikon = ACTIVITI_ICON_MAP[teks] || AlertCircle;

  let variant = "secondary";
  if (teks === "Tambah" || teks === "Lulus") variant = "success";
  else if (teks === "Kemaskini") variant = "default";
  else if (teks === "Padam" || teks === "Tolak") variant = "destructive";
  else if (teks === "Permohonan") variant = "outline";

  const sizeClass = size === "sm" ? "text-[10px] px-1.5 py-0 gap-1" : "gap-1.5";

  return (
    <Badge variant={variant} className={sizeClass}>
      <Ikon size={size === "sm" ? 10 : 14} />
      <span>{teks}</span>
    </Badge>
  );
}

// ===================================================================
// Log Detail Sheet (Drawer)
// ===================================================================
function LogDetailSheet({ log, onClose }) {
  if (!log) return null;

  const fields = [
    { label: "Pengguna", value: log.nama_pengguna },
    { label: "ID Staff", value: log.staff_id },
    { label: "Peranan", value: log.peranan_pengguna },
    { label: "Syarikat", value: log.nama_syarikat },
    { label: "Tarikh & Masa", value: formatDate(log.tarikh_masa) },
  ];

  return (
    <Sheet open={!!log} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="pr-8">Perincian Log Aktiviti</SheetTitle>
          <SheetDescription>{log.ringkasan || "Tiada ringkasan"}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Aktiviti badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Aktiviti:</span>
            <AktivitiTag aktiviti={log.aktiviti} />
          </div>

          {/* Fields */}
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.label} className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                <span className="text-xs text-muted-foreground">{f.label}</span>
                <span className="text-sm font-medium text-foreground">{f.value || "-"}</span>
              </div>
            ))}
          </div>

          {/* Perincian penuh */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Perincian Penuh</span>
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {log.perincian || "-"}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===================================================================
// Delete Range Dialog
// ===================================================================
function DeleteRangeDialog({ isOpen, onClose, onDeleteSuccess }) {
  const [deleteMula, setDeleteMula] = useState("");
  const [deleteAkhir, setDeleteAkhir] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);

  const performDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await api.delete("/log_aktiviti", {
        params: { tarikhMula: deleteMula, tarikhAkhir: deleteAkhir },
      });
      setToast({ variant: "success", title: "Berjaya", message: res.data.message });
      onDeleteSuccess();
      onClose();
    } catch (err) {
      setToast({ variant: "error", title: "Ralat", message: err.response?.data?.error || err.message || "Gagal memadam log." });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitDelete = () => {
    if (!deleteMula || !deleteAkhir) {
      setError("Sila pilih kedua-dua tarikh mula dan tarikh akhir.");
      return;
    }
    setError("");
    setConfirmAction(() => () => {
      setConfirmAction(null);
      performDelete();
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Padam Log Mengikut Julat Tarikh</DialogTitle>
            <DialogDescription>
              Pilih julat tarikh untuk memadam rekod log secara pukal. Tindakan ini adalah kekal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="deleteMula">Tarikh Mula</Label>
              <Input
                type="date"
                id="deleteMula"
                value={deleteMula}
                onChange={(e) => setDeleteMula(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deleteAkhir">Tarikh Akhir</Label>
              <Input
                type="date"
                id="deleteAkhir"
                value={deleteAkhir}
                onChange={(e) => setDeleteAkhir(e.target.value)}
              />
            </div>
            {error && (
              <AlertBanner variant="error" title="Ralat" description={error} onClose={() => setError("")} />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isDeleting}>Batal</Button>
            <Button variant="destructive" onClick={handleSubmitDelete} disabled={isDeleting}>
              {isDeleting ? "Memadam..." : "Padam Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={confirmAction !== null}
        onOpenChange={(v) => { if (!v) setConfirmAction(null); }}
        title="Padam Log Mengikut Julat"
        description={`Adakah anda pasti mahu memadam SEMUA log dari ${deleteMula} hingga ${deleteAkhir}? Tindakan ini tidak boleh diundur.`}
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
    </>
  );
}

// ===================================================================
// Log Card
// ===================================================================
function LogCard({ log, onView, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div
        className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center pt-0.5">
          {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{log.nama_pengguna}</span>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-[10px] text-muted-foreground">{log.peranan_pengguna}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{log.ringkasan}</p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <AktivitiTag aktiviti={log.aktiviti} size="sm" />
            <span className="text-[10px] text-muted-foreground">{log.nama_syarikat}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={10} />
            <span className="whitespace-nowrap">{formatDate(log.tarikh_masa)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary hover:bg-primary/10"
            title="Lihat Perincian"
            onClick={(e) => { e.stopPropagation(); onView(log); }}
          >
            <Eye size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            title="Padam Log"
            onClick={(e) => { e.stopPropagation(); onDelete(log.log_id); }}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
            <div><span className="text-muted-foreground">Staff ID: </span><span className="text-foreground">{log.staff_id || "-"}</span></div>
            <div><span className="text-muted-foreground">Syarikat: </span><span className="text-foreground">{log.nama_syarikat || "-"}</span></div>
            <div><span className="text-muted-foreground">Tarikh: </span><span className="text-foreground">{formatDate(log.tarikh_masa)}</span></div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Aktiviti: </span>
              <AktivitiTag aktiviti={log.aktiviti} size="sm" />
            </div>
          </div>
          <div className="pt-1">
            <p className="text-xs font-medium text-muted-foreground mb-1">Perincian Penuh</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{log.perincian || "-"}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ===================================================================
// Komponen Utama
// ===================================================================
function LogAktiviti() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [senaraiPeranan, setSenaraiPeranan] = useState([]);
  const [senaraiSyarikat, setSenaraiSyarikat] = useState([]);
  const [senaraiAktiviti] = useState(mockSenaraiAktiviti);

  const [tarikhMula, setTarikhMula] = useState("");
  const [tarikhAkhir, setTarikhAkhir] = useState("");
  const [filterPeranan, setFilterPeranan] = useState("");
  const [filterSyarikat, setFilterSyarikat] = useState("");
  const [filterAktiviti, setFilterAktiviti] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedLog, setSelectedLog] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchRoles = async () => {
    try {
      const res = await api.get("/roles");
      setSenaraiPeranan(res.data);
    } catch (err) {
      console.error("Gagal memuatkan senarai peranan:", err);
    }
  };

  const fetchSyarikats = async () => {
    try {
      const res = await api.get("/syarikat");
      setSenaraiSyarikat(res.data);
    } catch (err) {
      console.error("Gagal memuatkan senarai syarikat:", err);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchSyarikats();
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {};
      if (tarikhMula) params.tarikhMula = tarikhMula;
      if (tarikhAkhir) params.tarikhAkhir = tarikhAkhir;
      if (filterPeranan) params.peranan = filterPeranan;
      if (filterSyarikat) params.syarikat = filterSyarikat;
      if (filterAktiviti) params.aktiviti_teks = filterAktiviti;

      const res = await api.get("/log_aktiviti", { params });
      setLogs(res.data);
    } catch (err) {
      console.error("Gagal memuatkan log aktiviti:", err);
      setError(err.message || "Gagal memuatkan data dari server.");
    } finally {
      setIsLoading(false);
    }
  }, [tarikhMula, tarikhAkhir, filterPeranan, filterSyarikat, filterAktiviti]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDeleteLog = (logId) => {
    setConfirmAction(() => async () => {
      setConfirmAction(null);
      try {
        await api.delete(`/log_aktiviti/${logId}`);
        setLogs((prev) => prev.filter((log) => log.log_id !== logId));
      } catch (err) {
        setToast({ variant: "error", title: "Ralat", message: `Gagal memadam log: ${err.message}` });
      }
    });
  };

  const resetFilters = () => {
    setTarikhMula("");
    setTarikhAkhir("");
    setFilterPeranan("");
    setFilterSyarikat("");
    setFilterAktiviti("");
    setSearchTerm("");
  };

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    const lower = searchTerm.toLowerCase();
    return logs.filter(
      (log) =>
        (log.nama_pengguna && log.nama_pengguna.toLowerCase().includes(lower)) ||
        (log.ringkasan && log.ringkasan.toLowerCase().includes(lower)) ||
        (log.perincian && log.perincian.toLowerCase().includes(lower)) ||
        (log.nama_syarikat && log.nama_syarikat.toLowerCase().includes(lower))
    );
  }, [logs, searchTerm]);

  const activeFilterCount = [filterPeranan, filterSyarikat, filterAktiviti, tarikhMula, tarikhAkhir].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Log Aktiviti" description="Rekod aktiviti pengguna dalam sistem" />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Inbox size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Jumlah Log</p>
            <p className="text-lg font-bold text-foreground">{logs.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Plus size={18} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tambah</p>
            <p className="text-lg font-bold text-foreground">{logs.filter((l) => getAktivitiTeks(l.aktiviti) === "Tambah").length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FilePenLine size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kemaskini</p>
            <p className="text-lg font-bold text-foreground">{logs.filter((l) => getAktivitiTeks(l.aktiviti) === "Kemaskini").length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Padam</p>
            <p className="text-lg font-bold text-foreground">{logs.filter((l) => getAktivitiTeks(l.aktiviti) === "Padam").length}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari pengguna, ringkasan, syarikat..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <Filter size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Select value={filterAktiviti} onChange={(e) => setFilterAktiviti(e.target.value)} className="h-9 min-w-[140px] pl-8">
              <option value="">Semua Aktiviti</option>
              {senaraiAktiviti.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </div>

          <div className="relative">
            <UserCog size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Select value={filterPeranan} onChange={(e) => setFilterPeranan(e.target.value)} className="h-9 min-w-[140px] pl-8">
              <option value="">Semua Peranan</option>
              {senaraiPeranan.map((r) => (
                <option key={r.peranan_id} value={r.nama_peranan}>{r.nama_peranan}</option>
              ))}
            </Select>
          </div>

          <div className="relative">
            <Building size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Select value={filterSyarikat} onChange={(e) => setFilterSyarikat(e.target.value)} className="h-9 min-w-[140px] pl-8">
              <option value="">Semua Syarikat</option>
              {senaraiSyarikat.map((s) => (
                <option key={s.syarikat_id} value={s.nama_syarikat}>{s.nama_syarikat}</option>
              ))}
            </Select>
          </div>

          <div className="relative">
            <Calendar size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" value={tarikhMula} onChange={(e) => setTarikhMula(e.target.value)} className="h-9 w-[145px] pl-8" />
          </div>
          <span className="text-sm text-muted-foreground">ke</span>
          <div className="relative">
            <Calendar size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" value={tarikhAkhir} onChange={(e) => setTarikhAkhir(e.target.value)} className="h-9 w-[145px] pl-8" />
          </div>

          {activeFilterCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-destructive hover:text-destructive">
              Reset ({activeFilterCount})
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 size={13} /> Padam Julat
          </Button>
        </div>
      </Card>

      {/* Content */}
      {isLoading ? (
        <Card className="flex items-center justify-center py-16">
          <LoadingSpinner text="Memuatkan data log aktiviti..." size="sm" />
        </Card>
      ) : error ? (
        <Card className="p-6">
          <AlertBanner variant="error" title="Ralat" description={error} onClose={() => setError(null)} />
        </Card>
      ) : filteredLogs.length > 0 ? (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <LogCard
              key={log.log_id}
              log={log}
              onView={(l) => setSelectedLog(l)}
              onDelete={handleDeleteLog}
            />
          ))}
        </div>
      ) : (
        <Card className="flex items-center justify-center py-16">
          <EmptyState
            icon={Inbox}
            title="Tiada log aktiviti dijumpai"
            description="Tiada log aktiviti dijumpai yang sepadan dengan carian anda."
          />
        </Card>
      )}

      {/* Log Detail Sheet */}
      <LogDetailSheet log={selectedLog} onClose={() => setSelectedLog(null)} />

      {/* Delete Range Dialog */}
      <DeleteRangeDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleteSuccess={fetchLogs}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmAction !== null}
        onOpenChange={(v) => { if (!v) setConfirmAction(null); }}
        title="Padam Rekod Log"
        description="Adakah anda pasti mahu memadam rekod log ini? Tindakan ini tidak boleh diundur."
        confirmText="Ya, Padam"
        variant="destructive"
        icon="destructive"
        onConfirm={() => { confirmAction?.(); }}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-[64px] right-4 z-50 w-80">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}

export default LogAktiviti;
