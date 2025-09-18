import { useState, useEffect } from "react";
import axios from "axios";
import "./UrusPengguna.css";

function UrusPengguna() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedSubsidiary, setSelectedSubsidiary] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(""); // "edit" or "delete"
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    staff_id: "",
    nama_penuh: "",
    katalaluan: "",
    peranan_id: "",
    subsidiari_id: "",
  });

  const token = localStorage.getItem("token");

  // Fetch roles
  useEffect(() => {
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
    fetchRoles();
  }, [token]);

  // Fetch subsidiaries
  useEffect(() => {
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
    fetchSubsidiaries();
  }, [token]);

  // Fetch users
  useEffect(() => {
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
    fetchUsers();
  }, [token]);

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const subsidiary = subsidiaries.find((s) => s.subsidiari_id === u.subsidiari_id);
    return (
      (u.nama_penuh.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.staff_id.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedRole === "" || u.nama_peranan === selectedRole) &&
      (selectedSubsidiary === "" || (subsidiary && subsidiary.nama_subsidiari === selectedSubsidiary))
    );
  });

  // Open Modal
  const openModal = (type, user) => {
    setModalType(type);
    setSelectedUser(user);

    if (type === "edit" && user) {
      setFormData({
        staff_id: user.staff_id,
        nama_penuh: user.nama_penuh,
        katalaluan: user.katalaluan,
        peranan_id: user.peranan_id,
        subsidiari_id: user.subsidiari_id,
      });
    } else {
      setFormData({
        staff_id: "",
        nama_penuh: "",
        katalaluan: "",
        peranan_id: "",
        subsidiari_id: "",
      });
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setModalType("");
  };

  // Handle Save (Tambah / Ubah)
  const handleSave = async () => {
    try {
      if (selectedUser) {
        // Update user
        const res = await axios.put(
          `http://localhost:5000/api/users/${selectedUser.pengguna_id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUsers(users.map((u) => (u.pengguna_id === selectedUser.pengguna_id ? res.data : u)));
      } else {
        // Tambah user
        const res = await axios.post("http://localhost:5000/api/users", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers([...users, res.data]);
      }
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/users/${selectedUser.pengguna_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((u) => u.pengguna_id !== selectedUser.pengguna_id));
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  // Check if selected role is Admin/Executive
  const isAdminOrExec =
    roles.find((r) => r.peranan_id === parseInt(formData.peranan_id))?.nama_peranan === "Admin" ||
    roles.find((r) => r.peranan_id === parseInt(formData.peranan_id))?.nama_peranan === "Executive";

  return (
    <div className="urus-container">
      <h1>Urus Pengguna</h1>

      {/* Filter + Add */}
      <div className="filter-add">
        <input
          type="text"
          placeholder="Carian Nama Penuh atau Staff ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="role-select"
        >
          <option value="">Pilih Peranan</option>
          {roles.map((r) => (
            <option key={r.peranan_id} value={r.nama_peranan}>
              {r.nama_peranan}
            </option>
          ))}
        </select>
        <select
          value={selectedSubsidiary}
          onChange={(e) => setSelectedSubsidiary(e.target.value)}
          className="role-select"
        >
          <option value="">Pilih Subsidiari</option>
          {subsidiaries.map((s) => (
            <option key={s.subsidiari_id} value={s.nama_subsidiari}>
              {s.nama_subsidiari}
            </option>
          ))}
        </select>
        <button className="add-btn" onClick={() => openModal("edit", null)}>
          + Tambah Pengguna
        </button>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {["Bil", "Subsidiari", "Staff ID", "Nama Penuh", "Kata Laluan", "Peranan", "Tindakan"].map(
                (col, i) => (
                  <th key={i}>{col}</th>
                )
              )}
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
                const subsidiary = subsidiaries.find((s) => s.subsidiari_id === u.subsidiari_id);
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{subsidiary ? subsidiary.nama_subsidiari : "❌ Tiada"}</td>
                    <td>{u.staff_id}</td>
                    <td>{u.nama_penuh}</td>
                    <td>{u.katalaluan}</td>
                    <td>{u.nama_peranan}</td>
                    <td>
                      <button className="edit-btn" onClick={() => openModal("edit", u)}>
                        ✏️
                      </button>
                      <button className="delete-btn" onClick={() => openModal("delete", u)}>
                        🗑️
                      </button>
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
        <div className="filter-modal-backdrop" onClick={closeModal}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            {modalType === "delete" ? (
              <>
                <h2>Padam Pengguna</h2>
                <p>
                  Adakah anda pasti mahu memadam <b>{selectedUser.nama_penuh}</b>?
                </p>
                <div className="filter-buttons">
                  <button onClick={closeModal}>Batal</button>
                  <button onClick={handleDelete}>Padam</button>
                </div>
              </>
            ) : (
              <>
                <h2>{selectedUser ? "Ubah Pengguna" : "Tambah Pengguna"}</h2>
                <div className="filter-select">
                  <label>Staff ID</label>
                  <input
                    type="text"
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  />
                </div>
                <div className="filter-select">
                  <label>Nama Penuh</label>
                  <input
                    type="text"
                    value={formData.nama_penuh}
                    onChange={(e) => setFormData({ ...formData, nama_penuh: e.target.value })}
                  />
                </div>
                <div className="filter-select">
                  <label>Kata Laluan</label>
                  <input
                    type="text"
                    value={formData.katalaluan}
                    onChange={(e) => setFormData({ ...formData, katalaluan: e.target.value })}
                  />
                </div>
                <div className="filter-select">
                  <label>Peranan</label>
                  <select
                    value={formData.peranan_id}
                    onChange={(e) => {
                      const selectedRoleId = e.target.value;
                      const selectedRole = roles.find(
                        (r) => r.peranan_id === parseInt(selectedRoleId)
                      );

                      let newFormData = { ...formData, peranan_id: selectedRoleId };

                      // Kalau Admin / Executive → auto UKM Holdings
                      if (
                        selectedRole &&
                        (selectedRole.nama_peranan === "Admin" || selectedRole.nama_peranan === "Executive")
                      ) {
                        const ukm = subsidiaries.find((s) => s.nama_subsidiari === "UKM Holdings");
                        if (ukm) {
                          newFormData.subsidiari_id = ukm.subsidiari_id;
                        }
                      }

                      setFormData(newFormData);
                    }}
                  >
                    <option value="">-- Pilih Peranan --</option>
                    {roles.map((r) => (
                      <option key={r.peranan_id} value={r.peranan_id}>
                        {r.nama_peranan}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-select">
                  <label>Subsidiari</label>
                  <select
                    value={formData.subsidiari_id}
                    onChange={(e) => setFormData({ ...formData, subsidiari_id: e.target.value })}
                    disabled={isAdminOrExec}
                  >
                    <option value="">-- Pilih Subsidiari --</option>
                    {subsidiaries.map((s) => (
                      <option key={s.subsidiari_id} value={s.subsidiari_id}>
                        {s.nama_subsidiari}
                      </option>
                    ))}
                  </select>
                </div>
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
