// src/components/Sidebar.jsx
import { useState, useEffect, useCallback } from "react";
import KakiHalaman from "./KakiHalaman";
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
  ScrollText,
  Settings,
  LogOut,
} from "lucide-react";
import "./sidebar.css";
import api from "../api/api";
import LogoLight from "../assets/images/Light Background/UKMH_light.png";
import LogoDark from "../assets/images/Dark Background/UKMH_dark.png";
import { getAuthUser, hasKebenaran } from "../utils/auth";
import { useRisikoBerubah } from "../hooks/useBukaRisiko";

// Menu dipapar ikut kebenaran (lulus jika ada salah satu), bukan nama peranan,
// supaya ia mengikut matriks `peranan_kebenaran`. Laporan (pentadbir & pelulus,
// selaras dasar Executive = Admin) dan Log Aktiviti sengaja dihadkan dalam menu
// walaupun API membenarkan `laporan:jana` / `log:baca` untuk semua peranan.
const KUMPULAN = [
  {
    tajuk: "Utama",
    menu: [
      { ke: "/", label: "Paparan Utama", icon: LayoutDashboard },
      {
        ke: "/SenaraiTugasan",
        label: "Senarai Tugasan",
        icon: ClipboardList,
        kebenaran: ["risiko:lulus", "pindaan:lulus"],
        tugasan: true,
      },
    ],
  },
  {
    tajuk: "Risiko",
    menu: [
      { ke: "/SenaraiRisiko", label: "Senarai Risiko", icon: ListChecks, kebenaran: ["risiko:lihat"] },
      { ke: "/DaftarRisiko", label: "Daftar Risiko", icon: FilePlus2, kebenaran: ["risiko:daftar"] },
      { ke: "/RawatanRisiko", label: "Penilaian & Rawatan", icon: Stethoscope, kebenaran: ["risiko:lihat"] },
      { ke: "/PemantauanRisiko", label: "Pemantauan Risiko", icon: Activity, kebenaran: ["risiko:lihat"] },
      { ke: "/Pindaan", label: "Pindaan", icon: FileEdit, kebenaran: ["pindaan:lihat"] },
    ],
  },
  {
    tajuk: "Pentadbiran",
    menu: [
      { ke: "/Laporan", label: "Laporan", icon: BarChart3, kebenaran: ["pengguna:urus", "pindaan:lulus"] },
      { ke: "/UrusPengguna", label: "Urus Pengguna", icon: Users, kebenaran: ["pengguna:urus"] },
      { ke: "/LogAktiviti", label: "Log Aktiviti", icon: ScrollText, kebenaran: ["pengguna:urus"] },
      { ke: "/TetapanSistem", label: "Tetapan Sistem", icon: Settings, kebenaran: ["tetapan:urus"] },
    ],
  },
];

/** Bilangan risiko baharu + pindaan yang menunggu kelulusan (pelulus sahaja) */
function useBilanganTugasan(aktif, laluan) {
  const [bilangan, setBilangan] = useState(0);
  const muat = useCallback(() => {
    if (!aktif) return;
    Promise.all([
      hasKebenaran("risiko:lulus")
        ? api.get("/risiko", { params: { tugasan: "true" } }).then((r) => r.data.length)
        : 0,
      hasKebenaran("pindaan:lulus")
        ? api.get("/pindaan", { params: { tugasan: "true" } }).then((r) => r.data.length)
        : 0,
    ])
      .then(([a, b]) => setBilangan(a + b))
      .catch(() => {});
  }, [aktif]);
  // Dimuat semula bila bertukar halaman (cth. selepas meluluskan) & selepas perubahan dalam modal
  useEffect(() => {
    muat();
  }, [muat, laluan]);
  useRisikoBerubah(muat);
  return bilangan;
}

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
  const pelulus = Boolean(authUser?.roleTitle) && hasKebenaran("risiko:lulus", "pindaan:lulus");
  const bilanganTugasan = useBilanganTugasan(pelulus, location.pathname);
  if (!authUser?.roleTitle) return null;

  // Modal butiran risiko (/risiko/:id) kekal menyerlahkan halaman di belakangnya
  const laluanAktif = location.state?.latar?.pathname || location.pathname;

  const kumpulan = KUMPULAN.map((k) => ({
    ...k,
    menu: k.menu.filter((m) => !m.kebenaran || hasKebenaran(...m.kebenaran)),
  })).filter((k) => k.menu.length > 0);

  return (
    <div className={`sidebar ${terbuka ? "terbuka" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <img src={isDark ? LogoDark : LogoLight} alt="UKM Holdings" className="sidebar-logo" />
        <h2>Risk Management System</h2>
      </div>

      {/* Menu berkumpulan */}
      <nav className="sidebar-menu" aria-label="Menu utama">
        {kumpulan.map((k) => (
          <div key={k.tajuk} className="sidebar-kumpulan">
            <p className="sidebar-tajuk">{k.tajuk}</p>
            <ul>
              {k.menu.map((m) => {
                const aktif = laluanAktif === m.ke;
                return (
                  <li key={m.ke}>
                    <Link
                      to={m.ke}
                      aria-current={aktif ? "page" : undefined}
                      className={`sidebar-link ${aktif ? "active" : ""}`}
                    >
                      <m.icon className="sidebar-icon" />
                      <span className="sidebar-label">{m.label}</span>
                      {m.tugasan && bilanganTugasan > 0 && (
                        <span className="sidebar-lencana" aria-label={`${bilanganTugasan} menunggu kelulusan`}>
                          {bilanganTugasan > 99 ? "99+" : bilanganTugasan}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Log keluar & versi */}
      <div className="sidebar-bawah">
        <Link to="/login" className="sidebar-logout" onClick={() => localStorage.removeItem("token")}>
          <LogOut className="sidebar-icon" />
          Log Keluar
        </Link>
        <KakiHalaman ringkas className="pt-2" />
      </div>
    </div>
  );
}

export default Sidebar;
