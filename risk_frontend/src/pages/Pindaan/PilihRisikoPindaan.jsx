import { useEffect, useMemo, useState } from "react";
import { ChevronRight, FilePenLine, Search } from "lucide-react";
import api from "@/api/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/ui/empty-state";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { LencanaTahap } from "@/components/risiko/umum";
import { formatSeparuhTahun } from "@/utils/formatters";
import { useBukaRisiko } from "@/hooks/useBukaRisiko";

/**
 * Dialog memilih risiko untuk dipinda. Borang pindaan sebenar berada di tab
 * Pindaan halaman butiran risiko supaya hanya ada satu borang.
 */
export default function PilihRisikoPindaan({ buka, onTutup }) {
  const bukaRisiko = useBukaRisiko();
  const [senarai, setSenarai] = useState(null);
  const [carian, setCarian] = useState("");
  const [ralat, setRalat] = useState(null);

  useEffect(() => {
    if (!buka || senarai) return;
    api
      .get("/pindaan/risks-for-amendment")
      .then(({ data }) => setSenarai(Array.isArray(data) ? data : []))
      .catch((err) => setRalat(err.response?.data?.error || "Gagal memuatkan senarai risiko."));
  }, [buka, senarai]);

  const ditapis = useMemo(() => {
    const q = carian.trim().toLowerCase();
    return (senarai || []).filter(
      (r) => !q || `${r.no_rujukan} ${r.risiko} ${r.nama_syarikat}`.toLowerCase().includes(q)
    );
  }, [senarai, carian]);

  const pilih = (r) => {
    onTutup();
    bukaRisiko(r.id, "?tab=pindaan&sunting=1");
  };

  return (
    <Dialog open={buka} onOpenChange={(b) => !b && onTutup()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pilih risiko untuk dipinda</DialogTitle>
          <DialogDescription>
            Hanya risiko yang diluluskan dan telah dinilai boleh dipinda.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            autoFocus
            className="pl-9"
            placeholder="Cari no. rujukan, risiko atau syarikat"
            aria-label="Cari risiko untuk dipinda"
            value={carian}
            onChange={(e) => setCarian(e.target.value)}
          />
        </div>

        <div className="-mx-2 min-h-[200px] overflow-y-auto px-2">
          {ralat ? (
            <p className="text-sm text-red-600">{ralat}</p>
          ) : !senarai ? (
            <LoadingSpinner text="Memuatkan risiko..." />
          ) : ditapis.length === 0 ? (
            <EmptyState icon={FilePenLine} title="Tiada risiko sepadan" />
          ) : (
            <ul className="grid gap-2">
              {ditapis.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pilih(r)}
                    aria-label={`Pilih risiko ${r.no_rujukan}`}
                    className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {r.no_rujukan}
                        </span>
                        <LencanaTahap
                          k={r.skor_kebarangkalian_terkini || r.skor_kebarangkalian_sebelum}
                          i={r.skor_impak_terkini || r.skor_impak_sebelum}
                        />
                      </div>
                      <p className="line-clamp-1 text-sm text-foreground">{r.risiko}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.nama_syarikat} · {r.tahun} · {formatSeparuhTahun(r.separuh_tahun)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
