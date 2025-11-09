import React, { useState, useEffect } from "react";
import "./PaparanUtama.css";

export default function FilterModal({
  filterValues,
  setFilterValues,
  setShowModal,
  subsidiariOptions,
  currentUser, // <-- 1. Terima prop currentUser
}) {
  const initialId = filterValues.subsidiariId ?? "Semua";
  const [tempId, setTempId] = useState(initialId);

  // 2. Tentukan peranan pengguna
  const adminRoles = [1, 2]; // 1: ADMIN, 2: EXECUTIVE
  const isAdmin = adminRoles.includes(currentUser?.peranan_id);

  // 3. Bina senarai pilihan (options) secara dinamik
  // Mula dengan senarai asas
  const baseOptions = Array.isArray(subsidiariOptions) ? subsidiariOptions : [];
  
  // Hanya tambah "Semua Subsidiari" jika pengguna ialah Admin atau Executive
  const options = isAdmin
    ? [
        { subsidiari_id: "Semua", nama_subsidiari: "Semua Subsidiari" },
        ...baseOptions,
      ]
    : baseOptions; // Pengguna biasa hanya nampak senarai subsidiari

  const handleApply = () => {
    // Logik ini sepatutnya masih berfungsi dengan betul
    const selected = options.find((o) => String(o.subsidiari_id) === String(tempId));
    
    // Jika 'selected' tidak ditemui (cth: pengguna bukan admin tapi 'tempId' entah bagaimana 'Semua'),
    // ia akan menggunakan 'fallback' "Semua Subsidiari",
    // tetapi 'PaparanUtama' akan menukarnya kembali ke dashboard subsidiari pengguna.
    // Walau bagaimanapun, 'fallback' yang lebih selamat ialah pilihan pertama yang ada.
    const safeSelected = selected || options[0]; // Fallback ke item pertama jika berlaku ralat

    const nama = safeSelected ? safeSelected.nama_subsidiari : "";
    const id = safeSelected ? String(safeSelected.subsidiari_id) : "";
    
    setFilterValues({
      subsidiari: nama,
      subsidiariId: id,
      subsidiariName: nama,
    });
    setShowModal(false);
  };

  return (
    <div className="filter-modal-backdrop">
      <div className="filter-modal">
        <h2>Pilih Paparan Dashboard</h2>

        <div className="filter-select">
          <label>Paparkan data untuk:</label>
          {/* 4. Dropdown kini memaparkan 'options' yang telah ditapis */}
          <select value={tempId} onChange={(e) => setTempId(e.target.value)}>
            {options.map((opt) => (
              <option key={opt.subsidiari_id} value={opt.subsidiari_id}>
                {opt.nama_subsidiari}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-buttons">
          <button className="btn-cancel" onClick={() => setShowModal(false)}>
            Batal
          </button>
          <button className="btn-apply" onClick={handleApply}>
            Guna Tapisan
          </button>
        </div>
      </div>
    </div>
  );
}