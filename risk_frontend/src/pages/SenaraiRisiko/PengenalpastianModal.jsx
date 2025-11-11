import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import api from "../../api/api";
import "./PengenalpastianModal.css";

// ✅ NOTA: Fail ini telah diperbetulkan - Kategori kini menggunakan dropdown select

function PengenalpastianModal({ isOpen, onClose, initialData = {} }) {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        noRujukan: initialData.no_rujukan || "",
        tahun: initialData.tahun || "",
        separuhTahun: initialData.separuh_tahun || "",
        subsidiari: initialData.subsidiari_id || initialData.subsidiari || "",
        kategori: initialData.kategori || "",
        bahagian: initialData.bahagian_unit || initialData.bahagian || "",
        risiko: initialData.risiko || "",
        punca: initialData.punca || ["", ""],
        kesan: initialData.kesan || ["", ""],
    });

    const [subsidiariList, setSubsidiariList] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const token = localStorage.getItem("token");
    let userRole = "";
    if (token) {
        try {
            const decoded = jwtDecode(token);
            const roleMapping = { 1: "ADMIN", 2: "EXECUTIVE", 3: "KETUA SUBSIDIARI", 4: "STAFF", 5: "VIEWER" };
            userRole = roleMapping[decoded.peranan_id] || "";
        } catch (err) { console.error("❌ Invalid token", err); }
    }

    const canEditPengenalpastian = ["ADMIN", "EXECUTIVE"].includes(userRole);

    useEffect(() => {
        const fetchSubsidiari = async () => {
            try {
                const res = await api.get("/subsidiari");
                const data = Array.isArray(res.data) ? res.data : res.data.subsidiari || [];
                setSubsidiariList(data);
            } catch (err) {
                console.error("❌ Error fetch subsidiari:", err);
            }
        };
        fetchSubsidiari();
    }, []); 

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleListChange = (listName, index, value) => {
        const list = [...formData[listName]];
        list[index] = value;
        setFormData(prev => ({ ...prev, [listName]: list }));
    };

    const handleAddListItem = (listName) => {
        setFormData(prev => ({ ...prev, [listName]: [...prev[listName], ""] }));
    };

    const handleRemoveListItem = (listName, index) => {
        const list = formData[listName].filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, [listName]: list }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        
        if (!canEditPengenalpastian) return alert("⚠️ Anda tidak mempunyai kebenaran untuk mengemaskini maklumat risiko.");
        if (!initialData.risiko_id) return alert("⚠️ ID Risiko tidak sah untuk dikemaskini.");

        const finalData = { 
            noRujukan: formData.noRujukan,
            tahun: formData.tahun,
            separuhTahun: formData.separuhTahun,
            subsidiari: formData.subsidiari, 
            kategori: formData.kategori,
            bahagian: formData.bahagian,
            risiko: formData.risiko,
            punca: formData.punca.filter(p => p && p.trim() !== ""),
            kesan: formData.kesan.filter(k => k && k.trim() !== ""),
            
            skorKebarangkalian: initialData.skor_kebarangkalian !== undefined ? initialData.skor_kebarangkalian : null,
            skorImpak: initialData.skor_impak !== undefined ? initialData.skor_impak : null,
            skorRisiko: initialData.skor_risiko || "",
            statusRisiko: initialData.status_risiko || "",
            tahapRisiko: initialData.tahap_risiko || ""
        };

        setIsSubmitting(true);
        try {
            await api.put(`/risiko/${initialData.risiko_id}`, finalData); 
            alert("✅ Pengenalpastian Risiko berjaya dikemaskini!");
            onClose(true);
        } catch (err) {
            console.error("❌ Error kemaskini pengenalpastian:", err.response?.data || err.message);
            alert("⚠️ Gagal mengemaskini pengenalpastian risiko.");
        } finally { setIsSubmitting(false); }
    };

    const subsidiariName = subsidiariList.find(s => s.subsidiari_id == formData.subsidiari)?.nama_subsidiari || "Memuat...";

    return (
        <div className="penilaian-modal-overlay">
            <div className="penilaian-modal-container">
                <div className="penilaian-box-header-main">
                    <span>Kemaskini Pengenalpastian Risiko: {formData.noRujukan}</span>
                    <button type="button" onClick={() => onClose(false)} className="penilaian-close-btn"><X size={20}/></button>
                </div>

                <div className="penilaian-modal-content">
                    <form onSubmit={handleSubmit}>
                        <div className="penilaian-box">
                            <div className="penilaian-box-header">Maklumat Asas Risiko</div>

                            <div className="penilaian-info-section">
                                <div className="penilaian-info-row">
                                    <div className="penilaian-input-group">
                                        <label className="penilaian-label">No Rujukan:</label>
                                        <input readOnly value={formData.noRujukan} className="penilaian-input" />
                                    </div>
                                    <div className="penilaian-input-group">
                                        <label className="penilaian-label">Tahun:</label>
                                        <input readOnly value={formData.tahun} className="penilaian-input" />
                                    </div>
                                    <div className="penilaian-input-group">
                                        <label className="penilaian-label">Separuh Tahun:</label>
                                        <input readOnly value={formData.separuhTahun == 1 ? "Pertama" : formData.separuhTahun == 2 ? "Kedua" : ""} className="penilaian-input" />
                                    </div>
                                </div>
                                <div className="penilaian-info-row" style={{ marginTop: '0px' }}>
                                    <div className="penilaian-input-group full-width">
                                        <label className="penilaian-label">Syarikat:</label>
                                        <input readOnly value={subsidiariName} className="penilaian-input" />
                                    </div>
                                </div>

                                <hr className="penilaian-divider-line" />

                                {/* ✅ PEMBETULAN: Tukar input kepada select dropdown untuk Kategori */}
                                <div className="penilaian-field-group">
                                    <div className="penilaian-input-group">
                                        <label className="penilaian-label">Kategori Risiko:</label>
                                        <select 
                                            name="kategori" 
                                            value={formData.kategori} 
                                            onChange={handleChange} 
                                            className="penilaian-input penilaian-select-dropdown" 
                                            disabled={!canEditPengenalpastian}
                                        >
                                            <option value="">-- Pilih --</option>
                                            <option>Operasi</option>
                                            <option>Kewangan</option>
                                            <option>Strategik</option>
                                            <option>Pematuhan / Perundangan</option>
                                        </select>
                                    </div>
                                    <div className="penilaian-input-group">
                                        <label className="penilaian-label">Bahagian/Unit:</label>
                                        <textarea name="bahagian" value={formData.bahagian} onChange={handleChange} className="penilaian-textarea" style={{ height: '70px' }} disabled={!canEditPengenalpastian} />
                                    </div>
                                </div>

                                <label className="penilaian-label" style={{ marginTop:"12px" }}>Risiko:</label>
                                <textarea name="risiko" value={formData.risiko} onChange={handleChange} className="penilaian-textarea" placeholder="Huraian Risiko" disabled={!canEditPengenalpastian} />

                                {/* Punca */}
                                <div style={{ marginTop:"12px" }}>
                                    <label className="penilaian-label">Punca:</label>
                                    {formData.punca.map((p, idx) => (
                                        <div key={idx} style={{ display:"flex", alignItems:"center", marginBottom:"6px", gap: '8px' }}>
                                            <input 
                                                value={p} 
                                                onChange={(e) => handleListChange('punca', idx, e.target.value)}
                                                className="penilaian-input" 
                                                disabled={!canEditPengenalpastian} 
                                            />
                                            {canEditPengenalpastian && (
                                                <button type="button" onClick={() => handleRemoveListItem('punca', idx)} className="penilaian-close-btn" style={{ background: '#ef4444', color: 'white' }}>X</button>
                                            )}
                                        </div>
                                    ))}
                                    {canEditPengenalpastian && (
                                        <button type="button" onClick={() => handleAddListItem('punca')} className="penilaian-submit-button" style={{ background: '#10b981', marginTop: '5px', padding: '8px 12px' }}>+ Tambah Punca</button>
                                    )}
                                </div>

                                {/* Kesan */}
                                <div style={{ marginTop:"12px" }}>
                                    <label className="penilaian-label">Kesan:</label>
                                    {formData.kesan.map((k, idx) => (
                                        <div key={idx} style={{ display:"flex", alignItems:"center", marginBottom:"6px", gap: '8px' }}>
                                            <input 
                                                value={k} 
                                                onChange={(e) => handleListChange('kesan', idx, e.target.value)}
                                                className="penilaian-input" 
                                                disabled={!canEditPengenalpastian} 
                                            />
                                            {canEditPengenalpastian && (
                                                <button type="button" onClick={() => handleRemoveListItem('kesan', idx)} className="penilaian-close-btn" style={{ background: '#ef4444', color: 'white' }}>X</button>
                                            )}
                                        </div>
                                    ))}
                                    {canEditPengenalpastian && (
                                        <button type="button" onClick={() => handleAddListItem('kesan')} className="penilaian-submit-button" style={{ background: '#10b981', marginTop: '5px', padding: '8px 12px' }}>+ Tambah Kesan</button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="penilaian-button-group">
                            <button type="submit" className="penilaian-submit-button" disabled={isSubmitting || !canEditPengenalpastian}>
                                {isSubmitting ? <span className="penilaian-spinner"></span> : (<><Save size={16} style={{ marginRight: '8px' }}/>Simpan Pengenalpastian</>)}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default PengenalpastianModal;