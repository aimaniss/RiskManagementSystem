import { useState } from "react";

function SenaraiRisiko() {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [view, setView] = useState("table"); // 👈 Table or Grid

  const companies = ["UKMH Holdings", "Subsidiari A", "Subsidiari B"];

  // Sample risks (can fetch from DB later)
  const risks = [
    {
      noRujukan: "R001",
      tahun: 2025,
      separuhTahun: "H1",
      namaSyarikat: "UKMH Holdings",
      bahagian: "Kewangan",
      kategori: "Operasi",
      risiko: "Kelewatan laporan kewangan",
      punca: "Kurang staf",
      kesan: "Pengurusan lambat buat keputusan",
      skorRisiko: "8",
      status: "Tinggi",
    },
    {
      noRujukan: "R002",
      tahun: 2025,
      separuhTahun: "H1",
      namaSyarikat: "Subsidiari A",
      bahagian: "IT",
      kategori: "Teknologi",
      risiko: "Gangguan sistem server",
      punca: "Serangan siber",
      kesan: "Operasi terhenti",
      skorRisiko: "9",
      status: "Kritikal",
    },
  ];

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
        Senarai Risiko
      </h1>

      {/* Filter + View Toggle + Add Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
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
          {companies.map((company, index) => (
            <option key={index} value={company}>
              {company}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: "10px" }}>
          {/* View Toggle */}
          <button
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              cursor: "pointer",
              background: view === "table" ? "#2563eb" : "#ffffff",
              color: view === "table" ? "white" : "#2563eb",
              fontSize: "14px",
              fontWeight: "500",
            }}
            onClick={() => setView("table")}
          >
            📋 Table
          </button>
          <button
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              cursor: "pointer",
              background: view === "grid" ? "#2563eb" : "#ffffff",
              color: view === "grid" ? "white" : "#2563eb",
              fontSize: "14px",
              fontWeight: "500",
            }}
            onClick={() => setView("grid")}
          >
            🗂 Grid
          </button>

          {/* Add Button */}
          <button
            style={{
              padding: "10px 18px",
              background: "linear-gradient(90deg, #2563eb, #7c3aed)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)",
              transition: "0.3s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 6px 16px rgba(124, 58, 237, 0.6)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(37, 99, 235, 0.4)")
            }
          >
            + Tambah Risiko
          </button>
        </div>
      </div>

      {/* Table View */}
      {view === "table" && (
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
                  "Bahagian/Unit",
                  "Kategori Risiko",
                  "Risiko",
                  "Punca",
                  "Kesan",
                  "Skor Risiko",
                  "Status Risiko",
                  "Tindakan",
                ].map((col, index) => (
                  <th
                    key={index}
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
                    colSpan="12"
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
                    🚫 Tiada data risiko
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
                      {risk.bahagian}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      {risk.kategori}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      {risk.risiko}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      {risk.punca}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      {risk.kesan}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      {risk.skorRisiko}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      {risk.status}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      <button
                        style={{
                          marginRight: "8px",
                          cursor: "pointer",
                          color: "#ef4444",
                          border: "none",
                          background: "none",
                          fontSize: "16px",
                        }}
                      >
                        🗑️
                      </button>
                      <button
                        style={{
                          cursor: "pointer",
                          color: "#2563eb",
                          border: "none",
                          background: "none",
                          fontSize: "16px",
                        }}
                      >
                        🔍
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {view === "grid" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {risks.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "24px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                color: "#94a3b8",
                fontSize: "15px",
                fontWeight: "500",
              }}
            >
              🚫 Tiada data risiko
            </div>
          ) : (
            risks.map((risk, index) => (
              <div
                key={index}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  transition: "0.3s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 6px 16px rgba(0,0,0,0.1)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(0,0,0,0.05)")
                }
              >
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px", color: "#0f172a" }}>
                  {risk.risiko}
                </h3>
                <p style={{ fontSize: "14px", marginBottom: "4px", color: "#475569" }}>
                  <strong>Syarikat:</strong> {risk.namaSyarikat}
                </p>
                <p style={{ fontSize: "14px", marginBottom: "4px", color: "#475569" }}>
                  <strong>Kategori:</strong> {risk.kategori}
                </p>
                <p style={{ fontSize: "14px", marginBottom: "4px", color: "#475569" }}>
                  <strong>Kesan:</strong> {risk.kesan}
                </p>
                <p style={{ fontSize: "14px", marginBottom: "4px", color: "#475569" }}>
                  <strong>Skor:</strong> {risk.skorRisiko} | <strong>Status:</strong>{" "}
                  <span
                    style={{
                      color:
                        risk.status === "Kritikal"
                          ? "#dc2626"
                          : risk.status === "Tinggi"
                          ? "#f97316"
                          : "#16a34a",
                      fontWeight: "600",
                    }}
                  >
                    {risk.status}
                  </span>
                </p>
                <div style={{ marginTop: "10px" }}>
                  <button
                    style={{
                      marginRight: "8px",
                      cursor: "pointer",
                      color: "#ef4444",
                      border: "none",
                      background: "none",
                      fontSize: "16px",
                    }}
                  >
                    🗑️
                  </button>
                  <button
                    style={{
                      cursor: "pointer",
                      color: "#2563eb",
                      border: "none",
                      background: "none",
                      fontSize: "16px",
                    }}
                  >
                    🔍
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default SenaraiRisiko;
