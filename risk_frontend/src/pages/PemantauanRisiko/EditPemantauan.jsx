import { useState, useEffect } from "react";
import { X, BookOpen, Loader2, Trash2, PlusCircle } from "lucide-react"; 
// Sila pastikan laluan fail ini betul
import "./EditPemantauan.css"; 
// Sila gantikan dengan laluan fail API anda yang betul
import api from "../../api/api"; 
// Sila gantikan dengan laluan fail PanduanModal anda yang betul
import PanduanModal from '../Panduan/Panduan'; 

// IMPORT KOMPONEN MODAL BARU
import TambahLogModal from './TambahLogModal'; 

// =======================================================
// Komponen Pembantu untuk Memaparkan Senarai Bernombor (Read-Only)
// =======================================================
const ListDisplay = ({ data }) => {
    // Memastikan data adalah array dan menapis item kosong
    const cleanedData = Array.isArray(data) ? data.filter(item => item?.trim() !== "") : [];
    if (cleanedData.length === 0) return <span style={{ color: '#64748b' }}>-</span>;
    return (
        <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '0' }}>
            {cleanedData.map((item, index) => (
                <li key={index} className="pemantauan-list-item">
                    <span className="pemantauan-data-inline">
                        {`${index + 1}. ${item}`}
                    </span>
                </li>
            ))}
        </ul>
    );
};

// Data Risk Matrix (Pengiraan Tahap Risiko)
const riskMatrix = {
    1: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Rendah", color: "#14b8a6" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
    2: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Rendah", color: "#14b8a6" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
    3: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Tinggi", color: "#f97316" } },
    4: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
    5: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Tinggi", color: "#f97316" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Sangat Tinggi", color: "#ef4444" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
};

const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "", color: "#f1f5f9" };
const getRiskLevel = (k, i) => getRiskMatrix(k, i).label; 

