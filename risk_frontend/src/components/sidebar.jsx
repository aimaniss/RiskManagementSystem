import { Link, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "./Sidebar.css";

// Import icons
import PaparanUtamaIcon from "../assets/icons/icons_dashboard.svg";
import SenaraiIcon from "../assets/icons/icons_senarai.svg";
import DaftarRisikoIcon from "../assets/icons/icons_daftar_risiko.svg";
import RawatanIcon from "../assets/icons/icon_rawatan.svg";
import PemantauanIcon from "../assets/icons/icons_pemantauan.svg";
import PindaanIcon from "../assets/icons/icons_pindaan.svg";
import LaporanIcon from "../assets/icons/icon_laporan.svg";
import UrusPenggunaIcon from "../assets/icons/icons_manage_accounts.svg";
import LogAktivitiIcon from "../assets/icons/icons_log_activity.svg";
import LogoutIcon from "../assets/icons/icons_logout.svg";
import LogoImage from "../assets/images/Light Background/UKMH_light.png"; // Sidebar Logo

function Sidebar() {
  const location = useLocation();

  // Get token and decode
  const token = localStorage.getItem("token");
  let role = null;

  try {
    if (token) {
      const user = jwtDecode(token);
      role = user?.nama_peranan;
    }
  } catch (err) {
    console.error("Invalid token:", err);
    localStorage.removeItem("token");
  }

  if (!role) return null;

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <img src={LogoImage} alt="Logo" className="sidebar-logo" />
        <h2>Risk Management System</h2>
      </div>

      {/* Menu */}
      <div className="sidebar-menu">
        <ul>
          <li>
            <Link to="/" className={`sidebar-link ${location.pathname === "/" ? "active" : ""}`}>
              <img src={PaparanUtamaIcon} alt="Dashboard" className="sidebar-icon" />
              Paparan Utama
            </Link>
          </li>
          <li>
            <Link
              to="/SenaraiRisiko"
              className={`sidebar-link ${location.pathname === "/SenaraiRisiko" ? "active" : ""}`}
            >
              <img src={SenaraiIcon} alt="Senarai Risiko" className="sidebar-icon" />
              Senarai Risiko
            </Link>
          </li>
          {(role === "Admin" || role === "Executive" || role === "Ketua Subsidiari" || role === "Staff") && (
            <li>
              <Link
                to="/DaftarRisiko"
                className={`sidebar-link ${location.pathname === "/DaftarRisiko" ? "active" : ""}`}
              >
                <img src={DaftarRisikoIcon} alt="Daftar Risiko" className="sidebar-icon" />
                Daftar Risiko
              </Link>
            </li>
          )}
          {(role === "Admin" || role === "Executive" || role === "Ketua Subsidiari" || role === "Viewer") && (
            <li>
              <Link
                to="/RawatanRisiko"
                className={`sidebar-link ${location.pathname === "/RawatanRisiko" ? "active" : ""}`}
              >
                <img src={RawatanIcon} alt="Rawatan Risiko" className="sidebar-icon" />
                Rawatan Risiko
              </Link>
            </li>
          )}
          {(role === "Admin" || role === "Executive" || role === "Staff" || role === "Viewer") && (
            <li>
              <Link
                to="/PemantauanRisiko"
                className={`sidebar-link ${location.pathname === "/PemantauanRisiko" ? "active" : ""}`}
              >
                <img src={PemantauanIcon} alt="Pemantauan Risiko" className="sidebar-icon" />
                Pemantauan Risiko
              </Link>
            </li>
          )}
          {(role === "Admin" || role === "Executive") && (
            <>
              <li>
                <Link
                  to="/Pindaan"
                  className={`sidebar-link ${location.pathname === "/Pindaan" ? "active" : ""}`}
                >
                  <img src={PindaanIcon} alt="Pindaan" className="sidebar-icon" />
                  Pindaan
                </Link>
              </li>
              <li>
                <Link
                  to="/Laporan"
                  className={`sidebar-link ${location.pathname === "/Laporan" ? "active" : ""}`}
                >
                  <img src={LaporanIcon} alt="Laporan" className="sidebar-icon" />
                  Laporan
                </Link>
              </li>
              <li>
                <Link
                  to="/UrusPengguna"
                  className={`sidebar-link ${location.pathname === "/UrusPengguna" ? "active" : ""}`}
                >
                  <img src={UrusPenggunaIcon} alt="Urus Pengguna" className="sidebar-icon" />
                  Urus Pengguna
                </Link>
              </li>
              <li>
                <Link
                  to="/LogAktiviti"
                  className={`sidebar-link ${location.pathname === "/LogAktiviti" ? "active" : ""}`}
                >
                  <img src={LogAktivitiIcon} alt="Log Aktiviti" className="sidebar-icon" />
                  Log Aktiviti
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Logout */}
      <Link
        to="/login"
        className="sidebar-logout"
        onClick={() => localStorage.removeItem("token")}
      >
        <img src={LogoutIcon} alt="Log Keluar" className="sidebar-icon" />
        Log Keluar
      </Link>
    </div>
  );
}

export default Sidebar;
