import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import './PindaanFormModal.css'; 

// Import modal pengesahan
import PengesahanPindaanModal from './PengesahanPindaanModal';

// --- (MULA) DESKRIPSI SKOR MENGIKUT JADUAL YANG DIBERIKAN (JADUAL 2 & 3) ---
const likelihoodDescriptions = {
    5: "Hampir Pasti",
    4: "Kemungkinan Tinggi",
    3: "Berpeluang Untuk Berlaku",
    2: "Kemungkinan Rendah",
    1: "Hampir Tiada Kemungkinan",
};

const impactDescriptions = {
    5: "Sangat Besar",
    4: "Besar",
    3: "Ketara",
    2: "Boleh Diukur",
    1: "Tidak Ketara",
};
// --- (TAMAT) DESKRIPSI SKOR MENGIKUT JADUAL YANG DIBERIKAN ---


// Matriks Risiko LENGKAP (Kekalkan yang sedia ada)
const riskMatrixDetails = {
    1: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    2: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    3: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    4: {1:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 2:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 3:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 4:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 5:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}},
    5: {1:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 2:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 3:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 4:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}, 5:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}},
};

// Fungsi: Dapatkan butiran LENGKAP dari matriks
const getRiskStylingFromMatrix = (likelihood, impact, matrix) => {
    const k_val = parseInt(likelihood, 10);
    const i_val = parseInt(impact, 10);
    if (!isNaN(k_val) && !isNaN(i_val) &&
        k_val >= 1 && k_val <= 5 && i_val >= 1 && i_val <= 5 &&
        matrix[k_val] && matrix[k_val][i_val])
    {
        return matrix[k_val][i_val];
    }
    return { label: "Tiada", shortLabel: "-", color: "#f1f5f9", textColor: "#334155" };
};

// Komponen Dropdown Skor (TELAH DIUBAHSUAI)
const SkorSelect = ({ name, value, onChange, type }) => {
    // Pilih set deskripsi berdasarkan prop 'type'
    const descriptions = type === 'likelihood' ? likelihoodDescriptions : impactDescriptions;
    const scores = [5, 4, 3, 2, 1]; // Urutan dari 5 ke 1

    return (
        <select name={name} value={value || ''} onChange={onChange} className="form-select">
            <option value="">-- Pilih --</option>
            {scores.map(score => (
                <option key={score} value={score}>
                    {score} - {descriptions[score]} {/* Papar skor dan deskripsi yang betul */}
                </option>
            ))}
        </select>
    );
};


