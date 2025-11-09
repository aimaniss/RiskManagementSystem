import React, { useState, useEffect } from "react";
import "./PaparanUtama.css";

export default function FilterModal({
  filterValues,
  setFilterValues,
  setShowModal,
  subsidiariOptions
}) {
  const initialId = filterValues.subsidiariId ?? "Semua";
  const [tempId, setTempId] = useState(initialId);

  const options = [
    { subsidiari_id: "Semua", nama_subsidiari: "Semua Subsidiari" },
    ...(Array.isArray(subsidiariOptions) ? subsidiariOptions : []),
  ];

  const handleApply = () => {
    const selected = options.find((o) => String(o.subsidiari_id) === String(tempId));
    const nama = selected ? selected.nama_subsidiari : "Semua Subsidiari";

    setFilterValues({
      subsidiari: nama,
      subsidiariId: String(tempId),
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
