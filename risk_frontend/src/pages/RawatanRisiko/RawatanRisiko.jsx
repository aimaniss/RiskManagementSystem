import { useState, useEffect, useMemo } from "react";
import { Edit, Plus } from "lucide-react";
import api from "../../api/api";
import EditRawatan from "./EditRawatan"; 
import TambahPenilaian from "./TambahPenilaian"; // 🌟 MODAL PENILAIAN BARU
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
    
    // 🌟 STATE ASINGAN UNTUK MENGENDALIKAN MODAL
    const [showPenilaianModal, setShowPenilaianModal] = useState(false); 
    const [showRawatanModal, setShowRawatanModal] = useState(false); 

    const [selectedData, setSelectedData] = useState(null); 

    const pelanList = ["Kurangkan Risiko", "Pindahkan Risiko", "Terima Risiko", "Elakkan Risiko"];
    const kakitanganList = ["Ali", "Fatimah", "Siti", "Rahman", "Aiman"];

    // Matrix Risiko (5x5)
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

    const isDinilai = (d) => (d.skor_kebarangkalian > 0 && d.skor_impak > 0) || (d.skor_kebarangkalian !== null && d.skor_impak !== null); // Semak juga jika null
    
    const hasRawatan = (d) => d.plan_tindakan && Array.isArray(d.plan_tindakan) && d.plan_tindakan.filter(p => p && p.trim() !== "").length > 0;
    
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
                // Mengambil skor (jika wujud) atau 0 jika null/undefined
                const k = parseInt(d.skor_kebarangkalian)||0;
                const i = parseInt(d.skor_impak)||0;
                
                const {label,color} = getRiskData(k, i);
                
                const planTindakan = d.plan_tindakan;
                const kakitangan = d.kakitangan_bertanggungjawab;
                
                return {
                    ...d, 
                    tahap_risiko: label, 
                    risk_color: color,
                    plan_tindakan: Array.isArray(planTindakan) ? planTindakan : [planTindakan].filter(p => p),
                    kakitangan_bertanggungjawab: Array.isArray(kakitangan) ? kakitangan : [kakitangan].filter(k => k),
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

    const risikoBelumDinilai = data.filter(d => !isDinilai(d)).length;
    const risikoMemerlukanRawatan = data.filter(d => isDinilai(d) && !hasRawatan(d)).length;
    const risikoAdaRawatan = data.filter(d => isDinilai(d) && hasRawatan(d)).length;

    // 🌟 FUNGSI TINDAKAN DIPERBAHARUI
    const handleAction = (item)=>{ 
        setSelectedData(item); 
        if (activeTab === 'penilaian') {
            setShowPenilaianModal(true); // Buka modal Tambah Penilaian
        } else {
            setShowRawatanModal(true); // Buka modal Edit Rawatan
        }
    };
    
    // Fungsi simpan universal untuk refresh data
    const handleSave = ()=>{ 
        setShowPenilaianModal(false); 
        setShowRawatanModal(false); 
        setSearch("");
        setTahunFilter("");
        setSeparuhFilter("");
        setSubsidiariFilter("");
        fetchData(); 
    };

    const filteredData = useMemo(()=>{
        const tabFiltered = data.filter(d => {
            const dinilai = isDinilai(d);
            
            if (activeTab === 'penilaian') {
                return !dinilai; // Tab Penilaian: Hanya yang BELUM dinilai
            } else {
                // Tab Rawatan: Hanya yang TELAH dinilai TETAPI BELUM diberi rawatan
                return dinilai && !hasRawatan(d); 
            }
        });

        return tabFiltered.filter(d => {
            const matchSearch = !search || d.no_rujukan?.toLowerCase().includes(search.toLowerCase());
            const matchSubsidiari = !subsidiariFilter || d.nama_subsidiari === subsidiariFilter;
            const matchTahun = !tahunFilter || String(d.tahun) === tahunFilter;
            const matchSeparuh = !separuhFilter || String(d.separuh_tahun) === separuhFilter;
            return matchSearch && matchSubsidiari && matchTahun && matchSeparuh;
        });
    }, [data, activeTab, search, subsidiariFilter, tahunFilter, separuhFilter]);

    // Colspan untuk tab Penilaian (1 Bil + 6 Maklumat + 2 Penilaian) = 9
    const penilaianColSpan = 9; 
    // Colspan untuk tab Rawatan (1 Bil + 6 Maklumat + 4 Rawatan) = 11
    const rawatanColSpan = 11; 

    const renderTableContent = () => {
        const currentColSpan = activeTab === 'penilaian' ? penilaianColSpan : rawatanColSpan;
        
        if (loading) return <tr><td colSpan={currentColSpan} className="pr-loading">Memuatkan...</td></tr>;
        if (filteredData.length === 0) {
            const message = activeTab === 'penilaian' ? 
                "Semua risiko telah dinilai." : 
                "Tiada risiko telah dinilai yang memerlukan rawatan."; 
            return <tr><td colSpan={currentColSpan} className="pr-no-data">{message}</td></tr>;
        }

        return filteredData.map((d,i)=>(
            <tr key={i}> 
                <td>{i+1}</td> {/* Lajur BIL. */}
                <td>{d.no_rujukan}</td>
                
                {activeTab === 'penilaian' ? (
                    // Laju data untuk Tab Penilaian
                    <>
                        <td>{d.tahun} <br/> {renderSeparuhTahun(d.separuh_tahun)}</td> {/* Tahun/Separuh */}
                        <td>{d.nama_subsidiari||"-"}</td>
                        <td>{d.kategori||"-"}</td> 
                        <td>{d.bahagian_unit||"-"}</td> 
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
                    // Laju data untuk Tab Rawatan (Telah dinilai, tetapi Belum diberi rawatan)
                    <>
                        <td>{d.tahun} <br/> {renderSeparuhTahun(d.separuh_tahun)}</td> {/* Tahun/Separuh */}
                        <td>{d.nama_subsidiari||"-"}</td>
                        <td>{d.kategori||"-"}</td>
                        <td>{d.bahagian_unit||"-"}</td>
                        <td>{d.risiko}</td>

                        {/* ✅ SKOR RISIKO (Kebarangkalian/Impak) */}
                        <td className="pr-center">
                            <div className="pr-risk-box" style={{backgroundColor:"#e0f2fe", color:"#005fa3"}}>
                                {d.skor_kebarangkalian}/{d.skor_impak}
                            </div>
                        </td>
                        {/* ✅ STATUS RISIKO (Tahap Risiko - T, S, R, ST) */}
                        <td className="pr-center">
                            <div className="pr-risk-box" style={{backgroundColor:d.risk_color}}>
                                {shortForm(d.tahap_risiko)}
                            </div>
                        </td>

                        {/* STATUS RAWATAN */}
                        <td className="pr-center">
                            <div className="pr-risk-box" style={{backgroundColor:"#fca5a5", color:"#991b1b", minWidth:"150px"}}>
                                RAWATAN BELUM DIBERI
                            </div>
                        </td>

                        {/* TINDAKAN (ADD RAWATAN) */}
                        <td className="pr-actions">
                            <button onClick={()=>handleAction(d)} className="pr-btn-action pr-btn-add">
                                <Plus size={16}/>
                            </button>
                        </td>
                    </>
                )}
            </tr>
        ));
    };

    const tableClassName = activeTab === 'rawatan' 
        ? 'pr-risiko-table rawatan-active' 
        : 'pr-risiko-table';

    return (
        <div className="penilaian-rawatan-container">
            <h1>Penilaian & Rawatan Risiko</h1>

            {/* Cards */}
            <div className="pr-cards-container">
                <div className="pr-info-card"><h3>Risiko Keseluruhan</h3><p>{data.length}</p></div>
                <div className="pr-info-card"><h3>Belum Dinilai</h3><p>{risikoBelumDinilai}</p></div>
                <div className="pr-info-card"><h3>Memerlukan Rawatan</h3><p>{risikoMemerlukanRawatan}</p></div>
                <div className="pr-info-card"><h3>Rawatan Aktif</h3><p>{risikoAdaRawatan}</p></div>
            </div>
            
            {/* Tabs */}
            <div className="pr-tab-container">
                <button 
                    className={`pr-tab-button ${activeTab === 'penilaian' ? 'pr-active' : ''}`}
                    onClick={() => setActiveTab('penilaian')}
                >
                    Penilaian Risiko (Belum Dinilai: {risikoBelumDinilai})
                </button>
                <button 
                    className={`pr-tab-button ${activeTab === 'rawatan' ? 'pr-active' : ''}`}
                    onClick={() => setActiveTab('rawatan')}
                >
                    Rawatan Risiko (Memerlukan Rawatan: {risikoMemerlukanRawatan})
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
                <table className={tableClassName}> 
                    <thead key={activeTab}>
                        {/* BARIS HEADER ATAS */}
                        <tr>
                            <th rowSpan="2" style={{minWidth:'40px'}}>BIL.</th>
                            <th colSpan="6" className="pr-header-penilaian">Maklumat Risiko</th>
                            
                            {activeTab === 'penilaian' ? (
                                <th colSpan="2" className="pr-header-rawatan">Penilaian</th> 
                            ) : (
                                <th colSpan="4" className="pr-header-rawatan">Rawatan</th>
                            )}
                        </tr>
                        
                        {/* BARIS HEADER BAWAH */}
                        {activeTab === 'penilaian' ? (
                            <tr>
                                <th>No Rujukan</th><th style={{lineHeight:'1.2'}}>Tahun<br/>Separuh Tahun</th>
                                <th>Subsidiari</th><th>Kategori Risiko</th> 
                                <th>Bahagian/Unit</th><th>Risiko</th>
                                <th>Status Penilaian</th> 
                                <th>Tindakan</th>
                            </tr>
                        ) : (
                            <tr>
                                <th>No Rujukan</th><th style={{lineHeight:'1.2'}}>Tahun<br/>Separuh Tahun</th>
                                <th>Subsidiari</th><th>Kategori Risiko</th>
                                <th>Bahagian/Unit</th><th>Risiko</th>
                                <th>Skor Risiko</th><th>Status Risiko</th> 
                                <th>Status Rawatan</th><th>Tindakan</th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {renderTableContent()}
                    </tbody>
                </table>
            </div>

            {/* 🌟 PENGENDALIAN MODAL PENILAIAN */}
            {showPenilaianModal && (
                <TambahPenilaian 
                    isOpen={showPenilaianModal} 
                    risk={selectedData} 
                    riskMatrix={riskMatrix} // Hantar matrix risiko
                    onClose={() => setShowPenilaianModal(false)} 
                    onSave={handleSave} 
                />
            )}

            {/* PENGENDALIAN MODAL RAWATAN */}
            {showRawatanModal && (
                <EditRawatan 
                    isOpen={showRawatanModal} 
                    risk={selectedData} 
                    isPenilaian={false} // Di Tab Rawatan, ini sentiasa false
                    isAddMode={true} // Jika ia muncul di sini, ia adalah mod Tambah Rawatan
                    pelanList={pelanList} 
                    kakitanganList={kakitanganList} 
                    subsidiariList={subsidiariList}
                    onClose={() => setShowRawatanModal(false)} 
                    onSave={handleSave} 
                />
            )}
        </div>
    );
}

export default PenilaianDanRawatan;