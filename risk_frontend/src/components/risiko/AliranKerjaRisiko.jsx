import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import api from "@/api/api";
import { cn } from "@/lib/utils";
import { peringkatAliran } from "./data";

const LANGKAH = [
  {
    id: "penilaian",
    label: "Perlu Dinilai",
    huraian: "Tetapkan skor kebarangkalian × impak",
    ke: "/RawatanRisiko?tab=penilaian",
  },
  {
    id: "rawatan",
    label: "Perlu Rawatan",
    huraian: "Rancang kawalan & pelan tindakan",
    ke: "/RawatanRisiko?tab=rawatan",
  },
  {
    id: "pemantauan",
    label: "Dalam Pemantauan",
    huraian: "Rekod log setiap separuh tahun",
    ke: "/PemantauanRisiko?kumpulan=aktif",
  },
  {
    id: "selesai",
    label: "Selesai / Tutup",
    huraian: "Risiko tidak lagi dipantau",
    ke: "/PemantauanRisiko?kumpulan=selesai",
  },
];

/**
 * Jalur aliran kerja risiko yang diluluskan: dinilai → dirawat → dipantau →
 * selesai, dengan bilangan risiko di setiap peringkat. Dikongsi oleh halaman
 * Penilaian & Rawatan dan Pemantauan supaya pengguna nampak di mana setiap
 * senarai berada dalam aliran penuh.
 *
 * `data`: senarai GET /pemantauan-risiko jika halaman sudah memuatkannya
 * (`null` = masih dimuat). Jika prop tidak diberi, komponen memuatkannya sendiri.
 */
export default function AliranKerjaRisiko({ aktif, data, onPilih }) {
  const navigate = useNavigate();
  const [dimuat, setDimuat] = useState(null);

  useEffect(() => {
    if (data !== undefined) return;
    api
      .get("/pemantauan-risiko")
      .then(({ data: d }) => setDimuat(Array.isArray(d) ? d : []))
      .catch(() => setDimuat([]));
  }, [data]);

  const senarai = data !== undefined ? data : dimuat;
  const kiraan = { penilaian: 0, rawatan: 0, pemantauan: 0, selesai: 0 };
  let tertunggak = 0;
  for (const r of senarai || []) {
    kiraan[peringkatAliran(r)] += 1;
    if (r.status_pemantauan_terkini === "Tertunggak") tertunggak += 1;
  }

  // onPilih pulangkan true jika halaman semasa mengendalikan langkah itu sendiri
  const pilih = (l) => {
    if (onPilih?.(l.id)) return;
    navigate(l.ke);
  };

  return (
    <nav aria-label="Aliran kerja risiko" className="rounded-xl border bg-card p-2 shadow-sm">
      <ol className="grid grid-cols-2 gap-2 md:flex md:items-stretch md:gap-0">
        {LANGKAH.map((l, i) => {
          const semasa = aktif === l.id;
          return (
            <li key={l.id} className="flex min-w-0 items-center md:flex-1">
              <button
                type="button"
                onClick={() => pilih(l)}
                aria-current={semasa ? "step" : undefined}
                className={cn(
                  "flex w-full min-w-0 items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors",
                  semasa ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted/60"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    semasa ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        semasa ? "text-primary" : "text-foreground"
                      )}
                    >
                      {l.label}
                    </span>
                    <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-foreground">
                      {senarai ? kiraan[l.id] : "…"}
                    </span>
                    {l.id === "pemantauan" && tertunggak > 0 && (
                      <span className="rounded-full bg-destructive px-1.5 text-[11px] font-medium text-white">
                        {tertunggak} tertunggak
                      </span>
                    )}
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:block">{l.huraian}</span>
                </span>
              </button>
              {i < LANGKAH.length - 1 && (
                <ChevronRight
                  aria-hidden
                  size={18}
                  className="mx-1 hidden shrink-0 text-muted-foreground md:block"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
