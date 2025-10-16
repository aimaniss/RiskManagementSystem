import { useState, useEffect, useCallback, useRef } from "react"; 
import api from "../../api/api"; // Andaikan ini fail konfigurasi axios
import { Pencil, Loader2 } from "lucide-react"; 
import EditPemantauan from "./EditPemantauan"; // Andaikan ini komponen modal
import "./PemantauanRisiko.css"; // Import CSS yang sangat penting!

// =======================================================
// UTILITIES (Dikekalkan)
// =======================================================
const riskMatrix = {
    1: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    2: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    3: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Tinggi",color:"#f97316"}},
    4: {1:{label:"Sederhana",color:"#eab308"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
    5: {1:{label:"Sederhana",color:"#eab308"},2:{label:"Tinggi",color:"#f97316"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Sangat Tinggi",color:"#ef4444"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
};

const getRiskData = (k,i) => riskMatrix[k]?.[i] || {label:"-", color:"#f1f5f9"};
const shortForm = (label) => label==="Rendah"?"R":label==="Sederhana"?"S":label==="Tinggi"?"T":label==="Sangat Tinggi"?"ST":"-";
const getSeparuhTahunLabel = (separuh) => separuh === 1 ? "Pertama" : separuh === 2 ? "Kedua" : "-";


function PemantauanRisiko() { 
    const [data, setData] = useState([]);
    const [subsidiariFilter, setSubsidiariFilter] = useState("");
    const [tahunFilter, setTahunFilter] = useState("");
    const [separuhFilter, setSeparuhFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [subsidiariList, setSubsidiariList] = useState([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRiskForEdit, setSelectedRiskForEdit] = useState(null); 
    const [loadingModal, setLoadingModal] = useState(false); 
    
    // REFS UNTUK SCROLLING MIRROR (DIKEKALKAN)
    const scrollWrapperRef = useRef(null);
    const scrollMirrorRef = useRef(null);

    // EFFECT UNTUK SYNC SCROLLBAR ATAS & BAWAH (DIKEKALKAN)
    useEffect(() => {
        const wrapper = scrollWrapperRef.current;
        const mirror = scrollMirrorRef.current;

        if (wrapper && mirror) {
            // Sync scroll dari bawah ke atas
            const handleWrapperScroll = () => {
                mirror.scrollLeft = wrapper.scrollLeft;
            };
            
            // Sync scroll dari atas ke bawah
            const handleMirrorScroll = () => {
                wrapper.scrollLeft = mirror.scrollLeft;
            };

            wrapper.addEventListener('scroll', handleWrapperScroll);
            mirror.addEventListener('scroll', handleMirrorScroll);

            return () => {
                wrapper.removeEventListener('scroll', handleWrapperScroll);
                mirror.removeEventListener('scroll', handleMirrorScroll);
            };
        }
    }, []);

    // Placeholder untuk fungsi logik backend (fetchData, fetchSubsidiariList, dll...)
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/rawatan"); 
            const rawData = res.data;
            
            const processedData = await Promise.all(rawData.map(async d => {
                // ... logik pemprosesan data ...
                const {label: skorDaftarLabel, color: skorDaftarColor} = getRiskData(
                    parseInt(d.skor_kebarangkalian) || 0,
                    parseInt(d.skor_impak) || 0
                );
                
                let pemantauanData = {};
                let tahapRisikoTerkini = skorDaftarLabel;
                let riskColorTerkini = skorDaftarColor;
                
                try {
                    // Cuba dapatkan data pemantauan terkini
                    const resPemantauan = await api.get(`/pemantauan/${d.risiko_id}`); 
                    const latestPemantauan = resPemantauan.data;
                    
                    if (latestPemantauan) {
                        const k = parseInt(latestPemantauan.skor_kebarangkalian_selepas) || parseInt(d.skor_kebarangkalian) || 0;
                        const i = parseInt(latestPemantauan.skor_impak_selepas) || parseInt(d.skor_impak) || 0;
                        
                        const {label, color} = getRiskData(k, i);
                        tahapRisikoTerkini = label;
                        riskColorTerkini = color;
                        
                        pemantauanData = {
                            tahun_pemantauan: latestPemantauan.tahun_pemantauan,
                            separuh_tahun_pemantauan: latestPemantauan.separuh_tahun_pemantauan,
                            // Asumsi pelan_tindakan_log adalah array dan perlu digabungkan
                            pelan_tindakan_pemantauan: Array.isArray(latestPemantauan.pelan_tindakan_log) 
                                ? latestPemantauan.pelan_tindakan_log.map(p => p.butiran_log).join('; ') 
                                : "-",
                            status_pemantauan_terkini: latestPemantauan.status_pemantauan, 
                            catatan: latestPemantauan.catatan_pemantauan,
                            skor_kebarangkalian_terkini: latestPemantauan.skor_kebarangkalian_selepas,
                            skor_impak_terkini: latestPemantauan.skor_impak_selepas,
                        };
                    }
                } catch (err) {
                    if (err.response?.status !== 404) {
                        console.error(`Ralat memuat pemantauan untuk risiko ${d.risiko_id}:`, err);
                    }
                    // Abaikan ralat 404, anggap tiada pemantauan
                }
                
                return {
                    ...d, 
                    id: d.risiko_id, 
                    risiko_id: d.risiko_id, 
                    tahun_asal: d.tahun, 
                    separuh_tahun_asal: d.separuh_tahun,
                    skor_kebarangkalian_sebelum: d.skor_kebarangkalian, 
                    skor_impak_sebelum: d.skor_impak,
                    tahap_risiko_daftar: skorDaftarLabel, 
                    risk_color_daftar: skorDaftarColor,  
                    ...pemantauanData,
                    tahap_risiko: tahapRisikoTerkini, 
                    risk_color: riskColorTerkini,  
                    status_pemantauan_terkini: pemantauanData.status_pemantauan_terkini || "Tiada Pemantauan", 
                };
            }));

            setData(processedData);
        } catch(err){ console.error("Ralat memuat data risiko/rawatan:", err); }
        finally { setLoading(false); }
    }, []);

    const fetchSubsidiariList = async () => { setSubsidiariList([{subsidiari_id:1, nama_subsidiari:"Subsidiari A"}, {subsidiari_id:2, nama_subsidiari:"Subsidiari B"}]) };
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedRiskForEdit(null); fetchData(); }; // Tambah fetchData() untuk refresh data
    const handleEdit = async (risikoSenarai) => { 
        setSelectedRiskForEdit(risikoSenarai);
        setIsModalOpen(true);
    };
    const handleRefreshData = useCallback(() => { fetchData(); }, [fetchData]);

    
    useEffect(()=>{
        fetchSubsidiariList();
        fetchData();
    }, [fetchData]);

    const totalRisiko = data.length;
    const tindakanSelesai = data.filter(d=>d.status_pemantauan_terkini==="Selesai").length;
    const tindakanTertunggak = data.filter(d=>d.status_pemantauan_terkini==="Tertunggak").length;
    const peratusanSelesai = totalRisiko > 0 
        ? ((tindakanSelesai / totalRisiko) * 100).toFixed(1) 
        : "0.0";

    const filteredData = data.filter(d=>{
        const matchSubsidiari = !subsidiariFilter || d.nama_subsidiari===subsidiariFilter;
        const matchTahun = !tahunFilter || String(d.tahun_asal || d.tahun)===tahunFilter; 
        const matchSeparuh = !separuhFilter || String(d.separuh_tahun_asal || d.separuh_tahun)===separuhFilter; 
        const matchStatus = !statusFilter || d.status_pemantauan_terkini===statusFilter;
        return matchSubsidiari && matchTahun && matchSeparuh && matchStatus;
    });
    
    // JUMLAH KOLUM: 13 (6 Daftar + 1 Terdahulu + 6 Pemantauan)
    const COL_SPAN = 13; 

    return (
        <div className="senaraipemantauan-container">
            <h1>Pemantauan Risiko</h1>

            {/* Summary Cards */}
            <div className="senaraipemantauan-cards-container">
                <div className="senaraipemantauan-info-card">
                    <h3>Jumlah Risiko Dipantau</h3>
                    <p>{totalRisiko}</p>
                </div>
                <div className="senaraipemantauan-info-card senaraipemantauan-success-card">
                    <h3>Peratusan Tindakan Selesai</h3>
                    <p>{peratusanSelesai}%</p>
                </div>
                <div className="senaraipemantauan-info-card senaraipemantauan-danger-card">
                    <h3>Jumlah Tindakan Tertunggak</h3>
                    <p>{tindakanTertunggak}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="senaraipemantauan-filter-container">
                <select className="senaraipemantauan-filter-select" value={subsidiariFilter} onChange={e=>setSubsidiariFilter(e.target.value)}>
                    <option value="">-- Semua Subsidiari --</option>
                    {subsidiariList.map(s=>(
                        <option key={s.subsidiari_id} value={s.nama_subsidiari}>{s.nama_subsidiari}</option>
                    ))}
                </select>

                <select className="senaraipemantauan-filter-select" value={tahunFilter} onChange={e=>setTahunFilter(e.target.value)}>
                    <option value="">-- Semua Tahun --</option>
                    {[...new Set(data.map(d=>d.tahun))].filter(t => t).sort((a,b)=>b-a).map(t=>(
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                <select className="senaraipemantauan-filter-select" value={separuhFilter} onChange={e=>setSeparuhFilter(e.target.value)}>
                    <option value="">-- Semua Separuh Tahun --</option>
                    <option value="1">Pertama</option>
                    <option value="2">Kedua</option>
                </select>

                <select className="senaraipemantauan-filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                    <option value="">-- Semua Status --</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Tertunggak">Tertunggak</option>
                    <option value="Tiada Pemantauan">Tiada Pemantauan</option>
                </select>
            </div>

            {/* BAR SCROLL ATAS (Mirror Scrollbar) */}
            <div className="senaraipemantauan-scroll-top-bar" ref={scrollMirrorRef}>
                {/* Memaksa elemen di dalam untuk mempunyai lebar 1200px agar scrollbar kelihatan */}
                <div style={{minWidth: '1200px', height: '1px'}}></div>
            </div>

            {/* Table Wrapper UTAMA (Mengendalikan scroll mendatar) */}
            <div className="senaraipemantauan-table-wrapper" ref={scrollWrapperRef}>
                <table className="senaraipemantauan-table">
                    <thead>
                        {/* BARIS 1: TAJUK UTAMA */}
                        <tr>
                            {/* **Bil & No Rujukan dikira dalam colSpan** - 13 kolum = 6 + 1 + 6 */}
                            <th colSpan="6" className="senaraipemantauan-dark-zone-header">Data Pendaftaran Risiko</th> 
                            <th rowSpan="2" className="senaraipemantauan-dark-zone-header">Skor Risiko Terdahulu</th>
                            <th colSpan="6" className="senaraipemantauan-light-zone-header">Pemantauan Risiko</th> 
                        </tr>
                        
                        {/* BARIS 2: SUB-TAJUK KOLUM */}
                        <tr className="senaraipemantauan-table-separator"> 
                            <th className="senaraipemantauan-dark-zone-subheader">Bil.</th>
                            <th className="senaraipemantauan-dark-zone-subheader">No Rujukan</th>
                            <th className="senaraipemantauan-dark-zone-subheader">Tahun & Separuh Tahun Daftar</th> 
                            <th className="senaraipemantauan-dark-zone-subheader">Nama Subsidiari</th> 
                            <th className="senaraipemantauan-dark-zone-subheader">Kategori Risiko</th>
                            <th className="senaraipemantauan-dark-zone-subheader">Risiko</th> 
                            
                            <th className="senaraipemantauan-light-zone-subheader">Tahun & Separuh Tahun Pemantauan</th>
                            <th className="senaraipemantauan-light-zone-subheader">Pelan Tindakan Pemantauan Risiko</th>
                            <th className="senaraipemantauan-light-zone-subheader">Status Pemantauan Terkini</th>
                            <th className="senaraipemantauan-light-zone-subheader">Skor Risiko Terkini</th>
                            <th className="senaraipemantauan-light-zone-subheader">Catatan</th>
                            <th className="senaraipemantauan-light-zone-subheader">Tindakan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={COL_SPAN} className="senaraipemantauan-loading"><Loader2 size={20} className="senaraipemantauan-spin" /> Memuatkan...</td></tr>
                        ) : filteredData.length>0 ? (
                            filteredData.map((d,i)=>(
                                <tr key={d.id}>
                                    {/* KOLUM DATA */}
                                    <td>{i+1}</td>
                                    <td>{d.no_rujukan}</td>
                                    <td>{`${d.tahun_asal || d.tahun || "-"} - ${getSeparuhTahunLabel(d.separuh_tahun_asal || d.separuh_tahun)}`}</td>
                                    <td>{d.nama_subsidiari}</td>
                                    <td>{d.kategori || "-"}</td>
                                    <td>{d.risiko}</td> 
                                    
                                    {/* SKOR RISIKO TERDAHULU */}
                                    <td className="senaraipemantauan-center">
                                        <div className="senaraipemantauan-risk-box" style={{backgroundColor:d.risk_color_daftar}}>
                                            {shortForm(d.tahap_risiko_daftar)}
                                        </div>
                                    </td>
                                    
                                    {/* DATA PEMANTAUAN TERKINI */}
                                    <td>{d.tahun_pemantauan ? `${d.tahun_pemantauan} - ${getSeparuhTahunLabel(d.separuh_tahun_pemantauan)}` : "-"}</td>
                                    <td>{d.pelan_tindakan_pemantauan || "-"}</td>
                                    <td>{d.status_pemantauan_terkini || "-"}</td>
                                    
                                    {/* SKOR RISIKO TERKINI */}
                                    <td className="senaraipemantauan-center">
                                        <div className="senaraipemantauan-risk-box" style={{backgroundColor:d.risk_color}}>
                                            {shortForm(d.tahap_risiko)}
                                        </div>
                                    </td>
                                    
                                    <td>{d.catatan || "-"}</td>
                                    <td className="senaraipemantauan-center">
                                        <button className="senaraipemantauan-icon-edit-btn" onClick={() => handleEdit(d)} title="Lihat/Kemaskini Pemantauan" disabled={loadingModal}>
                                            <Pencil size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={COL_SPAN} className="senaraipemantauan-no-data">Tiada data dijumpai</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Render Modal Edit Pemantauan Risiko */}
            {isModalOpen && selectedRiskForEdit && ( 
                <EditPemantauan
                    isOpen={isModalOpen}
                    risk={selectedRiskForEdit} 
                    onClose={handleCloseModal}
                    onLogSave={handleRefreshData}
                />
            )}
        </div>
    );
}

export default PemantauanRisiko;