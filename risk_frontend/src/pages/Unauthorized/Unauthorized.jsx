// src/pages/Unauthorized/Unauthorized.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldOff, LogIn } from "lucide-react";
import "./Unauthorized.css";
import ukmhLogo from "../../assets/images/Light Background/UKMH_light.png";

export default function Unauthorized() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    localStorage.removeItem("token");

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="unauth-container">
      <div className="unauth-overlay" />

      <div className="unauth-card">
        <img src={ukmhLogo} alt="Logo UKM Holdings" className="unauth-logo" />

        <div className="unauth-icon-wrapper">
          <ShieldOff size={48} strokeWidth={1.5} />
        </div>

        <h1 className="unauth-title">Akses Ditolak</h1>
        <p className="unauth-subtitle">
          Anda tidak mempunyai kebenaran untuk mengakses halaman ini.
          <br />
          Sesi anda telah tamat tempoh atau tidak sah.
        </p>

        <p className="unauth-countdown">
          Menghalakan ke log masuk dalam <span>{countdown}</span> saat...
        </p>

        <button className="unauth-btn" onClick={() => navigate("/login")}>
          <LogIn size={18} />
          Log Masuk Sekarang
        </button>
      </div>
    </div>
  );
}
