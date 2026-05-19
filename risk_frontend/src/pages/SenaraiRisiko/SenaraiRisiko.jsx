import { useState, useEffect } from "react";
import { Trash2, Search } from "lucide-react"; 
import { jwtDecode } from "jwt-decode";
import api from "../../api/api";
import ViewRisikoModal from "./ViewRisikoModal";
import "./SenaraiRisiko.css";

function SenaraiRisiko({ refreshTrigger }) {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subsidiariFilter, setSubsidiariFilter] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [separuhFilter, setSeparuhFilter] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [subsidiariList, setSubsidiariList] = useState([]);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [riskToView, setRiskToView] = useState(null);

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

  const formatListDisplay = (dataString) => {
    if (!dataString || dataString === "—" || dataString.trim() === "") return "—";
    const items = dataString.split(';').map(item => item.trim()).filter(item => item !== "");
    if (items.length === 1) return items[0];
    return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
  };

  const riskMatrix = {
    1: {1:{label:"Rendah",color:"#e2fcdb",textColor:"#15803d"},2:{label:"Rendah",color:"#e2fcdb",textColor:"#15803d"},3:{label:"Sederhana",color:"#fef9c3",textColor:"#a16207"},4:{label:"Sederhana",color:"#fef9c3",textColor:"#a16207"},5:{label:"Tinggi",color:"#ffedd5",textColor:"#c2410c"}},
    2: {1:{label:"Rendah",color:"#e2fcdb",textColor:"#15803d"},2:{label:"Rendah",color:"#e2fcdb",textColor:"#15803d"},3:{label:"Sederhana",color:"#fef9c3",textColor:"#a16207"},4:{label:"Sederhana",color:"#fef9c3",textColor:"#a16207"},5:{label:"Tinggi",color:"#ffedd5",textColor:"#c2410c"}},
    3: {1:{label:"Rendah",color:"#e2fcdb",textColor:"#15803d"},2:{label:"Sederhana",color:"#fef9c3",textColor:"#a16207"},3:{label:"Sederhana",color:"#fef9c3",textColor:"#a16207"},4:{label:"Tinggi",color:"#ffedd5",textColor:"#c2410c"},5:{label:"Tinggi",color:"#ffedd5",textColor:"#c2410c"}},
    4: {1:{label:"Sederhana",color:"#fef9c3",textColor:"#a16207"},2:{label:"Sederhana",color:"#fef9c3",textColor:"#a16207"},3:{label:"Tinggi",color:"#ffedd5",textColor:"#c2410c"},4:{label:"Tinggi",color:"#ffedd5",textColor:"#c2410c"},5:{label:"Sangat Tinggi",color:"#fee2e2",textColor:"#b91c1c"}},
    5: {1:{label:"Sederhana",color:"#fef9c3",textColor:"#a16207"},2:{label:"Tinggi",color:"#ffedd5",textColor:"#c2410c"},3:{label:"Tinggi",color:"#ffedd5",textColor:"#c2410c"},4:{label:"Sangat Tinggi",color:"#fee2e2",textColor:"#b91c1c"},5:{label:"Sangat Tinggi",color:"#fee2e2",textColor:"#b91c1c"}},
  };

  const getRiskData = (k, i) => {
    if (!riskMatrix[k] || !riskMatrix[k][i]) return { label: "-", color: "#f1f5f9", textColor: "#64748b" };
    return riskMatrix[k][i];
  };

  const formatSeparuhTahun = (value) => {
    if (value === null || value === undefined) return "—";
    const strValue = String(value).toLowerCase();
    if (strValue === "1" || strValue === "pertama") return "T1";
    if (strValue === "2" || strValue === "kedua") return "T2";
    return value;
  };

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/risiko");
      
      const risksWithColor = res.data.map(r => {
        const k = parseInt(r.skor_kebarangkalian) || 0;
        const i = parseInt(r.skor_impak) || 0;
        const { label, color, textColor } = getRiskData(k, i);
        
        const k_semasa = parseInt(r.semasa_skor_kebarangkalian) || 0;
        const i_semasa = parseInt(r.semasa_skor_impak) || 0;
        const { label: label_semasa, color: color_semasa, textColor: textColor_semasa } = getRiskData(k_semasa, i_semasa);

        return { 
          ...r, 
          tahap_risiko: label,
          risk_color: color,
          risk_text_color: textColor,
          tahap_risiko_semasa: label_semasa,
          risk_color_semasa: color_semasa,
          risk_text_color_semasa: textColor_semasa,
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
    const matchKategori = !kategoriFilter || r.kategori === kategoriFilter; 
    return matchSearch && matchSubsidiari && matchTahun && matchSeparuh && matchKategori;
  });

  const handleDelete = async id => {
    if (!window.confirm("Adakah anda pasti mahu padam risiko ini?")) return;
    try { await api.delete(`/risiko/${id}`); fetchRisks(); }
    catch (err) { console.error(err); alert("⚠️ Gagal padam risiko."); }
  };

  const handleViewRisk = (risk) => {
    setRiskToView(risk);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = (shouldRefresh = false) => {
    setIsViewModalOpen(false);
    setRiskToView(null);
    if (shouldRefresh) fetchRisks();
  };

  const shortForm = label => {
    if (label === "Rendah") return "R";
    if (label === "Sederhana") return "S";
    if (label === "Tinggi") return "T";
    if (label === "Sangat Tinggi") return "ST";
    return "-";
  };

  const totalColumns = 28;
  const kategoriOptions = [...new Set(risks.map(r => r.kategori).filter(k => k))].sort();

  return (
    <div className="rm-container">
      <div className="rm-header-section">
        <h1>Senarai Risiko</h1>
        <span className="rm-subtitle">Klik pada mana-mana baris untuk melihat maklumat lengkap</span>
      </div>

      <div className="rm-filter-container">
        <div className="rm-search-wrapper">
          <Search size={16} className="rm-search-icon" />
          <input 
            type="text" 
            placeholder="Cari No Rujukan..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        
        <div className="rm-select-group">
          <select
            value={["STAFF","KETUA SUBSIDIARI"].includes(userRole) ? userSubsidiariId : subsidiariFilter}
            onChange={e => setSubsidiariFilter(e.target.value)}
            disabled={["STAFF","KETUA SUBSIDIARI"].includes(userRole)}
          >
            <option value="">Semua Syarikat</option>
            {subsidiariList.map(s => (
              <option key={s.subsidiari_id} value={s.subsidiari_id}>
                {s.nama_subsidiari}
              </option>
            ))}
          </select>

          <select value={tahunFilter} onChange={e => setTahunFilter(e.target.value)}>
            <option value="">Semua Tahun</option>
            {[...new Set(risks.map(r => r.tahun))].sort((a,b)=>b-a).map(t=>(<option key={t} value={t}>{t}</option>))}
          </select>

          <select value={separuhFilter} onChange={e => setSeparuhFilter(e.target.value)}>
            <option value="">Semua Term</option>
            <option value="1">Pertama (T1)</option>
            <option value="2">Kedua (T2)</option>
          </select>
          
          <select value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value)}>
            <option value="">Semua Kategori</option>
            {kategoriOptions.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rm-table-wrapper">
        <table className="rm-risiko-table">
          <thead>
            <tr>
              <th rowSpan="2" className="rm-sticky-bil">Bil</th>
              <th colSpan="6">Pengenalpastian Risiko</th>
              <th colSpan="5">Penilaian Risiko</th>
              <th colSpan="4">Rawatan atas Risiko</th>
              <th colSpan="4">Pemantauan Risiko</th>
              <th colSpan="7">Keberkesanan Tindakan</th>
              <th rowSpan="2" className="rm-sticky-action">Tindakan</th>
            </tr>
            <tr>
              <th className="rm-sticky-ref">No Rujukan</th>
              <th>Sesi Daftar</th>
              <th>Syarikat</th>
              <th>Bahagian / Unit</th>
              <th>Kategori Risiko</th>
              <th>Risiko</th>
              
              <th>Skor K</th>
              <th>Skor I</th>
              <th>Tahap</th>
              <th>Status Risiko</th>
              <th>Pindaan Penilaian</th>
              
              <th>Pelan Tindakan</th>
              <th>Jenis Kawalan</th>
              <th>Jangka Siap</th>
              <th>Staf Bertanggungjawab</th>
              
              <th>Sesi Pantau</th>
              <th>Pelan Tindakan Pantau</th>
              <th>Kekerapan</th>
              <th>Staf Bertanggungjawab</th>
              
              <th>Skor K (Semasa)</th>
              <th>Skor I (Semasa)</th>
              <th>Tahap (Semasa)</th>
              <th>Keberkesanan</th>
              <th>Status Pemantauan</th>
              <th>Pindaan Keberkesanan</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="rm-loader-row">
                <td colSpan={totalColumns} className="rm-center">⏳ Sedang memuat data...</td>
              </tr>
            ) : filteredRisks.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className="rm-center">🚫 Tiada data risiko</td>
              </tr>
            ) : filteredRisks.map((r, index) => (
              <tr 
                key={r.id} 
                onClick={() => handleViewRisk(r)} 
                className="rm-row-clickable"
              >
                <td className="rm-center rm-no-bil rm-sticky-bil">{index + 1}</td>
                <td className="rm-left rm-sticky-ref font-semibold">{r.no_rujukan}</td>
                
                <td className="rm-center">
                  <div className="rm-session-tag">{r.tahun} - {formatSeparuhTahun(r.separuh_tahun)}</div>
                </td>

                <td className="rm-center">
                  <div className="rm-text-truncate">{r.subsidiari}</div>
                </td>
                <td className="rm-center">
                  <div className="rm-text-truncate">{r.bahagian}</div>
                </td>
                <td className="rm-center">
                  <div className="rm-text-truncate">{r.kategori}</div>
                </td>
                <td className="rm-justify">
                  <div className="rm-text-truncate-large">{r.risiko}</div>
                </td>
                
                <td className="rm-center font-medium">{r.skor_kebarangkalian || "-"}</td>
                <td className="rm-center font-medium">{r.skor_impak || "-"}</td>
                <td className="rm-center">
                  <span className="rm-badge" style={{ backgroundColor: r.risk_color, color: r.risk_text_color }}>
                    {shortForm(r.tahap_risiko)}
                  </span>
                </td>
                <td className="rm-center">{r.status_risiko || "—"}</td>
                <td className="rm-center">
                  <div className="rm-text-truncate">{r.pindaan_penilaian || "—"}</div>
                </td>
                
                <td className="rm-left">
                  <div className="rm-text-truncate-large" style={{ whiteSpace: 'pre-line' }}>
                    {formatListDisplay(r.pelan_tindakan)}
                  </div>
                </td>
                <td className="rm-center">{r.jenis_kawalan || "—"}</td>
                <td className="rm-center">{r.tempoh_jangkaan_siap_tindakan || "—"}</td>
                <td className="rm-center">
                  <div className="rm-text-truncate" style={{ whiteSpace: 'pre-line' }}>
                    {formatListDisplay(r.kakitangan_bertanggungjawab)}
                  </div>
                </td>
                
                <td className="rm-center">
                  {(() => {
                    const data = r.pemantauan_tahun_separuh;
                    if (!data) return "—";
                    const parts = data.split(' - ');
                    if (parts.length === 2) return `${parts[0]} - ${formatSeparuhTahun(parts[1])}`;
                    return data;
                  })()}
                </td>
              
                <td className="rm-left">
                  <div className="rm-text-truncate-large" style={{ whiteSpace: 'pre-line' }}>
                    {formatListDisplay(r.pemantauan_pelan_tindakan)}
                  </div>
                </td>
                <td className="rm-center">{r.pemantauan_kekerapan || "—"}</td>
                <td className="rm-center">
                  <div className="rm-text-truncate" style={{ whiteSpace: 'pre-line' }}>
                    {formatListDisplay(r.pemantauan_kakitangan)}
                  </div>
                </td>
                
                <td className="rm-center font-medium">{r.semasa_skor_kebarangkalian || "—"}</td>
                <td className="rm-center font-medium">{r.semasa_skor_impak || "—"}</td>
                <td className="rm-center">
                  <span className="rm-badge" style={{ backgroundColor: r.risk_color_semasa, color: r.risk_text_color_semasa }}>
                    {shortForm(r.tahap_risiko_semasa)}
                  </span>
                </td>
                <td className="rm-center">{r.keberkesanan || "—"}</td>
                <td className="rm-center">{r.status_pemantauan || "—"}</td>
                <td className="rm-center">{r.pindaan_keberkesanan || "—"}</td>
                <td className="rm-left">
                  <div className="rm-text-truncate-large">{r.catatan || "—"}</div>
                </td>

                <td className="rm-center rm-sticky-action">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleDelete(r.id); 
                    }} 
                    className="rm-delete-btn"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isViewModalOpen && (
        <ViewRisikoModal
          isOpen={isViewModalOpen}
          risk={riskToView}
          userRole={userRole}
          onClose={handleCloseViewModal}
        />
      )}
    </div>
  );
}

export default SenaraiRisiko;