// =======================================================
// KOMPONEN UTAMA EDIT PEMANTAUAN (Paparan Read-Only + Log)
// =======================================================
export default function EditPemantauan({ isOpen, risk, onClose }) { 
    const [isPanduanOpen, setIsPanduanOpen] = useState(false); 
    const [isTambahLogModalOpen, setIsTambahLogModalOpen] = useState(false); // STATE BARU
    const [logData, setLogData] = useState([]); 
    const [isLoadingLog, setIsLoadingLog] = useState(false); 
    
    // State yang dikekalkan (semuanya read-only data)
    const [data, setData] = useState({
        risiko_id: null, 
        rawatan_id: null, 
        planTindakan: [],
        kakitanganBertanggungjawab: [],
        jenisKawalan: "",
        tempohSiap: "", 
        punca: [], 
        kesan: [],
        skor_kebarangkalian: null,
        skor_impak: null,
        tahap_risiko: "", 
        no_rujukan: "",
        tahun: "",
        separuh_tahun: null,
        nama_subsidiari: "",
        kategori: "",
        bahagian: "", // Bahagian/Unit
        risiko: "", // Perihalan Risiko
    });

    const [riskColor, setRiskColor] = useState("#f1f5f9");
    
    
    // Fungsi Fetch Log Pemantauan (KEMASKINI ENDPOINT)
    const fetchLog = async (risikoId) => {
        if (!risikoId) return;
        setIsLoadingLog(true);
        try {
            // GANTIKAN ENDPOINT KEPADA ENDPOINT LOG SEJARAH SEBENAR ANDA
            const response = await api.get(`/pemantauan-risiko/${risikoId}/sejarah`); 
            
            // Logik untuk mendapatkan array log dari response
            const logArray = response.data || []; 

            // Susun log mengikut tarikh terbaru dahulu
            const sortedLog = logArray.sort((a, b) => 
                new Date(b.tarikh_pemantauan) - new Date(a.tarikh_pemantauan)
            );
            
            setLogData(sortedLog); 
        } catch (err) {
            console.error("❌ Gagal fetch log pemantauan:", err);
            setLogData([]);
        } finally {
            setIsLoadingLog(false);
        }
    };


    // 1. Fetch data Risiko, Rawatan & Log
    useEffect(() => {
        if (!isOpen || !risk?.id) return; 

        const risikoId = risk.id;

        const fetchAllData = async () => {
            // Fetch Log Sejarah
            await fetchLog(risikoId); 

            try {
                // ASUMSI: Data risiko utama dan rawatan diambil dari objek 'risk' yang dihantar.
                const rawatanPart = {
                    planTindakan: Array.isArray(risk.plan_tindakan) ? risk.plan_tindakan : [], 
                    kakitanganBertanggungjawab: Array.isArray(risk.kakitangan_bertanggungjawab) ? risk.kakitangan_bertanggungjawab : [],
                    jenisKawalan: risk.jenis_kawalan || "Tiada Data Rawatan",
                    tempohSiap: risk.tempoh_jangkaan_siap || "Tiada Data Rawatan",
                };
                
                // 2. Gabungkan semua state
                setData((prev) => ({
                    ...prev,
                    ...risk,
                    ...rawatanPart,
                    risiko_id: risikoId,
                    // Pastikan menggunakan field yang betul dari API Jadual Risiko Utama:
                    skor_kebarangkalian: risk.skor_kebarangkalian_sebelum, 
                    skor_impak: risk.skor_impak_sebelum,
                    tahun: risk.tahun_asal, 
                    separuh_tahun: risk.separuh_tahun_asal,
                    risiko: risk.risiko, 
                    bahagian: risk.bahagian_unit || "-", 
                    // Field senarai:
                    punca: Array.isArray(risk.punca) ? risk.punca : [],
                    kesan: Array.isArray(risk.kesan) ? risk.kesan : [],
                }));

            } catch (err) {
                console.error("❌ Gagal fetch data lengkap (Rawatan mungkin gagal):", err);
                // Hanya set data risiko jika fetch rawatan gagal
                setData((prev) => ({
                    ...prev,
                    ...risk,
                    risiko_id: risikoId,
                    skor_kebarangkalian: risk.skor_kebarangkalian_sebelum,
                    skor_impak: risk.skor_impak_sebelum,
                }));
            }
        };

        fetchAllData();

    }, [isOpen, risk]);


    // 2. Update warna Tahap Risiko Awal
    useEffect(() => {
        const kAwal = parseInt(data.skor_kebarangkalian);
        const iAwal = parseInt(data.skor_impak);
        if (kAwal >= 1 && kAwal <= 5 && iAwal >= 1 && iAwal <= 5) {
            const { label, color } = getRiskMatrix(kAwal, iAwal);
            setRiskColor(color);
            setData(prev => ({ ...prev, tahap_risiko: label }));
        } else {
            setRiskColor("#f1f5f9");
        }
    }, [data.skor_kebarangkalian, data.skor_impak]);

    
    // Fungsi untuk mengendalikan butang padam log
    const handleDeleteLog = async (logId) => {
        if (!window.confirm("Adakah anda pasti mahu memadam rekod log pemantauan ini? Tindakan ini tidak boleh diundur.")) {
            return;
        }
        try {
            // GANTIKAN ENDPOINT DELETE KEPADA ENDPOINT DELETE SEBENAR ANDA
            await api.delete(`/pemantauan-risiko/${logId}`); 
            
            // Kemaskini local state untuk membuang item yang dipadam
            setLogData(prev => prev.filter(log => log.log_id !== logId)); // Guna log_id
            
            alert("✅ Rekod log berjaya dipadam!");
        } catch (err) {
            console.error("❌ Gagal memadam log:", err);
            alert(`Gagal memadam log. ${err.response?.data?.message || 'Sila cuba lagi.'}`);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="pemantauan-modal-overlay">
            <div className="pemantauan-modal-container" style={{ maxWidth: '1200px', width: '95%' }}> 
                
                {/* Header Modal */}
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
                            <button 
                                type="button" 
                                className="pemantauan-panduan-btn" 
                                onClick={() => setIsPanduanOpen(true)}
                            >
                                <BookOpen size={16} style={{ marginRight: '6px' }} />
                                Panduan 
                            </button>
                        </div>
                        <div className="pemantauan-flex-row">
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">No Rujukan:</span><span className="pemantauan-data-inline">{data.no_rujukan || "-"}</span></div>
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">Tahun:</span><span className="pemantauan-data-inline">{data.tahun || "-"}</span></div>
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">Separuh Tahun:</span><span className="pemantauan-data-inline">{data.separuh_tahun === 1 ? "Pertama" : data.separuh_tahun === 2 ? "Kedua" : "-"}</span></div>
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">Subsidiari:</span><span className="pemantauan-data-inline">{data.nama_subsidiari || "-"}</span></div>
                        </div>
                    </div>

                    {/* 2. Pengenalpastian Risiko (READ-ONLY) */}
                    <div className="pemantauan-box">
                        <div className="pemantauan-box-header">Pengenalpastian Risiko</div>
                        <div className="pemantauan-flex-row">
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">Kategori Risiko:</span><span className="pemantauan-data-inline">{data.kategori || "-"}</span></div>
                            <div className="pemantauan-flex-item"><span className="pemantauan-label-inline">Bahagian/Unit:</span><span className="pemantauan-data-inline">{data.bahagian || "-"}</span></div>
                            <div className="pemantauan-flex-item" style={{ flex: "1 1 100%" }}><span className="pemantauan-label-inline">Risiko:</span><span className="pemantauan-data-inline">{data.risiko || "-"}</span></div>
                        </div>
                        <div className="pemantauan-flex-row pemantauan-list-section">
                            <div className="pemantauan-flex-item" style={{ flex: "1 1 45%" }}><span className="pemantauan-label-inline">Punca Risiko:</span><ListDisplay data={data.punca} /></div>
                            <div className="pemantauan-flex-item" style={{ flex: "1 1 45%" }}><span className="pemantauan-label-inline">Kesan Risiko:</span><ListDisplay data={data.kesan} /></div>
                        </div>
                    </div>
                    
                    {/* 3. Penilaian Risiko Awal (READ-ONLY) */}
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
                    </div>

                    {/* 4. Rawatan Risiko (READ-ONLY) */}
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

                    {/* ======================================================= */}
                    {/* 5. PAPARAN LOG SEJARAH PEMANTAUAN (JADUAL) */}
                    {/* ======================================================= */}
                    <div className="pemantauan-box">
                        <div className="pemantauan-box-header" style={{ backgroundColor: '#10b981', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Log Sejarah Pemantauan Risiko</span>
                            {/* BUTANG TAMBAH BARU */}
                            <button 
                                type="button" 
                                className="pemantauan-add-log-btn" 
                                onClick={() => setIsTambahLogModalOpen(true)}
                                style={{ 
                                    backgroundColor: '#059669', // Darker green
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
                                                <th>TAHUN</th>
                                                <th>SEPARUH TAHUN</th>
                                                <th>PELAN TINDAKAN</th>
                                                <th>KAKITANGAN BERTANGGUNGJAWAB</th>
                                                <th>K'KALIAN</th>
                                                <th>IMPAK SKOR</th>
                                                <th>TAHAP RISIKO</th>
                                                <th>KEBERKESANAN</th>
                                                <th>STATUS PEMANTAUAN</th>
                                                <th>KELULUSAN</th>
                                                <th>CATATAN</th>
                                                <th>TINDAKAN</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logData.length > 0 ? (
                                                logData.map((log, index) => {
                                                    const k_selepas = log.skor_kebarangkalian_selepas;
                                                    const i_selepas = log.skor_impak_selepas;
                                                    const tahap_risiko = getRiskLevel(k_selepas, i_selepas);
                                                    const { color } = getRiskMatrix(k_selepas, i_selepas);
                                                    
                                                    const sem_tahun = log.separuh_tahun_pemantauan === 1 ? '1' : log.separuh_tahun_pemantauan === 2 ? '2' : '-';

                                                    // Mendapatkan senarai daripada log data (asumsi ia adalah array)
                                                    const pelanTindakanLog = Array.isArray(log.pelan_tindakan_log) ? log.pelan_tindakan_log.map(p => p.butiran_aktiviti + (p.kekerapan_audit ? ` (${p.kekerapan_audit})` : '')) : [];
                                                    const kakitanganLog = Array.isArray(log.kakitangan_bertanggungjawab_log) ? log.kakitangan_bertanggungjawab_log.map(k => k.butiran_kakitangan) : [];

                                                    return (
                                                        <tr key={log.log_id || index}> 
                                                            {/* 1. TAHUN */}
                                                            <td data-label="TAHUN">{log.tahun_pemantauan || '-'}</td> 
                                                            
                                                            {/* 2. SEPARUH TAHUN */}
                                                            <td data-label="SEPARUH TAHUN">{sem_tahun}</td> 
                                                            
                                                            {/* 3. PELAN TINDAKAN (Butiran Pelan Tindakan Pemantauan) */}
                                                            <td data-label="PELAN TINDAKAN">
                                                                <ListDisplay data={pelanTindakanLog} />
                                                            </td>
                                                            
                                                            {/* 4. KAKITANGAN BERTANGGUNGJAWAB */}
                                                            <td data-label="BERTANGGUNGJAWAB">
                                                                <ListDisplay data={kakitanganLog} />
                                                            </td> 
                                                            
                                                            {/* 5. SKOR KEBARANGKALIAN */}
                                                            <td data-label="K'KALIAN">{k_selepas || '-'}</td> 
                                                            
                                                            {/* 6. IMPAK SKOR */}
                                                            <td data-label="IMPAK SKOR">{i_selepas || '-'}</td> 
                                                            
                                                            {/* 7. TAHAP RISIKO */}
                                                            <td data-label="TAHAP RISIKO" style={{ backgroundColor: color, color: 'white', fontWeight: 'bold' }}>
                                                                {tahap_risiko}
                                                            </td>
                                                            
                                                            {/* 8. KEBERKESANAN */}
                                                            <td data-label="KEBERKESANAN">{log.keberkesanan || '-'}</td>
                                                            
                                                            {/* 9. STATUS PEMANTAUAN */}
                                                            <td data-label="STATUS">{log.status_pemantauan || '-'}</td>
                                                            
                                                            {/* 10. KELULUSAN */}
                                                            <td data-label="KELULUSAN">{log.no_bil_kelulusan || '-'}</td> 
                                                            
                                                            {/* 11. CATATAN */}
                                                            <td data-label="CATATAN" title={log.catatan} style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                                                                {log.catatan ? log.catatan.substring(0, 30) + (log.catatan.length > 30 ? '...' : '') : '-'}
                                                            </td>
                                                            
                                                            {/* 12. TINDAKAN (Butang Padam) */}
                                                            <td data-label="TINDAKAN">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => handleDeleteLog(log.log_id)} // Guna log_id
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                                                                    title="Padam Log Ini"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="12" style={{ textAlign: 'center', padding: '15px', color: '#71717a' }}>
                                                        Tiada rekod log pemantauan yang direkodkan setakat ini.
                                                    </td>
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
                <PanduanModal isOpen={isPanduanOpen} onClose={() => setIsPanduanOpen(false)} />

                {/* Modal Tambah Log Baharu */}
                <TambahLogModal 
                    isOpen={isTambahLogModalOpen} 
                    onClose={() => setIsTambahLogModalOpen(false)} 
                    risikoId={data.risiko_id} // Pastikan hantar risiko_id yang betul
                    onLogAdded={() => fetchLog(data.risiko_id)} // Panggil semula fetch log selepas tambah log baru
                />

            </div>
        </div>
    );
}