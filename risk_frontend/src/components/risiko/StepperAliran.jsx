import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const GAYA = {
  selesai: "border-green-600 bg-green-600 text-white",
  semasa: "border-primary bg-primary/10 text-primary ring-4 ring-primary/15",
  ditolak: "border-red-600 bg-red-600 text-white",
  belum: "border-border bg-background text-muted-foreground",
};

/** Stepper aliran kerja risiko (Daftar → Kelulusan → Penilaian → Rawatan → Pemantauan) */
export default function StepperAliran({ peringkat }) {
  return (
    <ol className="flex w-full items-start" aria-label="Peringkat aliran risiko">
      {peringkat.map((p, idx) => (
        <li key={p.id} className="flex flex-1 items-start last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                GAYA[p.status]
              )}
              aria-current={p.status === "semasa" ? "step" : undefined}
            >
              {p.status === "selesai" ? (
                <Check size={14} />
              ) : p.status === "ditolak" ? (
                <X size={14} />
              ) : (
                idx + 1
              )}
            </span>
            <span
              className={cn(
                "text-center text-[11px] leading-tight sm:text-xs",
                p.status === "semasa" ? "font-semibold text-primary" : "text-muted-foreground"
              )}
            >
              {p.label}
            </span>
          </div>
          {idx < peringkat.length - 1 && (
            <span
              className={cn(
                "mx-1 mt-3.5 h-0.5 flex-1 rounded sm:mx-2",
                p.status === "selesai" ? "bg-green-600" : "bg-border"
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
