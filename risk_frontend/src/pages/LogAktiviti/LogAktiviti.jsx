import { useState } from "react";

function LogAktiviti() {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const users = ["Admin", "Ali", "Aiman", "Fatimah"]; // contoh dari DB
  const logs = []; // data log dari DB

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
        Log Aktiviti
      </h1>

      {/* Filter */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
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
          <option value="">Pilih Pengguna</option>
          {users.map((user, index) => (
            <option key={index} value={user}>
              {user}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "2px solid transparent",
            borderRadius: "8px",
            fontSize: "14px",
            minWidth: "200px",
            background:
              "linear-gradient(#fff, #fff) padding-box, linear-gradient(90deg, #2563eb, #7c3aed) border-box",
          }}
        />
      </div>

      {/* Logs Table */}
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
                "No",
                "Tarikh & Masa",
                "Pengguna",
                "Peranan",
                "Aktiviti",
                "Status",
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
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
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
                  📜 Tiada log aktiviti dijumpai
                </td>
              </tr>
            ) : (
              logs.map((log, i) => (
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
                    {i + 1}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {log.tarikhMasa}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {log.pengguna}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {log.peranan}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {log.aktiviti}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {log.status}
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

export default LogAktiviti;
