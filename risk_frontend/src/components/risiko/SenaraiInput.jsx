import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Senarai input teks dinamik (punca, kesan, pelan tindakan, kakitangan).
// `nilai` sentiasa array string; baris kosong dibuang oleh borang semasa simpan.
export default function SenaraiInput({ nilai, onChange, placeholder, labelTambah = "Tambah", disabled = false }) {
  const senarai = nilai.length > 0 ? nilai : [""];

  const ubah = (index, teks) => onChange(senarai.map((v, i) => (i === index ? teks : v)));
  const buang = (index) => {
    const baki = senarai.filter((_, i) => i !== index);
    onChange(baki.length > 0 ? baki : [""]);
  };

  return (
    <div className="space-y-2">
      {senarai.map((teks, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{index + 1}.</span>
          <Input
            value={teks}
            onChange={(e) => ubah(index, e.target.value)}
            placeholder={`${placeholder} ${index + 1}`}
            disabled={disabled}
          />
          {!disabled && senarai.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => buang(index)}
              aria-label={`Buang ${placeholder} ${index + 1}`}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onChange([...senarai, ""])}>
          <Plus className="h-3.5 w-3.5" />
          {labelTambah}
        </Button>
      )}
    </div>
  );
}

