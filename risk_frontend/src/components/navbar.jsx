import { useState, useEffect, useRef } from "react";
import { UserCircle, X, Eye, EyeOff, Bell, CheckCheck, Trash2, Sun, Moon } from "lucide-react";
import api from "../api/api.js";
import { katalaluanMematuhiPolisi } from "../constants/katalaluan";
import Toast from "@/components/ui/toast";
import EmptyState from "@/components/ui/empty-state";
import "./navbar.css";

function Navbar() {
  const [user, setUser] = useState({
    role: "",
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
  const [showPasswordOld, setShowPasswordOld] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [newProfile, setNewProfile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removeProfileFlag, setRemoveProfileFlag] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewProfile(file);
      setPreview(URL.createObjectURL(file));
      setRemoveProfileFlag(false);
    }
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
      setShowPasswordOld(false);
      setShowPasswordNew(false);
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
    }
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
    setShowPasswordOld(false);
    setShowPasswordNew(false);
  };
  
  return (
    <>
      <div className={`navbar ${modalOpen ? "blurred" : ""}`}>
        <div className="navbar-actions">
          <button className="navbar-theme-toggle" onClick={toggleDarkMode} title={darkMode ? "Mod Cahaya" : "Mod Gelap"}>
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          <div className="navbar-notification-wrapper" ref={notifDropdownRef}>
          <div className="navbar-notification" onClick={handleNotifToggle}>
            <Bell size={22} className="text-foreground" />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
            )}
          </div>

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
                          <p className="notification-message">{notif.mesej}</p>
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
          <div className="navbar-user-info">
            <div className="user-syarikat-bold">{user.syarikat}</div>
            <div className="user-role-small">{getDisplayRoleName(user.role)}</div>
          </div>

          <div className="profile-wrapper" onClick={() => setOpen((prev) => !prev)}>
            {user.profileImage ? (
              <img src={user.profileImage} alt="User" className="profile-pic" />
            ) : (
              <UserCircle className="profile-icon" size={42} />
            )}
          </div>

          {open && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="profile-big">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt="User" className="dropdown-pic" />
                  ) : (
                    <UserCircle className="dropdown-icon" size={80} />
                  )}
                </div>
                <p className="dropdown-fullname">{user.fullName || "Nama Penuh"}</p>
                <p className="dropdown-syarikat">{user.syarikatPenuh || "Syarikat"}</p>
                <p className="dropdown-staffid">{user.staffId || "ID Staf"}</p>
              </div>
              <button className="edit-btn" onClick={openModal}>
                Kemaskini Profil
              </button>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Kemaskini Profil</h2>
              <X size={20} className="close-icon" onClick={closeModal} />
            </div>

            <form className="modal-form" onSubmit={handleUpdateProfile}>
              <div className="profile-upload-wrapper">
                {preview ? (
                  <>
                    <img src={preview} alt="Preview" className="profile-preview" />
                    <button type="button" className="remove-profile-btn" onClick={handleRemoveProfile}>
                      Buang
                    </button>
                  </>
                ) : user.profileImage && !removeProfileFlag ? (
                  <>
                    <img src={user.profileImage} alt="Current" className="profile-preview" />
                    <button type="button" className="remove-profile-btn" onClick={handleRemoveProfile}>
                      Buang
                    </button>
                  </>
                ) : (
                  <UserCircle className="profile-placeholder" size={100} />
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} className="profile-input" />
              </div>

              <label>Nama Penuh</label>
              <input type="text" value={user.fullName} readOnly />

              <label>Syarikat</label>
              <input type="text" value={user.syarikatPenuh} readOnly />

              <label>Staff ID</label>
              <input type="text" value={user.staffId} readOnly />

              <label>Kata Laluan Lama</label>
              <div style={{ position: "relative" }}>
                <input
                  key={modalOpen + "-old"} 
                  type={showPasswordOld ? "text" : "password"}
                  placeholder="Masukkan kata laluan lama"
                  value={passwordOld}
                  onChange={(e) => setPasswordOld(e.target.value)}
                  style={{ paddingRight: "40px" }}
                  autoComplete="current-password"
                />
                <div
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}
                  onClick={() => setShowPasswordOld((prev) => !prev)}
                >
                  {showPasswordOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>

              <label>Kata Laluan Baru</label>
              <div style={{ position: "relative" }}>
                <input
                  key={modalOpen + "-new"} 
                  type={showPasswordNew ? "text" : "password"}
                  placeholder="Masukkan kata laluan baru"
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  style={{ paddingRight: "40px" }}
                  autoComplete="new-password"
                />
                <div
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}
                  onClick={() => setShowPasswordNew((prev) => !prev)}
                >
                  {showPasswordNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
              <p style={{ fontSize: "11.5px", color: "#6b7280", margin: "-4px 0 8px" }}>
                Sekurang-kurangnya 8 aksara, mengandungi huruf dan nombor, tanpa ruang kosong.
              </p>

              <div className="filter-buttons">
                <button type="button" onClick={closeModal}>Batal</button>
                <button type="submit">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
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
