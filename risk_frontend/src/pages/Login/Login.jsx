import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { getUserRole } from "../../utils/auth";
import { jwtDecode } from "jwt-decode";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useTemaCerah } from "../../hooks/useTemaCerah";
import logoUkmh from "../../assets/images/Dark Background/UKMH_dark.png";
import KakiHalaman from "../../components/KakiHalaman";
import "./Login.css";

export default function Login() {
  useTemaCerah();
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [menghantar, setMenghantar] = useState(false);
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
    if (menghantar) return;
    if (!staffId.trim() || !password.trim()) {
      setError("Sila masukkan ID Staf dan kata laluan.");
      return;
    }
    setError("");
    setMenghantar(true);
    try {
      const res = await api.post("/auth/login", {
        staff_id: staffId.trim(),
        katalaluan: password.trim(),
      });

      localStorage.setItem("token", res.data.token);

      if (res.data.user?.perlu_tukar_katalaluan) {
        navigate("/tukar-katalaluan", { replace: true });
        return;
      }

      const role = jwtDecode(res.data.token).nama_peranan;
      const validRoles = ["Admin", "Executive", "Ketua Subsidiari", "Staff", "Viewer"];
      if (validRoles.some((r) => r.toLowerCase() === role?.toLowerCase())) {
        navigate("/");
      } else {
        navigate("/unauthorized");
      }
    } catch (err) {
      // Mesej pelayan membezakan kelayakan salah, akaun dikunci & akaun tidak aktif
      setError(err.response?.data?.error || "Tidak dapat menghubungi pelayan. Sila cuba lagi.");
    } finally {
      setMenghantar(false);
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
          <img src={logoUkmh} alt="UKM Holdings" className="login-logo" />
          <h2 className="login-left-title">Risk Management System</h2>
          <p className="login-left-subtitle">Unit Pematuhan dan Pengurusan Risiko</p>
          <p className="login-left-desc">
            Urus, jejak dan kawal risiko organisasi anda dalam satu platform yang berpusat
          </p>
        </div>

        {/* Right panel - form */}
        <div className="login-right">
          <p className="login-right-greeting">Selamat kembali</p>
          <p className="login-right-sub">Log masuk untuk teruskan ke akaun anda</p>

          {error && <div className="login-error">{error}</div>}

          <label className="login-label" htmlFor="login-staff-id">ID Staf</label>
          <div className="login-input-group">
            <FaUser className="login-input-icon" />
            <input
              id="login-staff-id"
              type="text"
              autoComplete="username"
              placeholder="contoh: UKMH001"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <label className="login-label" htmlFor="login-katalaluan">Kata laluan</label>
          <div className="login-input-group">
            <FaLock className="login-input-icon" />
            <input
              id="login-katalaluan"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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
              aria-label={showPassword ? "Sembunyi kata laluan" : "Papar kata laluan"}
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
          </div>

          <button className="login-btn" onClick={handleLogin} disabled={menghantar}>
            {menghantar ? "Sedang log masuk..." : "Log masuk"}
          </button>

          <p className="login-help">
            Masalah log masuk? Hubungi{" "}
            <span className="login-help-highlight">Unit Pematuhan dan Pengurusan Risiko</span>
          </p>
        </div>
      </div>
      <KakiHalaman className="login-footer" />
    </div>
  );
}
