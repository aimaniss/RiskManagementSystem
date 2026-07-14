// src/pages/Login/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { getUserRole } from "../../utils/auth";
import { jwtDecode } from "jwt-decode";
import { FaUser, FaLock } from "react-icons/fa";
import "./Login.css";
import ukmhLogo from "../../assets/images/Dark Background/UKMH_dark.png";

export default function Login() {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const role = getUserRole();
    if (role) {
      const validRoles = ["Admin", "Executive", "Ketua Subsidiari", "Staff", "Viewer"];
      if (validRoles.some(r => r.toLowerCase() === role?.toLowerCase())) {
        navigate("/");
      } else {
        navigate("/unauthorized");
      }
    }
  }, [navigate]);

  const handleLogin = async () => {
    setError("");
    try {
      const res = await api.post("/auth/login", {
        staff_id: staffId.trim(),
        katalaluan: password.trim(),
      });

      localStorage.setItem("token", res.data.token);
      const decoded = jwtDecode(res.data.token);
      const role = decoded.nama_peranan;

      const validRoles = ["Admin", "Executive", "Ketua Subsidiari", "Staff", "Viewer"];
      if (validRoles.some(r => r.toLowerCase() === role?.toLowerCase())) {
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
      <div className="login-overlay"></div>

      <div className="login-card glass-effect">
        <div className="login-header">
          <img src={ukmhLogo} alt="Logo UKM Holdings" className="login-logo" />
          <h1 className="login-title">RISK MANAGEMENT SYSTEM</h1>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="input-group">
          <FaUser className="input-icon" />
          <input
            type="text"
            placeholder="ID Staf"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
          />
        </div>

        <div className="input-group">
          <FaLock className="input-icon" />
          <input
            type="password"
            placeholder="Katalaluan"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="login-btn" onClick={handleLogin}>
          Log Masuk
        </button>
      </div>
    </div>
  );
}
