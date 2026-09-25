// Komponen paparan kecil yang dikongsi oleh borang & halaman butiran risiko
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRiskMatrix } from "@/constants/riskMatrix";
import { cn } from "@/lib/utils";

/** Lencana tahap risiko berwarna daripada skor K × I */
export function LencanaTahap({ k, i, tunjukSkor = false, className }) {
  const { label, color, textColor } = getRiskMatrix(k, i);
  if (label === "Tiada Data") {
    return (
      <span className={cn("rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground", className)}>
        Belum dinilai
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", className)}
      style={{ backgroundColor: color, color: textColor || "#fff" }}
    >
      {tunjukSkor ? `${k}×${i} · ` : ""}
      {label}
    </span>
  );
}

/** Pasangan label/nilai untuk paparan maklumat */
export function Medan({ label, children, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{children || "-"}</dd>
    </div>
  );
}

/** Senarai cip teks (punca, kesan, pelan tindakan, kakitangan) */
export function SenaraiCip({ items }) {
  const bersih = (items || []).filter((t) => t && String(t).trim() && t !== "-");
  if (bersih.length === 0) return <span className="text-sm text-muted-foreground">-</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {bersih.map((t, i) => (
        <span key={i} className="rounded-md bg-muted px-2.5 py-1 text-[13px] text-foreground">
          {t}
        </span>
      ))}
    </div>
  );
}

/**
 * Penyunting senarai teks (tambah / buang baris). Sentiasa sekurang-kurangnya
 * satu baris; baris kosong dibuang semasa simpan oleh pemanggil.
 */
export function EditorSenarai({ id, label, nilai, onChange, placeholder, disabled }) {
  const senarai = nilai.length ? nilai : [""];
  const ubah = (idx, v) => onChange(senarai.map((x, i) => (i === idx ? v : x)));
  const buang = (idx) => {
    const baki = senarai.filter((_, i) => i !== idx);
    onChange(baki.length ? baki : [""]);
  };
  return (
    <fieldset className="grid gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      {senarai.map((v, idx) => (
        <div key={idx} className="flex gap-2">
          <Input
            id={idx === 0 ? id : undefined}
            aria-label={`${label} ${idx + 1}`}
            value={v}
            placeholder={placeholder}
            onChange={(e) => ubah(idx, e.target.value)}
          />
          {!disabled && senarai.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-destructive"
              onClick={() => buang(idx)}
              title="Buang baris"
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => onChange([...senarai, ""])}
        >
          <Plus size={14} /> Tambah baris
        </Button>
      )}
    </fieldset>
  );
}
