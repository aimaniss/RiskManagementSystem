import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  Eye,
  EyeOff,
  Bell,
  CheckCheck,
  Trash2,
  Sun,
  Moon,
  ChevronDown,
  UserCog,
  LogOut,
} from "lucide-react";
import api from "../api/api.js";
import { SYARAT_KATALALUAN, katalaluanMematuhiPolisi } from "../constants/katalaluan";
import Toast from "@/components/ui/toast";
import EmptyState from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import PemilihGambar from "@/components/PemilihGambar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hasKebenaran } from "@/utils/auth";
import { stateLatar } from "@/hooks/useBukaRisiko";
import "./navbar.css";

// Mesej lama mungkin mengandungi **tebal** gaya markdown
function MesejNotifikasi({ teks }) {
  return String(teks || "")
    .split(/\*\*(.+?)\*\*/g)
    .map((bahagian, i) => (i % 2 ? <strong key={i}>{bahagian}</strong> : bahagian));
}

// Laluan rekod bagi notifikasi; pelulus dibawa ke Senarai Tugasan untuk item baharu
function laluanNotifikasi(notif) {
  const baharu = ["risiko_baru", "pindaan_baru"].includes(notif.jenis_notifikasi);
  if (baharu && hasKebenaran("risiko:lulus", "pindaan:lulus")) return "/SenaraiTugasan";
  if (!notif.risiko_id) return null;
  const tab = String(notif.jenis_notifikasi || "").startsWith("pindaan") ? "?tab=penilaian" : "";
  return `/risiko/${notif.risiko_id}${tab}`;
}

