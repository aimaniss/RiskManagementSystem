import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react"; 
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

  // Helper function: Convert separuh tahun value
  // BARIS 65: DIUBAH UNTUK MENGELAKKAN TypeError
  const formatSeparuhTahun = (value) => {
    if (value === null || value === undefined) return "—";

    // ✅ PEMBETULAN: Pastikan value adalah string sebelum menggunakan toLowerCase()
    const strValue = String(value).toLowerCase();

    if (strValue === "1" || strValue === "pertama") {
      return "Separuh Pertama";
    }
    if (strValue === "2" || strValue === "kedua") {
      return "Separuh Kedua";
    }
    return value;
  };

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/risiko");
      
      const risksWithColor = res.data.map(r => {
        const k = parseInt(r.skor_kebarangkalian) || 0;
        const i = parseInt(r.skor_impak) || 0;
        const { label, color } = getRiskData(k, i);
        
        const k_semasa = parseInt(r.semasa_skor_kebarangkalian) || 0;
        const i_semasa = parseInt(r.semasa_skor_impak) || 0;
        const { label: label_semasa, color: color_semasa } = getRiskData(k_semasa, i_semasa);

        return { 
          ...r, 
          tahap_risiko: label,
          risk_color: color,
          tahap_risiko_semasa: label_semasa,
          risk_color_semasa: color_semasa,
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

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setRiskToView(null);
  };

  const shortForm = label => {
    if (label === "Rendah") return "R";
    if (label === "Sederhana") return "S";
    if (label === "Tinggi") return "T";
    if (label === "Sangat Tinggi") return "ST";
    return "-";
  };

  const totalColumns = 28;

  const kategoriOptions = [...new Set(risks.map(r => r.kategori).filter(k => k))] 
                              .sort();

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
          <option value="">-- Semua Syarikat --</option>
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
          <option value="1">Pertama</option>
          <option value="2">Kedua</option>
        </select>
        
        <select value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value)}>
          <option value="">-- Semua Kategori --</option>
          {kategoriOptions.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      <div className="rm-table-wrapper">
        <table className="rm-risiko-table">
          <thead>
            <tr>
              <th rowSpan="2">Bil</th>
              <th colSpan="6">Pengenalpastian Risiko</th>
              <th colSpan="5">Penilaian Risiko</th>
              <th colSpan="4">Rawatan atas Risiko</th>
              <th colSpan="4">Pemantauan Risiko</th>
              <th colSpan="7">Keberkesanan Tindakan</th>
              <th rowSpan="2">Tindakan</th>
            </tr>
            <tr>
              <th>No Rujukan</th>
              <th>Tahun & Separuh Tahun Daftar</th>
              <th>Nama Syarikat</th>
              <th>Bahagian / Unit</th>
              <th>Kategori Risiko</th>
              <th>Risiko</th>
              
              <th>Skor Kebarangkalian</th>
              <th>Skor Impak</th>
              <th>Skor Risiko</th>
              <th>Status Risiko</th>
              <th>Pindaan Penilaian</th>
              
              <th>Pelan Tindakan</th>
              <th>Jenis Kawalan</th>
              <th>Tempoh Jangkaan Siap</th>
              <th>Kakitangan Bertanggungjawab</th>
              
              <th>Tahun & Separuh Tahun Pemantauan</th>
              <th>Pelan Tindakan Pemantauan</th>
              <th>Kekerapan</th>
              <th>Kakitangan Bertanggungjawab (Pemantauan)</th>
              
              <th>Skor Kebarangkalian (Semasa)</th>
              <th>Skor Impak (Semasa)</th>
              <th>Skor Risiko (Semasa)</th>
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
                <td className="rm-center rm-no-bil">{index + 1}</td>
                
                <td className="rm-left">{r.no_rujukan}</td>
                
                <td className="rm-center">
                  <div className="rm-year-separuh">
                    <div>{r.tahun}</div>
                    <div>{formatSeparuhTahun(r.separuh_tahun)}</div>
                  </div>
                </td>

                <td className="rm-center">{r.subsidiari}</td>
                <td className="rm-center">{r.bahagian}</td>
                <td className="rm-center">{r.kategori}</td>
                <td className="rm-justify">{r.risiko}</td>
                
                <td className="rm-center">{r.skor_kebarangkalian || "-"}</td>
                <td className="rm-center">{r.skor_impak || "-"}</td>
                <td className="rm-center">
                  <div className="rm-risk-box" style={{ backgroundColor: r.risk_color }}>
                    {shortForm(r.tahap_risiko)}
                  </div>
                </td>
                <td className="rm-center">{r.status_risiko || "—"}</td>
                <td className="rm-center">{r.pindaan_penilaian || "—"}</td>
                
                <td className="rm-left">{r.pelan_tindakan || "—"}</td>
                <td className="rm-center">{r.jenis_kawalan || "—"}</td>
                <td className="rm-center">{r.tempoh_jangkaan_siap_tindakan || "—"}</td>
                <td className="rm-center">{r.kakitangan_bertanggungjawab || "—"}</td>
                
                <td className="rm-center">
                  <div className="rm-year-separuh">
                    {(() => {
                      const data = r.pemantauan_tahun_separuh;
                      if (!data) return <div>—</div>;
                      
                      const parts = data.split(' - ');
                      if (parts.length === 2) {
                        return (
                          <>
                            <div>{parts[0]}</div>
                            <div>{formatSeparuhTahun(parts[1])}</div>
                          </>
                        );
                      }
                      
                      return <div>{data}</div>;
                    })()}
                  </div>
                </td>
                <td className="rm-left">{r.pemantauan_pelan_tindakan || "—"}</td>
                <td className="rm-center">{r.pemantauan_kekerapan || "—"}</td>
                <td className="rm-center">{r.pemantauan_kakitangan || "—"}</td>
                
                <td className="rm-center">{r.semasa_skor_kebarangkalian || "—"}</td>
                <td className="rm-center">{r.semasa_skor_impak || "—"}</td>
                <td className="rm-center">
                  <div 
                    className="rm-risk-box" 
                    style={{ backgroundColor: r.risk_color_semasa }}
                  >
                    {shortForm(r.tahap_risiko_semasa)}
                  </div>
                </td>
                <td className="rm-center">{r.keberkesanan || "—"}</td>
                <td className="rm-center">{r.status_pemantauan || "—"}</td>
                <td className="rm-center">{r.pindaan_keberkesanan || "—"}</td>
                <td className="rm-left">{r.catatan || "—"}</td>

                <td className="rm-center">
                  <div className="rm-action-buttons">
                    {/* Butang Padam */}
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleDelete(r.id); 
                      }} 
                      className="rm-delete-btn"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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