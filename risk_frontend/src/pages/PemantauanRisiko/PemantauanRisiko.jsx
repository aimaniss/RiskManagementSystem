import { useState, useEffect, useCallback } from "react"; 
import api from "../../api/api";
import { Pencil, Loader2 } from "lucide-react"; 
// Import komponen Modal anda
import EditPemantauan from "./EditPemantauan"; 
import "./PemantauanRisiko.css"; 

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

// =======================================================
// KOMPONEN PEMANTAUAN RISIKO UTAMA
// =======================================================

function PemantauanRisiko() {
    const [data, setData] = useState([]);
    const [subsidiariFilter, setSubsidiariFilter] = useState("");
    const [tahunFilter, setTahunFilter] = useState("");
    const [separuhFilter, setSeparuhFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [subsidiariList, setSubsidiariList] = useState([]);
    
    // State untuk Modal Edit Pemantauan
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRisk, setSelectedRisk] = useState(null);

    
    // Handler untuk Tutup Modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRisk(null);
    };
    
    // PENTING: Fungsi utama untuk memuatkan data risiko dan status pemantauan terkini
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            
            // Panggil data rawatan/daftar risiko
            const res = await api.get("/rawatan"); 
            const rawData = res.data;
            
            const processedData = await Promise.all(rawData.map(async d => {
                
                // 1. Kira Skor Risiko Daftar (menggunakan skor kebarangkalian/impak ASAL)
                const {label: skorDaftarLabel, color: skorDaftarColor} = getRiskData(
                    parseInt(d.skor_kebarangkalian) || 0,
                    parseInt(d.skor_impak) || 0
                );
                
                // 2. FETCH DATA PEMANTAUAN TERKINI
                let pemantauanData = {};
                let tahapRisikoTerkini = skorDaftarLabel;
                let riskColorTerkini = skorDaftarColor;
                
                try {
                    // Ambil rekod pemantauan terkini untuk risiko ini
                    const resPemantauan = await api.get(`/pemantauan/${d.risiko_id}`); 
                    const latestPemantauan = resPemantauan.data;
                    
                    if (latestPemantauan) {
                        const k = parseInt(latestPemantauan.skor_kebarangkalian_selepas) || parseInt(d.skor_kebarangkalian) || 0;
                        const i = parseInt(latestPemantauan.skor_impak_selepas) || parseInt(d.skor_impak) || 0;
                        
                        // Kira skor risiko berdasarkan skor terkini dari rekod pemantauan
                        const {label, color} = getRiskData(k, i);
                        tahapRisikoTerkini = label;
                        riskColorTerkini = color;
                        
                        pemantauanData = {
                            tahun_pemantauan: latestPemantauan.tahun_pemantauan,
                            separuh_tahun_pemantauan: latestPemantauan.separuh_tahun_pemantauan,
                            // Ekstrak pelan tindakan dari log (gunakan ListDisplay di EditPemantauan untuk array)
                            pelan_tindakan_pemantauan: Array.isArray(latestPemantauan.pelan_tindakan_log) 
                                ? latestPemantauan.pelan_tindakan_log.map(p => p.butiran_log).join('; ') // Untuk paparan jadual
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
                }
                
                return {
                    ...d, 
                    id: d.risiko_id, 
                    
                    // 🛠️ MAPPING DATA ASAL UNTUK MODAL EDIT 🛠️
                    tahun_asal: d.tahun, 
                    separuh_tahun_asal: d.separuh_tahun,
                    skor_kebarangkalian_sebelum: d.skor_kebarangkalian, // Digunakan oleh modal untuk kira skor awal
                    skor_impak_sebelum: d.skor_impak,
                    
                    // ✅ PENAMBAHAN UNTUK PUNCA & KESAN RISIKO
                    // Anda perlu pastikan 'punca_risiko_data' dan 'kesan_risiko_data' adalah key yang betul dari API anda.
                    // Mereka harus mengandungi ARRAY of objects/strings.
                     punca_risiko_data: Array.isArray(d.punca) ? d.punca : [], 
                    kesan_risiko_data: Array.isArray(d.kesan) ? d.kesan : [],
                    // ----------------------------------------------------
                    
                    // Data Daftar
                    tahap_risiko_daftar: skorDaftarLabel, 
                    risk_color_daftar: skorDaftarColor,  
                    
                    // Data Pemantauan Terkini
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


    const fetchSubsidiariList = async () => {
        try {
            const res = await api.get("/subsidiari");
            setSubsidiariList(res.data);
        } catch(err){ console.error("Ralat memuat subsidiari:", err); }
    };

    
    useEffect(()=>{
        fetchSubsidiariList();
        fetchData();
    }, [fetchData]);

    
    // Handler untuk Buka Modal
    const handleEdit = (risiko) => {
        setSelectedRisk(risiko);
        setIsModalOpen(true);
    };
    
    // Handler untuk Kemaskini data selepas Simpan dari Modal EditPemantauanRisiko
    // Hanya panggil semula fetchData untuk mendapatkan data terkini dari API
    const handleRefreshData = useCallback(() => {
        handleCloseModal(); // Tutup modal dahulu
        fetchData(); // Muat semula SEMUA data untuk mendapatkan status pemantauan terkini
    }, [fetchData]);


    // Summary Cards (Dikekalkan)
    const totalRisiko = data.length;
    const tindakanSelesai = data.filter(d=>d.status_pemantauan_terkini==="Selesai").length;
    const tindakanTertunggak = data.filter(d=>d.status_pemantauan_terkini==="Tertunggak").length;
    
    const peratusanSelesai = totalRisiko > 0 
        ? ((tindakanSelesai / totalRisiko) * 100).toFixed(1) 
        : "0.0";

    // Filtered data (Dikekalkan)
    const filteredData = data.filter(d=>{
        const matchSubsidiari = !subsidiariFilter || d.nama_subsidiari===subsidiariFilter;
        const matchTahun = !tahunFilter || String(d.tahun_asal || d.tahun)===tahunFilter; 
        const matchSeparuh = !separuhFilter || String(d.separuh_tahun_asal || d.separuh_tahun)===separuhFilter; 
        const matchStatus = !statusFilter || d.status_pemantauan_terkini===statusFilter;
        return matchSubsidiari && matchTahun && matchSeparuh && matchStatus;
    });
    
    const COL_SPAN = 15; 

    return (
        <div className="senarai-risiko-container">
            <h1>Pemantauan Risiko</h1>

            {/* Summary Cards */}
            <div className="cards-container">
                <div className="info-card">
                    <h3>Jumlah Risiko Dipantau</h3>
                    <p>{totalRisiko}</p>
                </div>
                <div className="info-card success-card">
                    <h3>Peratusan Tindakan Selesai</h3>
                    <p>{peratusanSelesai}%</p>
                </div>
                <div className="info-card danger-card">
                    <h3>Jumlah Tindakan Tertunggak</h3>
                    <p>{tindakanTertunggak}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-container">
                <select className="filter-select" value={subsidiariFilter} onChange={e=>setSubsidiariFilter(e.target.value)}>
                    <option value="">-- Semua Subsidiari --</option>
                    {subsidiariList.map(s=>(
                        <option key={s.subsidiari_id} value={s.nama_subsidiari}>{s.nama_subsidiari}</option>
                    ))}
                </select>

                <select className="filter-select" value={tahunFilter} onChange={e=>setTahunFilter(e.target.value)}>
                    <option value="">-- Semua Tahun --</option>
                    {[...new Set(data.map(d=>d.tahun))].filter(t => t).sort((a,b)=>b-a).map(t=>(
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                <select className="filter-select" value={separuhFilter} onChange={e=>setSeparuhFilter(e.target.value)}>
                    <option value="">-- Semua Separuh Tahun --</option>
                    <option value="1">Pertama</option>
                    <option value="2">Kedua</option>
                </select>

                <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                    <option value="Tiada Pemantauan">-- Semua Status --</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Tertunggak">Tertunggak</option>
                    <option value="Tiada Pemantauan">Tiada Pemantauan</option>
                </select>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table className="risiko-table">
                    <thead>
                        {/* Baris 1: Tajuk Besar */}
                        <tr>
                            <th rowSpan="2" className="dark-zone-header">Bil.</th>
                            <th rowSpan="2" className="dark-zone-header">No Rujukan</th>
                            <th rowSpan="2" className="dark-zone-header">Tahun & Separuh Tahun Daftar</th> 
                            <th rowSpan="2" className="dark-zone-header">Nama Syarikat</th>
                            <th rowSpan="2" className="dark-zone-header">Kategori Risiko</th>
                            <th rowSpan="2" className="dark-zone-header">Risiko</th> 
                            
                            <th rowSpan="2" className="dark-zone-header">Skor Risiko (Daftar)</th> 
                            
                            <th rowSpan="2" className="dark-zone-header">Pelan Rawatan Risiko</th> 
                            
                            {/* ZON BIRU CERAH */}
                            <th colSpan="6" className="light-zone-header">Pemantauan Risiko</th> 
                        </tr>
                        {/* Baris 2: Tajuk Kecil Kumpulan Pemantauan */}
                        <tr className="table-separator"> 
                            <th className="light-zone-subheader">Tahun & Separuh Tahun Pemantauan</th>
                            <th className="light-zone-subheader">Pelan Tindakan Pemantauan Risiko</th>
                            <th className="light-zone-subheader">Status Pemantauan Terkini</th>
                            <th className="light-zone-subheader">Skor Risiko Terkini</th>
                            <th className="light-zone-subheader">Catatan</th>
                            <th className="light-zone-subheader">Tindakan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={COL_SPAN} className="loading"><Loader2 size={20} className="spin" /> Memuatkan...</td></tr>
                        ) : filteredData.length>0 ? (
                            filteredData.map((d,i)=>(
                                <tr key={d.id}>
                                    {/* DATA ASAL RISIKO & RAWATAN (ZON GELAP) */}
                                    <td>{i+1}</td>
                                    <td>{d.no_rujukan}</td>
                                    <td>{`${d.tahun_asal || d.tahun || "-"} - ${getSeparuhTahunLabel(d.separuh_tahun_asal || d.separuh_tahun)}`}</td>
                                    <td>{d.nama_subsidiari}</td>
                                    <td>{d.kategori || "-"}</td>
                                    <td>{d.risiko}</td> 
                                    
                                    {/* SKOR RISIKO (DAFTAR) */}
                                    <td className="center">
                                        <div className="risk-box" style={{backgroundColor:d.risk_color_daftar}}>
                                            {shortForm(d.tahap_risiko_daftar)}
                                        </div>
                                    </td>
                                    
                                    {/* PELAN TINDAKAN RAWATAN (ASAL) */}
                                    <td>
                                            {Array.isArray(d.plan_tindakan) && d.plan_tindakan.length > 0
                                                ? d.plan_tindakan.map(p => p.butiran_aktiviti).join('; ')
                                                : "-"}
                                    </td> 
                                    
                                    {/* DATA PEMANTAUAN TERKINI (ZON CERAH) */}
                                    <td>{d.tahun_pemantauan ? `${d.tahun_pemantauan} - ${getSeparuhTahunLabel(d.separuh_tahun_pemantauan)}` : "-"}</td>
                                    <td>{d.pelan_tindakan_pemantauan || "-"}</td>
                                    <td>{d.status_pemantauan_terkini || "-"}</td>
                                    
                                    {/* SKOR RISIKO TERKINI */}
                                    <td className="center">
                                        <div className="risk-box" style={{backgroundColor:d.risk_color}}>
                                            {shortForm(d.tahap_risiko)}
                                        </div>
                                    </td>
                                    
                                    <td>{d.catatan || "-"}</td>
                                    <td className="center">
                                        <button className="icon-edit-btn" onClick={() => handleEdit(d)} title="Lihat/Kemaskini Pemantauan">
                                            <Pencil size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={COL_SPAN} className="no-data">Tiada data dijumpai</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Render Modal Edit Pemantauan Risiko */}
            {isModalOpen && selectedRisk && (
                <EditPemantauan
                    isOpen={isModalOpen}
                    risk={selectedRisk} 
                    onClose={handleCloseModal}
                    onLogSave={handleRefreshData} // Ganti onSave lama dengan ini
                />
            )}
        </div>
    );
}

export default PemantauanRisiko;