function MedanKatalaluan({ id, label, value, onChange, autoComplete, placeholder }) {
  const [tunjuk, setTunjuk] = useState(false);
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={tunjuk ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setTunjuk((t) => !t)}
          aria-label={tunjuk ? "Sembunyi kata laluan" : "Papar kata laluan"}
          className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {tunjuk ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function BarisAkaun({ label, children }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{children || "-"}</dd>
    </div>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const lokasi = useLocation();
  const [user, setUser] = useState({
    role: "",
    namaPeranan: "",
    syarikat: "",
    syarikatPenuh: "",
    staffId: "",
    profileImage: "",
    fullName: "",
  });
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [passwordOld, setPasswordOld] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [ralatGambar, setRalatGambar] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [newProfile, setNewProfile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removeProfileFlag, setRemoveProfileFlag] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState(null);
  // Lalai cerah; tidak mengikut tetapan mod gelap peranti
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");

  const dropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const roleNameMap = {
    "KETUA SUBSIDIARI": "Head Subsidiary",
  };

  const getDisplayRoleName = (roleName) => {
    return roleNameMap[roleName] || roleName;
  };

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    const fetchUser = async () => {
      try {
        const res = await api.get("/users/me");

        const u = res.data;
        setUser({
          role: (u.nama_peranan || "").toUpperCase(),
          namaPeranan: u.nama_peranan || "",
          syarikat: u.singkatan_syarikat || "",
          syarikatPenuh: u.nama_syarikat || "",
          staffId: u.staff_id || "",
          profileImage: u.profile_pic
            ? `data:image/png;base64,${u.profile_pic}`
            : "",
          fullName: u.nama_penuh || "",
        });
      } catch (err) {
        console.error("Gagal fetch user:", err);
      }
    };

    fetchUser();
  }, [token]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/notifikasi/unread-count");
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error("Gagal fetch unread count:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifikasi?limit=15");
      setNotifications(res.data);
    } catch (err) {
      console.error("Gagal fetch notifikasi:", err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchUnreadCount();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setOpen(false);
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target))
        setNotifOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleNotifToggle = async () => {
    setNotifOpen((prev) => !prev);
    setOpen(false);
    if (!notifOpen) {
      fetchNotifications();
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.telah_dibaca) {
      try {
        await api.put(`/notifikasi/${notif.notifikasi_id}/baca`);
        setNotifications((prev) =>
          prev.map((n) =>
            n.notifikasi_id === notif.notifikasi_id ? { ...n, telah_dibaca: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Gagal tanda baca:", err);
      }
    }
    const laluan = laluanNotifikasi(notif);
    if (laluan) {
      setNotifOpen(false);
      navigate(laluan, laluan.startsWith("/risiko/") ? { state: stateLatar(lokasi) } : undefined);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifikasi/baca-semua");
      setNotifications((prev) => prev.map((n) => ({ ...n, telah_dibaca: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Gagal tanda semua baca:", err);
    }
  };

  const handleDeleteNotif = async (e, notifId) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifikasi/${notifId}`);
      setNotifications((prev) => prev.filter((n) => n.notifikasi_id !== notifId));
      setUnreadCount((prev) => {
        const removed = notifications.find((n) => n.notifikasi_id === notifId);
        return removed && !removed.telah_dibaca ? Math.max(0, prev - 1) : prev;
      });
    } catch (err) {
      console.error("Gagal padam notifikasi:", err);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Baru sahaja";
    if (diffMin < 60) return `${diffMin} minit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return date.toLocaleDateString("ms-MY", { day: "numeric", month: "short" });
  };

  const getNotifIcon = (jenis) => {
    switch (jenis) {
      case "risiko_baru": return "📋";
      case "pindaan_baru": return "📝";
      case "pindaan_diluluskan": return "✅";
      case "pindaan_ditolak": return "❌";
      default: return "🔔";
    }
  };

  const handleFileChange = (file) => {
    setNewProfile(file);
    setPreview(URL.createObjectURL(file));
    setRemoveProfileFlag(false);
  };

  const handleRemoveProfile = () => {
    setNewProfile(null);
    setPreview(null);
    setRemoveProfileFlag(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!passwordOld && passwordNew) {
      setToast({ variant: "warning", title: "Sila masukkan kata laluan lama untuk tukar kata laluan baru." });
      return;
    }
    if (passwordNew && !katalaluanMematuhiPolisi(passwordNew)) {
      setToast({ variant: "warning", title: "Kata laluan baru tidak mematuhi polisi kata laluan." });
      return;
    }

    const passwordChanged = Boolean(passwordNew && passwordNew.trim() !== "");

    setMenyimpan(true);
    try {
      const formData = new FormData();
      if (passwordOld) formData.append("katalaluan_lama", passwordOld);
      if (passwordNew) formData.append("katalaluan_baru", passwordNew);
      if (newProfile) formData.append("gambar_profil", newProfile);
      if (removeProfileFlag) formData.append("hapus_gambar", "true");

      const res = await api.put("/users/me", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUser((prev) => ({
        ...prev,
        profileImage: res.data.profile_pic
          ? `data:image/png;base64,${res.data.profile_pic}`
          : "",
      }));

      setPasswordOld("");
      setPasswordNew("");
      setNewProfile(null);
      setPreview(null);
      setRemoveProfileFlag(false);
      setModalOpen(false);

      if (passwordChanged) {
        localStorage.removeItem("token");
        setToast({ variant: "success", title: "Kata laluan ditukar. Sila log masuk semula." });
        window.setTimeout(() => window.location.assign("/login"), 800);
        return;
      }

      setToast({ variant: "success", title: "Profil berjaya dikemaskini!" });
    } catch (err) {
      console.error("Gagal update profile:", err);
      setToast({
        variant: "error",
        title: err.response?.data?.error || "Gagal kemaskini profil. Sila cuba semula.",
      });
    } finally {
      setMenyimpan(false);
    }
  };

  const logKeluar = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const openModal = () => {
    setModalOpen(true);
    setOpen(false); 
  }
  
  const closeModal = () => {
    setModalOpen(false);
    setPasswordOld("");
    setPasswordNew("");
    setNewProfile(null);
    setPreview(null);
    setRemoveProfileFlag(false);
    setRalatGambar("");
  };
  
  return (
    <>
      <div className="navbar">
        <div className="navbar-actions">
          <button className="navbar-theme-toggle" onClick={toggleDarkMode} title={darkMode ? "Mod Cahaya" : "Mod Gelap"}>
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          <div className="navbar-notification-wrapper" ref={notifDropdownRef}>
          <button
            type="button"
            className="navbar-notification"
            onClick={handleNotifToggle}
            aria-label={unreadCount > 0 ? `Notifikasi (${unreadCount} belum dibaca)` : "Notifikasi"}
            aria-expanded={notifOpen}
          >
            <Bell size={22} className="text-foreground" />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>Notifikasi</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "11px", color: "var(--color-primary)", fontWeight: 500,
                      display: "flex", alignItems: "center", gap: "4px",
                    }}
                  >
                    <CheckCheck size={14} /> Tanda semua dibaca
                  </button>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="py-6 px-4">
                    <EmptyState
                      icon={Bell}
                      title="Tiada notifikasi"
                      description="Anda tiada notifikasi buat masa ini."
                    />
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.notifikasi_id}
                      className={`notification-item ${!notif.telah_dibaca ? "unread" : ""}`}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <span style={{ fontSize: "16px", marginTop: "1px" }}>
                          {getNotifIcon(notif.jenis_notifikasi)}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p className="notification-message"><MesejNotifikasi teks={notif.mesej} /></p>
                          <span className="notification-time">{formatTime(notif.created_at)}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteNotif(e, notif.notifikasi_id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--color-muted-foreground)", padding: "2px", flexShrink: 0,
                          }}
                          title="Padam"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        </div>

        <div className="navbar-user" ref={dropdownRef}>
          <button
            type="button"
            className="navbar-user-pencetus"
            onClick={() => setOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Menu profil"
          >
            <span className="navbar-user-info">
              <span className="user-syarikat-bold">{user.fullName || user.syarikat}</span>
              <span className="user-role-small">
                {[getDisplayRoleName(user.role), user.syarikat].filter(Boolean).join(" · ")}
              </span>
            </span>
            <Avatar src={user.profileImage} nama={user.fullName} />
            <ChevronDown size={15} className={`navbar-user-anak-panah ${open ? "terbuka" : ""}`} />
          </button>

          {open && (
            <div className="profile-dropdown" role="menu" aria-label="Menu profil">
              <div className="profile-dropdown-header">
                <Avatar src={user.profileImage} nama={user.fullName} saiz="lg" />
                <div className="min-w-0">
                  <p className="dropdown-fullname">{user.fullName || "-"}</p>
                  <p className="dropdown-staffid">{user.staffId}</p>
                </div>
              </div>
              <dl className="profile-dropdown-maklumat">
                <div>
                  <dt>Peranan</dt>
                  <dd>{user.namaPeranan || "-"}</dd>
                </div>
                <div>
                  <dt>Syarikat</dt>
                  <dd>{user.syarikatPenuh || "-"}</dd>
                </div>
              </dl>
              <div className="profile-dropdown-menu">
                <button type="button" role="menuitem" onClick={openModal}>
                  <UserCog size={16} /> Kemaskini profil
                </button>
                <button type="button" role="menuitem" className="bahaya" onClick={logKeluar}>
                  <LogOut size={16} /> Log keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={(buka) => !buka && closeModal()}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-[480px]">
          <DialogHeader className="border-b px-6 py-4 pr-12 text-left">
            <DialogTitle>Kemaskini profil</DialogTitle>
            <DialogDescription>Tukar gambar profil atau kata laluan anda.</DialogDescription>
          </DialogHeader>

          <form id="borang-profil" onSubmit={handleUpdateProfile} className="grid gap-6 px-6 py-5">
            <section className="grid gap-3">
              <h3 className="text-sm font-semibold text-foreground">Gambar profil</h3>
              <PemilihGambar
                src={preview || (removeProfileFlag ? "" : user.profileImage)}
                nama={user.fullName}
                onPilih={handleFileChange}
                onBuang={handleRemoveProfile}
                onRalat={setRalatGambar}
                disabled={menyimpan}
              />
              {ralatGambar && <p className="text-xs text-destructive">{ralatGambar}</p>}
            </section>

            <section className="grid gap-3">
              <h3 className="text-sm font-semibold text-foreground">Maklumat akaun</h3>
              <dl className="divide-y rounded-lg border text-sm">
                <BarisAkaun label="Nama penuh">{user.fullName}</BarisAkaun>
                <BarisAkaun label="ID Staf">{user.staffId}</BarisAkaun>
                <BarisAkaun label="Peranan">{user.namaPeranan}</BarisAkaun>
                <BarisAkaun label="Syarikat">{user.syarikatPenuh}</BarisAkaun>
              </dl>
              <p className="text-xs text-muted-foreground">
                Maklumat ini diurus oleh pentadbir sistem.
              </p>
            </section>

            <section className="grid gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Tukar kata laluan</h3>
                <p className="text-xs text-muted-foreground">
                  Pilihan. Biarkan kosong jika tidak mahu menukar. Anda akan diminta log masuk semula.
                </p>
              </div>
              <MedanKatalaluan
                id="profil-katalaluan-lama"
                label="Kata laluan semasa"
                placeholder="Masukkan kata laluan semasa"
                value={passwordOld}
                onChange={setPasswordOld}
                autoComplete="current-password"
              />
              <MedanKatalaluan
                id="profil-katalaluan-baru"
                label="Kata laluan baharu"
                placeholder="Masukkan kata laluan baharu"
                value={passwordNew}
                onChange={setPasswordNew}
                autoComplete="new-password"
              />
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {SYARAT_KATALALUAN.map((syarat) => {
                  const lulus = Boolean(passwordNew) && syarat.uji(passwordNew);
                  return (
                    <li
                      key={syarat.label}
                      className={`flex items-center gap-1.5 ${lulus ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                    >
                      {lulus ? <Check size={13} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                      {syarat.label}
                    </li>
                  );
                })}
              </ul>
            </section>
          </form>

          <DialogFooter className="gap-2 border-t px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" onClick={closeModal} disabled={menyimpan}>
              Batal
            </Button>
            <Button type="submit" form="borang-profil" disabled={menyimpan}>
              {menyimpan ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed top-[64px] right-4 z-[9999] w-[320px]">
          <Toast
            variant={toast.variant}
            title={toast.title}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </>
  );
}

export default Navbar;
