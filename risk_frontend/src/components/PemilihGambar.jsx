import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Selaras dengan middleware/muatNaikGambar.js di backend
const JENIS = ["image/png", "image/jpeg", "image/webp"];
const SAIZ_MAKS = 2 * 1024 * 1024;

/**
 * Pratonton gambar profil + butang pilih/tukar & buang. Input fail pelayar
 * disembunyikan supaya teks butang dalam BM. `onRalat` dipanggil bila fail
 * ditolak di klien (jenis / saiz).
 */
export default function PemilihGambar({ src, nama, onPilih, onBuang, onRalat, disabled }) {
  const input = useRef(null);

  const pilih = (e) => {
    const fail = e.target.files?.[0];
    e.target.value = "";
    if (!fail) return;
    if (!JENIS.includes(fail.type)) return onRalat?.("Gambar profil mesti fail PNG, JPEG atau WebP.");
    if (fail.size > SAIZ_MAKS) return onRalat?.("Saiz gambar profil melebihi 2 MB.");
    onRalat?.("");
    onPilih(fail);
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar src={src} nama={nama} saiz="xl" />
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => input.current?.click()}
            disabled={disabled}
          >
            <ImagePlus size={15} />
            {src ? "Tukar gambar" : "Pilih gambar"}
          </Button>
          {src && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onBuang}
              disabled={disabled}
            >
              <Trash2 size={15} />
              Buang
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPEG atau WebP, maksimum 2 MB.</p>
      </div>
      <input
        ref={input}
        type="file"
        accept={JENIS.join(",")}
        onChange={pilih}
        className="hidden"
        aria-label="Pilih gambar profil"
      />
    </div>
  );
}
