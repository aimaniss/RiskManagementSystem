import { NAMA_SISTEM, PEMILIK, TAHUN, VERSI } from "@/constants/aplikasi";
import { cn } from "@/lib/utils";

/**
 * Versi sistem & hak cipta. `ringkas` untuk ruang sempit (sidebar): dua baris
 * kecil; lalai untuk halaman log masuk: satu baris.
 */
export default function KakiHalaman({ ringkas = false, className }) {
  if (ringkas) {
    return (
      <footer className={cn("grid gap-0.5 text-center text-[10.5px] leading-tight text-muted-foreground", className)}>
        <span>
          {NAMA_SISTEM} v{VERSI}
        </span>
        <span>
          © {TAHUN} {PEMILIK}
        </span>
      </footer>
    );
  }
  return (
    <footer className={className}>
      {NAMA_SISTEM} v{VERSI} · © {TAHUN} {PEMILIK}. Hak cipta terpelihara.
    </footer>
  );
}
