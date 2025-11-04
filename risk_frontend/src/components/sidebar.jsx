// src/components/Sidebar.jsx
import { Link, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import {
  LayoutDashboard,
  ListChecks,
  FilePlus2,
  Stethoscope,
  Activity,
  FileEdit,
  BarChart3,
  Users,
  ClipboardList,
  LogOut,
} from "lucide-react";
import "./Sidebar.css";
import LogoImage from "../assets/images/Light Background/UKMH_light.png"; // Logo UKM Holdings

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
            <Link
              to="/"
              className={`sidebar-link ${location.pathname === "/" ? "active" : ""}`}
            >
              <>
                <LayoutDashboard className="sidebar-icon" />
                Paparan Utama
              </>
            </Link>
          </li>
          <li>
            <Link
              to="/SenaraiRisiko"
              className={`sidebar-link ${
                location.pathname === "/SenaraiRisiko" ? "active" : ""
              }`}
            >
              <>
                <ListChecks className="sidebar-icon" />
                Senarai Risiko
              </>
            </Link>
          </li>

          {/* Daftar Risiko: Tiada Viewer */}
          {(role === "Admin" ||
            role === "Executive" ||
            role === "Ketua Subsidiari" ||
            role === "Staff") && (
            <li>
              <Link
                to="/DaftarRisiko"
                className={`sidebar-link ${
                  location.pathname === "/DaftarRisiko" ? "active" : ""
                }`}
              >
                <>
                  <FilePlus2 className="sidebar-icon" />
                  Daftar Risiko
                </>
              </Link>
            </li>
          )}

          {/* === PERUBAHAN DI SINI: 'Viewer' ditambah === */}
          {(role === "Admin" ||
            role === "Executive" ||
            role === "Ketua Subsidiari" ||
            role === "Staff" ||
            role === "Viewer") && (
            <li>
              <Link
                to="/RawatanRisiko"
                className={`sidebar-link ${
                  location.pathname === "/RawatanRisiko" ? "active" : ""
                }`}
              >
                <>
                  <Stethoscope className="sidebar-icon" />
                  Penilaian & Rawatan
                </>
              </Link>
            </li>
          )}

          {/* Pemantauan Risiko: Ada Viewer */}
          {(role === "Admin" ||
            role === "Executive" ||
            role === "Ketua Subsidiari" ||
            role === "Staff" ||
            role === "Viewer") && (
            <li>
              <Link
                to="/PemantauanRisiko"
                className={`sidebar-link ${
                  location.pathname === "/PemantauanRisiko" ? "active" : ""
                }`}
              >
                <>
                  <Activity className="sidebar-icon" />
                  Pemantauan Risiko
                </>
              </Link>
            </li>
          )}

          {/* Pindaan: Hanya Admin dan Executive */}
          {(role === "Admin" || role === "Executive") && (
            <li>
              <Link
                to="/Pindaan"
                className={`sidebar-link ${
                  location.pathname === "/Pindaan" ? "active" : ""
                }`}
              >
                <>
                  <FileEdit className="sidebar-icon" />
                  Pindaan
                </>
              </Link>
            </li>
          )}

          {/* Laporan, Urus Pengguna, Log Aktiviti: Hanya Admin */}
          {role === "Admin" && (
            <>
              <li>
                <Link
                  to="/Laporan"
                  className={`sidebar-link ${
                    location.pathname === "/Laporan" ? "active" : ""
                  }`}
                >
                  <>
                    <BarChart3 className="sidebar-icon" />
                    Laporan
                  </>
                </Link>
              </li>
              <li>
                <Link
                  to="/UrusPengguna"
                  className={`sidebar-link ${
                    location.pathname === "/UrusPengguna" ? "active" : ""
                  }`}
                >
                  <>
                    <Users className="sidebar-icon" />
                    Urus Pengguna
                  </>
                </Link>
              </li>
              <li>
                <Link
                  to="/LogAktiviti"
                  className={`sidebar-link ${
                    location.pathname === "/LogAktiviti" ? "active" : ""
                  }`}
                >
                  <>
                    <ClipboardList className="sidebar-icon" />
                    Log Aktiviti
                  </>
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
        <>
          <LogOut className="sidebar-icon" />
          Log Keluar
        </>
      </Link>
    </div>
  );
}

export default Sidebar;