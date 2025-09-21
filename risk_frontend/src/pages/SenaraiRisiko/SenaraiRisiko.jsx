import { useState, useEffect } from "react";
import { Trash2, Edit } from "lucide-react";
import api from "../../api/api";
import "./SenaraiRisiko.css";

function SenaraiRisiko({ refreshTrigger, userRole, userSubsidiariId }) {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subsidiariFilter, setSubsidiariFilter] = useState(
    ["Staff", "Ketua Subsidiari"].includes(userRole) ? userSubsidiariId : ""
  );
  const [tahunFilter, setTahunFilter] = useState("");
  const [separuhFilter, setSeparuhFilter] = useState("");
  const [subsidiariList, setSubsidiariList] = useState([]);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/risiko");
      const risksWithMonitoring = res.data.map(r => ({
        ...r,
        status_pemantauan: r.status_pemantauan || ""
      }));
      setRisks(risksWithMonitoring);
    } catch (err) {
      console.error("❌ Error fetch risiko:", err.response?.data || err.message);
      alert("⚠️ Gagal memuatkan data risiko. Sila log masuk semula.");
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  };

  const fetchSubsidiari = async () => {
    try {
      const res = await api.get("/subsidiari");
      setSubsidiariList(res.data);
    } catch (err) {
      console.error("❌ Error fetch subsidiari:", err);
    }
  };

  useEffect(() => {
    fetchRisks();
    fetchSubsidiari();
  }, [refreshTrigger]);

  const filteredRisks = risks.filter(r =>
    (!subsidiariFilter || r.subsidiari_id === parseInt(subsidiariFilter)) &&
    (!tahunFilter || r.tahun === parseInt(tahunFilter)) &&
    (!separuhFilter || r.separuh_tahun === separuhFilter)
  );

  const getRiskColor = (score) => {
    if (score <= 3) return "#22c55e";
    if (score <= 7) return "#eab308";
    if (score <= 12) return "#f97316";
    return "#ef4444";
  };

  const getRiskLabelShort = (score) => {
    if (score <= 3) return "R";
    if (score <= 7) return "S";
    if (score <= 12) return "T";
    return "ST";
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Adakah anda pasti mahu padam risiko ini?")) return;
    try {
      await api.delete(`/risiko/${id}`);
      fetchRisks();
    } catch (err) {
      console.error("❌ Error delete risiko:", err.response?.data || err.message);
      alert("⚠️ Gagal padam risiko. Sila cuba semula.");
    }
  };

  const handleEdit = (id) => {
    window.location.href = `/risiko/edit/${id}`;
  };

  return (
    <div className="senarai-risiko-container">
      <h1>Senarai Risiko</h1>

      {/* Filter */}
      <div className="filter-container">
        {["Admin", "Executive"].includes(userRole) && (
          <select value={subsidiariFilter} onChange={(e) => setSubsidiariFilter(e.target.value)}>
            <option value="">-- Semua Subsidiari --</option>
            {subsidiariList.map(s => (
              <option key={s.subsidiari_id} value={s.subsidiari_id}>{s.nama_subsidiari}</option>
            ))}
          </select>
        )}

        <select value={tahunFilter} onChange={(e) => setTahunFilter(e.target.value)}>
          <option value="">-- Semua Tahun --</option>
          {[...new Set(risks.map(r => r.tahun))].sort((a,b) => b-a).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select value={separuhFilter} onChange={(e) => setSeparuhFilter(e.target.value)}>
          <option value="">-- Semua Separuh Tahun --</option>
          <option value="H1">H1</option>
          <option value="H2">H2</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="risiko-table">
          <thead>
            <tr>
              <th>No Rujukan</th>
              <th>Tahun</th>
              <th>Separuh Tahun</th>
              <th>Subsidiari</th>
              <th>Bahagian</th>
              <th>Kategori</th>
              <th>Risiko</th>
              <th>Skor Risiko</th>
              <th>Status Risiko</th>
              <th>Status Pemantauan</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loader-row">
                <td colSpan="11" className="center">⏳ Sedang memuat data...</td>
              </tr>
            ) : filteredRisks.length === 0 ? (
              <tr>
                <td colSpan="11" className="center">🚫 Tiada data risiko</td>
              </tr>
            ) : (
              filteredRisks.map((r) => {
                const color = getRiskColor(r.skor_risiko);
                const shortLabel = getRiskLabelShort(r.skor_risiko);

                return (
                  <tr key={r.id}>
                    <td className="center">{r.no_rujukan}</td>
                    <td className="center">{r.tahun}</td>
                    <td className="center">{r.separuh_tahun}</td>
                    <td className="center">{r.subsidiari}</td>
                    <td className="center">{r.bahagian}</td>
                    <td className="center">{r.kategori}</td>
                    <td className="justify">{r.risiko}</td>
                    <td className="center" style={{ backgroundColor: color, color: "#000", fontWeight: 600 }}>
                      {shortLabel}
                    </td>
                    <td className="center">{r.status_risiko}</td>
                    <td className="center">{r.status_pemantauan || "—"}</td>
                    <td className="center">
                      <div className="action-buttons">
                        <button onClick={() => handleEdit(r.id)} className="edit-btn">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="delete-btn">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SenaraiRisiko;
