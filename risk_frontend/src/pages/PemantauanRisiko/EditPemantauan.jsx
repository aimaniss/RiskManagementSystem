import { useState, useEffect } from "react";
import { X, BookOpen, Loader2, Trash2, PlusCircle, Pencil } from "lucide-react"; 
import "./EditPemantauan.css"; 
import api from "../../api/api"; 
import PanduanModal from '../Panduan/Panduan'; 
import TambahLogModal from './TambahLogModal'; 

// =======================================================
// Komponen Pembantu untuk Memaparkan Senarai Bernombor 
// (TIDAK BERUBAH)
// =======================================================
const ListDisplay = ({ data, isLogContext = false }) => {
    
    // Fungsi untuk mendapatkan teks daripada item (sama ada string atau objek)
    const getItemText = (item) => {
        // ✅ 1. UTAMAKAN String (Untuk Array of Strings dari DB)
        if (typeof item === 'string') return item; 

        // 💡 DEBUG FALLBACKS (PENTING UNTUK PUNCA/KESAN)
        if (item?.punca) return item.punca; // Fallback jika DB hantar {punca: "Punca 1"}
        if (item?.kesan) return item.kesan; // Fallback jika DB hantar {kesan: "Kesan A"}

        // ✅ 2. FIELD DB SEBENAR DARI punca_risiko & kesan_risiko (Jika menggunakan format objek lain)
        if (item?.punca_text) return item.punca_text;
        if (item?.kesan_text) return item.kesan_text;

        // 🚨 PEMBETULAN UTAMA: Tambah kunci yang paling mungkin digunakan oleh API anda 🚨
        if (item?.nama_punca) return item.nama_punca; 
        if (item?.nama_kesan) return item.nama_kesan; 
        // -------------------------------------------------------------

        // ✅ 3. UTAMAKAN field butiran LOG/RAWATAN
        if (item?.butiran_punca) return item.butiran_punca; 
        if (item?.butiran_kesan) return item.butiran_kesan; 
        if (item?.butiran_aktiviti) return item.butiran_aktiviti;
        if (item?.butiran_kakitangan) return item.butiran_kakitangan;
        if (item?.butiran_log) return item.butiran_log; 
        
        if (item?.text) return item.text; // General fallback if key is 'text'

        return "-";
    };

    // Memastikan data adalah array dan menapis item yang kosong/null
    const cleanedData = Array.isArray(data) ? data.filter(item => {
        const text = getItemText(item); 
        // pastikan teks wujud dan bukan hanya "-"
        return text && text.trim() !== "-"; 
    }) : [];
    
    if (cleanedData.length === 0) return <span style={{ color: '#64748b' }}>-</span>;

    return (
        <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '0' }}>
            {cleanedData.map((item, index) => (
                <li key={index} className="pemantauan-list-item">
                    <span className="pemantauan-data-inline">
                        {`${index + 1}. ${getItemText(item)}`}
                    </span>
                </li>
            ))}
        </ul>
    );
};

// =======================================================
// Risk Matrix & Utility Functions (Dikekalkan)
// =======================================================
const riskMatrix = {
    1: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Rendah", color:"#22c55e"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Sederhana", color:"#eab308"},5:{label:"Tinggi", color:"#f97316"}},
    2: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Rendah", color:"#22c55e"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Sederhana", color:"#eab308"},5:{label:"Tinggi", color:"#f97316"}},
    3: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Sederhana", color:"#eab308"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Tinggi", color:"#f97316"},5:{label:"Tinggi", color:"#f97316"}},
    4: {1:{label:"Sederhana", color:"#eab308"},2:{label:"Sederhana", color:"#eab308"},3:{label:"Tinggi", color:"#f97316"},4:{label:"Tinggi", color:"#f97316"},5:{label:"Sangat Tinggi", color:"#ef4444"}},
    5: {1:{label:"Sederhana", color:"#eab308"},2:{label:"Tinggi", color:"#f97316"},3:{label:"Tinggi", color:"#f97316"},4:{label:"Sangat Tinggi", color:"#ef4444"},5:{label:"Sangat Tinggi", color:"#ef4444"}},
  };

const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "", color: "#f1f5f9" };
const getRiskLevel = (k, i) => getRiskMatrix(k, i).label; 

/**
 * ✅ FUNGSI PEMBANTU BARU untuk menukar separuh tahun dari 1/2 ke Pertama/Kedua
 * @param {number | string | null} value - Nilai separuh tahun (1 atau 2)
 * @returns {string} - "Pertama", "Kedua", atau "-"
 */
