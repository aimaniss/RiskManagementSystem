import { useState, useEffect } from "react";
import { Edit } from "lucide-react";
import api from "../../api/api";
import EditRawatan from "./EditRawatan"; // Modal di fail lain
import "./RawatanRisiko.css";

function RawatanRisiko() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [separuhFilter, setSeparuhFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  // --- Placeholder untuk dropdown modal (boleh fetch dari DB nanti) ---
  const pelanList = [
    "Kurangkan Risiko",
    "Pindahkan Risiko",
    "Terima Risiko",
    "Elakkan Risiko",
  ];
  const kakitanganList = [
    "Ali",
    "Fatimah",
    "Siti",
    "Rahman",
    "Aiman",
  ];

  // --- Risk Matrix ---
  const riskMatrix = {
    1: { 1: { label: "Rendah", color: "#22c55e" }, 2: { label: "Rendah", color: "#22c55e" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
    2: { 1: { label: "Rendah", color: "#22c55e" }, 2: { label: "Rendah", color: "#22c55e" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
    3: { 1: { label: "Rendah", color: "#22c55e" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Tinggi", color: "#f97316" } },
    4: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
    5: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Tinggi", color: "#f97316" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Sangat Tinggi", color: "#ef4444" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
  };

  const getRiskData = (k, i) => {
    if (!riskMatrix[k] || !riskMatrix[k][i]) return { label: "-", color: "#f1f5f9" };
    return riskMatrix[k][i];
  };

  const shortForm = (label) => {
    if (label === "Rendah") return "R";
    if (label === "Sederhana") return "S";
    if (label === "Tinggi") return "T";
    if (label === "Sangat Tinggi") return "ST";
    return "-";
  };

  // --- Fetch Data dari Backend ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rawatan");
      const dataWithScore = res.data.map((d) => {
        const k = parseInt(d.skor_kebarangkalian) || 0;
        const i = parseInt(d.skor_impak) || 0;
        const { label, color } = getRiskData(k, i);
        return { ...d, tahap_risiko: label, risk_color: color };
      });

      // Sort ikut tahun (desc) dan separuh_tahun (desc)
      dataWithScore.sort((a, b) => {
        if (b.tahun !== a.tahun) return b.tahun - a.tahun;
        return b.separuh_tahun - a.separuh_tahun;
      });

      setData(dataWithScore);
    } catch (err) {
      console.error("❌ Gagal fetch rawatan risiko:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Filter ---
  const filteredData = data.filter((d) => {
    const matchSearch = d.no_rujukan?.toLowerCase().includes(search.toLowerCase());
    const matchTahun = !tahunFilter || d.tahun === parseInt(tahunFilter);
    const matchSeparuh = !separuhFilter || d.separuh_tahun === parseInt(separuhFilter);
    return matchSearch && matchTahun && matchSeparuh;
  });

  const risikoAktif = filteredData.length;
  const planRawatan = filteredData.filter((d) => d.plan_tindakan).length;

  const handleEdit = (item) => {
    setSelectedData(item);
    setShowModal(true);
  };

  const handleSaveRawatan = (updatedData) => {
    console.log("✅ Data dikemaskini:", updatedData);
    setShowModal(false);
    fetchData(); // refresh data lepas simpan
  };

  const renderSeparuhTahun = (v) => (v === 1 ? "Pertama" : v === 2 ? "Kedua" : "-");

  return (
    <div className="senarai-risiko-container">
      <h1>Rawatan Risiko</h1>

      {/* Cards */}
      <div className="cards-container">
        <div className="info-card">
          <h3>Bilangan Risiko Aktif</h3>
          <p>{risikoAktif}</p>
        </div>
        <div className="info-card">
          <h3>Bilangan Plan Rawatan</h3>
          <p>{planRawatan}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="filter-container">
        <input
          type="text"
          placeholder="Cari No Rujukan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={tahunFilter} onChange={(e) => setTahunFilter(e.target.value)}>
          <option value="">-- Semua Tahun --</option>
          {[...new Set(data.map((d) => d.tahun))].sort((a, b) => b - a).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={separuhFilter} onChange={(e) => setSeparuhFilter(e.target.value)}>
          <option value="">-- Semua Separuh Tahun --</option>
          <option value="1">Pertama</option>
          <option value="2">Kedua</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="risiko-table">
          <thead>
            <tr>
              <th>Bil.</th>
              <th>No Rujukan</th>
              <th>Tahun</th>
              <th>Separuh Tahun</th>
              <th>Nama Subsidiari</th>
              <th>Kategori Risiko</th>
              <th>Risiko</th>
              <th>Skor Risiko</th>
              <th>Plan Tindakan</th>
              <th>Jenis Kawalan</th>
              <th>Tempoh Siap</th>
              <th>Kakitangan</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="13" className="loading">
                  Loading...
                </td>
              </tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((d, i) => (
                <tr key={d.rawatan_id || d.risiko_id}>
                  <td>{i + 1}</td>
                  <td>{d.no_rujukan}</td>
                  <td>{d.tahun}</td>
                  <td>{renderSeparuhTahun(d.separuh_tahun)}</td>
                  <td>{d.nama_subsidiari || "-"}</td>
                  <td>{d.kategori}</td>
                  <td>{d.risiko}</td>
                  <td className="center">
                    <div
                      className="risk-box"
                      style={{
                        backgroundColor: d.risk_color,
                        color: "#fff",
                        borderRadius: "6px",
                        width: "40px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "600",
                        margin: "auto",
                      }}
                    >
                      {shortForm(d.tahap_risiko)}
                    </div>
                  </td>
                  <td>{d.plan_tindakan || "-"}</td>
                  <td>{d.jenis_kawalan || "-"}</td>
                  <td>{d.tempoh_jangkaan_siap || "-"}</td>
                  <td>{d.kakitangan_bertanggungjawab || "-"}</td>
                  <td className="actions">
                    <button onClick={() => handleEdit(d)} className="btn-edit">
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="13" className="no-data">
                  Tiada data dijumpai
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Modal Edit --- */}
      {showModal && (
        <EditRawatan
          isOpen={showModal}
          rawatan={selectedData}
          pelanList={pelanList}
          kakitanganList={kakitanganList}
          onClose={() => setShowModal(false)}
          onSave={handleSaveRawatan}
        />
      )}
    </div>
  );
}

export default RawatanRisiko;
