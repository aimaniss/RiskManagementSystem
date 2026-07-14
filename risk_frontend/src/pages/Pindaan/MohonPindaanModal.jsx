import React, { useState, useEffect, useMemo } from "react";
import { X, CheckSquare } from "lucide-react";

// Import CSS KHUSUS for this modal
import './MohonPindaanModal.css';
import { riskMatrix, getRiskMatrix } from "../../constants/riskMatrix";

// --- Helper function uses the 5x5 matrix directly ---
const getRiskDetails = (likelihood, impact) => {
    const k_val = parseInt(likelihood);
    const i_val = parseInt(impact);
    const k = Math.min(Math.max(k_val, 1), 5);
    const i = Math.min(Math.max(i_val, 1), 5);

    let details = (!isNaN(k_val) && !isNaN(i_val) && riskMatrix[k] && riskMatrix[k][i])
                        ? riskMatrix[k][i]
                        : { label: "Tiada", shortLabel: "-", color: "#f1f5f9", textColor: "#334155" };

    return { ...details };
};

// --- ⭐️ DIKEMASKINI: Logik untuk 'Pelan Tindakan' (numbered list) ---
const formatPelanTindakan = (pelanArray) => {
  // Tapis keluar item yang null atau kosong
  const validItems = Array.isArray(pelanArray) ? pelanArray.filter(item => item) : [];

  if (validItems.length === 0) {
    return '-';
  }

  // Jika hanya 1 item, papar sebagai teks biasa
  if (validItems.length === 1) {
    return validItems[0];
  }

  // Jika lebih 1 item, papar sebagai senarai bernombor <ol>
  return (
    <ol className="pilih-risiko-list-compact">
      {validItems.map((item, index) => <li key={index}>{item}</li>)}
    </ol>
  );
};


