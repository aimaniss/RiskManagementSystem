import React, { useState, useEffect, useMemo } from "react";
import { X, CheckSquare } from "lucide-react";

// Import CSS KHUSUS for this modal
import './MohonPindaanModal.css';

// --- Helper function uses the 5x5 matrix directly ---
const getRiskDetails = (likelihood, impact) => {
    // Define the risk matrix here
    const riskMatrix = {
        1: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
        2: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
        3: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
        4: {1:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 2:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 3:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 4:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 5:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}},
        5: {1:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 2:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 3:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 4:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}, 5:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}},
    };

    // --- Logik untuk mengendalikan nilai null/undefined ---
    const k_val = parseInt(likelihood); // Akan jadi NaN jika likelihood = null
    const i_val = parseInt(impact); // Akan jadi NaN jika impact = null

    // Hadkan nilai antara 1 dan 5. NaN akan kekal NaN.
    const k = Math.min(Math.max(k_val, 1), 5);
    const i = Math.min(Math.max(i_val, 1), 5);

    // Semak jika k_val atau i_val ASAL adalah NaN. Jika ya, guna default.
    let details = (!isNaN(k_val) && !isNaN(i_val) && riskMatrix[k] && riskMatrix[k][i])
                    ? riskMatrix[k][i]
                    : { label: "Tiada", shortLabel: "-", color: "#f1f5f9", textColor: "#334155" };

    const score = (!isNaN(k_val) && !isNaN(i_val))
                    ? k_val * i_val
                    : '-';
    // --- TAMAT PERUBAHAN ---

    // Kembalikan details tanpa score (kerana tidak digunakan untuk paparan)
    return { ...details }; // Hanya kembalikan label, shortLabel, color, textColor
};

// --- Helper function to format action plans (array) ---
const formatPelanTindakan = (pelanArray) => {
  if (!Array.isArray(pelanArray) || pelanArray.length === 0) {
    return '-';
  }
  return (
    <ul className="modal-list-compact">
      {pelanArray.map((item, index) => item ? <li key={index}>{item}</li> : null)}
    </ul>
  );
};