const formatSeparuhTahun = (value) => {
    const num = parseInt(value);
    if (num === 1) return "Pertama";
    if (num === 2) return "Kedua";
    return "-";
};

// =======================================================
// KOMPONEN UTAMA EDIT PEMANTAUAN
// =======================================================
export default function EditPemantauan({ isOpen, risk, onClose }) { 
    const [isPanduanOpen, setIsPanduanOpen] = useState(false); 
    const [isTambahLogModalOpen, setIsTambahLogModalOpen] = useState(false); 
    const [logData, setLogData] = useState([]); 
    const [isLoadingLog, setIsLoadingLog] = useState(false); 

    // State untuk memegang data log yang sedang diedit
    // Tambah log sedang diedit, jika ada
    const [logToEdit, setLogToEdit] = useState(null); 
    
    // State utama untuk memegang data Risiko dan Rawatan (Read-Only)
    const [data, setData] = useState({
        risiko_id: null, 
        planTindakan: [], 
        kakitanganBertanggungjawab: [], 
        jenisKawalan: "", 
        tempohSiap: "", 
        punca: [], // Data Punca
        kesan: [], // Data Kesan
        skor_kebarangkalian: null, 
        skor_impak: null, 
        tahap_risiko: "", 
        no_rujukan: "", 
        tahun: "", 
        separuh_tahun: null, 
        nama_subsidiari: "", 
        kategori: "", 
        bahagian: "", 
        risiko: "", 
        // 👇 FIELD BARU UNTUK STATUS RISIKO
        status_risiko: "", 
        status_risiko_desc: "",
        // 👆 FIELD BARU UNTUK STATUS RISIKO
    });

    const [riskColor, setRiskColor] = useState("#f1f5f9");
    
    // Fungsi Fetch Log Pemantauan (Dikekalkan)
    const fetchLog = async (risikoId) => {
        if (!risikoId) return;
        setIsLoadingLog(true);
        try {
            const response = await api.get(`/pemantauan-risiko/${risikoId}/sejarah`); 
            
            
            const logArray = response.data || []; 
            const sortedLog = logArray.sort((a, b) => {
                if (b.tahun_pemantauan !== a.tahun_pemantauan) {
                    return b.tahun_pemantauan - a.tahun_pemantauan;
                }
                return b.separuh_tahun_pemantauan - a.separuh_tahun_pemantauan;
            });
            
            setLogData(sortedLog); 
        } catch (err) {
            console.error("❌ Gagal fetch log pemantauan:", err);
            setLogData([]);
        } finally {
            setIsLoadingLog(false);
        }
    };


    // 1. Hook Utama: Mengemaskini data dari prop 'risk' dan memuatkan Log
    useEffect(() => {
        if (!isOpen || !risk?.id) return; 

        const risikoId = risk.id;
        
        // 💡 DEBUG 1: Semak data yang diterima melalui props
        console.log("✅ DEBUG: RISK PROP DATA (risiko id: " + risikoId + ")", risk);

        fetchLog(risikoId); 

        /**
         * 🚨 FUNGSI PEMBANTU UNTUK MENGAMBIL ARRAY RISIKO 🚨
         * Menyokong nama key yang berbeza dari API/PemantauanRisiko.js
         */
        const getRiskArray = (key1, key2) => {
            // Cuba key1 (dari PemantauanRisiko.js), kemudian key2 (dari rawatan.js)
            const arr = risk[key1] || risk[key2] || [];
            
            // Pastikan ia adalah array yang sah
            return Array.isArray(arr) ? arr : [];
        };

        
        
        // Map data dari prop 'risk' ke dalam state 'data'
        const initialData = {
            risiko_id: risikoId,
            no_rujukan: risk.no_rujukan || "-",
            tahun: risk.tahun_asal || risk.tahun || "-",
            separuh_tahun: risk.separuh_tahun_asal || risk.separuh_tahun,
            nama_subsidiari: risk.nama_subsidiari || "-",
            kategori: risk.kategori || "-",
            bahagian: risk.bahagian || risk.bahagian_unit || "-", 
            risiko: risk.risiko || "-", 
            
            // ✅ MENGAMBIL ARRAY PUNCA DAN KESAN
            // Key 1: punca_risiko_data (dari PemantauanRisiko.js)
            // Key 2: punca (fallback dari rawatan.js)
            punca: getRiskArray('punca_risiko_data', 'punca'), 
            
            // Key 1: kesan_risiko_data (dari PemantauanRisiko.js)
            // Key 2: kesan (fallback dari rawatan.js)
            kesan: getRiskArray('kesan_risiko_data', 'kesan'), 
            
            skor_kebarangkalian: risk.skor_kebarangkalian_sebelum || risk.skor_kebarangkalian, 
            skor_impak: risk.skor_impak_sebelum || risk.skor_impak,
            
            jenisKawalan: risk.jenis_kawalan || "-",
            tempohSiap: risk.tempoh_jangkaan_siap || "-",
            
            planTindakan: getRiskArray('plan_tindakan', 'rawatan_plan_tindakan'), 
            kakitanganBertanggungjawab: getRiskArray('kakitangan_bertanggungjawab', 'rawatan_kakitangan_bertanggungjawab'),
            // Tetapkan status_risiko & status_risiko_desc secara lalai, akan dikira dalam useEffect ke-2.
            status_risiko: "",
            status_risiko_desc: "",
        };
        
        // 💡 DEBUG 2: Semak data yang telah dipetakan
        console.log("✅ DEBUG: INITIAL MAPPED DATA (Cek punca/kesan di sini)", initialData);
        
        setData(initialData);

    }, [isOpen, risk]); 

    // 2. Update warna dan Tahap Risiko Awal, **SERTA STATUS RISIKO BARU**
    useEffect(() => {
        const kAwal = parseInt(data.skor_kebarangkalian);
        const iAwal = parseInt(data.skor_impak);
        let tahapRisiko = "-";
        let warnaRisiko = "#f1f5f9";
        let status = "-";
        let statusDesc = "-";

        if (kAwal >= 1 && kAwal <= 5 && iAwal >= 1 && iAwal <= 5) {
            const { label, color } = getRiskMatrix(kAwal, iAwal);
            tahapRisiko = label;
            warnaRisiko = color;

            // Logika Status Risiko BARU
            if (label === "Rendah") {
                status = "TIDAK";
                statusDesc = "Risiko sedia terkawal, tiada tindakan rawatan mandatori.";
            } else {
                status = "YA";
                statusDesc = "Risiko memerlukan tindakan segera dan rekod rawatan.";
            }
        } 
        
        setRiskColor(warnaRisiko);
        setData(prev => ({ 
            ...prev, 
            tahap_risiko: tahapRisiko,
            // 👇 UPDATE DATA DENGAN STATUS RISIKO BARU
            status_risiko: status,
            status_risiko_desc: statusDesc,
            // 👆 UPDATE DATA DENGAN STATUS RISIKO BARU
        }));

    }, [data.skor_kebarangkalian, data.skor_impak]); // Bergantung pada skor kebarangkalian dan impak

    
    // Fungsi untuk mengendalikan butang padam log (Dikekalkan)
    const handleDeleteLog = async (logId) => {
        if (!window.confirm("Adakah anda pasti mahu memadam rekod log pemantauan ini? Tindakan ini tidak boleh diundur.")) {
            return;
        }
        setIsLoadingLog(true);
        try {
            await api.delete(`/pemantauan-risiko/log/${logId}`); 
            await fetchLog(data.risiko_id);
            alert("✅ Rekod log berjaya dipadam!");
        } catch (err) {
            console.error("❌ Gagal memadam log:", err);
            alert(`Gagal memadam log. ${err.response?.data?.message || 'Sila cuba lagi.'}`);
        } finally {
            setIsLoadingLog(false);
        }
    };

    // ✅ FUNGSI BARU untuk mengendalikan butang edit log
    const handleEditLog = (logItem) => {
        // Tetapkan data log yang ingin diedit ke state
        setLogToEdit(logItem);
        // Buka modal TambahLogModal (yang akan berfungsi sebagai modal edit)
        setIsTambahLogModalOpen(true);
    };

    // Fungsi untuk Refresh Log dari TambahLogModal (Dikekalkan)
    const handleLogSaved = () => {
        setIsTambahLogModalOpen(false);
        // Kosongkan logToEdit (penting agar modal kembali ke mod 'tambah' selepas 'edit')
        setLogToEdit(null); 
        fetchLog(data.risiko_id);
    };

    // Fungsi untuk menutup modal log (tambah/edit)
    const handleCloseLogModal = () => {
        setIsTambahLogModalOpen(false);
        setLogToEdit(null); // Kosongkan log yang sedang diedit
    };


    if (!isOpen) return null;

    return (
        <div className="pemantauan-modal-overlay">
            <div className="pemantauan-modal-container" style={{ maxWidth: '1200px', width: '95%' }}> 
                
                <div className="pemantauan-box-header-main">
                    <span>Paparan Maklumat Risiko, Rawatan & Log Sejarah (Read-Only View)</span>
                    <button className="pemantauan-close-btn" onClick={onClose} aria-label="Tutup Borang">
                        <X size={16} />
                    </button>
                </div>
                
                <div style={{ padding: '0 18px 18px 18px' }}>
                    
                    {/* 1. Maklumat Risiko (READ-ONLY) */}
                    <div className="pemantauan-box">
                        <div className="pemantauan-box-header pemantauan-risk-header">
                            <span>Maklumat Risiko</span>
                            <button type="button" className="pemantauan-panduan-btn" onClick={() => setIsPanduanOpen(true)}>
                                <BookOpen size={16} style={{ marginRight: '6px' }} />
                                Panduan 
                            </button>
                        </div>
                        <div className="pemantauan-flex-row">
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">No Rujukan:</span><span className="pemantauan-data-inline">{data.no_rujukan || "-"}</span></div>
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">Tahun:</span><span className="pemantauan-data-inline">{data.tahun || "-"}</span></div>
                            {/* ✅ PERUBAHAN DI SINI: Tukar 1/2 kepada Pertama/Kedua */}
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">Separuh Tahun:</span><span className="pemantauan-data-inline">{formatSeparuhTahun(data.separuh_tahun)}</span></div>
                            {/* 👆 PERUBAHAN DI SINI */}
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">Subsidiari:</span><span className="pemantauan-data-inline">{data.nama_subsidiari || "-"}</span></div>
                        </div>
                    </div>

                    {/* ... Bahagian 2, 3, 4 (Tidak Berubah) ... */}
                    
                    {/* 2. Pengenalpastian Risiko (READ-ONLY) */}
                    <div className="pemantauan-box">
                        <div className="pemantauan-box-header">Pengenalpastian Risiko</div>
                        <div className="pemantauan-flex-row">
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">Kategori Risiko:</span><span className="pemantauan-data-inline">{data.kategori || "-"}</span></div>
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">Bahagian/Unit:</span><span className="pemantauan-data-inline">{data.bahagian || "-"}</span></div>
                            <div className="pemantauan-flex-item" style={{ flex: "1 1 100%" }}><span className="pemantauan-label-inline">Risiko:</span><span className="pemantauan-data-inline">{data.risiko || "-"}</span></div>
                        </div>
                        <div className="pemantauan-flex-row pemantauan-list-section">
                            {/* Paparan Punca Risiko (Menggunakan data.punca) */}
                            <div className="pemantauan-flex-item" style={{ flex: "1 1 45%" }}><span className="pemantauan-label-inline">Punca Risiko:</span><ListDisplay data={data.punca} /></div>
                            {/* Paparan Kesan Risiko (Menggunakan data.kesan) */}
                            <div className="pemantauan-flex-item" style={{ flex: "1 1 45%" }}><span className="pemantauan-label-inline">Kesan Risiko:</span><ListDisplay data={data.kesan} /></div>
                        </div>
                    </div>
                    
                    {/* 3. Penilaian Risiko Awal (READ-ONLY) - Diubahsuai untuk Status Risiko */}
                    <div className="pemantauan-box">
                        <div className="pemantauan-box-header">Penilaian Risiko Awal</div>
                        <div className="pemantauan-flex-row pemantauan-score-row">
                            <div className="pemantauan-score-card"><span className="pemantauan-score-label">Skor Kebarangkalian</span><span className="pemantauan-score-data">{data.skor_kebarangkalian || "-"}</span></div>
                            <div className="pemantauan-score-card"><span className="pemantauan-score-label">Skor Impak</span><span className="pemantauan-score-data">{data.skor_impak || "-"}</span></div>
                            <div className="pemantauan-score-card"><span className="pemantauan-score-label">Tahap Risiko</span>
                                <span className="pemantauan-score-data pemantauan-risk-score-text" 
                                    style={{ backgroundColor: riskColor, color: riskColor === "#f1f5f9" ? '#475569' : '#ffffff' }}
                                    data-level={data.tahap_risiko}
                                >
                                    {data.tahap_risiko || "-"}
                                </span>
                            </div>
                        </div>
                        {/* 👇 KOTAK STATUS RISIKO BARU */}
                        <div className="pemantauan-flex-row" style={{ marginTop: '15px' }}>
                             <div className="pemantauan-flex-item" style={{ display: 'flex', flexDirection: 'column', flex: "1 1 100%" }}>
                                <span className="pemantauan-label-inline" style={{ fontWeight: 'bold', marginBottom: '5px' }}>Status Risiko:</span>
                                <div style={{ 
                                    padding: '10px 15px', 
                                    borderRadius: '6px', 
                                    backgroundColor: data.status_risiko === 'YA' ? '#fef2f2' : data.status_risiko === 'TIDAK' ? '#ecfdf5' : '#f1f5f9',
                                    border: `1px solid ${data.status_risiko === 'YA' ? '#f87171' : data.status_risiko === 'TIDAK' ? '#34d399' : '#e2e8f0'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    <span style={{ 
                                        fontWeight: 'bold', 
                                        color: data.status_risiko === 'YA' ? '#ef4444' : data.status_risiko === 'TIDAK' ? '#10b981' : '#475569',
                                        minWidth: '70px',
                                        textAlign: 'center',
                                        marginRight: '15px',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: data.status_risiko === 'YA' ? '#f8717130' : data.status_risiko === 'TIDAK' ? '#10b98130' : '#e2e8f0'
                                    }}>
                                        {data.status_risiko || "-"}
                                    </span>
                                    <span style={{ color: '#475569', fontSize: '0.9rem' }}>
                                        {data.status_risiko_desc || "Skor risiko tiada."}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* 👆 KOTAK STATUS RISIKO BARU */}
                    </div>

                    {/* 4. Rawatan Risiko (READ-ONLY) - Dikekalkan */}
                    <div className="pemantauan-box">
                        <div className="pemantauan-box-header pemantauan-monitoring-header">Rawatan Risiko</div>
                        <div className="pemantauan-data-display-section">
                            <div className="pemantauan-data-line-block">
                                <span className="pemantauan-label-mon">Strategi Kawalan:</span>
                                <span className="pemantauan-data-mon">{data.jenisKawalan || "Tiada Data Rawatan"}</span>
                            </div>
                            <div className="pemantauan-data-line-block">
                                <span className="pemantauan-label-mon">Tempoh Jangkaan Siap:</span>
                                <span className="pemantauan-data-mon">{data.tempohSiap || "-"}</span>
                            </div>
                            <div className="pemantauan-data-line-block">
                                <span className="pemantauan-label-mon">Pelan Tindakan:</span>
                                <ListDisplay data={data.planTindakan} />
                            </div>
                            <div className="pemantauan-data-line-block">
                                <span className="pemantauan-label-mon">Kakitangan Bertanggungjawab:</span>
                                <ListDisplay data={data.kakitanganBertanggungjawab} />
                            </div>
                        </div>
                    </div>

                    {/* 5. PAPARAN LOG SEJARAH PEMANTAUAN (JADUAL) */}
                    <div className="pemantauan-box">
                        <div className="pemantauan-box-header" style={{ backgroundColor: '#10b981', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Log Sejarah Pemantauan Risiko</span>
                            <button 
                                type="button" 
                                className="pemantauan-add-log-btn" 
                                onClick={() => { setLogToEdit(null); setIsTambahLogModalOpen(true); }} // Pastikan logToEdit null untuk mod 'tambah'
                                style={{ 
                                    backgroundColor: '#059669', 
                                    color: 'white',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontWeight: 'bold'
                                }}
                            >
                                <PlusCircle size={16} style={{ marginRight: '6px' }} />
                                Tambah Log Pemantauan
                            </button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            {isLoadingLog ? (
                                <div style={{ textAlign: 'center', padding: '50px' }}>
                                    <Loader2 size={32} className="spin" />
                                    <p>Memuatkan Log Pemantauan...</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="log-pemantauan-table">
                                        <thead>
                                            <tr>
                                                <th>Tahun</th>
                                            {/* ✅ PERUBAHAN TAJUK: Kekalkan "Separuh Tahun" */}
                                                <th>Separuh Tahun</th> 
                                                <th>Pelan Tindakan</th>
                                                <th>Kekerapan Pemantauan</th> 
                                                <th>Kakitangan Bertanggungjawab</th>
                                                <th>K'kalian Skor</th> 
                                                <th>Impak Skor</th>
                                                <th>Tahap Risiko</th>
                                                <th>Keberkesanan</th>
                                                <th>Status Pemantauan</th>
                                                <th>Kelulusan (Bil No)</th> 
                                                <th>Catatan</th>
                                                <th>Tindakan</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logData.length > 0 ? (
                                                logData.map((log, index) => {
                                                    const k_selepas = log.skor_kebarangkalian_selepas;
                                                    const i_selepas = log.skor_impak_selepas;
                                                    const tahap_risiko = getRiskLevel(k_selepas, i_selepas);
                                                    const { color } = getRiskMatrix(k_selepas, i_selepas);
                                                    
                                                // ✅ PERUBAHAN DI SINI: Guna fungsi formatSeparuhTahun
                                                    const sem_tahun_text = formatSeparuhTahun(log.separuh_tahun_pemantauan);
                                                // 👆 PERUBAHAN DI SINI

                                                    const pelanTindakanLog = Array.isArray(log.pelan_tindakan_log) ? log.pelan_tindakan_log : [];
                                                    const kakitanganLog = Array.isArray(log.kakitangan_log) ? log.kakitangan_log : [];

                                                    return (
                                                        <tr key={log.log_id || index}> 
                                                            <td data-label="TAHUN">{log.tahun_pemantauan || '-'}</td> 
                                                        {/* ✅ PERUBAHAN DI SINI: Guna sem_tahun_text */}
                                                            <td data-label="SEPARUH TAHUN">{sem_tahun_text}</td> 
                                                        {/* 👆 PERUBAHAN DI SINI */}
                                                            <td data-label="PELAN TINDAKAN">
                                                                <ListDisplay data={pelanTindakanLog} />
                                                            </td>
                                                            <td data-label="KEKERAPAN AUDIT">{log.kekerapan_pemantauan || '-'}</td> 
                                                            <td data-label="BERTANGGUNGJAWAB">
                                                                <ListDisplay data={kakitanganLog} />
                                                            </td> 
                                                            <td data-label="K'KALIAN">{k_selepas || '-'}</td> 
                                                            <td data-label="IMPAK SKOR">{i_selepas || '-'}</td> 
                                                            <td data-label="TAHAP RISIKO" style={{ backgroundColor: color, color: color === "#f1f5f9" ? '#475569' : 'white', fontWeight: 'bold' }}>
                                                                {tahap_risiko || '-'}
                                                            </td>
                                                            <td data-label="KEBERKESANAN">
                                                                <span className={`pemantauan-keberkesanan-tag ${log.keberkesanan?.toLowerCase() || 'tiada'}`}>
                                                                    {log.keberkesanan || '-'}
                                                                </span>
                                                            </td>
                                                            <td data-label="STATUS">{log.status_pemantauan || '-'}</td> 
                                                            <td data-label="KELULUSAN">{log.no_bil_kelulusan || '-'}</td> 
                                                            <td data-label="CATATAN" style={{ maxWidth: '200px', whiteSpace: 'normal' }}>{log.catatan || '-'}</td> 
                                                            <td data-label="TINDAKAN" style={{ whiteSpace: 'nowrap' }}>
                                                            {/* ✅ BUTANG EDIT BARU */}
                                                            <button
                                                                    type="button"
                                                                    onClick={() => handleEditLog(log)} // Panggil fungsi edit baru
                                                                    className="pemantauan-button-circle rawatan-button-edit"
                                                                    style={{ backgroundColor: '#eab308', color: 'white', border: 'none', marginRight: '5px' }}
                                                                    aria-label="Edit Log"
                                                                    disabled={isLoadingLog}
                                                                >
                                                                    <Pencil size={16} />
                                                                </button>
                                                            {/* 👆 BUTANG EDIT BARU */}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteLog(log.log_id)}
                                                                    className="pemantauan-button-circle rawatan-button-remove"
                                                                    style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }}
                                                                    aria-label="Padam Log"
                                                                    disabled={isLoadingLog}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="13" style={{ textAlign: 'center', color: '#64748b' }}>Tiada rekod log pemantauan yang direkodkan lagi.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Modal Panduan */}
                {isPanduanOpen && <PanduanModal isOpen={isPanduanOpen} onClose={() => setIsPanduanOpen(false)} />}
                
                {/* Modal Tambah/Edit Log Pemantauan */}
                {isTambahLogModalOpen && (
                    <TambahLogModal 
                        isOpen={isTambahLogModalOpen} 
                        onClose={handleCloseLogModal} // Guna fungsi close baru untuk reset logToEdit
                        risikoId={data.risiko_id} 
                        onSaveSuccess={handleLogSaved} 
                        // ✅ PASS DATA UNTUK EDIT
                        logDataToEdit={logToEdit} 
                        // 👆 PASS DATA UNTUK EDIT
                    />
                )}

            </div>
        </div>
    );
}