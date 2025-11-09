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

// 1. Tentukan warna BARU - ikut riskMatrix & tambah "Belum Dinilai"
const COLORS = {
  "Sangat Tinggi": "#ef4444", // Merah (ST)
  "Tinggi": "#f97316",        // Oren (T)
  "Sederhana": "#eab308",      // Kuning/Emas (S)
  "Rendah": "#22c55e",        // Hijau (R)
  "Belum Dinilai": "#6b7280"  // Kelabu (N/A)
};

// 2. Fungsi untuk memaparkan label (KINI PAPAR NILAI 'VALUE')
const RADIAN = Math.PI / 180;
// Ambil 'value' dari props
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  // Letak label di tengah slice
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
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={14} // Saiz fon dibesarkan sikit
      fontWeight="bold"
    >
      {value} {/* <-- DIUBAH: Papar nilai (cth: 1, 2) bukan peratus --> */}
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
          dataKey="value"    // Ambil 'value' dari { name: "...", value: ... }
          nameKey="name"      // Ambil 'name' dari { name: "...", value: ... }
          outerRadius={110}
          fill="#8884d8"
          labelLine={false}
          label={renderCustomizedLabel} // Guna fungsi label baru kita
        >
          {data.map((entry, index) => (
            // 5. Gunakan warna yang kita tetapkan
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.name] || "#8884d8"} // Guna warna dari 'COLORS' baru
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}