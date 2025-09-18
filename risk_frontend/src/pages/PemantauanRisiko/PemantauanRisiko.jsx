import { useState } from "react";

function PemantauanRisiko() {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("");

  const companies = ["UKMH Holdings", "Subsidiari A", "Subsidiari B"];
  const years = ["2023", "2024", "2025"];
  const halves = ["Separuh Tahun 1", "Separuh Tahun 2"];

  const risks = []; // nanti fetch dari DB

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
        Pemantauan Risiko
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
          <h2 style={{ fontSize: "32px", margin: 0, color: "#2563eb" }}>5</h2>
          <p style={{ margin: 0, color: "#64748b" }}>Jumlah Risiko Dipantau</p>
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
          <h2 style={{ fontSize: "32px", margin: 0, color: "#7c3aed" }}>3</h2>
          <p style={{ margin: 0, color: "#64748b" }}>Tindakan Selesai</p>
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
          <h2 style={{ fontSize: "32px", margin: 0, color: "#f97316" }}>2</h2>
          <p style={{ margin: 0, color: "#64748b" }}>Tindakan Tertunggak</p>
        </div>
      </div>

      {/* Table Section */}
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
                "No Rujukan",
                "Tahun",
                "Separuh Tahun",
                "Nama Syarikat",
                "Risiko",
                "Pelan Tindakan",
                "Status Pemantauan",
                "Tarikh Pemantauan",
                "Catatan",
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
            {risks.length === 0 ? (
              <tr>
                <td
                  colSpan="9"
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
                  🚫 Tiada data pemantauan risiko
                </td>
              </tr>
            ) : (
              risks.map((risk, i) => (
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
                    {risk.noRujukan}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.tahun}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.separuhTahun}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.namaSyarikat}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.risiko}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.pelanTindakan}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.statusPemantauan}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.tarikhPemantauan}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.catatan}
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

export default PemantauanRisiko;
