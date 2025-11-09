// Fail: JenisKawalanChart.jsx

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Warna untuk setiap jenis kawalan
const COLORS = {
  "Terima": "#17a2b8",
  "Kurang": "#ffc107",
  "Elak": "#dc3545",
  "Pindah": "#6f42c1",
  "Tiada Rawatan": "#6c757d",
};

export default function JenisKawalanChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-no-data">
        Tiada data jenis kawalan untuk dipaparkan.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          dataKey="value"
          nameKey="name"
          innerRadius={60} // Ini yang menjadikannya donut
          outerRadius={110}
          fill="#8884d8"
          paddingAngle={5}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.name] || "#8884d8"}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}