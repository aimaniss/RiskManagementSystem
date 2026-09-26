import { User } from "lucide-react";
import { cn } from "@/lib/utils";

const SAIZ = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-2xl",
};

/** Dua huruf awal nama (cth. "Admin Ujian" -> "AU") */
const inisial = (nama) =>
  String(nama || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((b) => b[0].toUpperCase())
    .join("");

/** Gambar profil bulat; tanpa gambar, papar inisial nama */
export function Avatar({ src, nama, saiz = "md", className }) {
  const kelas = cn("shrink-0 rounded-full", SAIZ[saiz], className);
  if (src) {
    return <img src={src} alt={nama ? `Gambar profil ${nama}` : ""} className={cn(kelas, "border object-cover")} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        kelas,
        "inline-flex select-none items-center justify-center bg-primary/10 font-semibold text-primary dark:bg-primary/20 dark:text-blue-200"
      )}
    >
      {inisial(nama) || <User className="h-1/2 w-1/2" />}
    </span>
  );
}
