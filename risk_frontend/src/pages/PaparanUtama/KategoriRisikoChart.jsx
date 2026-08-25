import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
  ResponsiveContainer,
} from "recharts";

const CATEGORY_COLORS_LIGHT = ["#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626"];
const CATEGORY_COLORS_DARK = ["#60a5fa", "#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#f87171"];
import { useDarkMode } from "../../hooks/useDarkMode";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--color-foreground)",
};

export default function KategoriRisikoChart({ data }) {
  const isDark = useDarkMode();
  const gridColor = isDark ? "#3f3f46" : "#e2e8f0";
  const tickColor = isDark ? "#a1a1aa" : "#64748b";

  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Tiada data kategori risiko untuk dipaparkan.
      </p>
    );
  }

  const height = Math.max(200, safeData.length * 36 + 20);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={safeData}
        layout="vertical"
        margin={{ top: 4, right: 28, left: 0, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={gridColor} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: isDark ? "rgba(96, 165, 250, 0.08)" : "rgba(37, 99, 235, 0.05)" }}
          contentStyle={TOOLTIP_STYLE}
        />
        <Bar
          dataKey="value"
          name="Jumlah"
          radius={[0, 6, 6, 0]}
          barSize={18}
        >
          {safeData.map((_, index) => {
            const palette = isDark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
            return <Cell key={index} fill={palette[index % palette.length]} />;
          })}
          <LabelList dataKey="value" position="right" fontSize={11} fill={tickColor} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
