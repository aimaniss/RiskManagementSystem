import { useState, useEffect } from "react";
import axios from "axios";
import { UserCircle, Edit, Trash2 } from "lucide-react";
import "./UrusPengguna.css";

function UrusPengguna() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter states
  const [filterRoleId, setFilterRoleId] = useState("");
  const [filterSubsidiaryId, setFilterSubsidiaryId] = useState("");
  const [filterSubsidiaryLocked, setFilterSubsidiaryLocked] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    staff_id: "",
    nama_penuh: "",
    katalaluan: "",
    peranan_id: "",
    subsidiari_id: "",
    profile_pic: null,
  });
  const [preview, setPreview] = useState("");
  const [subsidiaryLocked, setSubsidiaryLocked] = useState(false);
  const [removeProfileFlag, setRemoveProfileFlag] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchRoles();
    fetchSubsidiaries();
    fetchUsers();
  }, [token]);

  const fetchRoles = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubsidiaries = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/subsidiari", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubsidiaries(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Table filter
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nama_penuh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.staff_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRoleId ? u.peranan_id === parseInt(filterRoleId) : true;
    const matchesSubsidiary = filterSubsidiaryId
      ? u.subsidiari_id === parseInt(filterSubsidiaryId)
      : true;

    return matchesSearch && matchesRole && matchesSubsidiary;
  });

  // Filter dropdown change
  const handleFilterRoleChange = (roleId) => {
    setFilterRoleId(roleId);
    const role = roles.find((r) => r.peranan_id === parseInt(roleId));

    if (role && ["Admin", "Executive", "Viewer"].includes(role.nama_peranan)) {
      const ukm = subsidiaries.find((s) => s.nama_subsidiari === "UKM Holdings");
      if (ukm) setFilterSubsidiaryId(ukm.subsidiari_id.toString());
      setFilterSubsidiaryLocked(true);
    } else {
      setFilterSubsidiaryId("");
      setFilterSubsidiaryLocked(false);
    }
  };

  // Modal open
  const openModal = (type, user) => {
    setModalType(type);
    setSelectedUser(user);

    if (type === "edit" && user) {
      setFormData({ ...user, profile_pic: null });
      setPreview(user.profile_pic ? `data:image/png;base64,${user.profile_pic}` : "");
      setRemoveProfileFlag(false);

      const role = roles.find((r) => r.peranan_id === user.peranan_id);
      if (role && ["Admin", "Executive", "Viewer"].includes(role.nama_peranan)) {
        const ukm = subsidiaries.find((s) => s.nama_subsidiari === "UKM Holdings");
        if (ukm) setFormData((f) => ({ ...f, subsidiari_id: ukm.subsidiari_id }));
        setSubsidiaryLocked(true);
      } else {
        setSubsidiaryLocked(false);
      }
    } else {
      setFormData({
        staff_id: "",
        nama_penuh: "",
        katalaluan: "",
        peranan_id: "",
        subsidiari_id: "",
        profile_pic: null,
      });
      setPreview("");
      setRemoveProfileFlag(false);
      setSubsidiaryLocked(false);
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setModalType("");
    setSubsidiaryLocked(false);
    setRemoveProfileFlag(false);
    setPreview("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profile_pic: file });
      setPreview(URL.createObjectURL(file));
      setRemoveProfileFlag(false);
    }
  };

  const handleRoleChange = (roleId) => {
    const role = roles.find((r) => r.peranan_id === parseInt(roleId));
    setFormData((f) => ({ ...f, peranan_id: parseInt(roleId) }));

    if (role && ["Admin", "Executive", "Viewer"].includes(role.nama_peranan)) {
      const ukm = subsidiaries.find((s) => s.nama_subsidiari === "UKM Holdings");
      if (ukm) setFormData((f) => ({ ...f, subsidiari_id: ukm.subsidiari_id }));
      setSubsidiaryLocked(true);
    } else {
      setFormData((f) => ({ ...f, subsidiari_id: "" }));
      setSubsidiaryLocked(false);
    }
  };

  const handleSave = async () => {
    try {
      const data = new FormData();
      data.append("staff_id", formData.staff_id);
      data.append("nama_penuh", formData.nama_penuh);
      data.append("katalaluan", formData.katalaluan);
      data.append("peranan_id", formData.peranan_id);
      data.append("subsidiari_id", formData.subsidiari_id);
      if (formData.profile_pic) data.append("gambar_profil", formData.profile_pic);
      if (removeProfileFlag) data.append("hapus_gambar", "true");

      let res;
      if (selectedUser) {
        res = await axios.put(
          `http://localhost:5000/api/users/${selectedUser.pengguna_id}`,
          data,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setUsers(
          users.map((u) => (u.pengguna_id === selectedUser.pengguna_id ? res.data : u))
        );
      } else {
        res = await axios.post("http://localhost:5000/api/users", data, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });
        setUsers([...users, res.data]);
      }

      closeModal();
      alert("Pengguna berjaya disimpan ✅");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan pengguna ❌");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/users/${selectedUser.pengguna_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((u) => u.pengguna_id !== selectedUser.pengguna_id));
      closeModal();
      alert("Pengguna berjaya dipadam ✅");
    } catch (err) {
      console.error(err);
      alert("Gagal memadam pengguna ❌");
    }
  };

  return (
    <div className="urus-container">
      <h1>Urus Pengguna</h1>

      {/* Filter bar */}
      <div className="filter-add">
        <input
          placeholder="Carian Nama Penuh atau Staff ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        <select
          value={filterRoleId}
          onChange={(e) => handleFilterRoleChange(e.target.value)}
          className="role-select"
        >
          <option value="">Pilih Peranan</option>
          {roles.map((r) => (
            <option key={r.peranan_id} value={r.peranan_id}>
              {r.nama_peranan}
            </option>
          ))}
        </select>

        <select
          value={filterSubsidiaryId}
          onChange={(e) => setFilterSubsidiaryId(e.target.value)}
          className="role-select"
          disabled={filterSubsidiaryLocked}
        >
          <option value="">Pilih Syarikat</option>
          {subsidiaries.map((s) => (
            <option key={s.subsidiari_id} value={s.subsidiari_id}>
              {s.nama_subsidiari}
            </option>
          ))}
        </select>

        <button className="add-btn" onClick={() => openModal("edit", null)}>
          + Tambah Pengguna
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Bil</th>
              <th>Nama Penuh</th>
              <th>Peranan</th>
              <th>Syarikat</th>
              <th>Staff ID</th>
              <th>Kata Laluan</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  🚫 Tiada pengguna dijumpai
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, i) => {
                const subsidiary = subsidiaries.find(
                  (s) => s.subsidiari_id === u.subsidiari_id
                );
                const profileSrc = u.profile_pic
                  ? `data:image/png;base64,${u.profile_pic}`
                  : null;
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="nama-penuh-cell">
                      {profileSrc ? (
                        <img src={profileSrc} alt="profile" className="profile-pic" />
                      ) : (
                        <UserCircle className="profile-icon" />
                      )}
                      <span>{u.nama_penuh}</span>
                    </td>
                    <td>{u.nama_peranan}</td>
                    <td>{subsidiary ? subsidiary.nama_subsidiari : "-"}</td>
                    <td>{u.staff_id}</td>
                    <td>{u.katalaluan || "-"}</td>
                    <td>
                      <div className="action-icons">
                        <Edit
                          className="edit-icon"
                          onClick={() => openModal("edit", u)}
                        />
                        <Trash2
                          className="delete-icon"
                          onClick={() => openModal("delete", u)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="filter-modal-backdrop">
          <div className="filter-modal">
            {modalType === "delete" ? (
              <>
                <h2>Pengesahan Padam</h2>
                <p>
                  Adakah anda pasti mahu memadam{" "}
                  <strong>{selectedUser?.nama_penuh}</strong>?
                </p>
                <div className="filter-buttons">
                  <button onClick={closeModal}>Batal</button>
                  <button onClick={handleDelete}>Padam</button>
                </div>
              </>
            ) : (
              <>
                <h2>{selectedUser ? "Edit Pengguna" : "Tambah Pengguna"}</h2>

                {/* Profile Upload */}
<div className="profile-upload">
  <div className="profile-wrapper">
    {preview || (formData.profile_pic && !removeProfileFlag) ? (
      <img
        src={
          preview
            ? preview
            : formData.profile_pic instanceof File
            ? URL.createObjectURL(formData.profile_pic)
            : `data:image/png;base64,${formData.profile_pic}`
        }
        alt="preview"
        className="profile-preview"
      />
    ) : (
      <UserCircle className="profile-placeholder" />
    )}

    {(preview || (formData.profile_pic && !removeProfileFlag)) && (
      <Trash2
        className="remove-profile-icon"
        onClick={() => {
          setFormData({ ...formData, profile_pic: null });
          setPreview("");
          setRemoveProfileFlag(true);
        }}
      />
    )}
  </div>

  <input
    type="file"
    accept="image/*"
    onChange={handleFileChange}
    className="profile-input"
  />
</div>


                <input
                  placeholder="Staff ID"
                  value={formData.staff_id}
                  onChange={(e) =>
                    setFormData({ ...formData, staff_id: e.target.value })
                  }
                />
                <input
                  placeholder="Nama Penuh"
                  value={formData.nama_penuh}
                  onChange={(e) =>
                    setFormData({ ...formData, nama_penuh: e.target.value })
                  }
                />
                <input
                  placeholder="Kata Laluan"
                  value={formData.katalaluan}
                  onChange={(e) =>
                    setFormData({ ...formData, katalaluan: e.target.value })
                  }
                />

                <select
                  value={formData.peranan_id}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="">Pilih Peranan</option>
                  {roles.map((r) => (
                    <option key={r.peranan_id} value={r.peranan_id}>
                      {r.nama_peranan}
                    </option>
                  ))}
                </select>

                <select
                  value={formData.subsidiari_id}
                  onChange={(e) =>
                    setFormData({ ...formData, subsidiari_id: e.target.value })
                  }
                  disabled={subsidiaryLocked}
                >
                  <option value="">Pilih Syarikat</option>
                  {subsidiaries.map((s) => (
                    <option key={s.subsidiari_id} value={s.subsidiari_id}>
                      {s.nama_subsidiari}
                    </option>
                  ))}
                </select>

                <div className="filter-buttons">
                  <button onClick={closeModal}>Batal</button>
                  <button onClick={handleSave}>Simpan</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UrusPengguna;
