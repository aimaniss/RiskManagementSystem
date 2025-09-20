import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
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
      setRisks(res.data);
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
    if (score <= 3) return "#22c55e"; // R - hijau
    if (score <= 7) return "#eab308"; // S - kuning
    if (score <= 12) return "#f97316"; // T - oren
    return "#ef4444"; // ST - merah
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

  return (
    <div className="senarai-risiko-container">
      <h1>Senarai Risiko</h1>

      {/* Filter */}
      <div className="filter-container">
        {/* Hanya paparkan dropdown Subsidiari untuk Admin/Executive */}
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

      {loading ? (
        <p>⏳ Memuatkan data...</p>
      ) : filteredRisks.length === 0 ? (
        <p>🚫 Tiada data risiko</p>
      ) : (
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
                <th>Punca</th>
                <th>Kesan</th>
                <th>Skor Risiko</th>
                <th>Status Risiko</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {filteredRisks.map((r) => {
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

                    <td className="justify">
                      <ol className="number-list">
                        {r.punca?.map((p, idx) => <li key={idx}>{p}</li>)}
                      </ol>
                    </td>

                    <td className="justify">
                      <ol className="number-list">
                        {r.kesan?.map((k, idx) => <li key={idx}>{k}</li>)}
                      </ol>
                    </td>

                    <td className="center" style={{ backgroundColor: color, color: "#000", fontWeight: 600 }}>
                      {shortLabel}
                    </td>
                    <td className="center">{r.status_risiko}</td>
                    <td className="center">
                      <button onClick={() => handleDelete(r.id)} className="delete-btn">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SenaraiRisiko;
