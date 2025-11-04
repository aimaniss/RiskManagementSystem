import { useState, useEffect } from "react";
import { Trash2, Edit } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import api from "../../api/api";
import EditModalRisiko from "./EditModalRisiko";
import "./SenaraiRisiko.css"; // Pastikan nama fail CSS dikemaskini jika perlu

function SenaraiRisiko({ refreshTrigger }) {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subsidiariFilter, setSubsidiariFilter] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [separuhFilter, setSeparuhFilter] = useState("");
  const [subsidiariList, setSubsidiariList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);

  // Decode JWT
  const token = localStorage.getItem("token");
  let userRole = "";
  let userSubsidiariId = "";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      const roleMapping = {
        1: "ADMIN",
        2: "EXECUTIVE",
        3: "KETUA SUBSIDIARI",
        4: "STAFF",
        5: "VIEWER",
      };
      userRole = roleMapping[decoded.peranan_id] || "";
      userSubsidiariId = decoded.subsidiari_id || "";
    } catch (err) {
      console.error("❌ Invalid token", err);
      localStorage.removeItem("token");
    }
  }

  // Risiko matrix
  const riskMatrix = {
    1: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    2: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    3: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Tinggi",color:"#f97316"}},
    4: {1:{label:"Sederhana",color:"#eab308"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
    5: {1:{label:"Sederhana",color:"#eab308"},2:{label:"Tinggi",color:"#f97316"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Sangat Tinggi",color:"#ef4444"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
  };

  const getRiskData = (k, i) => {
    if (!riskMatrix[k] || !riskMatrix[k][i]) return { label: "-", color: "#f1f5f9" };
    return riskMatrix[k][i];
  };

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/risiko");
      const risksWithColor = res.data.map(r => {
        const k = parseInt(r.skor_kebarangkalian) || 0;
        const i = parseInt(r.skor_impak) || 0;
        const { label, color } = getRiskData(k, i);
        return { 
          ...r, 
          tahap_risiko: label, 
          risk_color: color,
          status_pemantauan: r.status_pemantauan || ""
        };
      });
      setRisks(risksWithColor);
    } catch (err) {
      console.error(err);
      alert("⚠️ Gagal memuatkan data risiko. Sila log masuk semula.");
      window.location.href = "/login";
    } finally { setLoading(false); }
  };

  const fetchSubsidiari = async () => {
    try {
      const res = await api.get("/subsidiari");
      setSubsidiariList(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchRisks(); fetchSubsidiari(); }, [refreshTrigger]);

  const filteredRisks = risks.filter(r => {
    const matchSearch = (r.no_rujukan || "").toLowerCase().includes(search.toLowerCase());
    const matchSubsidiari = ["STAFF","KETUA SUBSIDIARI"].includes(userRole)
      ? r.subsidiari_id === userSubsidiariId
      : !subsidiariFilter || r.subsidiari_id === parseInt(subsidiariFilter);
    const matchTahun = !tahunFilter || r.tahun === parseInt(tahunFilter);
    const matchSeparuh = !separuhFilter || r.separuh_tahun === separuhFilter;
    return matchSearch && matchSubsidiari && matchTahun && matchSeparuh;
  });

  const handleDelete = async id => {
    if (!window.confirm("Adakah anda pasti mahu padam risiko ini?")) return;
    try { await api.delete(`/risiko/${id}`); fetchRisks(); }
    catch (err) { console.error(err); alert("⚠️ Gagal padam risiko."); }
  };

  const handleEdit = risk => { setSelectedRisk(risk); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedRisk(null); };
  const handleSaveModal = async updatedRisk => {
    try { await api.put(`/risiko/${updatedRisk.id}`, updatedRisk); fetchRisks(); handleCloseModal(); }
    catch (err) { console.error(err); alert("⚠️ Gagal kemaskini risiko."); }
  };

  const shortForm = label => {
    if (label === "Rendah") return "R";
    if (label === "Sederhana") return "S";
    if (label === "Tinggi") return "T";
    if (label === "Sangat Tinggi") return "ST";
    return "-";
  };

  return (
    <div className="rm-container">
      <h1>Senarai Risiko</h1>

      <div className="rm-filter-container">
        <input 
          type="text" 
          placeholder="Cari No Rujukan..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />

        <select
          value={["STAFF","KETUA SUBSIDIARI"].includes(userRole) ? userSubsidiariId : subsidiariFilter}
          onChange={e => setSubsidiariFilter(e.target.value)}
          disabled={["STAFF","KETUA SUBSIDIARI"].includes(userRole)}
        >
          <option value="">-- Semua Subsidiari --</option>
          {subsidiariList.map(s => (
            <option key={s.subsidiari_id} value={s.subsidiari_id}>
              {s.nama_subsidiari}
            </option>
          ))}
        </select>

        <select value={tahunFilter} onChange={e => setTahunFilter(e.target.value)}>
          <option value="">-- Semua Tahun --</option>
          {[...new Set(risks.map(r => r.tahun))].sort((a,b)=>b-a).map(t=>(<option key={t} value={t}>{t}</option>))}
        </select>

        <select value={separuhFilter} onChange={e => setSeparuhFilter(e.target.value)}>
          <option value="">-- Semua Separuh Tahun --</option>
          <option value="Pertama">Pertama</option>
          <option value="Kedua">Kedua</option>
        </select>
      </div>

      <div className="rm-table-wrapper">
        <table className="rm-risiko-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>No Rujukan</th>
              <th>Tahun</th>
              <th>Separuh Tahun</th>
              <th>Subsidiari</th>
              <th>Bahagian</th>
              <th>Kategori</th>
              <th>Risiko</th>
              <th>Skor Kebarangkalian</th>
              <th>Skor Impak</th>
              <th>Skor Risiko</th>
              <th>Status Risiko</th>
              <th>Status Pemantauan</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="rm-loader-row"><td colSpan="14" className="rm-center">⏳ Sedang memuat data...</td></tr>
            ) : filteredRisks.length === 0 ? (
              <tr><td col colspan="14" className="rm-center">🚫 Tiada data risiko</td></tr>
            ) : filteredRisks.map((r,index) => (
              <tr key={r.id}>
                <td className="rm-center rm-no-bil">{index + 1}</td>
                <td className="rm-left">{r.no_rujukan}</td>
                <td className="rm-center">{r.tahun}</td>
                <td className="rm-center">{r.separuh_tahun}</td>
                <td className="rm-center">{r.subsidiari}</td>
                <td className="rm-center">{r.bahagian}</td>
                <td className="rm-center">{r.kategori}</td>
                <td className="rm-justify">{r.risiko}</td>
                <td className="rm-center">{r.skor_kebarangkalian || "-"}</td>
                <td className="rm-center">{r.skor_impak || "-"}</td>
                <td className="rm-center">
                  <div className="rm-risk-box" style={{backgroundColor: r.risk_color}}>
                    {shortForm(r.tahap_risiko)}
                  </div>
                </td>
                <td className="rm-center">{r.status_risiko}</td>
                <td className="rm-center">{r.status_pemantauan || "—"}</td>
                <td className="rm-center">
                  <div className="rm-action-buttons">
                    <button onClick={()=>handleEdit(r)} className="rm-edit-btn"><Edit size={16}/></button>
                    <button onClick={()=>handleDelete(r.id)} className="rm-delete-btn"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

     {selectedRisk && (
  <EditModalRisiko 
    isOpen={isModalOpen}          // <--- tambah ni
    risk={selectedRisk} 
    subsidiariList={subsidiariList} 
    userRole={userRole}
    userSubsidiariId={userSubsidiariId}
    onClose={handleCloseModal} 
    onSave={handleSaveModal} 
  />
)}

    </div>
  );
}

export default SenaraiRisiko;