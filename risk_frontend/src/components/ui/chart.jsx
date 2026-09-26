// Komponen carta gaya shadcn/ui (pembalut Recharts). Warna paksi, grid, kursor &
// sektor ditetapkan melalui kelas Tailwind supaya ikut tema cerah/gelap; warna
// siri dihantar terus (hex) kerana ia membawa makna (tahap risiko, syarikat).
import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

const ChartContext = React.createContext(null);

function useChart() {
  return React.useContext(ChartContext) || { config: {} };
}

const ChartContainer = React.forwardRef(({ config = {}, className, children, ...props }, ref) => (
  <ChartContext.Provider value={{ config }}>
    <div
      ref={ref}
      className={cn(
        "flex w-full justify-center text-xs",
        "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
        "[&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-cartesian-grid_line]:[stroke-opacity:0.7]",
        "[&_.recharts-cartesian-axis-line]:stroke-border",
        "[&_.recharts-polar-grid_line]:stroke-border [&_.recharts-polar-grid_polygon]:stroke-border",
        "[&_.recharts-polar-angle-axis-tick_text]:fill-muted-foreground",
        "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
        "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
        "[&_.recharts-radial-bar-background-sector]:fill-muted",
        "[&_.recharts-sector]:outline-none [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none",
        className
      )}
      {...props}
    >
      <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
        {children}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  </ChartContext.Provider>
));
ChartContainer.displayName = "ChartContainer";

const ChartTooltip = RechartsPrimitive.Tooltip;

/** Kandungan tooltip: tajuk, penunjuk warna, label & nilai; `jumlah` tambah baris jumlah */
function ChartTooltipContent({ active, payload, label, hideLabel = false, indicator = "dot", jumlah = false, labelFormatter }) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;
  const item0 = payload[0];
  const tajuk = hideLabel ? null : labelFormatter ? labelFormatter(label, payload) : label ?? item0?.payload?.nama;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
      {tajuk && <p className="font-medium text-foreground">{tajuk}</p>}
      <div className="grid gap-1">
        {payload.map((p) => {
          const kunci = String(p.dataKey ?? p.name);
          const warna = p.payload?.fill || p.color || p.fill;
          return (
            <div key={`${kunci}-${p.name}`} className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "shrink-0",
                  indicator === "line" ? "h-0.5 w-3 rounded-full" : "h-2.5 w-2.5 rounded-[3px]"
                )}
                style={{ backgroundColor: warna }}
              />
              <span className="flex-1 text-muted-foreground">
                {config[kunci]?.label || config[p.name]?.label || p.name}
              </span>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {Number(p.value ?? 0).toLocaleString("ms-MY")}
              </span>
            </div>
          );
        })}
      </div>
      {jumlah && payload.length > 1 && (
        <div className="flex justify-between border-t pt-1.5 text-muted-foreground">
          Jumlah
          <span className="font-mono font-medium tabular-nums text-foreground">{total}</span>
        </div>
      )}
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

/** Petunjuk mendatar di bawah carta */
function ChartLegendContent({ payload, className }) {
  const { config } = useChart();
  if (!payload?.length) return null;
  return (
    <ul className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-3", className)}>
      {payload
        .filter((p) => p.type !== "none")
        .map((p) => {
          const kunci = String(p.dataKey ?? p.value);
          return (
            <li key={kunci} className="flex items-center gap-1.5 text-muted-foreground">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: p.color }} />
              {config[kunci]?.label || p.value}
            </li>
          );
        })}
    </ul>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
