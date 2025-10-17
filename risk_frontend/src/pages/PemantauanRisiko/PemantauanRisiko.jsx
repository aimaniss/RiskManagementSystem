import { useState, useEffect, useCallback } from "react"; 
import api from "../../api/api"; // Andaikan ini fail konfigurasi axios
import { Pencil, Loader2 } from "lucide-react"; 
import EditPemantauan from "./EditPemantauan"; // Andaikan ini komponen modal untuk kemaskini log terkini
import "./PemantauanRisiko.css"; // Import CSS

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

const getRiskData = (k, i) => {
  // Jika tiada nilai (null, undefined, 0), tunjuk Tiada Data
  if (!k || !i) {
    return { label: "Tiada Data", color: "#9ca3af" }; // Kelabu
  }

  // Pastikan dalam julat 1–5
  const kk = Math.min(Math.max(parseInt(k), 1), 5);
  const ii = Math.min(Math.max(parseInt(i), 1), 5);

  // Jika valid, ambil dari riskMatrix
  return riskMatrix[kk]?.[ii] || { label: "-", color: "#9ca3af" };
};
const shortForm = (label) => label==="Rendah"?"R":label==="Sederhana"?"S":label==="Tinggi"?"T":label==="Sangat Tinggi"?"ST":"";
const getSeparuhTahunLabel = (separuh) => separuh === 1 ? "Pertama" : separuh === 2 ? "Kedua" : "";


