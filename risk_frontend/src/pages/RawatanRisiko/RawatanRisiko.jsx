import { useState, useEffect, useMemo } from "react";
import { Edit, Plus } from "lucide-react";
import api from "../../api/api";
import EditRawatan from "./EditRawatan"; 
import PenilaianModal from './PenilaianModal';
import "./PenilaianRawatan.css";
import { riskMatrix, getRiskMatrix, getRiskAbbreviation } from "../../constants/riskMatrix";
import { formatSeparuhTahun } from "../../utils/formatters";

function PenilaianDanRawatan() {
    const [data, setData] = useState([]);
    const [activeTab, setActiveTab] = useState('penilaian');
    const [search, setSearch] = useState("");
    const [tahunFilter, setTahunFilter] = useState("");
    const [separuhFilter, setSeparuhFilter] = useState("");
    const [syarikatFilter, setSyarikatFilter] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("");
    const [syarikatList, setSyarikatList] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [showPenilaianModal, setShowPenilaianModal] = useState(false); 
    const [showRawatanModal, setShowRawatanModal] = useState(false); 

    const [selectedData, setSelectedData] = useState(null); 

    const pelanList = ["Kurangkan Risiko", "Pindahkan Risiko", "Terima Risiko", "Elakkan Risiko"];
    const kakitanganList = ["Ali", "Fatimah", "Siti", "Rahman", "Aiman"];

    const getRiskData = (k,i) => getRiskMatrix(k, i);

    const isDinilai = (d) => (d.skor_kebarangkalian > 0 && d.skor_impak > 0) || (d.skor_kebarangkalian !== null && d.skor_impak !== null);
    const hasRawatan = (d) => d.plan_tindakan && Array.isArray(d.plan_tindakan) && d.plan_tindakan.filter(p => p && p.trim() !== "").length > 0;
    
    const fetchSyarikatList = async () => {
        try {
            const res = await api.get("/syarikat");
            setSyarikatList(res.data);
        } catch(err){ console.error("❌ Gagal fetch syarikat:",err); }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            
            const res = await api.get("/rawatan/with-status");
            
            const dataWithScore = res.data.map(d=>{
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
                    bahagian_unit: d.bahagian || d.unit || null,
                    status_pemantauan: d.status_pemantauan || "Buka",
                };
            });
            setData(dataWithScore);
        } catch(err){ 
            console.error("❌ Gagal fetch rawatan risiko:",err); 
        }
        finally{ setLoading(false); }
    };

    useEffect(()=>{ 
        fetchSyarikatList(); 
        fetchData(); 
    }, []);

    const risikoBelumDinilai = data.filter(d => !isDinilai(d)).length;
    const risikoMemerlukanRawatan = data.filter(d => isDinilai(d) && !hasRawatan(d)).length;

    const kategoriList = useMemo(() => {
        return [...new Set(data.map(d => d.kategori).filter(k => k))].sort();
    }, [data]);

    const handleAction = (item)=>{ 
        setSelectedData(item); 
        if (activeTab === 'penilaian') {
            setShowPenilaianModal(true);
        } else {
            setShowRawatanModal(true);
        }
    };
    
    const handleSave = ()=>{ 
        setShowPenilaianModal(false); 
        setShowRawatanModal(false); 
        setSearch("");
        setTahunFilter("");
        setSeparuhFilter("");
        setSyarikatFilter("");
        setKategoriFilter("");
        fetchData(); 
    };

    const filteredData = useMemo(()=>{
        const tabFiltered = data.filter(d => {
            const dinilai = isDinilai(d);
            
            if (activeTab === 'penilaian') {
                return !dinilai;
            } else {
                return dinilai && !hasRawatan(d); 
            }
        });

        return tabFiltered.filter(d => {
            const matchSearch = !search || d.no_rujukan?.toLowerCase().includes(search.toLowerCase());
            const matchSyarikat = !syarikatFilter || d.nama_syarikat === syarikatFilter;
            const matchTahun = !tahunFilter || String(d.tahun) === tahunFilter;
            const matchSeparuh = !separuhFilter || String(d.separuh_tahun) === separuhFilter;
            const matchKategori = !kategoriFilter || d.kategori === kategoriFilter;
            return matchSearch && matchSyarikat && matchTahun && matchSeparuh && matchKategori;
        });
    }, [data, activeTab, search, syarikatFilter, tahunFilter, separuhFilter, kategoriFilter]);

    const penilaianColSpan = 9; 
    const rawatanColSpan = 11; 

    const getStatusPemantauanStyle = (status) => {
        switch(status) {
            case "Buka":
                return { backgroundColor: "#fef3c7", color: "#92400e" };
            case "Sedang Dilaksanakan":
                return { backgroundColor: "#bfdbfe", color: "#1e40af" };
            case "Pemantauan":
                return { backgroundColor: "#dcfce7", color: "#166534" };
            default:
                return { backgroundColor: "#f1f5f9", color: "#475569" };
        }
    };

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
                <td>{i+1}</td>
                
                {activeTab === 'penilaian' ? (
                    <>
                        <td>{d.no_rujukan}</td>
                        <td>{d.tahun} <br/> {formatSeparuhTahun(d.separuh_tahun)}</td>
                        <td>{d.nama_syarikat||"-"}</td>
                        <td>{d.kategori||"-"}</td> 
                        <td>{d.bahagian_unit||"-"}</td> 
                        <td className="pr-group-divider">{d.risiko}</td>

                        <td className="pr-center">
                            <div className="pr-risk-box" style={getStatusPemantauanStyle(d.status_pemantauan)}>
                                {d.status_pemantauan || "Buka"}
                            </div>
                        </td>
                        <td className="pr-actions" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 0' }}>
                        <button onClick={()=>handleAction(d)} className="pr-btn-action pr-btn-add">
                            <Plus size={16}/>
                        </button>
                    </td>
                    </>
                ) : (
                    <>
                        <td>{d.no_rujukan}</td>
                        <td>{d.tahun} <br/> {formatSeparuhTahun(d.separuh_tahun)}</td>
                        <td>{d.nama_syarikat||"-"}</td>
                        <td>{d.kategori||"-"}</td>
                        <td>{d.bahagian_unit||"-"}</td>
                        <td>{d.risiko}</td>

                        <td className="pr-center">
                            <div className="pr-risk-box" style={{backgroundColor:d.risk_color}}>
                                {shortForm(d.tahap_risiko)}
                            </div>
                        </td>
                        
                        <td className="pr-center pr-group-divider">
                            <div className="pr-risk-box" style={{backgroundColor:"#e0f2fe", color:"#005fa3"}}>
                                {d.status_risiko || "-"}
                            </div>
                        </td>

                        <td className="pr-center">
                            <div className="pr-risk-box" style={getStatusPemantauanStyle(d.status_pemantauan)}>
                                {d.status_pemantauan || "Sedang Dilaksanakan"}
                            </div>
                        </td>

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
            <h2>Penilaian & Rawatan Risiko</h2>
            
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

            <div className="pr-filter-container">
                <input type="text" placeholder="Cari No Rujukan..." value={search} onChange={e=>setSearch(e.target.value)} />
                <select value={syarikatFilter} onChange={e=>setSyarikatFilter(e.target.value)}>
                    <option value="">-- Semua Syarikat --</option>
                    {syarikatList.map(s=><option key={s.syarikat_id} value={s.nama_syarikat}>{s.nama_syarikat}</option>)}
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
                <select value={kategoriFilter} onChange={e=>setKategoriFilter(e.target.value)}>
                    <option value="">-- Semua Kategori --</option>
                    {kategoriList.map(k=><option key={k} value={k}>{k}</option>)}
                </select>
            </div>

            <div className="pr-table-wrapper">
                <table className={tableClassName}> 
                    <thead key={activeTab}> 
                        {activeTab === 'penilaian' ? (
                            <>
                                <tr>
                                    <th rowSpan="2" style={{minWidth:'40px'}}>BIL.</th>
                                    <th colSpan="6" className="pr-header-penilaian">Maklumat Risiko</th> 
                                    <th colSpan="2" className="pr-header-rawatan">Penilaian</th> 
                                </tr>
                                <tr>
                                    <th>NO RUJUKAN</th>
                                    <th style={{lineHeight:'1.2'}}>Tahun<br/>Separuh Tahun</th>
                                    <th>Syarikat</th>
                                    <th>Kategori Risiko</th> 
                                    <th>Bahagian/Unit</th>
                                    <th className="pr-group-divider">Risiko</th>
                                    <th className="pr-center">Status Pemantauan</th>
                                    <th className="pr-center">Tindakan</th>
                                </tr>
                            </>
                        ) : (
                            <>
                                <tr>
                                    <th rowSpan="2" style={{minWidth:'40px'}}>BIL.</th>
                                    <th colSpan="8" className="pr-header-penilaian">Maklumat Risiko</th>
                                    <th colSpan="2" className="pr-header-rawatan">Rawatan</th>
                                </tr>
                                <tr>
                                    <th>No Rujukan</th>
                                    <th style={{lineHeight:'1.2'}}>Tahun<br/>Separuh Tahun</th>
                                    <th>Syarikat</th>
                                    <th>Kategori Risiko</th>
                                    <th>Bahagian/Unit</th>
                                    <th>Risiko</th>
                                    <th className="pr-center">Tahap Risiko</th> 
                                    <th className="pr-center pr-group-divider">Status Risiko</th>
                                    <th className="pr-center">Status Pemantauan</th>
                                    <th className="pr-center">Tindakan</th>
                                </tr>
                            </>
                        )}
                    </thead>

                    <tbody>
                        {renderTableContent()}
                    </tbody>
                </table>
            </div>

            {showPenilaianModal && (
                <PenilaianModal
                    isOpen={showPenilaianModal} 
                    initialData={selectedData}
                    onClose={onSave => {
                        setShowPenilaianModal(false);
                        if(onSave) handleSave();
                    }}
                />
            )}

            {showRawatanModal && (
                <EditRawatan 
                    isOpen={showRawatanModal} 
                    risk={selectedData} 
                    isPenilaian={false}
                    isAddMode={true}
                    pelanList={pelanList} 
                    kakitanganList={kakitanganList} 
                    syarikatList={syarikatList}
                    onClose={() => setShowRawatanModal(false)} 
                    onSave={handleSave} 
                />
            )}
        </div>
    );
}

export default PenilaianDanRawatan;