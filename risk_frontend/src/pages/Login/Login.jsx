import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { getUserRole } from "../../utils/auth";
import { jwtDecode } from "jwt-decode";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { FiShield } from "react-icons/fi";
import "./Login.css";
import ukmhLogo from "../../assets/images/Dark Background/UKMH_dark.png";

export default function Login() {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const role = getUserRole();
    if (role) {
      const validRoles = ["Admin", "Executive", "Ketua Subsidiari", "Staff", "Viewer"];
      if (validRoles.some((r) => r.toLowerCase() === role?.toLowerCase())) {
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
      if (validRoles.some((r) => r.toLowerCase() === role?.toLowerCase())) {
        navigate("/");
      } else {
        navigate("/unauthorized");
      }
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      setError("ID Staf atau katalaluan tidak sah. Sila cuba lagi.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left panel - branding */}
        <div className="login-left">
          <div className="login-left-icon">
            <FiShield size={28} color="#fff" />
          </div>
          <h2 className="login-left-title">Risk Management System</h2>
          <p className="login-left-subtitle">
            UKM Holdings Berhad
          </p>
          <p className="login-left-desc">
            Urus, jejak dan kawal risiko organisasi anda dalam satu platform yang berpusat
          </p>
          <div className="login-left-dots">
            <span className="dot dot-active"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>

        {/* Right panel - form */}
        <div className="login-right">
          <p className="login-right-greeting">Selamat kembali</p>
          <p className="login-right-sub">Log masuk untuk teruskan ke akaun anda</p>

          {error && <div className="login-error">{error}</div>}

          <label className="login-label">ID Staf</label>
          <div className="login-input-group">
            <FaUser className="login-input-icon" />
            <input
              type="text"
              placeholder="contoh: 12345"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <label className="login-label">Kata laluan</label>
          <div className="login-input-group">
            <FaLock className="login-input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan kata laluan"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <span
              className="login-toggle-pw"
              onClick={() => setShowPassword(!showPassword)}
              role="button"
              tabIndex={0}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <div className="login-row">
            <label className="login-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Ingat saya</span>
            </label>
            <span className="login-forgot">Lupa kata laluan?</span>
          </div>

          <button className="login-btn" onClick={handleLogin}>
            Log masuk
          </button>

          <p className="login-help">
            Masalah log masuk? Hubungi{" "}
            <span className="login-help-highlight">Unit Pengurusan Risiko</span>
          </p>
        </div>
      </div>
    </div>
  );
}
