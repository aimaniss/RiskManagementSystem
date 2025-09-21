import { useState, useEffect } from "react";
import { FaUserCircle } from "react-icons/fa";
import api from "../../api/api";
import "./UrusPengguna.css";

function UrusPengguna() {
  const [pengguna, setPengguna] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nama_penuh: "",
    subsidiari: "",
    staff_id: "",
    kata_laluan: "",
    peranan: "",
    profile_pic: "",
  });
  const [preview, setPreview] = useState(null);

  // Fetch pengguna
  useEffect(() => {
    const fetchPengguna = async () => {
      try {
        const res = await api.get("/pengguna");
        setPengguna(res.data);
      } catch (err) {
        console.error("❌ Error fetch pengguna:", err);
      }
    };
    fetchPengguna();
  }, []);

  // Filter data
  const filteredPengguna = pengguna.filter((p) => {
    return (
      (p.nama_penuh?.toLowerCase().includes(search.toLowerCase()) ||
        p.staff_id?.toLowerCase().includes(search.toLowerCase()) ||
        p.subsidiari?.toLowerCase().includes(search.toLowerCase())) &&
      (roleFilter ? p.peranan === roleFilter : true)
    );
  });

  // Hapus pengguna
  const handleDelete = async (id) => {
    if (!window.confirm("Padam pengguna ini?")) return;
    try {
      await api.delete(`/pengguna/${id}`);
      setPengguna((prev) => prev.filter((p) => p.pengguna_id !== id));
    } catch (err) {
      console.error("❌ Error delete pengguna:", err);
    }
  };

  // Upload & preview gambar
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profile_pic: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  // Simpan pengguna baru (demo)
  const handleSave = () => {
    console.log("Simpan pengguna:", formData);
    setIsModalOpen(false);
    setPreview(null);
    setFormData({
      nama_penuh: "",
      subsidiari: "",
      staff_id: "",
      kata_laluan: "",
      peranan: "",
      profile_pic: "",
    });
  };

  return (
    <div className="urus-container">
      <h1>Urus Pengguna</h1>

      {/* Filter + Add */}
      <div className="filter-add">
        <input
          type="text"
          placeholder="Cari nama / staff ID / subsidiari..."
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="role-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Semua Peranan</option>
          <option value="Admin">Admin</option>
          <option value="Executive">Executive</option>
          <option value="Viewer">Viewer</option>
        </select>

        <button className="add-btn" onClick={() => setIsModalOpen(true)}>
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
              <th>Subsidiari</th>
              <th>Staff ID</th>
              <th>Kata Laluan</th>
              <th>Peranan</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {filteredPengguna.length > 0 ? (
              filteredPengguna.map((p, index) => (
                <tr key={p.pengguna_id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="nama-penuh-cell">
                      {p.profile_pic ? (
                        <img
                          src={p.profile_pic}
                          alt="profile"
                          className="profile-pic"
                        />
                      ) : (
                        <FaUserCircle className="profile-icon" />
                      )}
                      <span className="nama-text">{p.nama_penuh}</span>
                    </div>
                  </td>
                  <td>{p.subsidiari}</td>
                  <td>{p.staff_id}</td>
                  <td>{p.kata_laluan}</td>
                  <td>{p.peranan}</td>
                  <td>
                    <button className="edit-btn">Edit</button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(p.pengguna_id)}
                    >
                      Padam
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  Tiada pengguna ditemui
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah */}
      {isModalOpen && (
        <div className="filter-modal-backdrop">
          <div className="filter-modal">
            <h2>Tambah Pengguna</h2>

            {/* Gambar Profil */}
            <div className="profile-upload">
              {preview ? (
                <img src={preview} alt="preview" className="profile-preview" />
              ) : (
                <FaUserCircle className="profile-placeholder" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <input
              type="text"
              placeholder="Nama penuh"
              value={formData.nama_penuh}
              onChange={(e) =>
                setFormData({ ...formData, nama_penuh: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Subsidiari"
              value={formData.subsidiari}
              onChange={(e) =>
                setFormData({ ...formData, subsidiari: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Staff ID"
              value={formData.staff_id}
              onChange={(e) =>
                setFormData({ ...formData, staff_id: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Kata Laluan"
              value={formData.kata_laluan}
              onChange={(e) =>
                setFormData({ ...formData, kata_laluan: e.target.value })
              }
            />
            <select
              value={formData.peranan}
              onChange={(e) =>
                setFormData({ ...formData, peranan: e.target.value })
              }
            >
              <option value="">Pilih Peranan</option>
              <option value="Admin">Admin</option>
              <option value="Executive">Executive</option>
              <option value="Viewer">Viewer</option>
            </select>

            <div className="filter-buttons">
              <button onClick={() => setIsModalOpen(false)}>Batal</button>
              <button onClick={handleSave}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UrusPengguna;
