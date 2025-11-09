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

// <-- DIUBAH: Fungsi untuk memaparkan label (BILANGAN) ditambah -->
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  // Tentukan kedudukan label di tengah hirisan donut
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Jika nilai adalah 0, jangan tunjuk label
  if (value === 0) {
    return null;
  }
  
  return (
    <text
      x={x}
      y={y}
      fill="white" // Warna teks label
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={14}
      fontWeight="bold"
    >
      {value} {/* Papar nilai (cth: 1, 2) */}
    </text>
  );
};
// <-- TAMAT BLOK PERUBAHAN -->


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
          labelLine={false} // <-- DIUBAH: Sembunyikan garis label
          label={renderCustomizedLabel} // <-- DIUBAH: Guna fungsi label baru
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