// Komponen Blok Skor
const RiskScoringBlock = ({
    title,
    originalLikelihood,
    originalImpact,
    likelihoodValue,
    impactValue,
    onScoreChange,
    likelihoodName,
    impactName,
    justifikasiValue,
    onJustifikasiChange,
    justifikasiLabel,
    justifikasiPlaceholder,
    monitoringTahun,
    monitoringSeparuh
}) => {
    const originalScoreDetails = useMemo(() => {
        return getRiskStylingFromMatrix(originalLikelihood, originalImpact, riskMatrixDetails);
    }, [originalLikelihood, originalImpact]);

    const currentScoreDetails = useMemo(() => {
        return getRiskStylingFromMatrix(likelihoodValue, impactValue, riskMatrixDetails);
    }, [likelihoodValue, impactValue]);

    const separuhTahunText = monitoringSeparuh === 1 ? 'Pertama' : monitoringSeparuh === 2 ? 'Kedua' : '-';
    const displayOriginalScoreNumber = (scoreValue) => scoreValue ?? '-';
    
    // Fungsi bantuan untuk mendapatkan deskripsi asal
    const getOriginalDescription = (score, type) => {
        if (!score) return "-";
        const descMap = type === 'likelihood' ? likelihoodDescriptions : impactDescriptions;
        return descMap[score] || 'Skor Tidak Sah';
    };

    return (
        <div className="pemantauan-box">
            <div className="pemantauan-box-header">
                <span>{title}</span>
            </div>

            {/* Info Pemantauan (jika ada) */}
            {monitoringTahun && (
                <div className="pemantauan-flex-row pemantauan-info-row">
                    <div className="pemantauan-flex-item">
                        <label className="pemantauan-label-inline">Tahun Pemantauan:</label>
                        <input type="text" readOnly value={monitoringTahun || '-'} className="pemantauan-data-inline pemantauan-textonly" />
                    </div>
                    <div className="pemantauan-flex-item">
                        <label className="pemantauan-label-inline">Separuh Tahun:</label>
                        <input type="text" readOnly value={separuhTahunText} className="pemantauan-data-inline pemantauan-textonly" />
                    </div>
                </div>
            )}

            {/* Skor Asal Rujukan */}
            <div className="pemantauan-flex-row pemantauan-original-score-row">
                 <span className="pemantauan-original-title">Data Rujukan:</span>
                 <div className="pemantauan-flex-item pemantauan-original-item">
                      <label className="pemantauan-label-inline">Skor Kebarangkalian:</label>
                      <span className="pemantauan-data-inline pemantauan-textonly" title={getOriginalDescription(originalLikelihood, 'likelihood')}>
                            {displayOriginalScoreNumber(originalLikelihood)}
                      </span>
                 </div>
                 <div className="pemantauan-flex-item pemantauan-original-item">
                      <label className="pemantauan-label-inline">Skor Impak:</label>
                      <span className="pemantauan-data-inline pemantauan-textonly" title={getOriginalDescription(originalImpact, 'impact')}>
                            {displayOriginalScoreNumber(originalImpact)}
                      </span>
                 </div>
                 <div className="pemantauan-flex-item pemantauan-original-item">
                      <label className="pemantauan-label-inline">Tahap Risiko:</label>
                      <span
                            className="pemantauan-data-inline risk-score-badge"
                            style={{
                                backgroundColor: originalScoreDetails.color,
                                color: originalScoreDetails.textColor,
                            }}
                      >
                            {originalScoreDetails.shortLabel}
                      </span>
                 </div>
            </div>

            {/* Skor Boleh Ubah (Baru) */}
            <div className="pemantauan-flex-row">
                <div className="pemantauan-flex-item">
                    <label className="pemantauan-label-inline">Skor Kebarangkalian (Baru):</label>
                    {/* Pindaan: Tambah type="likelihood" */}
                    <SkorSelect 
                        name={likelihoodName} 
                        value={likelihoodValue} 
                        onChange={onScoreChange} 
                        type="likelihood" 
                    />
                </div>
                <div className="pemantauan-flex-item">
                    <label className="pemantauan-label-inline">Skor Impak (Baru):</label>
                    {/* Pindaan: Tambah type="impact" */}
                    <SkorSelect 
                        name={impactName} 
                        value={impactValue} 
                        onChange={onScoreChange} 
                        type="impact" 
                    />
                </div>
                <div className="pemantauan-flex-item">
                    <label className="pemantauan-label-inline">Tahap Risiko (Baru):</label>
                    <span
                         className="pemantauan-data-inline risk-score-badge"
                         style={{
                             backgroundColor: currentScoreDetails.color,
                             color: currentScoreDetails.textColor,
                         }}
                         aria-label="Skor Risiko Baru (dikira)"
                    >
                        {currentScoreDetails.shortLabel}
                    </span>
                </div>
            </div>

            {/* Justifikasi */}
            <div className="form-group" style={{ marginTop: '16px', marginBottom: '0' }}>
                <label style={{ fontWeight: 'bold' }}>{justifikasiLabel}</label>
                <textarea
                    value={justifikasiValue}
                    onChange={onJustifikasiChange}
                    className="form-textarea"
                    placeholder={justifikasiPlaceholder}
                    rows={3}
                />
            </div>
        </div>
    );
};



