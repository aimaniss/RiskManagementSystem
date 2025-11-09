// Fail: KategoriRisikoChart.jsx

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Warna untuk setiap kategori
const COLORS = {
  "Strategik": "#0074c8",
  "Operasi": "#ffc107",
  "Pematuhan / Perundangan": "#dc3545",
  "Kewangan": "#28a745",
};

export default function KategoriRisikoChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-no-data">
        Tiada data kategori risiko untuk dipaparkan.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} />
        <YAxis dataKey="name" type="category" width={150} />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" name="Jumlah" fill="#8884d8">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.name] || "#8884d8"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}