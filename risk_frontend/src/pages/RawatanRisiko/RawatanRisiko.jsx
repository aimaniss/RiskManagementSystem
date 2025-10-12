import { useState, useEffect } from "react";
import { Edit } from "lucide-react";
import api from "../../api/api";
import EditRawatan from "./EditRawatan"; // Modal
import "./RawatanRisiko.css";

function RawatanRisiko() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [separuhFilter, setSeparuhFilter] = useState("");
  const [subsidiariFilter, setSubsidiariFilter] = useState("");
  const [subsidiariList, setSubsidiariList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  const pelanList = ["Kurangkan Risiko", "Pindahkan Risiko", "Terima Risiko", "Elakkan Risiko"];
  const kakitanganList = ["Ali", "Fatimah", "Siti", "Rahman", "Aiman"];

  const riskMatrix = {
    1: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    2: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    3: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Tinggi",color:"#f97316"}},
    4: {1:{label:"Sederhana",color:"#eab308"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
    5: {1:{label:"Sederhana",color:"#eab308"},2:{label:"Tinggi",color:"#f97316"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Sangat Tinggi",color:"#ef4444"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
  };

  const getRiskData = (k,i) => riskMatrix[k]?.[i] || {label:"-", color:"#f1f5f9"};
  const shortForm = (label) => label==="Rendah"?"R":label==="Sederhana"?"S":label==="Tinggi"?"T":label==="Sangat Tinggi"?"ST":"-";
  const renderSeparuhTahun = (v) => v===1?"Pertama":v===2?"Kedua":"-";

  // Fetch subsidiari dropdown
  const fetchSubsidiariList = async () => {
    try {
      const res = await api.get("/subsidiari");
      setSubsidiariList(res.data);
    } catch(err){ console.error("❌ Gagal fetch subsidiari:",err); }
  };

  // Fetch semua rawatan risiko
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rawatan");
      const dataWithScore = res.data.map(d=>{
        const {label,color} = getRiskData(parseInt(d.skor_kebarangkalian)||0, parseInt(d.skor_impak)||0);
        return {...d, tahap_risiko:label, risk_color:color};
      });
      setData(dataWithScore);
    } catch(err){ console.error("❌ Gagal fetch rawatan risiko:",err); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ 
    fetchSubsidiariList(); 
    fetchData(); 
  }, []);

  const risikoAktif = data.length;
  const planRawatan = data.filter(d=>d.plan_tindakan).length;

  const handleEdit = (item)=>{ setSelectedData(item); setShowModal(true); };
  const handleSaveRawatan = (updatedData)=>{ console.log("✅ Data dikemaskini:", updatedData); setShowModal(false); fetchData(); };

  // --- Client-side Filter ---
  const filteredData = data.filter(d => {
    const matchSearch = !search || d.no_rujukan?.toLowerCase().includes(search.toLowerCase());
    const matchSubsidiari = !subsidiariFilter || d.nama_subsidiari === subsidiariFilter;
    const matchTahun = !tahunFilter || String(d.tahun) === tahunFilter;
    const matchSeparuh = !separuhFilter || String(d.separuh_tahun) === separuhFilter;
    return matchSearch && matchSubsidiari && matchTahun && matchSeparuh;
  });

  return (
    <div className="senarai-risiko-container">
      <h1>Rawatan Risiko</h1>

      {/* Cards */}
      <div className="cards-container">
        <div className="info-card"><h3>Bilangan Risiko Aktif</h3><p>{risikoAktif}</p></div>
        <div className="info-card"><h3>Bilangan Plan Rawatan</h3><p>{planRawatan}</p></div>
      </div>

      {/* Filter Sebaris */}
      <div className="filter-container">
        <input type="text" placeholder="Cari No Rujukan..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select value={subsidiariFilter} onChange={e=>setSubsidiariFilter(e.target.value)}>
          <option value="">-- Semua Subsidiari --</option>
          {subsidiariList.map(s=><option key={s.subsidiari_id} value={s.nama_subsidiari}>{s.nama_subsidiari}</option>)}
        </select>
        <select value={tahunFilter} onChange={e=>setTahunFilter(e.target.value)}>
          <option value="">-- Semua Tahun --</option>
          {[...new Set(data.map(d=>d.tahun))].sort((a,b)=>b-a).map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={separuhFilter} onChange={e=>setSeparuhFilter(e.target.value)}>
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
              <th>Bil.</th><th>No Rujukan</th><th>Tahun</th><th>Separuh Tahun</th>
              <th>Nama Subsidiari</th><th>Kategori Risiko</th><th>Risiko</th><th>Skor Risiko</th>
              <th>Plan Tindakan</th><th>Jenis Kawalan</th><th>Tempoh Siap</th><th>Kakitangan</th><th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="13" className="loading">Loading...</td></tr> :
             filteredData.length>0 ? filteredData.map((d,i)=>(
              <tr key={d.rawatan_id || d.risiko_id}>
                <td>{i+1}</td>
                <td>{d.no_rujukan}</td>
                <td>{d.tahun}</td>
                <td>{renderSeparuhTahun(d.separuh_tahun)}</td>
                <td>{d.nama_subsidiari||"-"}</td>
                <td>{d.kategori}</td>
                <td>{d.risiko}</td>
                <td className="center">
                  <div className="risk-box" style={{backgroundColor:d.risk_color}}>{shortForm(d.tahap_risiko)}</div>
                </td>
                <td>{d.plan_tindakan||"-"}</td>
                <td>{d.jenis_kawalan||"-"}</td>
                <td>{d.tempoh_jangkaan_siap||"-"}</td>
                <td>{d.kakitangan_bertanggungjawab||"-"}</td>
                <td className="actions">
                  <button onClick={()=>handleEdit(d)} className="btn-edit"><Edit size={16}/></button>
                </td>
              </tr>
             )) : <tr><td colSpan="13" className="no-data">Tiada data dijumpai</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
          <EditRawatan 
          isOpen={showModal} 
          risk={selectedData}  pelanList={pelanList} 
          kakitanganList={kakitanganList} 
          subsidiariList={subsidiariList} // <--- BARIS INI
          onClose={()=>setShowModal(false)} 
          onSave={handleSaveRawatan} 
          />
          )}
    </div>
  );
}

export default RawatanRisiko;