// --- KOMPONEN MODAL UTAMA ---
function PindaanFormModal({ isOpen, risk, userRole, onClose, onPindaanSubmitted }) {
    const [originalData, setOriginalData] = useState({});
    const [formData, setFormData] = useState({});
    const [justifikasiPenilaian, setJustifikasiPenilaian] = useState("");
    const [justifikasiKeberkesanan, setJustifikasiKeberkesanan] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [dataToConfirm, setDataToConfirm] = useState(null);

    useEffect(() => {
        if (risk && isOpen) {
            const initialValues = {
                no_rujukan: risk.no_rujukan,
                risiko: risk.risiko,
                subsidiari: risk.nama_subsidiari || risk.subsidiari || 'N/A',
                bahagian: risk.bahagian,
                tahun: risk.tahun,
                separuh_tahun: risk.separuh_tahun,
                skor_kebarangkalian: risk.skor_kebarangkalian_sebelum,
                skor_impak: risk.skor_impak_sebelum,
                
                // --- DIUBAH: Guna `_selepas` sejajar dengan 'logpemantauan' ---
                skor_kebarangkalian_selepas: risk.skor_kebarangkalian_terkini,
                skor_impak_selepas: risk.skor_impak_terkini,
                // --- TAMAT PERUBAHAN ---

                tahun_pemantauan: risk.tahun_pemantauan,
                separuh_tahun_pemantauan: risk.separuh_tahun_pemantauan,
            };
            setOriginalData(initialValues);
            setFormData(initialValues);
            setJustifikasiPenilaian("");
            setJustifikasiKeberkesanan("");
        }
    }, [risk, isOpen]);

    // Fungsi untuk check jika ada skor penilaian asal
    const hasInitialAssessmentScore = useMemo(() => {
        return originalData.skor_kebarangkalian != null || originalData.skor_impak != null;
    }, [originalData]);

    // --- DIUBAH: Semak guna `_selepas` ---
    // Fungsi untuk check jika ada data pemantauan (skor semasa ATAU tahun)
    const hasMonitoringData = useMemo(() => {
        return originalData.tahun_pemantauan != null ||
               originalData.skor_kebarangkalian_selepas != null ||
               originalData.skor_impak_selepas != null;
    }, [originalData]);
    // --- TAMAT PERUBAHAN ---


    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        const currentData = { ...formData };

        const findChanges = (original, current) => {
            const before = {};
            const after = {};
            const allKeys = new Set([...Object.keys(original), ...Object.keys(current)]);
            const readOnlyKeys = [
                'risiko', 'no_rujukan', 'subsidiari', 'bahagian', 'tahun', 'separuh_tahun',
                'tahun_pemantauan', 'separuh_tahun_pemantauan'
            ];
            allKeys.forEach(key => {
                if (readOnlyKeys.includes(key)) return;
                const originalValue = original[key] ?? null;
                const currentValue = current[key] ?? null;
                if (originalValue !== currentValue) {
                    before[key] = originalValue;
                    after[key] = currentValue;
                }
            });
            return { before, after };
        };


        const { before, after } = findChanges(originalData, currentData);

        if (Object.keys(before).length === 0) {
            alert("ℹ️ Tiada perubahan dikesan pada skor.");
            return;
        }

        const hasPenilaianChanges = 'skor_kebarangkalian' in after || 'skor_impak' in after;
        
        // --- DIUBAH: Semak perubahan `_selepas` ---
        const hasKeberkesananChanges = 'skor_kebarangkalian_selepas' in after || 'skor_impak_selepas' in after;
        // --- TAMAT PERUBAHAN ---

        // Validasi Justifikasi hanya jika blok skor yang berkaitan DIPAPARKAN
        if (hasInitialAssessmentScore && hasPenilaianChanges && !justifikasiPenilaian.trim()) {
            alert("Sila isi justifikasi untuk Pindaan Penilaian.");
            return;
        }
        if (hasMonitoringData && hasKeberkesananChanges && !justifikasiKeberkesanan.trim()) {
            alert("Sila isi justifikasi untuk Pindaan Keberkesanan.");
            return;
        }

        const justifikasiObj = {};
        if (hasPenilaianChanges) justifikasiObj.penilaian = justifikasiPenilaian.trim();
        if (hasKeberkesananChanges) justifikasiObj.keberkesanan = justifikasiKeberkesanan.trim();

        const perubahanDicadang = { data_sebelum: before, data_selepas: after };

        setDataToConfirm({
            perubahan: perubahanDicadang,
            justifikasi: justifikasiObj
        });
        setIsConfirmModalOpen(true);
    };

      const handleConfirmSubmit = async () => {
        if (!dataToConfirm) return;
        const { justifikasi, perubahan } = dataToConfirm;
        setIsSubmitting(true);
        try {
            await onPindaanSubmitted(justifikasi, perubahan);
            setIsConfirmModalOpen(false);
            onClose();
        } catch (err) {
            console.error("Gagal hantar pindaan dari PindaanFormModal:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitButtonText = userRole === "Admin" ? "Hantar & Luluskan Terus" : "Hantar Permohonan";

    if (!isOpen) return null;

      return (
        <>
            <div className="modal-overlay">
                <div className="modal-dialog modal-form modal-form-large pindaan-form-modal-dialog">
                    <div className="modal-header">
                        <h3 style={{ margin: 0, fontSize: '18px' }}>Borang Pindaan: {risk?.no_rujukan || 'N/A'}</h3>
                        <button onClick={onClose} className="modal-close-x" aria-label="Tutup Borang"><X size={24} /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="modal-content modal-form-body">

                        {/* Baris Info Risiko & Subsidiari */}
                        <div className="form-info-row">
                            <div className="form-info-item">
                                <span className="form-info-label">Risiko:</span>
                                <span className="form-info-data">{formData.risiko || '-'}</span>
                            </div>
                            <div className="form-info-item">
                                <span className="form-info-label">Syarikat:</span>
                                <span className="form-info-data">{formData.subsidiari || '-'}</span>
                            </div>
                        </div>

                        {/* --- Rendering Bersyarat untuk Blok Penilaian --- */}
                        {hasInitialAssessmentScore && (
                            <RiskScoringBlock
                                title="Pindaan Penilaian Risiko"
                                originalLikelihood={originalData.skor_kebarangkalian}
                                originalImpact={originalData.skor_impak}
                                likelihoodValue={formData.skor_kebarangkalian}
                                impactValue={formData.skor_impak}
                                onScoreChange={handleChange}
                                likelihoodName="skor_kebarangkalian"
                                impactName="skor_impak"
                                justifikasiValue={justifikasiPenilaian}
                                onJustifikasiChange={e => setJustifikasiPenilaian(e.target.value)}
                                justifikasiLabel="Justifikasi Pindaan Penilaian:"
                                justifikasiPlaceholder="Sila isi justifikasi jika anda meminda skor Penilaian Risiko..."
                            />
                        )}

                        {/* --- DIUBAH: Blok Keberkesanan kini guna `_selepas` --- */}
                        {hasMonitoringData && (
                            <RiskScoringBlock
                                title="Pindaan Keberkesanan Tindakan"
                                originalLikelihood={originalData.skor_kebarangkalian_selepas}
                                originalImpact={originalData.skor_impak_selepas}
                                likelihoodValue={formData.skor_kebarangkalian_selepas}
                                impactValue={formData.skor_impak_selepas}
                                onScoreChange={handleChange}
                                likelihoodName="skor_kebarangkalian_selepas"
                                impactName="skor_impak_selepas"
                                monitoringTahun={formData.tahun_pemantauan}
                                monitoringSeparuh={formData.separuh_tahun_pemantauan}
                                justifikasiValue={justifikasiKeberkesanan}
                                onJustifikasiChange={e => setJustifikasiKeberkesanan(e.target.value)}
                                justifikasiLabel="Justifikasi Pindaan Keberkesanan:"
                                justifikasiPlaceholder="Sila isi justifikasi jika anda meminda skor Keberkesanan Tindakan..."
                            />
                        )}
                        {/* --- TAMAT PERUBAHAN --- */}


                        {/* --- Papar mesej jika tiada blok skor langsung --- */}
                        {!hasInitialAssessmentScore && !hasMonitoringData && (
                            <div className="pemantauan-box" style={{ padding: '14px 16px', marginBottom: '16px', textAlign: 'center', color: '#6b7280' }}>
                                Tiada data skor penilaian atau pemantauan tersedia untuk risiko ini.
                            </div>
                        )}

                        {/* Footer Modal (Butang) */}
                        {/* --- Sembunyikan butang Hantar jika tiada apa boleh dipinda --- */}
                        {(hasInitialAssessmentScore || hasMonitoringData) && (
                            <div className="modal-footer">
                                <button type="button" onClick={onClose} className="btn btn-default">Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Menghantar...' : submitButtonText}
                                </button>
                            </div>
                        )}
                          {/* Jika tiada skor langsung, hanya tunjuk butang Tutup */}
                        {!hasInitialAssessmentScore && !hasMonitoringData && (
                             <div className="modal-footer">
                                 <button type="button" onClick={onClose} className="btn btn-default">Tutup</button>
                             </div>
                        )}
                    </form>
                </div>
            </div>

            {/* Modal Pengesahan */}
            <PengesahanPindaanModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmSubmit}
                perubahan={dataToConfirm?.perubahan}
                isSubmitting={isSubmitting}
            />
        </>
    );
}

export default PindaanFormModal;