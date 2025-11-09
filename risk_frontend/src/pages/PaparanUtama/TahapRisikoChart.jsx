// Fail: TahapRisikoChart.jsx

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 1. Tentukan warna untuk setiap tahap risiko
// Nama ini mesti PADAN dengan apa yang backend hantar (cth, "Sangat Tinggi")
const COLORS = {
  "Sangat Tinggi": "#dc3545", // Merah
  "Tinggi": "#ffc107",        // Kuning/Oren
  "Sederhana": "#0074c8",      // Biru
  "Rendah": "#28a745",         // Hijau
};

// 2. Fungsi untuk memaparkan label peratusan
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Hanya tunjuk label jika peratusan > 5%
  if (percent * 100 < 5) {
    return null;
  }

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function TahapRisikoChart({ data }) {
  // 3. Handle jika tiada data
  if (!data || data.length === 0) {
    return (
      <div className="chart-no-data">
        Tiada data tahap risiko untuk dipaparkan.
      </div>
    );
  }

  return (
    // 4. Guna ResponsiveContainer agar saiz carta automatik
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          dataKey="value"    // Ambil 'value' dari { name: "...", value: ... }
          nameKey="name"      // Ambil 'name' dari { name: "...", value: ... }
          outerRadius={110}
          fill="#8884d8"
          labelLine={false}
          label={renderCustomizedLabel}
        >
          {data.map((entry, index) => (
            // 5. Gunakan warna yang kita tetapkan
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.name] || "#8884d8"} // Guna warna default jika nama tidak padan
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}