import React, { useState } from "react";
// Anda perlukan CSS untuk modal ini, contoh:
// import "./FilterModal.css";

export default function FilterModal({ filterValues, setFilterValues, setShowModal }) {
  
  // 1. Guna state sementara untuk uruskan pilihan dalam modal
  // Ini membenarkan pengguna klik "Cancel" tanpa menyimpan perubahan
  const [tempSubsidiari, setTempSubsidiari] = useState(filterValues.subsidiari);

  // Senaraikan semua pilihan subsidiari anda di sini
  // "Semua Subsidiari" akan memaparkan DashboardKeseluruhan
  const subsidiariOptions = [
    "Semua Subsidiari",
    "Subsidiari A",
    "Subsidiari B",
    "Subsidiari C", // Tambah seberapa banyak yang anda perlu
  ];

  // 2. Fungsi apabila "Apply Filter" ditekan
  const handleApply = () => {
    // Kemas kini state utama di 'App' atau 'Page'
    setFilterValues({ 
      ...filterValues, // Kekalkan apa-apa filter lain (jika ada)
      subsidiari: tempSubsidiari // Simpan pilihan baru
    });
    setShowModal(false); // Tutup modal
  };

  // 3. Fungsi apabila "Cancel" ditekan
  const handleCancel = () => {
    // Tidak berbuat apa-apa pada state, terus tutup modal
    setShowModal(false);
  };

  return (
    <div className="filter-modal-backdrop">
      <div className="filter-modal">
        <h2>Pilih Paparan Dashboard</h2>
        <div className="filter-select">
          <label>Paparkan data untuk:</label>
          <select
            value={tempSubsidiari} // Guna state sementara
            onChange={(e) => setTempSubsidiari(e.target.value)} // Kemas kini state sementara
          >
            {subsidiariOptions.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        {/* --- Bahagian filter perbandingan (grid) telah dibuang --- */}

        <div className="filter-buttons">
          <button onClick={handleCancel} className="btn-cancel">Cancel</button>
          <button onClick={handleApply} className="btn-apply">Apply Filter</button>
        </div>
      </div>
    </div>
  );
}