function MohonPindaanModal({ isOpen, onClose, risks = [], ...props }) {
    const { syarikatList = [], userRole, userSyarikatId, onRiskSelect, customClass } = props;
    
    // State Penapis
    const [search, setSearch] = useState("");
    const [syarikatFilter, setSyarikatFilter] = useState("");
    const [tahunFilter, setTahunFilter] = useState("");
    const [separuhFilter, setSeparuhFilter] = useState("");
    
    // State untuk senarai tahun yang unik bagi setiap tab
    const [uniqueYearsPengenalpastian, setUniqueYearsPengenalpastian] = useState([]);
    const [uniqueYearsPemantauan, setUniqueYearsPemantauan] = useState([]);
    
    // State Tab
    const [activeTab, setActiveTab] = useState('pengenalpastian');

    // 1. Populate data untuk dropdown apabila modal dibuka
    useEffect(() => {
        if (isOpen) {
            // Reset semua penapis
            setSearch("");
            setSyarikatFilter("");
            setTahunFilter("");
            setSeparuhFilter("");
            setActiveTab('pengenalpastian'); 
            
            // Populate tahun untuk tab "Pengenalpastian"
            const yearsP = [...new Set(risks.map(r => r.tahun).filter(Boolean))]
                            .sort((a, b) => b - a);
            setUniqueYearsPengenalpastian(yearsP);
            
            // Populate tahun untuk tab "Pemantauan" - HANYA risiko dengan tahap risiko yang sah
            const risksWithValidScores = risks.filter(risk =>
                risk.tahun_pemantauan !== null && 
                risk.tahun_pemantauan !== undefined &&
                risk.skor_kebarangkalian_terkini !== null &&
                risk.skor_kebarangkalian_terkini !== undefined &&
                risk.skor_impak_terkini !== null &&
                risk.skor_impak_terkini !== undefined &&
                risk.skor_kebarangkalian_terkini >= 1 &&
                risk.skor_kebarangkalian_terkini <= 5 &&
                risk.skor_impak_terkini >= 1 &&
                risk.skor_impak_terkini <= 5
            );
            
            const yearsM = [...new Set(risksWithValidScores.map(r => r.tahun_pemantauan).filter(Boolean))]
                            .sort((a, b) => b - a);
            setUniqueYearsPemantauan(yearsM);

            // Tetapkan penapis syarikat jika pengguna bukan Admin
            if (["Staff", "Ketua Subsidiari"].includes(userRole) && userSyarikatId) {
                setSyarikatFilter(String(userSyarikatId));
            }
        }
    }, [isOpen, risks, userRole, userSyarikatId]); 

    // 2. Reset penapis kontekstual apabila tab ditukar
    useEffect(() => {
        setTahunFilter("");
        setSeparuhFilter("");
    }, [activeTab]);

    // 3. Penapisan Global (Search & Syarikat)
    const baseFilteredRisks = useMemo(() => {
        let tempRisks = [...risks];

        if (search.trim()) {
            const lowerSearch = search.toLowerCase();
            tempRisks = tempRisks.filter(r =>
                ((r.no_rujukan || "").toLowerCase().includes(lowerSearch) ||
                 (r.risiko || "").toLowerCase().includes(lowerSearch))
            );
        }
        if (syarikatFilter) {
            tempRisks = tempRisks.filter(r => String(r.syarikat_id) === String(syarikatFilter));
        }
        return tempRisks;
    }, [risks, search, syarikatFilter]);

    // 4. Penapisan Kontekstual (mengikut Tab) - DIKEMASKINI dengan penapis tahap risiko
    const risksToDisplay = useMemo(() => {
        let tempRisks = [];

        if (activeTab === 'pengenalpastian') {
            tempRisks = baseFilteredRisks; 

            if (tahunFilter) {
                tempRisks = tempRisks.filter(r => String(r.tahun) === String(tahunFilter));
            }
            if (separuhFilter) {
                tempRisks = tempRisks.filter(r =>
                    (separuhFilter === 'Pertama' && r.separuh_tahun === 1) ||
                    (separuhFilter === 'Kedua' && r.separuh_tahun === 2)
                );
            }
        } 
        else if (activeTab === 'pemantauan') {
            // PENAPIS TAMBAHAN: Hanya papar risiko dengan tahap risiko yang sah
            tempRisks = baseFilteredRisks.filter(risk => 
                risk.tahun_pemantauan !== null && 
                risk.tahun_pemantauan !== undefined &&
                // Pastikan ada skor kebarangkalian dan impak terkini
                risk.skor_kebarangkalian_terkini !== null &&
                risk.skor_kebarangkalian_terkini !== undefined &&
                risk.skor_impak_terkini !== null &&
                risk.skor_impak_terkini !== undefined &&
                // Pastikan skor dalam julat yang sah (1-5)
                risk.skor_kebarangkalian_terkini >= 1 &&
                risk.skor_kebarangkalian_terkini <= 5 &&
                risk.skor_impak_terkini >= 1 &&
                risk.skor_impak_terkini <= 5
            );

            if (tahunFilter) {
                tempRisks = tempRisks.filter(r => String(r.tahun_pemantauan) === String(tahunFilter));
            }
            if (separuhFilter) {
                tempRisks = tempRisks.filter(r =>
                    (separuhFilter === 'Pertama' && r.separuh_tahun_pemantauan === 1) ||
                    (separuhFilter === 'Kedua' && r.separuh_tahun_pemantauan === 2)
                );
            }
        }
        return tempRisks;
    }, [baseFilteredRisks, activeTab, tahunFilter, separuhFilter]);

    // Tentukan senarai tahun yang betul untuk dropdown
    const uniqueYearsForCurrentTab = activeTab === 'pengenalpastian' 
        ? uniqueYearsPengenalpastian 
        : uniqueYearsPemantauan;

    const columnCount = activeTab === 'pengenalpastian' ? 7 : 9;

    if (!isOpen) return null;

    return (
        <div className="pilih-risiko-overlay">
            <div className={`pilih-risiko-dialog ${customClass || 'modal-pilih-risiko'}`}>

                <div className="pilih-risiko-header">
                    <h3 className="pilih-risiko-title">Pilih Risiko Untuk Dipinda</h3>
                    <button onClick={onClose} className="pilih-risiko-close-x" aria-label="Tutup modal">
                        <X size={24} />
                    </button>
                </div>

                <div className="pilih-risiko-content">
                    
                    {/* 1. Butang Tab */}
                    <div className="pilih-risiko-tab-container">
                        <button
                            className={`pilih-risiko-tab-button ${activeTab === 'pengenalpastian' ? 'active' : ''}`}
                            onClick={() => setActiveTab('pengenalpastian')}
                        >
                            Pengenalpastian Risiko
                        </button>
                        <button
                            className={`pilih-risiko-tab-button ${activeTab === 'pemantauan' ? 'active' : ''}`}
                            onClick={() => setActiveTab('pemantauan')}
                        >
                            Pemantauan Risiko
                        </button>
                    </div>
                    
                    {/* 2. Filter (Dipindahkan ke bawah Tab) */}
                    <div className="pilih-risiko-filter-container">
                        <input
                            type="text" 
                            placeholder="Cari No Rujukan / Risiko..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="form-input" 
                            aria-label="Cari risiko"
                        />
                        <select
                            value={syarikatFilter} 
                            onChange={e => setSyarikatFilter(e.target.value)} 
                            disabled={["Staff","Ketua Subsidiari"].includes(userRole)} 
                            className="form-select" 
                            aria-label="Tapis mengikut syarikat"
                        >
                            <option value="">-- Semua Syarikat --</option>
                            {syarikatList.map(s => ( 
                                <option key={s.syarikat_id} value={s.syarikat_id}>
                                    {s.nama_syarikat}
                                </option> 
                            ))}
                        </select>
                        
                        <select
                            value={tahunFilter} 
                            onChange={e => setTahunFilter(e.target.value)} 
                            className="form-select" 
                            aria-label="Tapis mengikut tahun"
                        >
                            <option value="">-- Semua Tahun --</option>
                            {uniqueYearsForCurrentTab.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        
                        <select
                            value={separuhFilter} 
                            onChange={e => setSeparuhFilter(e.target.value)} 
                            className="form-select" 
                            aria-label="Tapis mengikut separuh tahun"
                        >
                            <option value="">-- Semua Separuh Tahun --</option>
                            <option value="Pertama">Pertama</option>
                            <option value="Kedua">Kedua</option>
                        </select>
                    </div>

                    {/* 3. Jadual */}
                    <div className="pilih-risiko-table-wrapper">
                        <table className="pilih-risiko-table">

                            {/* ⭐️ DIKEMASKINI: <colgroup> dengan saiz yang diubahsuai */}
                            {activeTab === 'pengenalpastian' ? (
                                <colgroup>
                                    <col style={{ width: "40px" }} />  {/* Bil */}
                                    <col style={{ width: "150px" }} /> {/* No Ruj - Lebar */}
                                    <col style={{ width: "100px" }} /> {/* Tahun - Kecil */}
                                    <col style={{ width: "auto" }} />   {/* Risiko */}
                                    <col style={{ width: "60px" }} />  {/* Skor - Kecil */}
                                    <col style={{ width: "250px" }} /> {/* Justifikasi - Lebar */}
                                    <col style={{ width: "70px" }} />  {/* Tindakan */}
                                </colgroup>
                            ) : (
                                <colgroup>
                                    <col style={{ width: "40px" }} />   {/* Bil */}
                                    <col style={{ width: "150px" }} /> {/* No Ruj - Lebar */}
                                    <col style={{ width: "100px" }} /> {/* Tahun - Kecil */}
                                    <col style={{ width: "auto" }} />   {/* Risiko */}
                                    <col style={{ width: "200px" }} /> {/* Pelan */}
                                    <col style={{ width: "60px" }} />  {/* Skor - Kecil */}
                                    <col style={{ width: "250px" }} /> {/* Justifikasi - Lebar */}
                                    <col style={{ width: "120px" }} /> {/* Status - Lebar */}
                                    <col style={{ width: "70px" }} />  {/* Tindakan */}
                                </colgroup>
                            )}

                            <thead>
                                <tr>
                                    <th className="pilih-risiko-th" rowSpan="2">Bil</th>
                                    {activeTab === 'pengenalpastian' ? (
                                        <th className="pilih-risiko-th" colSpan="5">Pengenalpastian Risiko</th>
                                    ) : (
                                        <th className="pilih-risiko-th" colSpan="7">Pemantauan Risiko</th>
                                    )}
                                    <th className="pilih-risiko-th" rowSpan="2">Tindakan</th>
                                </tr>
                                <tr>
                                    {activeTab === 'pengenalpastian' ? (
                                        <>
                                            <th className="pilih-risiko-th">No Rujukan</th>
                                            <th className="pilih-risiko-th th-wrap">Tahun & Separuh</th>
                                            <th className="pilih-risiko-th">Risiko</th>
                                            <th className="pilih-risiko-th th-wrap">Tahap Risiko</th>
                                            <th className="pilih-risiko-th th-wrap">Pindaan Penilaian</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="pilih-risiko-th">No Rujukan</th>
                                            <th className="pilih-risiko-th th-wrap">Tahun & Separuh</th>
                                            <th className="pilih-risiko-th">Risiko</th>
                                            <th className="pilih-risiko-th th-wrap">Pelan Tindakan</th>
                                            <th className="pilih-risiko-th th-wrap">Tahap Risiko</th>
                                            <th className="pilih-risiko-th th-wrap">Pindaan Keberkesanan</th>
                                            <th className="pilih-risiko-th th-wrap">Status</th>
                                        </>
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {risks.length === 0 ? (
                                    <tr>
                                        <td colSpan={columnCount} className="pilih-risiko-td td-message">
                                            Tiada data risiko tersedia.
                                        </td>
                                    </tr>
                                ) : baseFilteredRisks.length === 0 ? ( 
                                    <tr>
                                        <td colSpan={columnCount} className="pilih-risiko-td td-message">
                                            Tiada risiko dijumpai dengan kriteria carian ini.
                                        </td>
                                    </tr>
                                ) : risksToDisplay.length === 0 ? (
                                    <tr>
                                        <td colSpan={columnCount} className="pilih-risiko-td td-message">
                                            {activeTab === 'pemantauan' 
                                                ? "Tiada risiko dengan tahap risiko yang sah dijumpai untuk penapis ini."
                                                : "Tiada padanan dijumpai untuk penapis Tahun & Separuh Tahun ini."
                                            }
                                        </td>
                                    </tr>
                                ) : (
                                    risksToDisplay.map((risk, index) => {

                                        const skorAsal = getRiskDetails(
                                            risk.skor_kebarangkalian_sebelum,
                                            risk.skor_impak_sebelum
                                        );
                                        const skorSemasa = getRiskDetails(
                                            risk.skor_kebarangkalian_terkini,
                                            risk.skor_impak_terkini
                                        );
                                        
                                        return (
                                            <tr key={risk.id || risk.risiko_id}>
                                                <td className="pilih-risiko-td td-center">{index + 1}</td>
                                                
                                                {activeTab === 'pengenalpastian' ? (
                                                    <>
                                                        <td className="pilih-risiko-td">{risk.no_rujukan}</td>
                                                       
                                                        <td className="pilih-risiko-td td-stacked">
                                                            <div>{risk.tahun}</div>
                                                            <div>{risk.separuh_tahun === 1 ? 'Pertama' : 'Kedua'}</div>
                                                        </td>
                                                        <td className="pilih-risiko-td td-risiko" title={risk.risiko}>
                                                            {risk.risiko}
                                                        </td>
                                                        <td className="pilih-risiko-td td-center">
                                                            <span
                                                                className="td-skor"
                                                                style={{ 
                                                                    backgroundColor: skorAsal.color, 
                                                                    color: skorAsal.textColor 
                                                                }}
                                                                title={`Skor Asal: ${skorAsal.label}`}
                                                            >
                                                                {skorAsal.shortLabel}
                                                            </span>
                                                        </td>
                                                        <td className="pilih-risiko-td td-justifikasi" 
                                                            title={risk.justifikasi_pindaan_penilaian}
                                                        >
                                                            {risk.justifikasi_pindaan_penilaian || '-'}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="pilih-risiko-td">{risk.no_rujukan}</td>
                                                       
                                                        <td className="pilih-risiko-td td-stacked">
                                                            <div>{risk.tahun_pemantauan}</div>
                                                            <div>{risk.separuh_tahun_pemantauan === 1 ? 'Pertama' : 'Kedua'}</div>
                                                        </td>
                                                        <td className="pilih-risiko-td td-risiko" title={risk.risiko}>
                                                            {risk.risiko}
                                                        </td>
                                                        <td className="pilih-risiko-td td-pelan">
                                                            {formatPelanTindakan(risk.pelan_tindakan_terkini)}
                                                        </td>
                                                        <td className="pilih-risiko-td td-center">
                                                            <span
                                                                className="td-skor"
                                                                style={{ 
                                                                    backgroundColor: skorSemasa.color, 
                                                                    color: skorSemasa.textColor 
                                                                }}
                                                                title={`Skor Semasa: ${skorSemasa.label}`}
                                                            >
                                                                {skorSemasa.shortLabel}
                                                            </span>
                                                        </td>
                                                        <td className="pilih-risiko-td td-justifikasi" 
                                                            title={risk.keberkesanan}
                                                        >
                                                            {risk.keberkesanan || '-'}
                                                        </td>
                                                        <td className="pilih-risiko-td">
                                                            {risk.status_pemantauan_terkini || '-'}
                                                        </td>
                                                    </>
                                                )}

                                                <td className="pilih-risiko-td td-center">
                                                    <button 
                                                        onClick={() => onRiskSelect(risk)} 
                                                        className="pilih-risiko-btn pilih-risiko-btn-sm pilih-risiko-btn-success" 
                                                        aria-label={`Pilih risiko ${risk.no_rujukan}`}
                                                    >
                                                        <CheckSquare size={14} /> Pilih
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
            </div>
        </div>
    );
}

export default MohonPindaanModal;