import { useState, useEffect, useRef } from "react";
import { UserCircle, X, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import NotificationIcon from "../assets/icons/icon_notification.svg";
import "./Navbar.css";

function Navbar() {
  const [user, setUser] = useState({
    role: "",
    subsidiari: "",
    subsidiariPenuh: "",
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
  const dropdownRef = useRef(null);
  const token = localStorage.getItem("token");

  // ------------------ Fetch current user ------------------
  useEffect(() => {
    if (!token) return;

    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const roleMapping = {
          1: "ADMIN",
          2: "EXECUTIVE",
          3: "KETUA SUBSIDIARI",
          4: "STAFF",
          5: "VIEWER",
        };

        const u = res.data;
        setUser({
          role: roleMapping[u.peranan_id] || "",
          subsidiari: u.singkatan_subsidiari || "",
          subsidiariPenuh: u.nama_subsidiari || "",
          staffId: u.staff_id || "",
          profileImage: u.profile_pic
            ? `data:image/png;base64,${u.profile_pic}`
            : "",
          fullName: u.nama_penuh || "",
        });
      } catch (err) {
        console.error("Gagal fetch user:", err);
        alert("Gagal dapatkan profil. Sila login semula.");
      }
    };

    fetchUser();
  }, [token]);

  // ------------------ Close dropdown on outside click ------------------
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ------------------ File change ------------------
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

  // ------------------ Update profile ------------------
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!passwordOld && passwordNew) {
      alert("Sila masukkan kata laluan lama untuk tukar kata laluan baru.");
      return;
    }

    try {
      const formData = new FormData();
      if (passwordOld) formData.append("katalaluan_lama", passwordOld);
      if (passwordNew) formData.append("katalaluan_baru", passwordNew);
      if (newProfile) formData.append("gambar_profil", newProfile);
      if (removeProfileFlag) formData.append("hapus_gambar", "true");

      const res = await axios.put(
        "http://localhost:5000/api/users/me",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setUser((prev) => ({
        ...prev,
        profileImage: res.data.profile_pic
          ? `data:image/png;base64,${res.data.profile_pic}`
          : "",
      }));

      // Reset form
      setPasswordOld("");
      setPasswordNew("");
      setNewProfile(null);
      setPreview(null);
      setRemoveProfileFlag(false);
      setShowPasswordOld(false);
      setShowPasswordNew(false);
      setModalOpen(false);

      alert("Profil berjaya dikemaskini!");
    } catch (err) {
      console.error("Gagal update profile:", err);
      alert(
        err.response?.data?.error || "Gagal kemaskini profil. Sila cuba semula."
      );
    }
  };

  const openModal = () => setModalOpen(true);
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

  // ------------------ Render ------------------
  return (
    <>
      <div className={`navbar ${modalOpen ? "blurred" : ""}`}>
        <div className="navbar-notification">
          <img src={NotificationIcon} alt="Notifikasi" />
        </div>

        <div className="navbar-user" ref={dropdownRef}>
          <div className="navbar-user-info">
            <div className="user-subsidiari-bold">{user.subsidiari}</div>
            <div className="user-role-small">{user.role}</div>
          </div>

          <div
            className="profile-wrapper"
            onClick={() => setOpen((prev) => !prev)}
          >
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
                    <img
                      src={user.profileImage}
                      alt="User"
                      className="dropdown-pic"
                    />
                  ) : (
                    <UserCircle className="dropdown-icon" size={80} />
                  )}
                </div>
                <p className="dropdown-fullname">{user.fullName || "Nama Penuh"}</p>
                <p className="dropdown-subsidiari">
                  {user.subsidiariPenuh || "Subsidiari"}
                </p>
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
                    <button
                      type="button"
                      className="remove-profile-btn"
                      onClick={handleRemoveProfile}
                    >
                      Buang
                    </button>
                  </>
                ) : user.profileImage && !removeProfileFlag ? (
                  <>
                    <img
                      src={user.profileImage}
                      alt="Current"
                      className="profile-preview"
                    />
                    <button
                      type="button"
                      className="remove-profile-btn"
                      onClick={handleRemoveProfile}
                    >
                      Buang
                    </button>
                  </>
                ) : (
                  <UserCircle className="profile-placeholder" size={100} />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="profile-input"
                />
              </div>

              <label>Nama Penuh</label>
              <input type="text" value={user.fullName} readOnly />

              <label>Subsidiari</label>
              <input type="text" value={user.subsidiariPenuh} readOnly />

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
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                  }}
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
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowPasswordNew((prev) => !prev)}
                >
                  {showPasswordNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>

              <div className="filter-buttons">
                <button type="button" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
