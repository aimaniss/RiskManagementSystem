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
  LabelList, // <-- 1. IMPORT LabelList
} from "recharts";

// Warna untuk setiap kategori
const COLORS = {
  "Strategik": "#0074c8",
  "Operasi": "#ffc107",
  "Pematuhan / Perundangan": "#dc3545",
  "Kewangan": "#28a745",
  "Lain-lain / Tiada": "#6b7280", // <-- 2. TAMBAH WARNA 'FALLBACK'
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
      {/* 3. Laraskan margin kiri untuk label Y-axis yang panjang */}
      <BarChart 
        data={data} 
        layout="vertical" 
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }} // 'left' ditambah
      >
        <CartesianGrid strokeDasharray="3 3" />
        {/* Paksa X-axis tunjuk nombor bulat sahaja */}
        <XAxis type="number" allowDecimals={false} /> 
        {/* 4. Buang 'width' tetap, biarkan 'margin' yang kawal */}
        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} /> 
        <Tooltip />
        <Legend />
        <Bar dataKey="value" name="Jumlah" fill="#8884d8">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.name] || COLORS["Lain-lain / Tiada"]} // Guna warna 'fallback'
            />
          ))}
          {/* 5. TAMBAH LABEL PADA SETIAP BAR */}
          <LabelList 
            dataKey="value" 
            position="right" // Letak nombor di sebelah kanan bar
            style={{ fill: "#333", fontSize: 12 }} // Warna nombor
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}