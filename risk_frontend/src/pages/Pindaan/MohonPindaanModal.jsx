import React, { useState, useEffect, useMemo } from "react";
import { X, CheckSquare } from "lucide-react";

// Import CSS KHUSUS untuk modal ini
import './MohonPindaanModal.css';

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
                            type="text"
                            placeholder="Cari No Rujukan / Risiko..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="form-input"
                            aria-label="Cari risiko"
                        />
                        <select
                            value={subsidiariFilter}
                            onChange={e => setSubsidiariFilter(e.target.value)}
                            disabled={["Staff","Ketua Subsidiari"].includes(userRole)}
                            className="form-select"
                            aria-label="Tapis mengikut subsidiari">
                            <option value="">-- Semua Subsidiari --</option>
                            {subsidiariList.map(s => (
                                <option key={s.subsidiari_id} value={s.subsidiari_id}>
                                    {s.nama_subsidiari}
                                </option>
                            ))}
                        </select>
                        <select
                            value={tahunFilter}
                            onChange={e => setTahunFilter(e.target.value)}
                            className="form-select"
                            aria-label="Tapis mengikut tahun">
                            <option value="">-- Tahun --</option>
                            {uniqueYears.map(t=>(<option key={t} value={t}>{t}</option>))}
                        </select>
                        <select
                            value={separuhFilter}
                            onChange={e => setSeparuhFilter(e.target.value)}
                            className="form-select"
                            aria-label="Tapis mengikut separuh tahun">
                            <option value="">-- Separuh --</option>
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
                                    <th className="modal-th" colSpan="4">Pemantauan Risiko</th>
                                    <th className="modal-th" rowSpan="2">Tindakan</th>
                                </tr>
                                <tr>
                                    {/* Sub-header Kumpulan 1 */}
                                    <th className="modal-th">No Rujukan</th>
                                    <th className="modal-th th-wrap">Tahun & Separuh</th>
                                    <th className="modal-th">Risiko</th>
                                    <th className="modal-th th-wrap">Skor</th> {/* Pastikan ada th-wrap */}

                                    {/* Sub-header Kumpulan 2 */}
                                    <th className="modal-th th-wrap">Tahun & Separuh Pemantauan</th>
                                    <th className="modal-th th-wrap">Pelan Tindakan</th>
                                    <th className="modal-th th-wrap">Skor Risiko</th> {/* Pastikan ada th-wrap */}
                                    <th className="modal-th th-wrap">Status Pemantauan</th>
                                </tr>
                            </thead>

                            <tbody>
                                {risks.length === 0 ? (
                                    <tr><td colSpan={columnCount} className="modal-td modal-message">Tiada data risiko tersedia.</td></tr>
                                ) : filteredRisks.length === 0 ? (
                                    <tr><td colSpan={columnCount} className="modal-td modal-message">Tiada risiko dijumpai dengan kriteria ini.</td></tr>
                                ) : (
                                    filteredRisks.map((risk, index) => (
                                        <tr key={risk.id || risk.risiko_id}>
                                            <td className="modal-td td-center">{index + 1}</td>

                                            {/* --- Kumpulan 1: Pengenalpastian --- */}
                                            <td className="modal-td">{risk.no_rujukan}</td>
                                            <td className="modal-td">
                                                {risk.tahun} {risk.separuh_tahun === 1 ? 'Pertama' : 'Kedua'}
                                            </td>
                                            <td className="modal-td td-risiko" title={risk.risiko}>
                                                {risk.risiko}
                                            </td>
                                            <td
                                                className="modal-td modal-td-skor"
                                                style={{
                                                    backgroundColor: risk.risk_color || '#f1f5f9',
                                                    color: (risk.risk_color === '#eab308' ? '#854d0e' : (risk.risk_color ==='#f1f5f9' ? '#334155' : '#ffffff'))
                                                }}>
                                                {risk.tahap_risiko || '-'}
                                            </td>

                                            {/* --- Kumpulan 2: Pemantauan --- */}
                                            <td className="modal-td">
                                                {risk.tahun_pemantauan || '-'} {risk.separuh_tahun_pemantauan === 1 ? 'Pertama' : (risk.separuh_tahun_pemantauan === 2 ? 'Kedua' : '')}
                                            </td>
                                            <td className="modal-td td-risiko" title={risk.pelan_tindakan}>
                                                {risk.pelan_tindakan || '-'}
                                            </td>
                                            <td
                                                className="modal-td modal-td-skor"
                                                style={{
                                                    backgroundColor: risk.risk_color_semasa || '#f1f5f9',
                                                    color: (risk.risk_color_semasa === '#eab308' ? '#854d0e' : (risk.risk_color_semasa ==='#f1f5f9' ? '#334155' : '#ffffff'))
                                                }}>
                                                {risk.tahap_risiko_semasa || '-'}
                                            </td>
                                            <td className="modal-td">
                                                {risk.status_pemantauan || '-'}
                                            </td>

                                            <td className="modal-td td-center">
                                                <button onClick={() => onRiskSelect(risk)} className="btn btn-sm btn-success" aria-label={`Pilih risiko ${risk.no_rujukan}`}>
                                                    <CheckSquare size={14} /> Pilih
                                                </button>
                                            </td>
                                        </tr>
                                    ))
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