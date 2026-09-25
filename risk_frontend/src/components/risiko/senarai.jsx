// Blok binaan halaman senarai kerja risiko (Penilaian & Rawatan, Pemantauan):
// tab berkiraan, penapis sesi, paging dan baris/kad yang membuka /risiko/:id.
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SAIZ_HALAMAN } from "./data";

/** Tab dengan kiraan; `tab` ialah id aktif. */
export function TabBerkiraan({ tabs, tab, onTukar }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => onTukar(t.id)}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            tab === t.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
          <span
            className={cn(
              "rounded-full px-1.5 text-[11px]",
              t.penting && t.kiraan > 0 ? "bg-destructive text-white" : "bg-muted text-foreground"
            )}
          >
            {t.kiraan}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Kotak carian dengan ikon */
export function KotakCarian({ nilai, onUbah, placeholder }) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        className="h-9 pl-9"
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
      />
    </div>
  );
}

/** Kawalan halaman: "1–20 daripada 26" + sebelum/seterusnya */
export function Paging({ halaman, jumlah, onTukar }) {
  const bilHalaman = Math.max(1, Math.ceil(jumlah / SAIZ_HALAMAN));
  if (jumlah <= SAIZ_HALAMAN) return null;
  const mula = (halaman - 1) * SAIZ_HALAMAN + 1;
  const akhir = Math.min(halaman * SAIZ_HALAMAN, jumlah);
  return (
    <div className="flex items-center justify-between gap-2 px-1 text-sm text-muted-foreground">
      <span>
        {mula}–{akhir} daripada {jumlah}
      </span>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={halaman <= 1}
          onClick={() => onTukar(halaman - 1)}
          aria-label="Halaman sebelum"
        >
          <ChevronLeft size={15} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={halaman >= bilHalaman}
          onClick={() => onTukar(halaman + 1)}
          aria-label="Halaman seterusnya"
        >
          <ChevronRight size={15} />
        </Button>
      </div>
    </div>
  );
}

/** No. rujukan (pautan ke butiran) + huraian risiko dua baris */
export function SelRisiko({ id, noRujukan, risiko, tab }) {
  return (
    <div className="min-w-0">
      <Link
        to={`/risiko/${id}${tab ? `?tab=${tab}` : ""}`}
        className="font-mono text-xs font-semibold text-primary hover:underline"
      >
        {noRujukan}
      </Link>
      <p className="line-clamp-2 text-sm text-foreground" title={risiko}>
        {risiko || "-"}
      </p>
    </div>
  );
}
