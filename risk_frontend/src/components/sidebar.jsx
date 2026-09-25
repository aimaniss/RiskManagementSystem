// src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListChecks,
  ClipboardList,
  FilePlus2,
  Stethoscope,
  Activity,
  FileEdit,
  BarChart3,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import "./sidebar.css";
import LogoLight from "../assets/images/Light Background/UKMH_light.png";
import LogoDark from "../assets/images/Dark Background/UKMH_dark.png";
import { getAuthUser, hasKebenaran } from "../utils/auth";

// Menu dipapar ikut kebenaran (lulus jika ada salah satu), bukan nama peranan,
// supaya ia mengikut matriks `peranan_kebenaran`. Laporan & Log Aktiviti
// sengaja dihadkan kepada pentadbir dalam menu walaupun API membenarkan
// `laporan:jana` / `log:baca` untuk semua peranan.
const MENU = [
  { ke: "/", label: "Paparan Utama", icon: LayoutDashboard },
  { ke: "/SenaraiRisiko", label: "Senarai Risiko", icon: ListChecks, kebenaran: ["risiko:lihat"] },
  {
    ke: "/SenaraiTugasan",
    label: "Senarai Tugasan",
    icon: ClipboardList,
    kebenaran: ["risiko:lulus", "pindaan:lulus"],
  },
  { ke: "/DaftarRisiko", label: "Daftar Risiko", icon: FilePlus2, kebenaran: ["risiko:daftar"] },
  {
    ke: "/RawatanRisiko",
    label: "Penilaian & Rawatan",
    icon: Stethoscope,
    kebenaran: ["risiko:lihat"],
  },
  {
    ke: "/PemantauanRisiko",
    label: "Pemantauan Risiko",
    icon: Activity,
    kebenaran: ["risiko:lihat"],
  },
  { ke: "/Pindaan", label: "Pindaan", icon: FileEdit, kebenaran: ["pindaan:lihat"] },
  { ke: "/Laporan", label: "Laporan", icon: BarChart3, kebenaran: ["pengguna:urus"] },
  { ke: "/UrusPengguna", label: "Urus Pengguna", icon: Users, kebenaran: ["pengguna:urus"] },
  { ke: "/LogAktiviti", label: "Log Aktiviti", icon: ClipboardList, kebenaran: ["pengguna:urus"] },
  { ke: "/TetapanSistem", label: "Tetapan Sistem", icon: Settings, kebenaran: ["tetapan:urus"] },
];

function Sidebar({ terbuka = false }) {
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const authUser = getAuthUser();
  if (!authUser?.roleTitle) return null;

  const menu = MENU.filter((m) => !m.kebenaran || hasKebenaran(...m.kebenaran));

  return (
    <div className={`sidebar ${terbuka ? "terbuka" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <img src={isDark ? LogoDark : LogoLight} alt="Logo" className="sidebar-logo" />
        <h2>Risk Management System</h2>
      </div>

      {/* Menu */}
      <div className="sidebar-menu">
        <ul>
          {menu.map((m) => (
            <li key={m.ke}>
              <Link
                to={m.ke}
                className={`sidebar-link ${location.pathname === m.ke ? "active" : ""}`}
              >
                <m.icon className="sidebar-icon" />
                {m.label}
              </Link>
            </li>
          ))}
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