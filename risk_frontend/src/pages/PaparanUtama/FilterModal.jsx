// FilterModal.jsx (updated)
import React, { useState, useEffect } from "react";
import "./PaparanUtama.css";

export default function FilterModal({
  filterValues,
  setFilterValues,
  setShowModal,
  subsidiariOptions // expect array of { subsidiari_id, nama_subsidiari } or undefined
}) {
  const [tempSubsId, setTempSubsId] = useState(filterValues.subsidiariId ?? "Semua");

  const optionsList = (subsidiariOptions && subsidiariOptions.length > 0)
    ? [{ subsidiari_id: "Semua", nama_subsidiari: "Semua Subsidiari" }, ...subsidiariOptions]
    : [{ subsidiari_id: "Semua", nama_subsidiari: "Semua Subsidiari" }];

  const handleApply = () => {
    const selected = optionsList.find(o => String(o.subsidiari_id) === String(tempSubsId));
    setFilterValues({
      ...filterValues,
      subsidiariId: tempSubsId,
      subsidiariName: selected ? selected.nama_subsidiari : tempSubsId
    });
    setShowModal(false);
  };

  return (
    <div className="filter-modal-backdrop">
      <div className="filter-modal">
        <h2>Pilih Paparan Dashboard</h2>
        <div className="filter-select">
          <label>Paparkan data untuk:</label>
          <select value={tempSubsId} onChange={(e) => setTempSubsId(e.target.value)}>
            {optionsList.map(opt => (
              <option key={opt.subsidiari_id} value={opt.subsidiari_id}>
                {opt.nama_subsidiari}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-buttons">
          <button onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
          <button onClick={handleApply} className="btn-apply">Apply Filter</button>
        </div>
      </div>
    </div>
  );
}
