import { riskMatrix, KebarangkalianData, ImpakData } from "../../constants/riskMatrix";
import { cn } from "@/lib/utils";

/**
 * Matriks Risiko 5x5 interaktif.
 * Sel yang sepadan dengan (kebarangkalian, impak) akan ditanda secara aktif
 * supaya pengguna nampak kedudukan skor risiko semasa.
 *
 * Props:
 *  - kebarangkalian: 1-5 (atau string)
 *  - impak: 1-5 (atau string)
 *  - compact: saiz kecil utk modal/edit form
 *  - className
 */
export default function RiskMatrixVisual({ kebarangkalian, impak, compact = false, className }) {
  const k = parseInt(kebarangkalian);
  const i = parseInt(impak);
  const hasPosition = !isNaN(k) && !isNaN(i) && k >= 1 && k <= 5 && i >= 1 && i <= 5;

  // Baris dari atas (5) ke bawah (1)
  const rows = [5, 4, 3, 2, 1];
  const cols = [1, 2, 3, 4, 5];

  const legend = [
    { label: "Rendah", color: "#22c55e" },
    { label: "Sederhana", color: "#eab308" },
    { label: "Tinggi", color: "#f97316" },
    { label: "Sangat Tinggi", color: "#ef4444" },
  ];

  return (
    <div className={cn("inline-block select-none", className)}>
      {/* Label paksi-Y */}
      <div className="flex items-stretch">
        <div className="flex items-center justify-center pr-1">
          <span
            className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Kebarangkalian
          </span>
        </div>

        <table className="border-separate" style={{ borderSpacing: compact ? "2px" : "3px" }}>
          <tbody>
            {rows.map((rowK) => (
              <tr key={rowK}>
                {/* Skor kebarangkalian di tepi */}
                <td className="pr-1 text-center align-middle">
                  <span
                    title={KebarangkalianData[rowK]}
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                      hasPosition && rowK === k ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {rowK}
                  </span>
                </td>

                {cols.map((colI) => {
                  const cell = riskMatrix[rowK][colI];
                  const isActive = hasPosition && rowK === k && colI === i;
                  return (
                    <td key={colI}>
                      <div
                        title={`Kebarangkalian ${rowK} × Impak ${colI} — ${cell.label}`}
                        className={cn(
                          "relative flex items-center justify-center rounded font-bold transition-all duration-150",
                          compact ? "h-8 w-8 text-[10px]" : "h-11 w-11 text-xs",
                          isActive
                            ? "scale-110 z-10 shadow-lg ring-2 ring-foreground ring-offset-1"
                            : "opacity-85 hover:opacity-100"
                        )}
                        style={{
                          backgroundColor: cell.color,
                          color: cell.textColor,
                        }}
                      >
                        {cell.shortLabel}
                        {isActive && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-white shadow-md">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Baris skor impak di bawah */}
            <tr>
              <td />
              {cols.map((colI) => (
                <td key={colI} className="pt-0.5 text-center">
                  <span
                    title={ImpakData[colI]}
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                      hasPosition && colI === i ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {colI}
                  </span>
                </td>
              ))}
            </tr>

            {/* Label paksi-X */}
            <tr>
              <td />
              <td colSpan={5} className="pt-1 text-center">
                <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">Impak</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
              <span className="text-[11px] text-muted-foreground">{l.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
