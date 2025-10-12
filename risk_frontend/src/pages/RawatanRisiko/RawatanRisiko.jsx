import { useState, useEffect } from "react";
import { Edit } from "lucide-react";
import api from "../../api/api";
import EditRawatan from "./EditRawatan";
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

  // Standard Risk Matrix (Likelihood x Impact)
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
      // Assuming the endpoint returns an array of objects like { subsidiari_id: 1, nama_subsidiari: "Subsidiari A" }
      const res = await api.get("/subsidiari");
      setSubsidiariList(res.data);
    } catch(err){ console.error("❌ Gagal fetch subsidiari:",err); }
  };

  // Fetch semua rawatan risiko
  const fetchData = async () => {
    try {
      setLoading(true);
      // Assuming the endpoint returns an array of risk objects, potentially with raw data for plan_tindakan and kakitangan_bertanggungjawab
      const res = await api.get("/rawatan");
      
      const dataWithScore = res.data.map(d=>{
        // Calculate risk score and color
        const {label,color} = getRiskData(parseInt(d.skor_kebarangkalian)||0, parseInt(d.skor_impak)||0);
        
        // Ensure plan_tindakan and kakitangan_bertanggungjawab are arrays for renderNumberedList
        const planTindakan = d.plan_tindakan || [];
        const kakitangan = d.kakitangan_bertanggungjawab || [];
        
        return {
          ...d, 
          tahap_risiko:label, 
          risk_color:color,
          plan_tindakan: Array.isArray(planTindakan) ? planTindakan : [planTindakan].filter(p => p),
          kakitangan_bertanggungjawab: Array.isArray(kakitangan) ? kakitangan : [kakitangan].filter(k => k),
        };
      });
      setData(dataWithScore);
    } catch(err){ console.error("❌ Gagal fetch rawatan risiko:",err); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ 
    fetchSubsidiariList(); 
    fetchData(); 
  }, []);

  // Cards data
  const risikoAktif = data.length;
  const planRawatan = data.filter(d=>d.plan_tindakan && d.plan_tindakan.filter(p => p && p.trim() !== "").length > 0).length;

  const handleEdit = (item)=>{ 
    setSelectedData(item); 
    setShowModal(true); 
  };
  
  const handleSaveRawatan = (updatedData)=>{ 
    setShowModal(false); 
    // Re-fetch data to reflect the changes
    fetchData(); 
  };

  // --- Client-side Filter ---
  const filteredData = data.filter(d => {
    const matchSearch = !search || d.no_rujukan?.toLowerCase().includes(search.toLowerCase());
    const matchSubsidiari = !subsidiariFilter || d.nama_subsidiari === subsidiariFilter;
    const matchTahun = !tahunFilter || String(d.tahun) === tahunFilter;
    const matchSeparuh = !separuhFilter || String(d.separuh_tahun) === separuhFilter;
    return matchSearch && matchSubsidiari && matchTahun && matchSeparuh;
  });

  // Helper function to render numbered list (Already correct in your original code)
  const renderNumberedList = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return "-";
    }
    
    const validItems = items.filter(item => item && item.trim() !== "");
    if (validItems.length === 0) return "-";
    
    return (
      // The <ul> will be styled as a numbered list (decimal) in RawatanRisiko.css
      <ol style={{ margin: 0, paddingLeft: '16px', textAlign: 'left' }}> 
        {validItems.map((item, index) => (
          <li key={index} style={{ fontSize: '0.9em', marginBottom: '2px' }}>
            {item}
          </li>
        ))}
      </ol>

    );
  };

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
          {/* Get unique, sorted years */}
          {[...new Set(data.map(d=>d.tahun))].filter(t => t).sort((a,b)=>b-a).map(t=><option key={t} value={t}>{t}</option>)}
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
            {/* BARIS HEADER ATAS: Pengelompokan Lajur */}
            <tr>
              <th colSpan="8" className="header-penilaian">Maklumat Risiko</th>
              <th colSpan="5" className="header-rawatan">Rawatan Atas Risiko</th>
            </tr>
            {/* BARIS HEADER BAWAH: Sub-Tajuk Lajur */}
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
                  <div className="risk-box" style={{backgroundColor:d.risk_color}}>
                    {shortForm(d.tahap_risiko)}
                  </div>
                </td>
                {/* Display numbered list for plan tindakan */}
                <td className="numbered-list-cell">
                  {renderNumberedList(d.plan_tindakan)}
                </td>
                <td>{d.jenis_kawalan||"-"}</td>
                <td>{d.tempoh_jangkaan_siap||"-"}</td>
                {/* Display numbered list for kakitangan */}
                <td className="numbered-list-cell">
                  {renderNumberedList(d.kakitangan_bertanggungjawab)}
                </td>
                <td className="actions">
                  <button onClick={()=>handleEdit(d)} className="btn-edit">
                    <Edit size={16}/>
                  </button>
                </td>
              </tr>
             )) : <tr><td colSpan="13" className="no-data">Tiada data dijumpai</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <EditRawatan 
          isOpen={showModal} 
          risk={selectedData}  
          pelanList={pelanList} 
          kakitanganList={kakitanganList} 
          subsidiariList={subsidiariList}
          onClose={()=>setShowModal(false)} 
          onSave={handleSaveRawatan} 
        />
      )}
    </div>
  );
}

export default RawatanRisiko;