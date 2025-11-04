import { useState, useEffect, useMemo } from "react";
import { Edit, Plus } from "lucide-react";
import api from "../../api/api";
import EditRawatan from "./EditRawatan"; 
import "./PenilaianRawatan.css";

function PenilaianDanRawatan() {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState('penilaian');
  const [search, setSearch] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [separuhFilter, setSeparuhFilter] = useState("");
  const [subsidiariFilter, setSubsidiariFilter] = useState("");
  const [subsidiariList, setSubsidiariList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  // ✅ PEMBETULAN UNTUK "null is not iterable":
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

  const isDinilai = (d) => d.skor_kebarangkalian > 0 && d.skor_impak > 0;
  
  const fetchSubsidiariList = async () => {
    try {
      const res = await api.get("/subsidiari");
      setSubsidiariList(res.data);
    } catch(err){ console.error("❌ Gagal fetch subsidiari:",err); }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rawatan");
      
      const dataWithScore = res.data.map(d=>{
        const {label,color} = getRiskData(parseInt(d.skor_kebarangkalian)||0, parseInt(d.skor_impak)||0);
        
        const planTindakan = d.plan_tindakan;
        const kakitangan = d.kakitangan_bertanggungjawab;
        
        return {
          ...d, 
          tahap_risiko:label, 
          risk_color:color,
          // Pastikan ianya adalah array, jika tidak jadikan array kosong atau array 1 elemen jika wujud
          plan_tindakan: Array.isArray(planTindakan) ? planTindakan : [planTindakan].filter(p => p),
          kakitangan_bertanggungjawab: Array.isArray(kakitangan) ? kakitangan : [kakitangan].filter(k => k),
          // Tambah field bahagian_unit jika belum ada
          bahagian_unit: d.bahagian_unit || d.unit || null,
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

  const risikoAktif = data.length;
  const risikoBelumDinilai = data.filter(d => !isDinilai(d)).length;
  const planRawatan = data.filter(d=>isDinilai(d) && d.plan_tindakan && d.plan_tindakan.filter(p => p && p.trim() !== "").length > 0).length;

  const handleAction = (item)=>{ 
    setSelectedData(item); 
    setShowModal(true); 
  };
  
  const handleSaveRawatan = ()=>{ 
    setShowModal(false); 
    setSearch("");
    setTahunFilter("");
    setSeparuhFilter("");
    setSubsidiariFilter("");
    fetchData(); 
  };

  const filteredData = useMemo(()=>{
    const tabFiltered = data.filter(d => {
      const dinilai = isDinilai(d);
      return activeTab === 'penilaian' ? !dinilai : dinilai;
    });

    return tabFiltered.filter(d => {
      const matchSearch = !search || d.no_rujukan?.toLowerCase().includes(search.toLowerCase());
      const matchSubsidiari = !subsidiariFilter || d.nama_subsidiari === subsidiariFilter;
      const matchTahun = !tahunFilter || String(d.tahun) === tahunFilter;
      const matchSeparuh = !separuhFilter || String(d.separuh_tahun) === separuhFilter;
      return matchSearch && matchSubsidiari && matchTahun && matchSeparuh;
    });
  }, [data, activeTab, search, subsidiariFilter, tahunFilter, separuhFilter]);

  // Colspan untuk tab Penilaian kini 9 (1 Bil + 6 Maklumat + 2 Penilaian)
  const penilaianColSpan = 9; 
  // Colspan untuk tab Rawatan (13 lajur total)
  const rawatanColSpan = 13; 

  const renderNumberedList = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return "-";
    }
    
    const validItems = items.filter(item => item && item.trim() !== "");
    if (validItems.length === 0) return "-";
    
    return (
      <ol style={{ margin: 0, paddingLeft: '16px', textAlign: 'left' }}> 
        {validItems.map((item, index) => (
          <li key={index} style={{ fontSize: '0.9em', marginBottom: '2px' }}>
            {item}
          </li>
        ))}
      </ol>
    );
  };

  const renderTableContent = () => {
    const currentColSpan = activeTab === 'penilaian' ? penilaianColSpan : rawatanColSpan;
    
    if (loading) return <tr><td colSpan={currentColSpan} className="pr-loading">Memuatkan...</td></tr>;
    if (filteredData.length === 0) {
        const message = activeTab === 'penilaian' ? 
            "Semua risiko telah dinilai." : 
            "Tiada risiko yang telah dinilai dan mempunyai rawatan.";
        return <tr><td colSpan={currentColSpan} className="pr-no-data">{message}</td></tr>;
    }

    // ✅ PEMBETULAN UNTUK KEY TIDAK UNIK DAN WHITESPACE DI SINI
    return filteredData.map((d,i)=>(
        <tr key={i}> {/* Guna indeks 'i' untuk kunci yang unik */}
          <td>{i+1}</td> {/* Lajur BIL. */}
          <td>{d.no_rujukan}</td>
          
          {activeTab === 'penilaian' ? (
                // Laju data untuk Tab Penilaian (9 lajur total)
                <>
                    <td>{d.tahun} ({renderSeparuhTahun(d.separuh_tahun)})</td> {/* Tahun/Separuh */}
                    <td>{d.nama_subsidiari||"-"}</td>
                    {/* ✅ TAMBAH KATEGORI RISIKO */}
                    <td>{d.kategori||"-"}</td> 
                    <td>{d.bahagian_unit||"-"}</td> {/* Bahagian/Unit */}
                    <td>{d.risiko}</td>

                    <td className="pr-center">
                        <div className="pr-risk-box" style={{backgroundColor:"#fca5a5", color:"#991b1b"}}>
                            BELUM DINILAI
                        </div>
                    </td>
                    <td className="pr-actions">
                        <button onClick={()=>handleAction(d)} className="pr-btn-action pr-btn-add">
                            <Plus size={16}/>
                        </button>
                    </td>
                </>
          ) : (
                // Laju data untuk Tab Rawatan (13 lajur) - Kekal Sama
            <>
                    <td>{d.tahun}</td>
                    <td>{renderSeparuhTahun(d.separuh_tahun)}</td>
                    <td>{d.nama_subsidiari||"-"}</td>
                    <td>{d.kategori}</td>
                    <td>{d.risiko}</td>

                  <td className="pr-center">
                    <div className="pr-risk-box" style={{backgroundColor:d.risk_color}}>
                      {shortForm(d.tahap_risiko)}
                    </div>
                  </td>
                  <td className="pr-numbered-list-cell">
                    {renderNumberedList(d.plan_tindakan)}
                  </td>
                  <td>{d.jenis_kawalan||"-"}</td>
                  <td>{d.tempoh_jangkaan_siap||"-"}</td>
                  <td className="pr-numbered-list-cell">
                    {renderNumberedList(d.kakitangan_bertanggungjawab)}
                  </td>
                  <td className="pr-actions">
                    <button onClick={()=>handleAction(d)} className="pr-btn-action pr-btn-edit">
                      <Edit size={16}/>
                    </button>
                  </td>
            </>
          )}
        </tr>
      ));
  };


  return (
    <div className="penilaian-rawatan-container">
      <h1>Penilaian & Rawatan Risiko</h1>

      {/* Cards */}
      <div className="pr-cards-container">
        <div className="pr-info-card"><h3>Risiko Keseluruhan</h3><p>{risikoAktif}</p></div>
        <div className="pr-info-card"><h3>Belum Dinilai</h3><p>{risikoBelumDinilai}</p></div>
        <div className="pr-info-card"><h3>Plan Rawatan Aktif</h3><p>{planRawatan}</p></div>
      </div>
      
      {/* Tabs */}
      <div className="pr-tab-container">
          <button 
              className={`pr-tab-button ${activeTab === 'penilaian' ? 'pr-active' : ''}`}
              onClick={() => setActiveTab('penilaian')}
          >
              Penilaian Risiko (Belum Dinilai)
          </button>
          <button 
              className={`pr-tab-button ${activeTab === 'rawatan' ? 'pr-active' : ''}`}
              onClick={() => setActiveTab('rawatan')}
          >
              Rawatan Risiko (Telah Dinilai)
          </button>
      </div>

      {/* Filter Sebaris */}
      <div className="pr-filter-container">
        <input type="text" placeholder="Cari No Rujukan..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select value={subsidiariFilter} onChange={e=>setSubsidiariFilter(e.target.value)}>
          <option value="">-- Semua Subsidiari --</option>
          {subsidiariList.map(s=><option key={s.subsidiari_id} value={s.nama_subsidiari}>{s.nama_subsidiari}</option>)}
        </select>
        <select value={tahunFilter} onChange={e=>setTahunFilter(e.target.value)}>
          <option value="">-- Semua Tahun --</option>
          {[...new Set(data.map(d=>d.tahun))].filter(t => t).sort((a,b)=>b-a).map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={separuhFilter} onChange={e=>setSeparuhFilter(e.target.value)}>
          <option value="">-- Semua Separuh Tahun --</option>
          <option value="1">Pertama</option>
          <option value="2">Kedua</option>
        </select>
      </div>

      {/* Table */}
      <div className="pr-table-wrapper">
        <table className="pr-risiko-table">
          <thead key={activeTab}>
            {/* BARIS HEADER ATAS (MEMEGANG KUMPULAN & BIL.) */}
            <tr>
                {/* ✅ Bil. sebagai sel rowSpan=2 */}
                <th rowSpan="2" style={{minWidth:'40px'}}>BIL.</th>
              {activeTab === 'penilaian' ? (
                // ✅ Tab Penilaian: colSpan 6 (Maklumat Risiko) - DINAICKAN dari 5 ke 6
                <th colSpan="6" className="pr-header-penilaian">Maklumat Risiko</th>
              ) : (
                // Tab Rawatan: colSpan 6 (Maklumat Risiko) - Kekal Sama
                <th colSpan="6" className="pr-header-penilaian">Maklumat Risiko</th>
              )}

              {activeTab === 'penilaian' ? (
                // Tab Penilaian: 2 lajur Penilaian/Tindakan
                <th colSpan="2" className="pr-header-rawatan">Penilaian</th> 
              ) : (
                // Tab Rawatan: 6 lajur Rawatan
                <th colSpan="6" className="pr-header-rawatan">Rawatan Atas Risiko</th>
              )}
            </tr>
            
            {/* BARIS HEADER BAWAH (ISI LAJUR) */}
            {activeTab === 'penilaian' ? (
                <tr>
                    <th>No Rujukan</th><th>Tahun/Separuh</th>
                    <th>Subsidiari</th>
                    {/* ✅ TAMBAH KATEGORI RISIKO */}
                    <th>Kategori Risiko</th> 
                    <th>Bahagian/Unit</th>
                    <th>Risiko</th>
                    <th>Status Penilaian</th> 
                    <th>Tindakan</th>
                </tr>
            ) : (
                <tr>
                    <th>No Rujukan</th><th>Tahun</th><th>Separuh Tahun</th>
                    <th>Nama Subsidiari</th><th>Kategori Risiko</th><th>Risiko</th>
                    <th>Skor Risiko</th><th>Plan Tindakan</th><th>Jenis Kawalan</th><th>Tempoh Siap</th><th>Kakitangan</th><th>Tindakan</th>
                </tr>
            )}
          </thead>
          <tbody>
            {renderTableContent()}
          </tbody>
        </table>
      </div>

      {showModal && (
        <EditRawatan 
          isOpen={showModal} 
          risk={selectedData} 
          isPenilaian={activeTab === 'penilaian'}
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

export default PenilaianDanRawatan;