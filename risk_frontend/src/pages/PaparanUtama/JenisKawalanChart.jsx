import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { useDarkMode } from "../../hooks/useDarkMode";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--color-foreground)",
};

export default function JenisKawalanChart({ data }) {
  const isDark = useDarkMode();
  const gridColor = isDark ? "#3f3f46" : "#e2e8f0";
  const tickColor = isDark ? "#a1a1aa" : "#64748b";
  const barColor = isDark ? "#60a5fa" : "#2563eb";

  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Tiada data jenis kawalan untuk dipaparkan.
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
          fill={barColor}
          radius={[0, 6, 6, 0]}
          barSize={18}
        >
          <LabelList dataKey="value" position="right" fontSize={11} fill={tickColor} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
