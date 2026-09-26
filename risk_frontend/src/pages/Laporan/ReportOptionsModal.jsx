import { useEffect, useMemo, useState } from "react";
import { AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const labelSesi = (log) =>
  `${log.tahun} · Separuh Tahun ${log.separuh_tahun === 1 ? "Pertama" : "Kedua"}`;

/** Kad pilihan jenis laporan (radio) */
function PilihanJenis({ id, nilai, dipilih, onPilih, tajuk, keterangan, disabled, children }) {
  const aktif = dipilih === nilai;
  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        aktif ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/40",
        disabled && "opacity-60"
      )}
    >
      <label
        htmlFor={id}
        className={cn("flex items-start gap-3 p-3.5", disabled ? "cursor-not-allowed" : "cursor-pointer")}
      >
        <input
          type="radio"
          id={id}
          name="jenisLaporan"
          value={nilai}
          checked={aktif}
          disabled={disabled}
          onChange={() => onPilih(nilai)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span className="grid gap-0.5">
          <span className="text-sm font-medium text-foreground">{tajuk}</span>
          <span className="text-xs text-muted-foreground">{keterangan}</span>
        </span>
      </label>
      {aktif && children && <div className="border-t px-3.5 pb-3.5 pt-3">{children}</div>}
    </div>
  );
}

function Semak({ id, checked, onChange, children }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      {children}
    </label>
  );
}

function PilihSesi({ id, label, value, onChange, pilihan }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {pilihan.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** Pilihan julat laporan sebelum menjana PDF */
export default function ReportOptionsModal({ risk, onClose, logs = [], onShowPreview }) {
  const [reportType, setReportType] = useState("all");
  const [isSingleLogMode, setIsSingleLogMode] = useState(false);
  const [isLogOnlyMode, setIsLogOnlyMode] = useState(false);
  const [singleValue, setSingleValue] = useState("");
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");

  const logOptions = useMemo(
    () => (logs || []).map((log) => ({ value: `${log.tahun}-${log.separuh_tahun}`, label: labelSesi(log) })),
    [logs]
  );
  const hasLogs = logOptions.length > 0;

  useEffect(() => {
    if (!hasLogs) return;
    setFromValue(logOptions[0].value);
    setToValue(logOptions[logOptions.length - 1].value);
    setSingleValue(logOptions[logOptions.length - 1].value);
  }, [logOptions, hasLogs]);

  const pilihJenis = (jenis) => {
    setReportType(jenis);
    if (jenis === "all") setIsLogOnlyMode(false);
  };

  function handleGenerateClick() {
    const dari = isSingleLogMode ? singleValue : fromValue;
    const hingga = isSingleLogMode ? singleValue : toValue;
    onShowPreview(risk, {
      reportType,
      isSingleLog: reportType === "range" && isSingleLogMode,
      fromValue: dari,
      toValue: hingga,
      fromLabel: logOptions.find((o) => o.value === dari)?.label,
      toLabel: logOptions.find((o) => o.value === hingga)?.label,
      isLogOnly: reportType === "range" && isLogOnlyMode,
    });
  }

  return (
    <Dialog open onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="flex max-h-[92vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText size={16} className="text-primary" /> Jana Laporan
          </DialogTitle>
          <DialogDescription>
            {risk.no_rujukan} · {risk.subsidiary}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4">
          <p className="rounded-lg bg-muted/50 px-3.5 py-2.5 text-sm text-foreground">{risk.title}</p>

          <div className="grid gap-2.5" role="radiogroup" aria-label="Jenis laporan">
            <PilihanJenis
              id="laporan-penuh"
              nilai="all"
              dipilih={reportType}
              onPilih={pilihJenis}
              tajuk="Keseluruhan laporan"
              keterangan="Pengenalpastian, penilaian, rawatan dan semua log pemantauan."
            />
            <PilihanJenis
              id="laporan-khusus"
              nilai="range"
              dipilih={reportType}
              onPilih={pilihJenis}
              disabled={!hasLogs}
              tajuk="Laporan khusus"
              keterangan={
                hasLogs
                  ? "Pilih sesi pemantauan tertentu."
                  : "Tiada log pemantauan untuk risiko ini."
              }
            >
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Semak id="satu-sesi" checked={isSingleLogMode} onChange={setIsSingleLogMode}>
                    Satu sesi pemantauan sahaja
                  </Semak>
                  <Semak id="pemantauan-sahaja" checked={isLogOnlyMode} onChange={setIsLogOnlyMode}>
                    Pemantauan sahaja
                    <span className="text-xs text-muted-foreground">(tanpa bahagian 1–3)</span>
                  </Semak>
                </div>
                {isSingleLogMode ? (
                  <PilihSesi pilihan={logOptions} id="sesi-tunggal" label="Sesi" value={singleValue} onChange={setSingleValue} />
                ) : (
                  <div className="grid gap-3">
                    <PilihSesi pilihan={logOptions} id="sesi-dari" label="Dari" value={fromValue} onChange={setFromValue} />
                    <PilihSesi pilihan={logOptions} id="sesi-hingga" label="Hingga" value={toValue} onChange={setToValue} />
                  </div>
                )}
              </div>
            </PilihanJenis>
          </div>

          {!hasLogs && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle size={14} /> Laporan keseluruhan masih boleh dijana tanpa log pemantauan.
            </p>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleGenerateClick} disabled={reportType === "range" && !hasLogs}>
            Jana Laporan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