function MohonPindaanModal({ isOpen, onClose, risks = [], ...props }) {
    const { subsidiariList = [], userRole, userSubsidiariId, onRiskSelect, customClass } = props;
    const [search, setSearch] = useState("");
    const [subsidiariFilter, setSubsidiariFilter] = useState("");
    const [tahunFilter, setTahunFilter] = useState("");
    const [separuhFilter, setSeparuhFilter] = useState("");
    const [uniqueYears, setUniqueYears] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setSearch("");
            setSubsidiariFilter("");
            setTahunFilter("");
            setSeparuhFilter("");
            const years = [...new Set(risks.map(r => r.tahun))].sort((a, b) => b - a);
            setUniqueYears(years);
            if (["Staff", "Ketua Subsidiari"].includes(userRole) && userSubsidiariId) {
                setSubsidiariFilter(String(userSubsidiariId));
            }
        }
    }, [isOpen, risks, userRole, userSubsidiariId]);

    const filteredRisks = useMemo(() => {
        let tempRisks = [...risks];

        if (search.trim()) {
            const lowerSearch = search.toLowerCase();
            tempRisks = tempRisks.filter(r =>
                ((r.no_rujukan || "").toLowerCase().includes(lowerSearch) ||
                 (r.risiko || "").toLowerCase().includes(lowerSearch))
            );
        }
        if (subsidiariFilter) {
            tempRisks = tempRisks.filter(r => String(r.subsidiari_id) === String(subsidiariFilter));
        }
        if (tahunFilter) {
            tempRisks = tempRisks.filter(r => String(r.tahun) === String(tahunFilter));
        }
        if (separuhFilter) {
            tempRisks = tempRisks.filter(r =>
                (separuhFilter === 'Pertama' && r.separuh_tahun === 1) ||
                (separuhFilter === 'Kedua' && r.separuh_tahun === 2)
            );
        }
        return tempRisks;
    }, [risks, search, subsidiariFilter, tahunFilter, separuhFilter]);

    const columnCount = 10;

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className={`modal-dialog ${customClass || 'modal-pilih-risiko'}`}>

                <div className="modal-header">
                    <h3 className="modal-title">Pilih Risiko Untuk Dipinda</h3>
                    <button onClick={onClose} className="modal-close-x" aria-label="Tutup modal">
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-content">
                    <div className="modal-filter-container">
                        <input
                            type="text" placeholder="Cari No Rujukan / Risiko..." value={search} onChange={e => setSearch(e.target.value)} className="form-input" aria-label="Cari risiko"
                        />
                        <select
                            value={subsidiariFilter} onChange={e => setSubsidiariFilter(e.target.value)} disabled={["Staff","Ketua Subsidiari"].includes(userRole)} className="form-select" aria-label="Tapis mengikut subsidiari">
                            <option value="">-- Semua Subsidiari --</option>
                            {subsidiariList.map(s => ( <option key={s.subsidiari_id} value={s.subsidiari_id}> {s.nama_subsidiari} </option> ))}
                        </select>
                        <select
                            value={tahunFilter} onChange={e => setTahunFilter(e.target.value)} className="form-select" aria-label="Tapis mengikut tahun">
                            <option value="">-- Tahun Asal --</option>
                            {uniqueYears.map(t=>(<option key={t} value={t}>{t}</option>))}
                        </select>
                        <select
                            value={separuhFilter} onChange={e => setSeparuhFilter(e.target.value)} className="form-select" aria-label="Tapis mengikut separuh tahun">
                            <option value="">-- Separuh Asal --</option>
                            <option value="Pertama">Pertama</option>
                            <option value="Kedua">Kedua</option>
                        </select>
                    </div>

                    <div className="modal-table-wrapper">
                        <table className="modal-table">
                            <thead>
                                <tr>
                                    <th className="modal-th" rowSpan="2">Bil</th>
                                    <th className="modal-th" colSpan="4">Pengenalpastian Risiko</th>
                                    <th className="modal-th" colSpan="4">Pemantauan Terkini</th>
                                    <th className="modal-th" rowSpan="2">Tindakan</th>
                                </tr>
                                <tr>
                                    <th className="modal-th">No Rujukan</th>
                                    <th className="modal-th th-wrap">Tahun & Separuh</th>
                                    <th className="modal-th">Risiko</th>
                                    <th className="modal-th th-wrap">Skor Asal</th>
                                    <th className="modal-th th-wrap">Tahun & Separuh</th>
                                    <th className="modal-th th-wrap">Pelan Tindakan</th>
                                    <th className="modal-th th-wrap">Skor Semasa</th>
                                    <th className="modal-th th-wrap">Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {risks.length === 0 ? (
                                    <tr><td colSpan={columnCount} className="modal-td modal-message">Tiada data risiko tersedia.</td></tr>
                                ) : filteredRisks.length === 0 ? (
                                    <tr><td colSpan={columnCount} className="modal-td modal-message">Tiada risiko dijumpai dengan kriteria ini.</td></tr>
                                ) : (
                                    filteredRisks.map((risk, index) => {

                                        // --- Guna nama prop yang betul dari API backend ---
                                        const skorAsal = getRiskDetails(
                                            risk.skor_kebarangkalian_sebelum,
                                            risk.skor_impak_sebelum
                                        );
                                        const skorSemasa = getRiskDetails(
                                            risk.skor_kebarangkalian_terkini,
                                            risk.skor_impak_terkini
                                        );
                                        // --- TAMAT PERUBAHAN ---

                                        return (
                                            <tr key={risk.id || risk.risiko_id}>
                                                <td className="modal-td td-center">{index + 1}</td>
                                                <td className="modal-td">{risk.no_rujukan}</td>
                                                <td className="modal-td">
                                                    {risk.tahun} {risk.separuh_tahun === 1 ? 'Pertama' : 'Kedua'}
                                                </td>
                                                <td className="modal-td td-risiko" title={risk.risiko}>
                                                    {risk.risiko}
                                                </td>
                                                <td
                                                    className="modal-td modal-td-skor"
                                                    style={{ backgroundColor: skorAsal.color, color: skorAsal.textColor }}
                                                    title={`Skor Asal: ${skorAsal.label}`} // Tooltip kini hanya label
                                                >
                                                    {skorAsal.shortLabel} {/* Hanya papar shortLabel */}
                                                </td>
                                                <td className="modal-td">
                                                    {risk.tahun_pemantauan || '-'} {risk.separuh_tahun_pemantauan === 1 ? 'Pertama' : (risk.separuh_tahun_pemantauan === 2 ? 'Kedua' : '')}
                                                </td>
                                                <td className="modal-td td-pelan">
                                                    {formatPelanTindakan(risk.pelan_tindakan_terkini)}
                                                </td>
                                                <td
                                                    className="modal-td modal-td-skor"
                                                    style={{ backgroundColor: skorSemasa.color, color: skorSemasa.textColor }}
                                                    title={`Skor Semasa: ${skorSemasa.label}`} // Tooltip kini hanya label
                                                >
                                                    {skorSemasa.shortLabel} {/* Hanya papar shortLabel */}
                                                </td>
                                                <td className="modal-td">
                                                    {risk.status_pemantauan_terkini || '-'}
                                                </td>
                                                <td className="modal-td td-center">
                                                    <button onClick={() => onRiskSelect(risk)} className="btn btn-sm btn-success" aria-label={`Pilih risiko ${risk.no_rujukan}`}>
                                                        <CheckSquare size={14} /> Pilih
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="button" onClick={onClose} className="btn btn-default">Tutup</button>
                </div>
            </div>
        </div>
    );
}

export default MohonPindaanModal;