import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDarkMode } from "../../hooks/useDarkMode";

export const RISK_COLORS = {
  "Sangat Tinggi": "#ef4444",
  "Tinggi": "#f97316",
  "Sederhana": "#eab308",
  "Rendah": "#22c55e",
  "Belum Dinilai": "#94a3b8",
};

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--color-foreground)",
};

export default function TahapRisikoChart({ data }) {
  const isDark = useDarkMode();
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((sum, item) => sum + (item?.value || 0), 0);

  if (safeData.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Tiada data tahap risiko untuk dipaparkan.
      </p>
    );
  }

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={safeData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              stroke={isDark ? "#27272a" : "#ffffff"}
            >
              {safeData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={RISK_COLORS[entry.name] || RISK_COLORS["Belum Dinilai"]}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-foreground">
            {total}
          </span>
          <span className="text-xs text-muted-foreground">risiko</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {safeData.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  RISK_COLORS[entry.name] || RISK_COLORS["Belum Dinilai"],
              }}
            />
            {entry.name}
          </div>
        ))}
      </div>
    </div>
  );
}
