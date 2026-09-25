import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { FiShield, FiCheck, FiX } from "react-icons/fi";
import api from "../../api/api";
import { getAuthUser } from "../../utils/auth";
import { SYARAT_KATALALUAN, katalaluanMematuhiPolisi } from "../../constants/katalaluan";
import { useTemaCerah } from "../../hooks/useTemaCerah";
import "../Login/Login.css";

function MedanKatalaluan({ label, value, onChange, autoComplete, placeholder }) {
  const [tunjuk, setTunjuk] = useState(false);
  return (
    <>
      <label className="login-label">{label}</label>
      <div className="login-input-group">
        <FaLock className="login-input-icon" />
        <input
          type={tunjuk ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <span
          className="login-toggle-pw"
          onClick={() => setTunjuk((t) => !t)}
          role="button"
          tabIndex={0}
          title={tunjuk ? "Sembunyi" : "Tunjuk"}
        >
          {tunjuk ? <FaEyeSlash /> : <FaEye />}
        </span>
      </div>
    </>
  );
}

export default function TukarKatalaluan() {
  useTemaCerah();
  const navigate = useNavigate();
  const user = getAuthUser();
  const [semasa, setSemasa] = useState("");
  const [baharu, setBaharu] = useState("");
  const [sahkan, setSahkan] = useState("");
  const [error, setError] = useState("");
  const [menghantar, setMenghantar] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const wajib = user.perluTukarKatalaluan;
  const sepadan = baharu.length > 0 && baharu === sahkan;
  const bolehHantar =
    semasa.length > 0 && katalaluanMematuhiPolisi(baharu) && sepadan && !menghantar;

  const handleHantar = async (e) => {
    e.preventDefault();
    if (!bolehHantar) return;
    setError("");
    setMenghantar(true);
    try {
      const res = await api.put("/auth/tukar-katalaluan", {
        katalaluan_lama: semasa,
        katalaluan_baru: baharu,
      });
      localStorage.setItem("token", res.data.token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Gagal menukar kata laluan. Sila cuba semula.");
    } finally {
      setMenghantar(false);
    }
  };

  const handleLogKeluar = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div className="login-page">
      <form className="login-container login-container-single" onSubmit={handleHantar}>
        <div className="login-right">
          <div className="login-left-icon">
            <FiShield size={28} color="#fff" />
          </div>
          <p className="login-right-greeting">
            {wajib ? "Tetapkan kata laluan baharu" : "Tukar kata laluan"}
          </p>
          <p className="login-right-sub">
            {wajib
              ? `Hai ${user.namaPenuh || user.raw?.staff_id || ""}, anda sedang menggunakan kata laluan sementara. Sila tetapkan kata laluan anda sendiri untuk meneruskan.`
              : "Masukkan kata laluan semasa dan kata laluan baharu anda."}
          </p>

          {error && <div className="login-error">{error}</div>}

          <MedanKatalaluan
            label={wajib ? "Kata laluan sementara" : "Kata laluan semasa"}
            placeholder={wajib ? "Kata laluan yang diberi pentadbir" : "Kata laluan semasa"}
            value={semasa}
            onChange={setSemasa}
            autoComplete="current-password"
          />
          <MedanKatalaluan
            label="Kata laluan baharu"
            placeholder="Kata laluan baharu"
            value={baharu}
            onChange={setBaharu}
            autoComplete="new-password"
          />
          <MedanKatalaluan
            label="Sahkan kata laluan baharu"
            placeholder="Taip semula kata laluan baharu"
            value={sahkan}
            onChange={setSahkan}
            autoComplete="new-password"
          />

          <ul className="login-policy">
            {SYARAT_KATALALUAN.map((s) => {
              const lulus = s.uji(baharu);
              return (
                <li key={s.label} className={lulus ? "lulus" : ""}>
                  {lulus ? <FiCheck /> : <FiX />} {s.label}
                </li>
              );
            })}
            <li className={sepadan ? "lulus" : ""}>
              {sepadan ? <FiCheck /> : <FiX />} Pengesahan sepadan
            </li>
          </ul>

          <button type="submit" className="login-btn" disabled={!bolehHantar}>
            {menghantar ? "Menyimpan..." : "Simpan kata laluan"}
          </button>

          <p className="login-help">
            {wajib ? "Bukan anda? " : ""}
            <span className="login-forgot" onClick={wajib ? handleLogKeluar : () => navigate(-1)}>
              {wajib ? "Log keluar" : "Kembali"}
            </span>
          </p>
        </div>
      </form>
    </div>
  );
}
