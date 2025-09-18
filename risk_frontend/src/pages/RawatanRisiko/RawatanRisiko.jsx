import { useState } from "react";

function RawatanRisiko() {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const companies = ["UKMH Holdings", "Subsidiari A", "Subsidiari B"];
  const years = ["2023", "2024", "2025"];

  // Example data (replace with DB fetch)
  const risks = [];

  return (
    <div style={{ padding: "20px", fontFamily: "Roboto, sans-serif" }}>
      {/* Page Title */}
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "700",
          color: "#0f172a",
          marginBottom: "20px",
        }}
      >
        Rawatan Risiko
      </h1>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
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
            minWidth: "220px",
            background:
              "linear-gradient(#fff, #fff) padding-box, linear-gradient(90deg, #2563eb, #7c3aed) border-box",
          }}
        >
          <option value="">Pilih Syarikat</option>
          {companies.map((c, i) => (
            <option key={i} value={c}>
              {c}
            </option>
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
            minWidth: "140px",
            background:
              "linear-gradient(#fff, #fff) padding-box, linear-gradient(90deg, #16a34a, #22d3ee) border-box",
          }}
        >
          <option value="">Tahun</option>
          {years.map((y, i) => (
            <option key={i} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            color: "white",
            textAlign: "center",
            boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
          }}
        >
          <h2 style={{ fontSize: "40px", fontWeight: "700", margin: "0" }}>
            3
          </h2>
          <p style={{ margin: "0", fontSize: "14px" }}>Bilangan Risiko Aktif</p>
        </div>

        <div
          style={{
            padding: "20px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #16a34a, #22d3ee)",
            color: "white",
            textAlign: "center",
            boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
          }}
        >
          <h2 style={{ fontSize: "40px", fontWeight: "700", margin: "0" }}>
            2
          </h2>
          <p style={{ margin: "0", fontSize: "14px" }}>Bilangan Plan Rawatan</p>
        </div>
      </div>

      {/* Table */}
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
                "Separuh Tahun Didaftarkan",
                "Nama Syarikat",
                "Kategori Risiko",
                "Risiko",
                "Skor Risiko",
                "Plan Tindakan",
                "Jenis Kawalan",
                "Tempoh Jangkaan Siap",
                "Kakitangan Bertanggungjawab",
              ].map((col, i) => (
                <th
                  key={i}
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
                  colSpan="11"
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
                  🚫 Tiada data rawatan risiko
                </td>
              </tr>
            ) : (
              risks.map((risk, index) => (
                <tr
                  key={index}
                  style={{
                    transition: "0.2s",
                    background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "#f1f5f9")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background =
                      index % 2 === 0 ? "#ffffff" : "#f8fafc")
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
                    {risk.kategori}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.risiko}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.skorRisiko}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.plan}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.kawalan}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.tempoh}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {risk.kakitangan}
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

export default RawatanRisiko;
