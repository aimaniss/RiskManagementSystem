import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./DashboardSubsidiari.css";

export default function DashboardSubsidiari({ filterValues }) {
  // Dummy data
  const allData = [
    {
      tahun: "2024",
      noRujukan: "UKMSC/0723/01",
      bahagian: "SUMBER MANUSIA",
      kategori: "STRATEGIK",
      status: "Sedang Dilaksanakan",
      skorPenilaian: "T",
      jenisKawalan: "Kurang",
      pelanTindakan: "1. Competitive Salary\n2. Recognize & Reward Employees",
      skorPemantauan: "S",
    },
    {
      tahun: "2025",
      noRujukan: "UKMSC/0724/02",
      bahagian: "KEWANGAN",
      kategori: "OPERASI",
      status: "Tutup",
      skorPenilaian: "S",
      jenisKawalan: "Terima",
      pelanTindakan: "1. Audit Internal\n2. Pemantauan vendor",
      skorPemantauan: "S",
    },
    {
      tahun: "2025",
      noRujukan: "UKMSC/0724/03",
      bahagian: "SUMBER MANUSIA",
      kategori: "STRATEGIK",
      status: "Sedang Dilaksanakan",
      skorPenilaian: "T",
      jenisKawalan: "Kurang",
      pelanTindakan: "1. Kursus Latihan",
      skorPemantauan: "S",
    },
  ];

  const [tahunFokus, setTahunFokus] = useState(filterValues.tahunAsas);
  const [selectedNoRujukan, setSelectedNoRujukan] = useState("");

  const dataTahun = allData.filter((item) => item.tahun === tahunFokus);
  const selectedData = dataTahun.find(
    (item) => item.noRujukan === selectedNoRujukan
  );

  const dataAsas = allData.filter(
    (item) => item.tahun === filterValues.tahunAsas
  );
  const dataBanding = allData.filter(
    (item) => item.tahun === filterValues.tahunBanding
  );

  // Dummy chart data
  const chartBahagian = [
    { name: "SUMBER MANUSIA", value: 3 },
    { name: "KEWANGAN", value: 2 },
    { name: "OPERASI", value: 1 },
  ];

  const chartKategori = [
    { name: "STRATEGIK", value: 4 },
    { name: "OPERASI", value: 2 },
    { name: "KEWANGAN", value: 1 },
  ];

  const chartStatus = [
    { name: "Sedang Dilaksanakan", value: 4 },
    { name: "Tutup", value: 2 },
  ];

  const chartKawalan = [
    { name: "Kurang", value: 3 },
    { name: "Terima", value: 2 },
  ];

  const COLORS = ["#0074c8", "#00c49f", "#ffbb28", "#ff8042"];

  return (
    <div className="dashboard-subsidiari">
      {/* Header */}
      <div className="dash-header">
        <h2>Dashboard Subsidiari: {filterValues.subsidiari}</h2>
        <p>
          Perbandingan Tahun Asas {filterValues.tahunAsas} & Tahun Bandingan{" "}
          {filterValues.tahunBanding}
        </p>
      </div>

      {/* Ringkasan */}
      <div className="summary-grid">
        <div className="summary-card">
          <h4>Jumlah Risiko</h4>
          <div className="year-compare">
            <span>
              {filterValues.tahunAsas}: {dataAsas.length}
            </span>
            <span>
              {filterValues.tahunBanding}: {dataBanding.length}
            </span>
          </div>
        </div>
        <div className="summary-card">
          <h4>Kategori Risiko</h4>
          <div className="year-compare">
            <span>{filterValues.tahunAsas}: Strategik</span>
            <span>{filterValues.tahunBanding}: Operasi</span>
          </div>
        </div>
        <div className="summary-card">
          <h4>Status Pemantauan</h4>
          <div className="year-compare">
            <span>{filterValues.tahunAsas}: Aktif</span>
            <span>{filterValues.tahunBanding}: Tutup</span>
          </div>
        </div>
        <div className="summary-card">
          <h4>Jenis Kawalan</h4>
          <div className="year-compare">
            <span>{filterValues.tahunAsas}: Kurang</span>
            <span>{filterValues.tahunBanding}: Terima</span>
          </div>
        </div>
      </div>

      {/* Pilih Tahun */}
      <div className="tahun-toggle">
        <button
          className={tahunFokus === filterValues.tahunAsas ? "active" : ""}
          onClick={() => {
            setTahunFokus(filterValues.tahunAsas);
            setSelectedNoRujukan("");
          }}
        >
          {filterValues.tahunAsas}
        </button>
        <button
          className={tahunFokus === filterValues.tahunBanding ? "active" : ""}
          onClick={() => {
            setTahunFokus(filterValues.tahunBanding);
            setSelectedNoRujukan("");
          }}
        >
          {filterValues.tahunBanding}
        </button>
      </div>

      {/* Perincian */}
      <div className="perincian-section">
        <h3>Perincian Risiko ({tahunFokus})</h3>
        <div className="no-rujukan-select">
          <label>Pilih No Rujukan:</label>
          <select
            value={selectedNoRujukan}
            onChange={(e) => setSelectedNoRujukan(e.target.value)}
          >
            <option value="">-- Pilih No Rujukan --</option>
            {dataTahun.map((item) => (
              <option key={item.noRujukan} value={item.noRujukan}>
                {item.noRujukan}
              </option>
            ))}
          </select>
        </div>

        {selectedData ? (
          <div className="perincian-grid">
            <div>
              <strong>Bahagian / Unit:</strong> {selectedData.bahagian}
            </div>
            <div>
              <strong>Kategori Risiko:</strong> {selectedData.kategori}
            </div>
            <div>
              <strong>Status Pemantauan:</strong> {selectedData.status}
            </div>
            <div>
              <strong>Skor Penilaian Risiko:</strong>{" "}
              {selectedData.skorPenilaian}
            </div>
            <div>
              <strong>Jenis Kawalan:</strong> {selectedData.jenisKawalan}
            </div>
            <div>
              <strong>Pelan Tindakan:</strong>
              <pre>{selectedData.pelanTindakan}</pre>
            </div>
            <div>
              <strong>Skor Pemantauan:</strong> {selectedData.skorPemantauan}
            </div>
          </div>
        ) : (
          <p className="empty-note">Sila pilih No Rujukan untuk lihat maklumat.</p>
        )}
      </div>

      {/* Carta Bahagian */}
      <div className="chart-section">
        <h3>Bahagian / Unit</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartBahagian} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" />
            <Tooltip />
            <Bar dataKey="value" fill="#0074c8" barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Carta Kategori */}
      <div className="chart-section">
        <h3>Kategori Risiko</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartKategori}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#00c49f" barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pai Chart Status */}
      <div className="chart-grid">
        <div className="chart-section">
          <h3>Status Pemantauan</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartStatus}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {chartStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Pai Chart Jenis Kawalan */}
        <div className="chart-section">
          <h3>Jenis Kawalan</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartKawalan}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {chartKawalan.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
