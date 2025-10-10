import { useState, useEffect } from "react";
import { Edit, X } from "lucide-react";
import api from "../../api/api"; // axios instance
import "./RawatanRisiko.css";

function RawatanRisiko() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [separuhFilter, setSeparuhFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // --- Edit Modal State ---
  const [showModal, setShowModal] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [form, setForm] = useState({
    plan_tindakan: "",
    jenis_kawalan: "",
    tempoh_jangkaan_siap: "",
    kakitangan_bertanggungjawab: "",
  });

  // --- Risk Matrix (sama dengan SenaraiRisiko) ---
  const riskMatrix = {
    1: {
      1: { label: "Rendah", color: "#22c55e" },
      2: { label: "Rendah", color: "#22c55e" },
      3: { label: "Sederhana", color: "#eab308" },
      4: { label: "Sederhana", color: "#eab308" },
      5: { label: "Tinggi", color: "#f97316" },
    },
    2: {
      1: { label: "Rendah", color: "#22c55e" },
      2: { label: "Rendah", color: "#22c55e" },
      3: { label: "Sederhana", color: "#eab308" },
      4: { label: "Sederhana", color: "#eab308" },
      5: { label: "Tinggi", color: "#f97316" },
    },
    3: {
      1: { label: "Rendah", color: "#22c55e" },
      2: { label: "Sederhana", color: "#eab308" },
      3: { label: "Sederhana", color: "#eab308" },
      4: { label: "Tinggi", color: "#f97316" },
      5: { label: "Tinggi", color: "#f97316" },
    },
    4: {
      1: { label: "Sederhana", color: "#eab308" },
      2: { label: "Sederhana", color: "#eab308" },
      3: { label: "Tinggi", color: "#f97316" },
      4: { label: "Tinggi", color: "#f97316" },
      5: { label: "Sangat Tinggi", color: "#ef4444" },
    },
    5: {
      1: { label: "Sederhana", color: "#eab308" },
      2: { label: "Tinggi", color: "#f97316" },
      3: { label: "Tinggi", color: "#f97316" },
      4: { label: "Sangat Tinggi", color: "#ef4444" },
      5: { label: "Sangat Tinggi", color: "#ef4444" },
    },
  };

  const getRiskData = (k, i) => {
    if (!riskMatrix[k] || !riskMatrix[k][i])
      return { label: "-", color: "#f1f5f9" };
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
  useEffect(() => {
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
        setData(dataWithScore);
      } catch (err) {
        console.error("❌ Gagal fetch rawatan risiko:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Filter ---
  const filteredData = data.filter((d) => {
    const matchSearch = d.no_rujukan
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchTahun = !tahunFilter || d.tahun === parseInt(tahunFilter);
    const matchSeparuh =
      !separuhFilter || d.separuh_tahun === parseInt(separuhFilter);
    return matchSearch && matchTahun && matchSeparuh;
  });

  // --- Metric Cards ---
  const risikoAktif = filteredData.length;
  const planRawatan = filteredData.filter((d) => d.plan_tindakan).length;

  // --- Edit Handler ---
  const handleEdit = (item) => {
    setSelectedData(item);
    setForm({
      plan_tindakan: item.plan_tindakan || "",
      jenis_kawalan: item.jenis_kawalan || "",
      tempoh_jangkaan_siap: item.tempoh_jangkaan_siap || "",
      kakitangan_bertanggungjawab: item.kakitangan_bertanggungjawab || "",
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await api.put(`/rawatan/${selectedData.rawatan_id}`, form);
      alert("✅ Berjaya kemas kini maklumat rawatan!");
      setShowModal(false);

      // Refresh data
      const res = await api.get("/rawatan");
      const dataWithScore = res.data.map((d) => {
        const k = parseInt(d.skor_kebarangkalian) || 0;
        const i = parseInt(d.skor_impak) || 0;
        const { label, color } = getRiskData(k, i);
        return { ...d, tahap_risiko: label, risk_color: color };
      });
      setData(dataWithScore);
    } catch (err) {
      console.error("❌ Gagal update rawatan:", err);
      alert("Gagal kemas kini data!");
    }
  };

  const renderSeparuhTahun = (v) =>
    v === 1 ? "Pertama" : v === 2 ? "Kedua" : "-";

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
        <select
          value={tahunFilter}
          onChange={(e) => setTahunFilter(e.target.value)}
        >
          <option value="">-- Semua Tahun --</option>
          {[...new Set(data.map((d) => d.tahun))]
            .sort((a, b) => b - a)
            .map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
        </select>
        <select
          value={separuhFilter}
          onChange={(e) => setSeparuhFilter(e.target.value)}
        >
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
                    <button
                      onClick={() => handleEdit(d)}
                      className="btn-edit"
                    >
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Rawatan Risiko</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <label>Pelan Tindakan</label>
              <textarea
                name="plan_tindakan"
                value={form.plan_tindakan}
                onChange={handleChange}
              />

              <label>Jenis Kawalan</label>
              <input
                type="text"
                name="jenis_kawalan"
                value={form.jenis_kawalan}
                onChange={handleChange}
              />

              <label>Tempoh Jangkaan Siap</label>
              <input
                type="text"
                name="tempoh_jangkaan_siap"
                value={form.tempoh_jangkaan_siap}
                onChange={handleChange}
              />

              <label>Kakitangan Bertanggungjawab</label>
              <input
                type="text"
                name="kakitangan_bertanggungjawab"
                value={form.kakitangan_bertanggungjawab}
                onChange={handleChange}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-cancel">
                Batal
              </button>
              <button onClick={handleSave} className="btn-save">
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RawatanRisiko;
