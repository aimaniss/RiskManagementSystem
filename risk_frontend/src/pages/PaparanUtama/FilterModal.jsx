export default function FilterModal({ filterValues, setFilterValues, setShowModal }) {
  const options = [
    { label: "Tahun Asas", value: "tahunAsas", items: ["2024", "2025"] },
    { label: "Separuh Tahun Asas", value: "separuhAsas", items: ["H1", "H2"] },
    { label: "Tahun Bandingan", value: "tahunBanding", items: ["2024", "2025"] },
    { label: "Separuh Tahun Bandingan", value: "separuhBanding", items: ["H1", "H2"] },
  ];

  return (
    <div className="filter-modal-backdrop">
      <div className="filter-modal">
        <h2>Filter Data</h2>
        <div className="filter-select">
          <label>Subsidiari:</label>
          <select
            value={filterValues.subsidiari}
            onChange={(e) =>
              setFilterValues({ ...filterValues, subsidiari: e.target.value })
            }
          >
            <option value="Semua Subsidiari">Semua Subsidiari</option>
            <option value="Subsidiari A">Subsidiari A</option>
            <option value="Subsidiari B">Subsidiari B</option>
          </select>
        </div>

        <div className="filter-grid">
          {options.map((opt) => (
            <div key={opt.value}>
              <label>{opt.label}:</label>
              <select
                value={filterValues[opt.value]}
                onChange={(e) =>
                  setFilterValues({ ...filterValues, [opt.value]: e.target.value })
                }
              >
                {opt.items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="filter-buttons">
          <button onClick={() => setShowModal(false)}>Cancel</button>
          <button onClick={() => setShowModal(false)}>Apply Filter</button>
        </div>
      </div>
    </div>
  );
}
