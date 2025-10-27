import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import './PindaanFormModal.css';

// --- (BARU) Import modal pengesahan ---
import PengesahanPindaanModal from './PengesahanPindaanModal'; 

// --- (MULA) FUNGSI HELPER & KOMPONEN SKOR ---

const getRiskDetails = (likelihood, impact) => {
    // ... (kod sedia ada anda, tidak perlu ubah)
    const l = parseInt(likelihood, 10);
    const i = parseInt(impact, 10);
    if (isNaN(l) || isNaN(i) || l < 1 || l > 5 || i < 1 || i > 5) {
        return { score: '-' };
    }
    const score = l * i;
    return { score };
};

const SkorSelect = ({ name, value, onChange }) => (
    // ... (kod sedia ada anda, tidak perlu ubah)
    <select name={name} value={value || ''} onChange={onChange} className="form-select">
        <option value="">-- Pilih --</option>
        <option value="1">1 - Sangat Rendah</option>
        <option value="2">2 - Rendah</option>
        <option value="3">3 - Sederhana</option>
        <option value="4">4 - Tinggi</option>
        <option value="5">5 - Sangat Tinggi</option>
    </select>
);

const RiskScoringBlock = ({ 
    title, 
    likelihoodValue, impactValue, 
    onScoreChange, likelihoodName, impactName,
    justifikasiValue,
    onJustifikasiChange,
    justifikasiLabel,
    justifikasiPlaceholder,
    monitoringTahun,
    monitoringSeparuh
}) => {
    // ... (kod sedia ada anda, tidak perlu ubah)
    const { score } = useMemo(() => {
        return getRiskDetails(likelihoodValue, impactValue);
    }, [likelihoodValue, impactValue]);
    
    const separuhTahunText = monitoringSeparuh === 1 ? 'Pertama' : monitoringSeparuh === 2 ? 'Kedua' : '-';

    return (
        <div className="pemantauan-box" style={{ padding: '14px 16px', marginBottom: '16px' }}>
            <div className="pemantauan-box-header">
                <span>{title}</span>
            </div>
            
            <div className="pemantauan-flex-row" style={{ marginTop: '10px' }}>
                
                {monitoringTahun && (
                    <>
                        <div className="pemantauan-flex-item">
                            <label className="pemantauan-label-inline">Tahun Pemantauan:</label>
                            <input type="text" readOnly value={monitoringTahun || '-'} className="pemantauan-data-inline pemantauan-textonly" />
                        </div>
                        <div className="pemantauan-flex-item">
                            <label className="pemantauan-label-inline">Separuh Tahun:</label>
                            <input type="text" readOnly value={separuhTahunText} className="pemantauan-data-inline pemantauan-textonly" />
                        </div>
                    </>
                )}
                
                <div className="pemantauan-flex-item">
                    <label className="pemantauan-label-inline">Skor Kebarangkalian:</label>
                    <SkorSelect name={likelihoodName} value={likelihoodValue} onChange={onScoreChange} />
                </div>
                <div className="pemantauan-flex-item">
                    <label className="pemantauan-label-inline">Skor Impak:</label>
                    <SkorSelect name={impactName} value={impactValue} onChange={onScoreChange} />
                </div>
                <div className="pemantauan-flex-item">
                    <label className="pemantauan-label-inline">Skor Risiko:</label>
                    <input type="text" readOnly value={score} className="pemantauan-data-inline pemantauan-textonly" style={{ textAlign: 'center' }} aria-label="Skor Risiko (dikira)" />
                </div>
            </div>

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
// --- (TAMAT) FUNGSI HELPER & KOMPONEN SKOR ---


// --- KOMPONEN MODAL UTAMA ---
function PindaanFormModal({ isOpen, risk, userRole, onClose, onPindaanSubmitted }) {
    const [originalData, setOriginalData] = useState({});
    const [formData, setFormData] = useState({});
    const [justifikasiPenilaian, setJustifikasiPenilaian] = useState("");
    const [justifikasiKeberkesanan, setJustifikasiKeberkesanan] = useState("");
    
    // 'isSubmitting' kini dikawal di sini untuk kedua-dua modal
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- (BARU) State untuk modal pengesahan ---
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [dataToConfirm, setDataToConfirm] = useState(null); // { perubahan, justifikasi }

    useEffect(() => {
        if (risk && isOpen) {
            // ... (kod sedia ada anda, tidak perlu ubah)
            const original = {
                no_rujukan: risk.no_rujukan,
                risiko: risk.risiko,
                subsidiari: risk.subsidiari || 'N/A',
                bahagian: risk.bahagian,
                tahun: risk.tahun,
                separuh_tahun: risk.separuh_tahun,
                skor_kebarangkalian: risk.skor_kebarangkalian,
                skor_impak: risk.skor_impak,
                skor_kebarangkalian_semasa: risk.skor_kebarangkalian_semasa,
                skor_impak_semasa: risk.skor_impak_semasa,
                tahun_pemantauan: risk.tahun_pemantauan,
                separuh_tahun_pemantauan: risk.separuh_tahun_pemantauan,
            };
            setOriginalData(original);
            setFormData(original);
            setJustifikasiPenilaian("");
            setJustifikasiKeberkesanan("");
        }
    }, [risk, isOpen]);

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    /**
     * --- (DIKEMASKINI) ---
     * 'handleSubmit' kini hanya membuat validasi dan membuka modal pengesahan.
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        const currentData = { ...formData }; 

        const findChanges = (original, current) => {
            // ... (kod sedia ada anda, tidak perlu ubah)
            const before = {};
            const after = {};
            const allKeys = new Set([...Object.keys(original), ...Object.keys(current)]);
            const readOnlyKeys = [
                'risiko', 'no_rujukan', 'subsidiari', 'bahagian', 'tahun', 'separuh_tahun',
                'tahun_pemantauan', 'separuh_tahun_pemantauan'
            ];
            allKeys.forEach(key => {
                if (readOnlyKeys.includes(key)) return; 
                if (JSON.stringify(original[key]) !== JSON.stringify(current[key])) {
                    before[key] = original[key] ?? null;
                    after[key] = current[key] ?? null;
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
        const hasKeberkesananChanges = 'skor_kebarangkalian_semasa' in after || 'skor_impak_semasa' in after;

        if (hasPenilaianChanges && !justifikasiPenilaian.trim()) {
            alert("Sila isi justifikasi untuk Pindaan Penilaian.");
            return;
        }
        if (hasKeberkesananChanges && !justifikasiKeberkesanan.trim()) {
            alert("Sila isi justifikasi untuk Pindaan Keberkesanan.");
            return;
        }
        
        const justifikasiObj = {};
        if (hasPenilaianChanges) justifikasiObj.penilaian = justifikasiPenilaian.trim();
        if (hasKeberkesananChanges) justifikasiObj.keberkesanan = justifikasiKeberkesanan.trim();

        const perubahanDicadang = { data_sebelum: before, data_selepas: after };
        
        // --- (DIKEMASKINI) Simpan data & buka modal pengesahan ---
        setDataToConfirm({
            perubahan: perubahanDicadang,
            justifikasi: justifikasiObj
        });
        setIsConfirmModalOpen(true);
        // Jangan hantar lagi
    };
    
    /**
     * --- (BARU) ---
     * Fungsi ini akan dipanggil oleh modal pengesahan untuk hantaran data sebenar.
     */
    const handleConfirmSubmit = () => {
        if (!dataToConfirm) return;

        const { justifikasi, perubahan } = dataToConfirm;
        
        setIsSubmitting(true); // Mula 'loading'
        
        // Panggil fungsi prop 'onPindaanSubmitted' yang sebenar
        onPindaanSubmitted(justifikasi, perubahan)
            .then(() => {
                // Jika berjaya, tutup kedua-dua modal
                setIsConfirmModalOpen(false);
                onClose(); // Fungsi 'onClose' dari props (untuk tutup PindaanFormModal)
            })
            .catch((err) => {
                // Jika gagal, papar ralat dan kekal di modal pengesahan
                console.error("Gagal hantar pindaan:", err);
                alert("Gagal menghantar permohonan. Sila cuba lagi.");
            })
            .finally(() => {
                setIsSubmitting(false); // Berhenti 'loading'
            });
    };

    const submitButtonText = userRole === "Admin" ? "Hantar & Luluskan Terus" : "Hantar Permohonan";

    if (!isOpen) return null;

    return (
        // --- (DIKEMASKINI) Guna React Fragment (<>) ---
        <> 
            <div className="modal-overlay">
                <div className="modal-dialog modal-form modal-form-large">
                    <div className="modal-header">
                        <h3 style={{ margin: 0, fontSize: '18px' }}>Borang Pindaan: {risk.no_rujukan}</h3>
                        {/* Butang 'X' kini ditutup oleh 'onClose' */}
                        <button onClick={onClose} className="modal-close-x" aria-label="Tutup Borang"><X size={24} /></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="modal-content modal-form-body">
                        
                        <div className="form-info-row">
                            <div className="form-info-item" style={{ flexBasis: '60%' }}>
                                <span className="form-info-label">Risiko:</span>
                                <span className="form-info-data">{formData.risiko || '-'}</span>
                            </div>
                            <div className="form-info-item" style={{ flexBasis: '40%' }}>
                                <span className="form-info-label">Subsidiari:</span>
                                <span className="form-info-data">{formData.subsidiari || '-'}</span>
                            </div>
                        </div>
                        
                        <RiskScoringBlock
                            title="Penilaian Risiko (Pengenalpastian)"
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
                        
                        <RiskScoringBlock
                            title="Keberkesanan Tindakan (Pemantauan)"
                            likelihoodValue={formData.skor_kebarangkalian_semasa}
                            impactValue={formData.skor_impak_semasa}
                            onScoreChange={handleChange}
                            likelihoodName="skor_kebarangkalian_semasa"
                            impactName="skor_impak_semasa"
                            monitoringTahun={formData.tahun_pemantauan}
                            monitoringSeparuh={formData.separuh_tahun_pemantauan}
                            justifikasiValue={justifikasiKeberkesanan}
                            onJustifikasiChange={e => setJustifikasiKeberkesanan(e.target.value)}
                            justifikasiLabel="Justifikasi Pindaan Keberkesanan:"
                            justifikasiPlaceholder="Sila isi justifikasi jika anda meminda skor Keberkesanan Tindakan..."
                        />
                        
                        <div className="modal-footer" style={{ marginTop: '0' }}>
                            {/* Butang Batal kini ditutup oleh 'onClose' */}
                            <button type="button" onClick={onClose} className="btn btn-default">Batal</button>
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                {/* Teks butang kekal sama, ia kini membuka modal pengesahan */}
                                {submitButtonText}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* --- (BARU) Modal Pengesahan diletak di sini --- */}
            <PengesahanPindaanModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)} // 'Batal' di modal ke-2
                onConfirm={handleConfirmSubmit} // 'Sahkan' di modal ke-2
                perubahan={dataToConfirm?.perubahan}
                isSubmitting={isSubmitting} // Kongsi state 'isSubmitting'
            />
        </>
    );
}

export default PindaanFormModal;