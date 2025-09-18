// src/pages/Login/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { getUserRole } from "../../utils/auth";
import { jwtDecode } from "jwt-decode"; // v4 named import
import "./Login.css";

export default function Login() {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const role = getUserRole();
    if (role) {
      // Match uppercase roles from DB
      if (["Admin", "Executive", "Ketua Subsidiari", "Staff", "Viewer"].includes(role)) {
        navigate("/");
      } else {
        navigate("/unauthorized");
      }
    }
  }, [navigate]);

  const handleLogin = async () => {
    setError(""); // reset previous errors
    try {
      const res = await api.post("/auth/login", {
        staff_id: staffId.trim(),
        katalaluan: password.trim(),
      });

      // Save token
      localStorage.setItem("token", res.data.token);

      // Decode role from token
      const decoded = jwtDecode(res.data.token); // named import usage
      const role = decoded.nama_peranan; // should match DB uppercase

      // Redirect based on role
      if (["Admin", "Executive", "Ketua Subsidiari", "Staff", "Viewer"].includes(role)) {
        navigate("/");
      } else {
        navigate("/unauthorized");
      }
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      setError("ID Staf atau katalaluan tidak sah. Sila cuba lagi.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Risk Management System</h1>

        {error && <div className="login-error">{error}</div>}

        <input
          type="text"
          placeholder="ID Staf"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
        />
        <input
          type="password"
          placeholder="Katalaluan"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin}>Log Masuk</button>
      </div>
    </div>
  );
}
