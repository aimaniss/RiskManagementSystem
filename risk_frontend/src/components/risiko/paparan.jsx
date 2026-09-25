// Blok paparan kecil yang dikongsi oleh halaman butiran risiko & borangnya.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { getRiskMatrix } from "../../constants/riskMatrix";

export function Medan({ label, children }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[170px_1fr] sm:gap-3">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground">{children ?? "-"}</dd>
    </div>
  );
}

export function SenaraiChip({ item }) {
  const teks = (item || []).filter((t) => typeof t === "string" && t.trim() !== "");
  if (teks.length === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <ul className="space-y-1">
      {teks.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="text-muted-foreground">{i + 1}.</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

// Lencana tahap risiko berwarna dari skor kebarangkalian × impak
export function LencanaTahap({ kebarangkalian, impak, tunjukSkor = true }) {
  const k = parseInt(kebarangkalian, 10);
  const i = parseInt(impak, 10);
  if (!k || !i) return <Badge variant="outline">Belum dinilai</Badge>;
  const { label, color, textColor } = getRiskMatrix(k, i);
  return (
    <Badge className="border-transparent" style={{ backgroundColor: color, color: textColor }}>
      {tunjukSkor ? `${k}×${i} · ` : ""}
      {label}
    </Badge>
  );
}

export function TajukBahagian({ tajuk, keterangan, tindakan }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-foreground">{tajuk}</h2>
        {keterangan && <p className="mt-0.5 text-xs text-muted-foreground">{keterangan}</p>}
      </div>
      {tindakan && <div className="flex shrink-0 flex-wrap gap-2">{tindakan}</div>}
    </div>
  );
}

// Butang Batal/Simpan yang sama untuk setiap borang sunting dalam tab
export function ButangBorang({ menyimpan, onBatal, labelSimpan = "Simpan" }) {
  return (
    <div className="flex justify-end gap-2 border-t pt-4">
      <Button type="button" variant="outline" onClick={onBatal} disabled={menyimpan}>
        Batal
      </Button>
      <Button type="submit" disabled={menyimpan}>
        {menyimpan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {menyimpan ? "Menyimpan..." : labelSimpan}
      </Button>
    </div>
  );
}

