import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  FilePenLine,
  FilePlus2,
  History,
  Pencil,
  Stethoscope,
  Trash2,
  XCircle,
} from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

// Ikon & warna ikut kata kunci aktiviti (log_aktiviti.aktiviti), turutan penting
const JENIS = [
  { kunci: /tolak/i, ikon: XCircle, warna: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300" },
  { kunci: /lulus/i, ikon: CheckCircle2, warna: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" },
  { kunci: /pindaan/i, ikon: FilePenLine, warna: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" },
  { kunci: /padam/i, ikon: Trash2, warna: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300" },
  { kunci: /penilaian|nilai/i, ikon: ClipboardCheck, warna: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" },
  { kunci: /rawatan/i, ikon: Stethoscope, warna: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300" },
  { kunci: /pemantauan|log/i, ikon: Activity, warna: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  { kunci: /tambah|daftar/i, ikon: FilePlus2, warna: "bg-primary/10 text-primary" },
  { kunci: /kemaskini|kemas kini|sunting/i, ikon: Pencil, warna: "bg-muted text-muted-foreground" },
];
const LALAI = { ikon: History, warna: "bg-muted text-muted-foreground" };

const jenis = (aktiviti) => JENIS.find((j) => j.kunci.test(aktiviti || "")) || LALAI;

const tarikh = (d) =>
  new Date(d).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" });
const masa = (d) => new Date(d).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });

// Ringkasan log biasanya mengulang no. rujukan risiko yang sedang dilihat
const bersihkan = (teks, noRujukan) => {
  if (!teks) return "";
  const ulang = noRujukan.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return teks
    .replace(new RegExp(`\\s*:?\\s*${ulang}`, "gi"), "")
    .replace(/\s+\./g, ".")
    .trim();
};

/** Garis masa aktiviti risiko, dikelompok mengikut tarikh (terkini dahulu). */
export default function TabSejarah({ senarai, noRujukan }) {
  if (senarai === null) return <LoadingSpinner text="Memuatkan sejarah..." />;
  if (senarai.length === 0) return <EmptyState icon={History} title="Tiada aktiviti direkodkan" />;

  const kumpulan = [];
  for (const l of senarai) {
    const t = tarikh(l.tarikh_masa);
    const akhir = kumpulan[kumpulan.length - 1];
    if (akhir?.tarikh === t) akhir.item.push(l);
    else kumpulan.push({ tarikh: t, item: [l] });
  }

  return (
    <div className="grid gap-6" aria-label="Sejarah aktiviti">
      {kumpulan.map((k) => (
        <section key={k.tarikh}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {k.tarikh}
          </h3>
          <ol className="relative grid gap-1">
            {k.item.map((l, i) => {
              const { ikon: Ikon, warna } = jenis(l.aktiviti);
              const ringkasan = bersihkan(l.ringkasan, noRujukan);
              return (
                <li key={l.log_id} className="relative flex gap-3 rounded-lg px-1 py-2">
                  {i < k.item.length - 1 && (
                    <span aria-hidden className="absolute left-[19px] top-10 h-[calc(100%-1.75rem)] w-px bg-border" />
                  )}
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", warna)}>
                    <Ikon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-sm font-medium text-foreground">{l.aktiviti}</p>
                      <time className="text-xs text-muted-foreground" dateTime={l.tarikh_masa}>
                        {masa(l.tarikh_masa)}
                      </time>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {l.nama_pengguna}
                      {l.peranan_pengguna && ` · ${l.peranan_pengguna}`}
                    </p>
                    {ringkasan && ringkasan.toLowerCase() !== (l.aktiviti || "").toLowerCase() && (
                      <p className="mt-1 text-sm text-muted-foreground">{ringkasan}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