function PemantauanRisiko() { 
    const [data, setData] = useState([]);
    const [subsidiariFilter, setSubsidiariFilter] = useState("");
    const [tahunFilter, setTahunFilter] = useState("");
    const [separuhFilter, setSeparuhFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);
    // Nota: Dalam aplikasi sebenar, senarai subsidiari perlu dimuatkan dari API yang sesuai.
    const [subsidiariList, setSubsidiariList] = useState([{subsidiari_id:1, nama_subsidiari:"Subsidiari A"}, {subsidiari_id:2, nama_subsidiari:"Subsidiari B"}]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRiskForEdit, setSelectedRiskForEdit] = useState(null); 
    // 💡 Digunakan untuk kawal butang edit semasa memuatkan data sejarah
    const [loadingModal, setLoadingModal] = useState(false); 
    
    
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            
            // 🚀 Memanggil endpoint yang telah diagregatkan oleh backend (risiko + log terkini)
            const res = await api.get("/pemantauan-risiko"); 
            const rawData = res.data;
            
            const processedData = rawData.map(d => {
                
                // 1. Skor Risiko SEBELUM (Skor Asal dari jadual Risiko)
                const {label: skorDaftarLabel, color: skorDaftarColor} = getRiskData(
                    parseInt(d.skor_kebarangkalian_sebelum) || 0,
                    parseInt(d.skor_impak_sebelum) || 0
                );
                
                // 2. Skor Risiko TERKINI / SELEPAS (Ambil dari field COALESCE di SQL)
                const {label: tahapRisikoTerkini, color: riskColorTerkini} = getRiskData(
                    parseInt(d.skor_kebarangkalian_terkini) || 0,
                    parseInt(d.skor_impak_terkini) || 0
                );
                
                return {
                    ...d, 
                    id: d.id, 
                    risiko_id: d.id, 
                    tahun_asal: d.tahun, 
                    separuh_tahun_asal: d.separuh_tahun,
                    
                    // Skor Pendaftaran
                    skor_kebarangkalian_sebelum: d.skor_kebarangkalian_sebelum, 
                    skor_impak_sebelum: d.skor_impak_sebelum,
                    tahap_risiko_daftar: skorDaftarLabel, 
                    risk_color_daftar: skorDaftarColor,  
                    
                    // Data Pemantauan Terkini
                    tahun_pemantauan: d.tahun_pemantauan,
                    separuh_tahun_pemantauan: d.separuh_tahun_pemantauan,
                    // Pelan tindakan adalah array, gabungkan untuk paparan
                    pelan_tindakan_pemantauan: Array.isArray(d.pelan_tindakan_terkini) 
                        ? d.pelan_tindakan_terkini.filter(p => p).join('; ') 
                        : (d.pelan_tindakan_terkini || ""), 
                    status_pemantauan_terkini: d.status_pemantauan_terkini || "Buka", 
                    catatan: d.catatan,
                    skor_kebarangkalian_terkini: d.skor_kebarangkalian_terkini,
                    skor_impak_terkini: d.skor_impak_terkini,
                    tahap_risiko: tahapRisikoTerkini, // Ini kini adalah Skor Selepas Terkini
                    risk_color: riskColorTerkini,  
                };
            });

            setData(processedData);
        } catch(err){ 
            console.error("❌ Ralat memuat data pemantauan risiko:", err); 
        }
        finally { setLoading(false); }
    }, []);

    const fetchSubsidiariList = async () => { /* Logic untuk fetch subsidiari */ };
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedRiskForEdit(null); fetchData(); }; // Tambah fetchData() untuk refresh data
    
    // 🔴 FUNGSI BARU/DIKEMASKINI: Muatkan log sejarah dengan skor sebelum/selepas berurutan
    const handleEdit = async (risikoSenarai) => {
  try {
    setLoadingModal(true);
    // Panggil API yang mengembalikan PUNCA & KESAN
    const res = await api.get(`/rawatan/${risikoSenarai.risiko_id}`);
    const fullRiskData = res.data;

    // Gabungkan data terkini + data penuh dari rawatan
    const dataUntukModal = {
      ...risikoSenarai,
      ...fullRiskData,
      punca_risiko_data: Array.isArray(fullRiskData.punca) ? fullRiskData.punca : [],
      kesan_risiko_data: Array.isArray(fullRiskData.kesan) ? fullRiskData.kesan : [],
      skor_kebarangkalian_sebelum: fullRiskData.skor_kebarangkalian,
      skor_impak_sebelum: fullRiskData.skor_impak,
    };

    setSelectedRiskForEdit(dataUntukModal);
    setIsModalOpen(true);
  } catch (err) {
    console.error(`Ralat memuat data risiko lengkap ${risikoSenarai.risiko_id}:`, err);
  } finally {
    setLoadingModal(false);
  }
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
        // Gunakan tahun/separuh_tahun dari log pemantauan jika ada, atau tahun asal.
        const d_tahun = d.tahun_pemantauan || d.tahun_asal || d.tahun;
        const d_separuh = d.separuh_tahun_pemantauan || d.separuh_tahun_asal || d.separuh_tahun;
        
        const matchTahun = !tahunFilter || String(d_tahun)===tahunFilter; 
        const matchSeparuh = !separuhFilter || String(d_separuh)===separuhFilter; 
        const matchStatus = !statusFilter || d.status_pemantauan_terkini===statusFilter;
        return matchSubsidiari && matchTahun && matchSeparuh && matchStatus;
    });
    
    // 🔴 Jumlah lajur: 6 (Pendaftaran) + 1 (Skor Sebelum) + 5 (Log Pemantauan) + 1 (Tindakan) = 13
    const COL_SPAN = 13; 

    return (
        <div className="senaraipemantauan-container">
            <h1>Pemantauan Risiko</h1>

            {/* ... Summary Cards (Dikekalkan) ... */}
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

            {/* ... Filters (Dikekalkan) ... */}
            <div className="senaraipemantauan-filter-container">
                <select className="senaraipemantauan-filter-select" value={subsidiariFilter} onChange={e=>setSubsidiariFilter(e.target.value)}>
                    <option value="">-- Semua Subsidiari --</option>
                    {subsidiariList.map(s=>(
                        <option key={s.subsidiari_id} value={s.nama_subsidiari}>{s.nama_subsidiari}</option>
                    ))}
                </select>

                <select className="senaraipemantauan-filter-select" value={tahunFilter} onChange={e=>setTahunFilter(e.target.value)}>
                    <option value="">-- Semua Tahun --</option>
                    {[...new Set(data.map(d=>d.tahun || d.tahun_pemantauan))].filter(t => t).sort((a,b)=>b-a).map(t=>(
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
                    <option value="Buka">Buka</option>
                    <option value="Sedang Dilaksanakan">Sedang Dilaksanakan</option>
                    <option value="Pemantauan">Pemantauan</option>
                    <option value="Selesai">Selesai</option>
                     <option value="Tutup">Tutup</option>
                </select>
            </div>

            {/* Table Wrapper UTAMA (Mengendalikan scroll mendatar) */}
            <div className="senaraipemantauan-table-wrapper">
                <table className="senaraipemantauan-table">
                    <thead>
                        {/* BARIS 1: TAJUK UTAMA */}
                        <tr>
                            <th colSpan="6" className="senaraipemantauan-dark-zone-header">Data Pendaftaran Risiko</th> 
                            <th rowSpan="2" className="senaraipemantauan-dark-zone-header">Skor Risiko Sebelum</th>
                            <th colSpan="6" className="senaraipemantauan-light-zone-header">Log Pemantauan Terkini</th> 
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
                            <th className="senaraipemantauan-light-zone-subheader">Skor Risiko Selepas</th>
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
                                    {/* KOLUM DATA PENDAFTARAN */}
                                    <td>{i+1}</td>
                                    <td>{d.no_rujukan}</td>
                                    <td>{`${d.tahun_asal || d.tahun || ""} - ${getSeparuhTahunLabel(d.separuh_tahun_asal || d.separuh_tahun)}`}</td>
                                    <td>{d.nama_subsidiari}</td>
                                    <td>{d.kategori_risiko || ""}</td> 
                                    <td>{d.risiko}</td> 
                                    
                                    {/* SKOR RISIKO SEBELUM (Skor Asal Pendaftaran) */}
                                    <td className="senaraipemantauan-center">
                                        <div className="senaraipemantauan-risk-box" style={{backgroundColor:d.risk_color_daftar}}>
                                            {shortForm(d.tahap_risiko_daftar)}
                                        </div>
                                    </td>
                                    
                                    {/* DATA LOG PEMANTAUAN TERKINI */}
                                    <td>{d.tahun_pemantauan ? `${d.tahun_pemantauan} - ${getSeparuhTahunLabel(d.separuh_tahun_pemantauan)}` : ""}</td>
                                    <td>{d.pelan_tindakan_pemantauan || ""}</td>
                                    <td>{d.status_pemantauan_terkini || ""}</td>
                                    
                                    {/* SKOR RISIKO SELEPAS */}
                                    <td className="senaraipemantauan-center">
                                        <div className="senaraipemantauan-risk-box" style={{backgroundColor:d.risk_color}}>
                                            {shortForm(d.tahap_risiko)}
                                        </div>
                                    </td>
                                    
                                    <td>{d.catatan || ""}</td>
                                    
                                    {/* KEMASKINI PEMANTAUAN */}
                                    <td className="senaraipemantauan-center">
                                        <button 
                                            className="senaraipemantauan-icon-edit-btn" 
                                            onClick={() => handleEdit(d)} 
                                            title="Lihat/Kemaskini Pemantauan" 
                                            disabled={loadingModal}
                                        >
                                            {loadingModal ? <Loader2 size={18} className="senaraipemantauan-spin" /> : <Pencil size={18} />}
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
                    // Pastikan komponen EditPemantauan menerima objek yang telah dilampirkan sejarah log
                    risk={selectedRiskForEdit} 
                    onClose={handleCloseModal}
                    onLogSave={handleRefreshData}
                />
            )}
        </div>
    );
}

export default PemantauanRisiko;