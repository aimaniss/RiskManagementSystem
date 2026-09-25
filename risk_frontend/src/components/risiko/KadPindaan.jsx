import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/formatters";

// Label medan dalam data_sebelum / data_selepas permohonan pindaan
const LABEL_MEDAN = {
  skor_kebarangkalian: "Kebarangkalian (penilaian)",
  skor_impak: "Impak (penilaian)",
  skor_risiko_penilaian: "Tahap risiko (penilaian)",
  skor_kebarangkalian_selepas: "Kebarangkalian (keberkesanan)",
  skor_impak_selepas: "Impak (keberkesanan)",
  skor_risiko_keberkesanan: "Tahap risiko (keberkesanan)",
};

const NAMA_TAHAP = { R: "Rendah", S: "Sederhana", T: "Tinggi", ST: "Sangat Tinggi" };

const VARIAN_STATUS = {
  Diluluskan: "success",
  Ditolak: "destructive",
  "Menunggu Kelulusan": "warning",
};

const nilai = (medan, v) => {
  if (v === null || v === undefined || v === "" || v === "-") return "-";
  return medan.startsWith("skor_risiko") ? NAMA_TAHAP[v] || v : String(v);
};

/** Status permohonan pindaan sebagai lencana */
export function StatusPindaan({ status }) {
  return <Badge variant={VARIAN_STATUS[status] || "outline"}>{status}</Badge>;
}

/** Jadual kecil "medan: sebelum → selepas" */
export function Perubahan({ sebelum = {}, selepas = {} }) {
  const medan = Object.keys(LABEL_MEDAN).filter((m) => m in selepas);
  if (medan.length === 0) return null;
  return (
    <dl className="grid gap-1.5 rounded-lg bg-muted/40 p-3 text-sm">
      {medan.map((m) => (
        <div key={m} className="flex flex-wrap items-center gap-x-2">
          <dt className="min-w-[190px] text-muted-foreground">{LABEL_MEDAN[m]}</dt>
          <dd className="flex items-center gap-1.5 font-medium text-foreground">
            <span>{nilai(m, sebelum[m])}</span>
            <ArrowRight size={13} className="text-muted-foreground" />
            <span>{nilai(m, selepas[m])}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Satu permohonan pindaan: no. rujukan, status, perubahan, justifikasi,
 * sebab ditolak dan siapa memohon/memproses. `bingkai` = sempadan kad.
 */
export default function KadPindaan({ p, bingkai = true }) {
  return (
    <div className={bingkai ? "grid gap-3 rounded-lg border p-4" : "grid gap-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">
            {p.no_rujukan_pindaan || `#${p.pindaan_id}`}
          </span>
          <StatusPindaan status={p.status_permohonan} />
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
      </div>

      <Perubahan sebelum={p.data_sebelum || {}} selepas={p.data_selepas || {}} />

      {(p.justifikasi_penilaian || p.justifikasi_keberkesanan) && (
        <div className="grid gap-1 text-sm">
          {p.justifikasi_penilaian && (
            <p>
              <span className="text-muted-foreground">Justifikasi penilaian: </span>
              {p.justifikasi_penilaian}
            </p>
          )}
          {p.justifikasi_keberkesanan && p.justifikasi_keberkesanan !== p.justifikasi_penilaian && (
            <p>
              <span className="text-muted-foreground">Justifikasi keberkesanan: </span>
              {p.justifikasi_keberkesanan}
            </p>
          )}
        </div>
      )}

      {p.status_permohonan === "Ditolak" && p.sebab_ditolak && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Sebab ditolak: {p.sebab_ditolak}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Dipohon oleh <span className="text-foreground">{p.nama_pemohon || "-"}</span>
        {p.tarikh_diproses && (
          <>
            {" · "}
            {p.status_permohonan === "Ditolak" ? "Ditolak" : "Diluluskan"} oleh{" "}
            <span className="text-foreground">{p.nama_pelulus || "-"}</span> pada{" "}
            {formatDate(p.tarikh_diproses)}
          </>
        )}
      </p>
    </div>
  );
}
