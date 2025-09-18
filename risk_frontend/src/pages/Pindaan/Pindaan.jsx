import { useState } from "react";

function PindaanRisiko() {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("");

  const companies = ["UKMH Holdings", "Subsidiari A", "Subsidiari B"];
  const years = ["2023", "2024", "2025"];
  const halves = ["Separuh Tahun 1", "Separuh Tahun 2"];

  const amendments = []; // Data pindaan dari DB

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
        Pindaan Risiko
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

      {/* Amendments Table */}
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
                "No Pindaan",
                "Tarikh",
                "Nama Risiko",
                "Kategori Risiko",
                "Pindaan Diminta",
                "Status",
                "Pemohon",
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
            {amendments.length === 0 ? (
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
                  🚫 Tiada permohonan pindaan dijumpai
                </td>
              </tr>
            ) : (
              amendments.map((amend, i) => (
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
                    {amend.noPindaan}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {amend.tarikh}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {amend.namaRisiko}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {amend.kategori}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {amend.permohonan}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {amend.status}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {amend.pemohon}
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
                        marginRight: "8px",
                        cursor: "pointer",
                        color: "#16a34a",
                        border: "none",
                        background: "none",
                        fontSize: "16px",
                      }}
                    >
                      ✅
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
                      ❌
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

export default PindaanRisiko;
