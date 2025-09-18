import { useState } from "react";

function LaporanRisiko() {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("");

  const companies = ["UKMH Holdings", "Subsidiari A", "Subsidiari B"];
  const years = ["2023", "2024", "2025"];
  const halves = ["Separuh Tahun 1", "Separuh Tahun 2"];

  const reports = []; // nanti fetch dari DB

  return (
    <div style={{ padding: "20px", fontFamily: "Roboto, sans-serif" }}>
      {/* Page Title */}
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "700",
          color: "#0f172a",
          marginBottom: "16px",
        }}
      >
        Laporan Risiko
      </h1>

      {/* Filter Section */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "2px solid transparent",
            borderRadius: "8px",
            fontSize: "14px",
            background:
              "linear-gradient(#fff, #fff) padding-box, linear-gradient(90deg, #2563eb, #7c3aed) border-box",
          }}
        >
          <option value="">Pilih Syarikat</option>
          {companies.map((c, i) => (
            <option key={i}>{c}</option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "2px solid transparent",
            borderRadius: "8px",
            fontSize: "14px",
            background:
              "linear-gradient(#fff, #fff) padding-box, linear-gradient(90deg, #2563eb, #7c3aed) border-box",
          }}
        >
          <option value="">Pilih Tahun</option>
          {years.map((y, i) => (
            <option key={i}>{y}</option>
          ))}
        </select>

        <select
          value={selectedHalf}
          onChange={(e) => setSelectedHalf(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "2px solid transparent",
            borderRadius: "8px",
            fontSize: "14px",
            background:
              "linear-gradient(#fff, #fff) padding-box, linear-gradient(90deg, #2563eb, #7c3aed) border-box",
          }}
        >
          <option value="">Pilih Separuh Tahun</option>
          {halves.map((h, i) => (
            <option key={i}>{h}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "32px", margin: 0, color: "#2563eb" }}>12</h2>
          <p style={{ margin: 0, color: "#64748b" }}>Jumlah Laporan</p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "32px", margin: 0, color: "#16a34a" }}>7</h2>
          <p style={{ margin: 0, color: "#64748b" }}>Laporan Selesai</p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "32px", margin: 0, color: "#f97316" }}>5</h2>
          <p style={{ margin: 0, color: "#64748b" }}>Laporan Belum Selesai</p>
        </div>
      </div>

      {/* Reports Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0",
            fontSize: "14px",
            background: "#ffffff",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <thead
            style={{
              background: "linear-gradient(90deg, #2563eb, #7c3aed)",
              color: "white",
            }}
          >
            <tr>
              {[
                "No Laporan",
                "Tahun",
                "Separuh Tahun",
                "Nama Syarikat",
                "Tarikh Laporan",
                "Status",
                "Penyedia",
                "Tindakan",
              ].map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    fontWeight: "600",
                    borderBottom: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: "#ffffff", color: "#334155" }}>
            {reports.length === 0 ? (
              <tr>
                <td
                  colSpan="8"
                  style={{
                    textAlign: "center",
                    padding: "24px",
                    background: "#ffffff",
                    color: "#94a3b8",
                    borderTop: "1px solid #e2e8f0",
                    fontSize: "15px",
                    fontWeight: "500",
                  }}
                >
                  🚫 Tiada laporan dijumpai
                </td>
              </tr>
            ) : (
              reports.map((report, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                    transition: "0.2s",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "#f1f5f9")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background =
                      i % 2 === 0 ? "#ffffff" : "#f8fafc")
                  }
                >
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {report.noLaporan}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {report.tahun}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {report.separuhTahun}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {report.namaSyarikat}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {report.tarikh}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {report.status}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {report.penyedia}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <button
                      style={{
                        marginRight: "8px",
                        cursor: "pointer",
                        color: "#2563eb",
                        border: "none",
                        background: "none",
                        fontSize: "16px",
                      }}
                    >
                      🔍
                    </button>
                    <button
                      style={{
                        cursor: "pointer",
                        color: "#ef4444",
                        border: "none",
                        background: "none",
                        fontSize: "16px",
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LaporanRisiko;
