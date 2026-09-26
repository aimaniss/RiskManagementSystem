import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { getUserRole } from "../../utils/auth";
import { jwtDecode } from "jwt-decode";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { useTemaCerah } from "../../hooks/useTemaCerah";
import logoPutih from "../../assets/images/Dark Background/UKMH_dark.png";
import logoWarna from "../../assets/images/Light Background/UKMH_light.png";
import KakiHalaman from "../../components/KakiHalaman";
import "./Login.css";

export default function Login() {
  useTemaCerah();
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const handleLogin = async (e) => {
    e?.preventDefault();
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

  return (
    <div className="login-skrin">
      <aside className="login-jenama">
        <img src={logoPutih} alt="UKM Holdings" className="login-jenama-logo" />
        <span className="login-jenama-garis" aria-hidden="true" />
        <p className="login-jenama-tajuk">Sistem Pengurusan Risiko</p>
        <p className="login-jenama-unit">Unit Pematuhan dan Pengurusan Risiko</p>
      </aside>

      <main className="login-tengah">
        <form className="login-kad" onSubmit={handleLogin} noValidate>
          <img src={logoWarna} alt="UKM Holdings" className="login-kad-logo" />
          <h1 className="login-right-greeting">Log masuk</h1>
          <p className="login-right-sub">Gunakan ID Staf dan kata laluan anda.</p>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <label className="login-label" htmlFor="login-staff-id">
            ID Staf
          </label>
          <div className="login-input-group">
            <User className="login-input-icon" />
            <input
              id="login-staff-id"
              type="text"
              autoComplete="username"
              placeholder="contoh: UKMH001"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            />
          </div>

          <label className="login-label" htmlFor="login-katalaluan">
            Kata laluan
          </label>
          <div className="login-input-group">
            <Lock className="login-input-icon" />
            <input
              id="login-katalaluan"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan kata laluan"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="login-toggle-pw"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Sembunyi kata laluan" : "Papar kata laluan"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" className="login-btn" disabled={menghantar}>
            {menghantar ? "Sedang log masuk..." : "Log masuk"}
          </button>
        </form>

        <p className="login-help">
          <span className="login-help-tajuk">Masalah log masuk?</span>
          Hubungi Unit Pematuhan dan Pengurusan Risiko.
        </p>

        <KakiHalaman className="login-footer" />
      </main>
    </div>
  );
}
