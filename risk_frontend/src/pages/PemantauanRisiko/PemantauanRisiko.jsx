import { useState, useEffect, useCallback, Fragment } from "react";
import api from "../../api/api";
import { Pencil, Loader2, ChevronRight, ChevronDown, Filter } from "lucide-react";
import EditPemantauan from "./EditPemantauan";
import "./PemantauanRisiko.css";

// =======================================================
// UTILITIES
// =======================================================
const riskMatrix = {
    1: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    2: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    3: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Tinggi",color:"#f97316"}},
    4: {1:{label:"Sederhana",color:"#eab308"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
    5: {1:{label:"Sederhana",color:"#eab308"},2:{label:"Tinggi",color:"#f97316"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Sangat Tinggi",color:"#ef4444"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
};
const getRiskData = (k, i) => {
    if (!k || !i) {
        return { label: "Tiada Data", color: "#9ca3af" };
    }
    const kk = Math.min(Math.max(parseInt(k), 1), 5);
    const ii = Math.min(Math.max(parseInt(i), 1), 5);
    return riskMatrix[kk]?.[ii] || { label: "-", color: "#9ca3af" };
};
const shortForm = (label) => label==="Rendah"?"R":label==="Sederhana"?"S":label==="Tinggi"?"T":label==="Sangat Tinggi"?"ST":"";
const getSeparuhTahunLabel = (separuh) => separuh === 1 ? "Pertama" : separuh === 2 ? "Kedua" : "";

const STATUS_COLORS = {
    "Buka": "#3b82f6",
    "Sedang Dilaksanakan": "#eab308",
    "Pemantauan": "#a855f7",
    "Selesai": "#22c55e",
    "Tutup": "#6b7280",
    "Tertunggak": "#ef4444",
};
const RISK_LEVEL_COLORS = {
    "Rendah": "#22c55e",
    "Sederhana": "#eab308",
    "Tinggi": "#f97316",
    "Sangat Tinggi": "#ef4444",
    "Tiada Data": "#9ca3af",
};


// =======================================================
// Komponen Modal Penapis Tarikh
// =======================================================
const DateFilterModal = ({ isOpen, onClose, allData, currentType, currentTahun, currentSeparuh, onApplyFilter }) => {
    const [filterType, setFilterType] = useState(currentType || 'pemantauan');
    const [tahun, setTahun] = useState(currentTahun || "");
    const [separuh, setSeparuh] = useState(currentSeparuh || "");

    if (!isOpen) return null;

    const uniqueTahun = [...new Set(allData
        .map(d => filterType === 'pemantauan' ? (d.tahun_pemantauan || d.tahun_asal) : (d.tahun_asal || d.tahun_pemantauan))
        .filter(t => t)
        .map(t => String(t))
    )].sort((a, b) => parseInt(b) - parseInt(a));

    const handleApply = () => {
        onApplyFilter(filterType, tahun, separuh);
    };

    const handleReset = () => {
        setFilterType('pemantauan');
        setTahun("");
        setSeparuh("");
        onApplyFilter('pemantauan', "", "");
    };

    return (
        <div className="pemantauan-modal-overlay">
            <div className="pemantauan-modal-container pemantauan-date-filter-modal">
                <div className="pemantauan-modal-header">
                    <h2>Tapis Tahun & Separuh Tahun</h2>
                </div>
                <div className="pemantauan-modal-body pemantauan-filter-body">
                    
                    <p className="pemantauan-filter-label-group">Pilih Data:</p>
                    <div className="pemantauan-radio-group">
                        <label className="pemantauan-radio-label">
                            <input 
                                type="radio" 
                                value="pengenalpastian" 
                                checked={filterType === 'pengenalpastian'} 
                                onChange={(e) => {setFilterType(e.target.value); setTahun(""); setSeparuh("");}}
                            />
                            Pengenalpastian Risiko (Data Asal)
                        </label>
                        <label className="pemantauan-radio-label">
                            <input 
                                type="radio" 
                                value="pemantauan" 
                                checked={filterType === 'pemantauan'} 
                                onChange={(e) => {setFilterType(e.target.value); setTahun(""); setSeparuh("");}}
                            />
                            Pemantauan Risiko (Data Terkini)
                        </label>
                    </div>

                    <p className="pemantauan-filter-label-group">Pilih Tahun & Separuh Tahun:</p>
                    <div className="pemantauan-select-group">
                        <select className="senaraipemantauan-filter-select" value={tahun} onChange={e=>setTahun(e.target.value)}>
                            <option value="">-- Semua Tahun --</option>
                            {uniqueTahun.map(t=>(
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <select className="senaraipemantauan-filter-select" value={separuh} onChange={e=>setSeparuh(e.target.value)}>
                            <option value="">-- Semua Separuh Tahun --</option>
                            <option value="1">Pertama</option>
                            <option value="2">Kedua</option>
                        </select>
                    </div>

                </div>
                <div className="pemantauan-modal-footer">
                    <button onClick={handleReset} className="pemantauan-btn-secondary">Set Semula</button>
                    <div style={{flexGrow: 1}}></div>
                    <button onClick={onClose} className="pemantauan-btn-tertiary">Batal</button>
                    <button onClick={handleApply} className="pemantauan-btn-primary">Tapis Data</button>
                </div>
            </div>
        </div>
    );
};


function PemantauanRisiko() {
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [subsidiariFilter, setSubsidiariFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState(""); 
    
    // STATE BARU: Untuk filter Tahap Risiko Terkini (menggunakan logik fallback)
    const [riskLevelFilter, setRiskLevelFilter] = useState("");
    
    const [loading, setLoading] = useState(true);
    const [subsidiariList, setSubsidiariList] = useState([]);
    const [kategoriList, setKategoriList] = useState([]); 
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRiskForEdit, setSelectedRiskForEdit] = useState(null);
    const [loadingModal, setLoadingModal] = useState(false);

    const [expandedRowId, setExpandedRowId] = useState(null);

    const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
    const [dateFilterType, setDateFilterType] = useState('pemantauan'); 
    const [selectedFilterTahun, setSelectedFilterTahun] = useState("");
    const [selectedFilterSeparuh, setSelectedFilterSeparuh] = useState("");
    
    // Logik fetchData 
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/pemantauan-risiko");
            const rawData = res.data;
            
            const uniqueKategori = [...new Set(rawData.map(d => d.kategori_risiko).filter(k => k))].sort();
            setKategoriList(uniqueKategori);

            const processedData = rawData.map(d => {
                const {label: skorDaftarLabel, color: skorDaftarColor} = getRiskData(
                    parseInt(d.skor_kebarangkalian_sebelum) || 0,
                    parseInt(d.skor_impak_sebelum) || 0
                );
                
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
                    
                    skor_kebarangkalian_sebelum: d.skor_kebarangkalian_sebelum,
                    skor_impak_sebelum: d.skor_impak_sebelum,
                    tahap_risiko_daftar: skorDaftarLabel,
                    risk_color_daftar: skorDaftarColor,
                    
                    tahun_pemantauan: d.tahun_pemantauan,
                    separuh_tahun_pemantauan: d.separuh_tahun_pemantauan,
                    
                    pelan_tindakan_pemantauan: Array.isArray(d.pelan_tindakan_terkini)
                        ? d.pelan_tindakan_terkini.filter(p => p) 
                        : [], 
                        
                    status_pemantauan_terkini: d.status_pemantauan_terkini || "",
                    catatan: d.catatan,
                    skor_kebarangkalian_terkini: d.skor_kebarangkalian_terkini,
                    skor_impak_terkini: d.skor_impak_terkini,
                    tahap_risiko: tahapRisikoTerkini, 
                    risk_color: riskColorTerkini,
                };
            });

            setData(processedData);
        } catch(err){
            console.error("❌ Ralat memuat data pemantauan risiko:", err);
        }
        finally { setLoading(false); }
    }, []);

    // Logik handleApplyDateFilter (Dikekalkan)
    const handleApplyDateFilter = (type, tahun, separuh) => {
        setDateFilterType(type);
        setSelectedFilterTahun(tahun);
        setSelectedFilterSeparuh(separuh);
        setIsDateFilterModalOpen(false);
    }
    
    // Logik fetchSubsidiariList (Dikekalkan)
    const fetchSubsidiariList = useCallback(async () => {
        try {
          const res = await api.get("/subsidiari");
          if (Array.isArray(res.data)) {
            setSubsidiariList(res.data);
          } else {
            console.warn("⚠️ Format respons subsidiari tidak dijangka:", res.data);
          }
        } catch (err) {
          console.error("❌ Ralat memuat senarai subsidiari:", err);
        }
    }, []);

    // Logik handleCloseModal (Dikekalkan)
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedRiskForEdit(null); fetchData(); };
    
    // Logik handleEdit (Dikekalkan)
    const handleEdit = async (risikoSenarai) => {
        try {
            setLoadingModal(true);
            const res = await api.get(`/rawatan/${risikoSenarai.risiko_id}`);
            const fullRiskData = res.data;

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

    // Logik handleRefreshData (Dikekalkan)
    const handleRefreshData = useCallback(() => { fetchData(); }, [fetchData]);
    
    // Logik useEffect (Dikekalkan)
    useEffect(()=>{
        fetchSubsidiariList();
        fetchData();
    }, [fetchData]);


    // Logik filteredData (DIKEMASKINI: tambah riskLevelFilter)
    const filteredData = data.filter(d=>{
        const searchLower = searchTerm.toLowerCase();
        const matchSearch = !searchTerm ||
            (d.no_rujukan && d.no_rujukan.toLowerCase().includes(searchLower)) ||
            (d.risiko && d.risiko.toLowerCase().includes(searchLower)) ||
            (d.nama_subsidiari && d.nama_subsidiari.toLowerCase().includes(searchLower));

        const matchSubsidiari = !subsidiariFilter || d.nama_subsidiari===subsidiariFilter;
        
        // Logik Penapisan Tarikh
        const isFilteringByDate = selectedFilterTahun || selectedFilterSeparuh;
        let matchTahunSeparuh = true;

        if (isFilteringByDate) {
            let filterTahun;
            let filterSeparuh;

            if (dateFilterType === 'pengenalpastian') {
                filterTahun = d.tahun_asal;
                filterSeparuh = d.separuh_tahun_asal;
            } else { // 'pemantauan'
                filterTahun = d.tahun_pemantauan;
                filterSeparuh = d.separuh_tahun_pemantauan;
            }

            const tahunMatch = !selectedFilterTahun || String(filterTahun) === selectedFilterTahun;
            const separuhMatch = !selectedFilterSeparuh || String(filterSeparuh) === selectedFilterSeparuh;

            matchTahunSeparuh = tahunMatch && separuhMatch;
        }

        // Logik Penapisan Kategori
        const matchKategori = !kategoriFilter || d.kategori_risiko === kategoriFilter;

        const matchStatus = !statusFilter || d.status_pemantauan_terkini===statusFilter;

        // Logik Penapisan Tahap Risiko Terkini (BARU)
        const currentRiskLevel = d.tahap_risiko === "Tiada Data" || !d.tahap_risiko
            ? d.tahap_risiko_daftar // Fallback ke Skor Asal
            : d.tahap_risiko;
        const matchRiskLevel = !riskLevelFilter || currentRiskLevel === riskLevelFilter;
        
        // Gabungkan semua penapis
        return matchSearch && matchSubsidiari && matchTahunSeparuh && matchKategori && matchStatus && matchRiskLevel; 
    });

    // Logik Kad Ringkasan (DIKEMASKINI: untuk Graf Bar Skor Terkini)
    const totalRisiko = filteredData.length;
    const statusCounts = filteredData.reduce((acc, d) => {
        const status = d.status_pemantauan_terkini || ""; 
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    const sortedStatusEntries = Object.entries(statusCounts).sort(([keyA], [keyB]) => {
        const order = ["Tertunggak", "Buka", "Sedang Dilaksanakan", "Pemantauan", "Selesai", "Tutup"];
        return order.indexOf(keyA) - order.indexOf(keyB);
    });

    // LOGIK UTAMA PEMBETULAN: Mengira Skor Risiko Terkini (dengan fallback)
    const riskLevelCounts = filteredData.reduce((acc, d) => {
        const currentRiskLevel = d.tahap_risiko === "Tiada Data" || !d.tahap_risiko
            ? d.tahap_risiko_daftar // Fallback ke Skor Asal
            : d.tahap_risiko;
            
        // Final level, in case both are missing (should not happen if data is proper)
        const level = currentRiskLevel || "Tiada Data"; 
        
        acc[level] = (acc[level] || 0) + 1;
        return acc;
    }, {});
    const sortedRiskLevelEntries = Object.entries(riskLevelCounts).sort(([keyA], [keyB]) => {
        const order = ["Sangat Tinggi", "Tinggi", "Sederhana", "Rendah", "Tiada Data"];
        return order.indexOf(keyA) - order.indexOf(keyB);
    });

    const COL_SPAN = 8; // Dikemaskini: 7 + 1 (BIL) = 8

    // handleToggleRow (Dikekalkan)
    const handleToggleRow = (id) => {
        setExpandedRowId(prevId => (prevId === id ? null : id));
    };

    // Teks Butang Penapis Tarikh (Dikekalkan)
    const dateFilterButtonText = selectedFilterTahun || selectedFilterSeparuh
        ? `${dateFilterType === 'pengenalpastian' ? 'Pengenalpastian' : 'Pemantauan'}: ${selectedFilterTahun || 'Semua Tahun'} (${getSeparuhTahunLabel(selectedFilterSeparuh) || 'Semua Separuh'})`
        : "Tahun & Separuh Tahun";


    return (
        <div className="senaraipemantauan-container">
            <h1>Pemantauan Risiko</h1>

            {/* Kad Ringkasan (Dikekalkan) */}
            <div className="senaraipemantauan-cards-container">
                <div className="senaraipemantauan-info-card">
                    <h3>Jumlah Risiko Dipantau</h3>
                    <p>{totalRisiko}</p>
                </div>
                <div className="senaraipemantauan-info-card">
                    <h3>Pecahan Status Pemantauan</h3>
                    <div className="senaraipemantauan-barchart-container">
                        {sortedStatusEntries.map(([status, count]) => {
                            const percentage = totalRisiko > 0 ? (count / totalRisiko) * 100 : 0;
                            return (
                                <div key={status} className="senaraipemantauan-barchart-row">
                                    <span className="senaraipemantauan-barchart-label" title={status}>{status}</span>
                                    <div className="senaraipemantauan-barchart-bar-bg">
                                        <div 
                                            className="senaraipemantauan-barchart-bar" 
                                            style={{ 
                                                width: `${percentage}%`, 
                                                backgroundColor: STATUS_COLORS[status] || '#9ca3af' 
                                            }}
                                            title={`${count} (${percentage.toFixed(0)}%)`}
                                        ></div>
                                    </div>
                                    <span className="senaraipemantauan-barchart-count">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="senaraipemantauan-info-card">
                    <h3>Pecahan Skor Risiko </h3>
                    <div className="senaraipemantauan-barchart-container">
                        {sortedRiskLevelEntries.map(([level, count]) => {
                            const percentage = totalRisiko > 0 ? (count / totalRisiko) * 100 : 0;
                            return (
                                <div key={level} className="senaraipemantauan-barchart-row">
                                    <span className="senaraipemantauan-barchart-label" title={level}>{level}</span>
                                    <div className="senaraipemantauan-barchart-bar-bg">
                                        <div 
                                            className="senaraipemantauan-barchart-bar" 
                                            style={{ 
                                                width: `${percentage}%`, 
                                                backgroundColor: RISK_LEVEL_COLORS[level] || '#9ca3af' 
                                            }}
                                            title={`${count} (${percentage.toFixed(0)}%)`}
                                        ></div>
                                    </div>
                                    <span className="senaraipemantauan-barchart-count">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Filter Container */}
            <div className="senaraipemantauan-filter-container">
                <input
                    type="text"
                    placeholder="Cari No Rujukan / Risiko / Subsidiari..."
                    className="senaraipemantauan-filter-search"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                
                {/* Filter Subsidiari */}
                <select className="senaraipemantauan-filter-select" value={subsidiariFilter} onChange={e=>setSubsidiariFilter(e.target.value)}>
                    <option value="">-- Semua Syarikat --</option>
                    {subsidiariList.map(s=>(
                        <option key={s.subsidiari_id} value={s.nama_subsidiari}>{s.nama_subsidiari}</option>
                    ))}
                </select>
                
                {/* Butang Modal Filter Tarikh */}
                <button 
                    className={`senaraipemantauan-filter-btn ${selectedFilterTahun || selectedFilterSeparuh ? 'active' : ''}`}
                    onClick={() => setIsDateFilterModalOpen(true)}
                    title="Tapis mengikut Tahun dan Separuh Tahun (Pengenalpastian/Pemantauan)"
                >
                    <Filter size={14} />
                    {dateFilterButtonText}
                </button>
                
                {/* Filter Kategori Risiko */}
                <select className="senaraipemantauan-filter-select" value={kategoriFilter} onChange={e=>setKategoriFilter(e.target.value)}>
                    <option value="">-- Semua Kategori Risiko --</option>
                    {kategoriList.map(kategori => (
                        <option key={kategori} value={kategori}>{kategori}</option>
                    ))}
                </select>
                
                {/* Filter Tahap Risiko Terkini (BARU) */}
                <select className="senaraipemantauan-filter-select" value={riskLevelFilter} onChange={e=>setRiskLevelFilter(e.target.value)}>
                    <option value="">-- Semua Tahap Risiko --</option>
                    <option value="Sangat Tinggi">Sangat Tinggi</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Sederhana">Sederhana</option>
                    <option value="Rendah">Rendah</option>
                    <option value="Tiada Data">Tiada Data</option>
                </select>

                {/* Filter Status */}
                <select className="senaraipemantauan-filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                    <option value="">-- Semua Status --</option>
                    <option value="Buka">Buka</option>
                    <option value="Sedang Dilaksanakan">Sedang Dilaksanakan</option>
                    <option value="Pemantauan">Pemantauan</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Tutup">Tutup</option>
                </select>
            </div>

            {/* Table Wrapper */}
            <div className="senaraipemantauan-table-wrapper">
                <table className="senaraipemantauan-table">
                    
                    {/* THEAD DIBETULKAN UNTUK MENAMBAH BIL */}
                    <thead>
                        <tr>
                            <th className="senaraipemantauan-th-expand"></th>
                            <th className="senaraipemantauan-th-bil">BIL</th> {/* COLUMN BARU */}
                            <th>No Rujukan</th>
                            <th>Risiko</th>
                            <th>Skor Risiko Sebelum</th>
                            <th>Status Pemantauan</th>
                            <th>Skor Risiko Selepas</th>
                            <th className="senaraipemantauan-th-tindakan">Tindakan</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr><td colSpan={COL_SPAN} className="senaraipemantauan-loading"><Loader2 size={20} className="senaraipemantauan-spin" /> Memuatkan...</td></tr>
                        ) : filteredData.length > 0 ? (
                            filteredData.map((d, i) => {
                                const isExpanded = expandedRowId === d.id; 
                                return (
                                <Fragment key={d.id}>
                                    {/* BARIS UTAMA */}
                                    <tr className={isExpanded ? "senaraipemantauan-row-expanded" : ""}>
                                        <td className="senaraipemantauan-td-expand">
                                            <button 
                                                onClick={() => handleToggleRow(d.id)} 
                                                className="senaraipemantauan-expand-btn"
                                                title={isExpanded ? "Tutup maklumat" : "Lihat maklumat"}
                                            >
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </button>
                                        </td>
                                        <td className="senaraipemantauan-center">{i + 1}</td> {/* DATA BIL */}
                                        <td>{d.no_rujukan}</td>
                                        <td>{d.risiko}</td>
                                        <td className="senaraipemantauan-center">
                                            <div className="senaraipemantauan-risk-box" style={{backgroundColor:d.risk_color_daftar}}>
                                                {shortForm(d.tahap_risiko_daftar)}
                                            </div>
                                        </td>
                                        <td>{d.status_pemantauan_terkini || ""}</td>
                                        <td className="senaraipemantauan-center">
                                            {/* SKOR TERKINI dalam jadual tidak perlu fallback, ia hanya memaparkan apa yang direkodkan */}
                                            <div className="senaraipemantauan-risk-box" style={{backgroundColor:d.risk_color}}>
                                                {shortForm(d.tahap_risiko)}
                                            </div>
                                        </td>
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

                                    {/* BARIS EXPANDED */}
                                    {isExpanded && (
                                        <tr className="senaraipemantauan-detail-row">
                                            <td colSpan={COL_SPAN}> {/* COL_SPAN dikemaskini */}
                                                <div className="senaraipemantauan-detail-content">
                                                    
                                                    {/* Kumpulan Data Pendaftaran */}
                                                    <div className="senaraipemantauan-detail-group">
                                                        <h4>Maklumat Pengenalpastian Risiko</h4>
                                                        
                                                        <p>
                                                            <strong>Syarikat:</strong> 
                                                            {d.nama_subsidiari || "-"}
                                                        </p>
                                                        
                                                        <p>
                                                            <strong>Tahun & Separuh:</strong> 
                                                            {d.tahun_asal || d.tahun || ""} ({getSeparuhTahunLabel(d.separuh_tahun_asal || d.separuh_tahun)})
                                                        </p>
                                                        <p>
                                                            <strong>Kategori Risiko:</strong> 
                                                            {d.kategori_risiko || "-"}
                                                        </p>
                                                    </div>
                                                    
                                                    {/* Kumpulan Data Pemantauan */}
                                                    {(d.tahun_pemantauan || d.catatan) && (
                                                        <div className="senaraipemantauan-detail-group">
                                                            <h4>Maklumat Pemantauan Risiko</h4>
                                                            {d.tahun_pemantauan && (
                                                                <p>
                                                                    <strong>Tahun & Separuh:</strong> 
                                                                    {d.tahun_pemantauan ? `${d.tahun_pemantauan} (${getSeparuhTahunLabel(d.separuh_tahun_pemantauan)})` : '-'}
                                                                </p>
                                                            )}
                                                            {d.catatan && (
                                                                <p>
                                                                    <strong>Catatan:</strong> 
                                                                    {d.catatan || "-"}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Kumpulan Pelan Tindakan */}
                                                    {d.pelan_tindakan_pemantauan && d.pelan_tindakan_pemantauan.length > 0 && (
                                                        <div className="senaraipemantauan-detail-group senaraipemantauan-detail-group-wide">
                                                            <h4>Pelan Tindakan Pemantauan</h4>
                                                            <ol>
                                                                {d.pelan_tindakan_pemantauan.map((plan, index) => (
                                                                    <li key={index}>{plan}</li>
                                                                ))}
                                                            </ol>
                                                        </div>
                                                    )}

                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    
                                </Fragment>
                                )
                            })
                        ) : (
                            <tr><td colSpan={COL_SPAN} className="senaraipemantauan-no-data">Tiada data dijumpai</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Modal Edit Pemantauan */}
            {isModalOpen && selectedRiskForEdit && (
                <EditPemantauan 
                   isOpen={isModalOpen}
                    risk={selectedRiskForEdit} 
                    onClose={handleCloseModal} 
                    onSave={handleRefreshData}
                />
            )}
            
            {/* Modal Filter Tarikh */}
            {isDateFilterModalOpen && (
                <DateFilterModal
                    isOpen={isDateFilterModalOpen}
                    onClose={() => setIsDateFilterModalOpen(false)}
                    allData={data}
                    currentType={dateFilterType}
                    currentTahun={selectedFilterTahun}
                    currentSeparuh={selectedFilterSeparuh}
                    onApplyFilter={handleApplyDateFilter}
                />
            )}
        </div>
    );
}

export default PemantauanRisiko;