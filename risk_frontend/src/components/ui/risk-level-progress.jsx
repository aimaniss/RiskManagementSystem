import { cn } from "@/lib/utils";
import { ArrowRight, ArrowDown, Minus } from "lucide-react";

const LEVELS = [
  { label: "Rendah", short: "R", color: "#22c55e" },
  { label: "Sederhana", short: "S", color: "#eab308" },
  { label: "Tinggi", short: "T", color: "#f97316" },
  { label: "Sangat Tinggi", short: "ST", color: "#ef4444" },
];

const getLevelIndex = (label) => {
  if (!label) return -1;
  return LEVELS.findIndex((l) => l.label === label || l.short === label);
};

const getLevelData = (label) => {
  if (!label) return null;
  return LEVELS.find((l) => l.label === label || l.short === label) || null;
};

export default function RiskLevelProgress({ sebelumLabel, selepasLabel, className }) {
  const dariIdx = getLevelIndex(sebelumLabel);
  const keIdx = getLevelIndex(selepasLabel);
  const dariData = getLevelData(sebelumLabel);
  const keData = getLevelData(selepasLabel);

  const improved = keIdx >= 0 && dariIdx >= 0 && keIdx < dariIdx;
  const worsened = keIdx >= 0 && dariIdx >= 0 && keIdx > dariIdx;
  const same = dariIdx === keIdx;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Risk level bar */}
      <div className="flex items-center gap-1">
        {LEVELS.map((level, idx) => {
          const isDari = idx === dariIdx;
          const isKe = idx === keIdx;
          const isInRange =
            dariIdx >= 0 && keIdx >= 0 &&
            idx >= Math.min(dariIdx, keIdx) &&
            idx <= Math.max(dariIdx, keIdx);

          return (
            <div key={level.short} className="relative flex-1 flex flex-col items-center gap-1">
              {/* Marker dots */}
              <div className="flex items-center justify-center h-5">
                {isDari && isKe ? (
                  <div className="flex items-center gap-0.5">
                    <div
                      className="h-3.5 w-3.5 rounded-full ring-2 ring-offset-1 ring-offset-background"
                      style={{ backgroundColor: level.color, ringColor: level.color }}
                      title={`Sebelum: ${level.label}`}
                    />
                    <Minus size={10} className="text-muted-foreground" />
                    <div
                      className="h-3.5 w-3.5 rounded-full ring-2 ring-offset-1 ring-offset-background"
                      style={{ backgroundColor: level.color, ringColor: level.color }}
                      title={`Selepas: ${level.label}`}
                    />
                  </div>
                ) : isDari ? (
                  <div
                    className="h-4 w-4 rounded-full ring-2 ring-offset-1 ring-offset-background"
                    style={{ backgroundColor: level.color, ringColor: level.color }}
                    title={`Sebelum: ${level.label}`}
                  />
                ) : isKe ? (
                  <div
                    className="h-4 w-4 rounded-full border-2 bg-background"
                    style={{ borderColor: level.color }}
                    title={`Selepas: ${level.label}`}
                  />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-muted" />
                )}
              </div>

              {/* Level segment */}
              <div
                className={cn(
                  "h-2 w-full rounded-full transition-all",
                  isInRange ? "opacity-100" : "opacity-30"
                )}
                style={{ backgroundColor: level.color }}
              />

              {/* Label */}
              <span className={cn(
                "text-[9px] leading-tight text-center whitespace-nowrap",
                (isDari || isKe) ? "font-semibold text-foreground" : "text-muted-foreground"
              )}>
                {level.short}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dariData?.color || "#94a3b8" }} />
            <span className="text-muted-foreground">
              Sebelum: <span className="font-medium text-foreground">{dariData?.label || "-"}</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full border-2 bg-background" style={{ borderColor: keData?.color || "#94a3b8" }} />
            <span className="text-muted-foreground">
              Selepas: <span className="font-medium text-foreground">{keData?.label || "-"}</span>
            </span>
          </div>
        </div>

        {improved && (
          <span className="flex items-center gap-0.5 font-medium text-emerald-600">
            <ArrowRight size={10} className="rotate-[-45deg]" /> Menurun
          </span>
        )}
        {worsened && (
          <span className="flex items-center gap-0.5 font-medium text-red-600">
            <ArrowRight size={10} className="rotate-[45deg]" /> Meningkat
          </span>
        )}
        {same && !improved && !worsened && dariIdx >= 0 && (
          <span className="flex items-center gap-0.5 font-medium text-muted-foreground">
            <Minus size={10} /> Kekal
          </span>
        )}
      </div>
    </div>
  );
}
