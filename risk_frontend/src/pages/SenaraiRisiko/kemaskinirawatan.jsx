import { useState, useEffect } from "react";
import { X, Trash2, Plus, Save } from "lucide-react"; 
import "./kemaskinirawatan.css";
import api from "../../api/api"; 

export default function KemaskiniRawatan({ isOpen, risk, onClose }) { 
    const [formData, setFormData] = useState({
        planTindakan: [""],
        kakitanganBertanggungjawab: [""],
        jenisKawalan: "",
        tempohSiap: "", 
        risiko_id: null, 
        rawatan_id: null, 
    });
    const [saving, setSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    useEffect(() => {
        if (!isOpen || !risk?.risiko_id) {
            console.log("❌ Modal tidak buka atau tiada risiko_id");
            return;
        }

        console.log("🔍 Fetching rawatan data for risiko_id:", risk.risiko_id);

        const fetchRawatanData = async () => {
            setIsLoadingData(true);
            
            try {
                const response = await api.get(`/risiko/${risk.risiko_id}/rawatan`);
                console.log("✅ Rawatan data fetched:", response.data);
                
                if (response.data && response.data.rawatan_id) {
                    const rawatanData = response.data;
                    
                    setFormData({
                        risiko_id: risk.risiko_id,
                        rawatan_id: rawatanData.rawatan_id,
                        planTindakan: Array.isArray(rawatanData.plan_tindakan) && rawatanData.plan_tindakan.length > 0 
                            ? rawatanData.plan_tindakan
                            : [""],
                        jenisKawalan: rawatanData.jenis_kawalan || "",
                        tempohSiap: rawatanData.tempoh_jangkaan_siap || "",
                        kakitanganBertanggungjawab: Array.isArray(rawatanData.kakitangan_bertanggungjawab) && rawatanData.kakitangan_bertanggungjawab.length > 0
                            ? rawatanData.kakitangan_bertanggungjawab
                            : [""],
                    });
                    
                    console.log("✅ Form data set:", {
                        rawatan_id: rawatanData.rawatan_id,
                        planTindakan: rawatanData.plan_tindakan,
                        jenisKawalan: rawatanData.jenis_kawalan
                    });
                } else {
                    throw new Error("Rawatan tidak dijumpai");
                }
                
            } catch (err) {
                console.warn("⚠️ Rawatan tidak dijumpai:", err.message);
                alert("⚠️ Rawatan risiko belum wujud. Sila tambah rawatan terlebih dahulu.");
                onClose(false);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchRawatanData();
    }, [isOpen, risk, onClose]);

    const handleSave = async () => {
        const cleanedPlanTindakan = formData.planTindakan.filter(p => p.trim() !== "");
        const cleanedKakitangan = formData.kakitanganBertanggungjawab.filter(k => k.trim() !== "");

        if (!formData.rawatan_id) {
            alert("⚠️ Ralat: Rawatan ID tidak dijumpai. Sila tutup modal dan cuba lagi.");
            return;
        }

        if (
            cleanedPlanTindakan.length === 0 || 
            cleanedKakitangan.length === 0 || 
            !formData.jenisKawalan || 
            !formData.tempohSiap
        ) {
            alert("Sila lengkapkan semua medan wajib.");
            return;
        }

        const payload = {
            plan_tindakan: cleanedPlanTindakan, 
            jenis_kawalan: formData.jenisKawalan,
            tempoh_jangkaan_siap: formData.tempohSiap, 
            kakitangan_bertanggungjawab: cleanedKakitangan,
        };

        const url = `/risiko/${formData.risiko_id}/rawatan`;

        console.log(`🔄 Updating rawatan:`, { url, payload });

        try {
            setSaving(true);
            
            await api.put(url, payload);
            
            console.log("✅ Rawatan saved successfully");
            
            alert(`✅ Rawatan risiko berjaya dikemaskini!`);
            
            onClose(true);
            
        } catch (err) {
            console.error("❌ Gagal menyimpan rawatan:", err.response?.data || err.message);
            alert(`⚠️ Gagal menyimpan perubahan. ${err.response?.data?.message || 'Sila cuba lagi.'}`);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    if (isLoadingData) {
        return (
            <div className="kemaskini-rawatan-modal-overlay">
                <div className="kemaskini-rawatan-modal-container">
                    <div className="kemaskini-rawatan-box-header-main">
                        <span>Memuat data...</span>
                    </div>
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div className="spinner"></div>
                        <p>Sila tunggu...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="kemaskini-rawatan-modal-overlay">
            <div className="kemaskini-rawatan-modal-container">
                <div className="kemaskini-rawatan-box-header-main">
                    <span>Kemaskini Rawatan Risiko</span>
                    <button className="kemaskini-rawatan-close-btn" onClick={() => onClose(false)} aria-label="Tutup Borang">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="kemaskini-rawatan-box kemaskini-rawatan-form-section" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
                        <div style={{ padding: "0 18px 18px 18px" }}> 
                            
                            <div style={{ marginBottom: "16px" }}>
                                <label className="kemaskini-rawatan-label kemaskini-rawatan-label-required">Pelan Tindakan:</label>
                                {formData.planTindakan.map((p, idx) => (
                                    <div key={`plan-${idx}`} className="kemaskini-rawatan-dynamic-row">
                                        <input
                                            value={p}
                                            onChange={(e) => {
                                                const newList = [...formData.planTindakan];
                                                newList[idx] = e.target.value;
                                                setFormData((prev) => ({ ...prev, planTindakan: newList }));
                                            }}
                                            placeholder={`Langkah Tindakan ${idx + 1}`}
                                            className="kemaskini-rawatan-input"
                                            required={idx === 0} 
                                        />
                                        {formData.planTindakan.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        planTindakan: prev.planTindakan.filter((_, i) => i !== idx),
                                                    }))
                                                }
                                                className="kemaskini-rawatan-button-circle kemaskini-rawatan-button-remove"
                                                aria-label="Buang Plan Tindakan"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        {idx === formData.planTindakan.length - 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        planTindakan: [...prev.planTindakan, ""],
                                                    }))
                                                }
                                                className="kemaskini-rawatan-button-circle kemaskini-rawatan-button-add" 
                                                aria-label="Tambah Plan Tindakan"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                <label className="kemaskini-rawatan-label kemaskini-rawatan-label-required">Jenis Kawalan:</label>
                                <select
                                    value={formData.jenisKawalan || ""}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, jenisKawalan: e.target.value }))}
                                    className="kemaskini-rawatan-select"
                                    required
                                >
                                    <option value="">-- Pilih Strategi Kawalan --</option>
                                    <option value="Terima">Terima – Menerima risiko </option>
                                    <option value="Kurang">Kurang – Mengurangkan kebarangkalian dan impak risiko</option>
                                    <option value="Pindah">Pindah – Pindahkan risiko </option>
                                    <option value="Elak">Elak – Berhenti menjalankan aktiviti / program atau mengubah objektif aktiviti yang boleh menyebabkan risiko</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                <label className="kemaskini-rawatan-label kemaskini-rawatan-label-required">Tempoh Jangkaan Siap Tindakan:</label>
                                <input
                                    type="text" 
                                    value={formData.tempohSiap || ""}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, tempohSiap: e.target.value }))}
                                    className="kemaskini-rawatan-input"
                                    placeholder="Cth: 2 bulan"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label className="kemaskini-rawatan-label kemaskini-rawatan-label-required">Kakitangan Bertanggungjawab:</label> 
                                {formData.kakitanganBertanggungjawab.map((s, idx) => (
                                    <div key={`kakitangan-${idx}`} className="kemaskini-rawatan-dynamic-row">
                                        <input
                                            value={s}
                                            onChange={(e) => {
                                                const newList = [...formData.kakitanganBertanggungjawab];
                                                newList[idx] = e.target.value;
                                                setFormData((prev) => ({ ...prev, kakitanganBertanggungjawab: newList }));
                                            }}
                                            placeholder={`Nama kakitangan / jawatan ${idx + 1}`}
                                            className="kemaskini-rawatan-input"
                                            required={idx === 0} 
                                        />
                                        {formData.kakitanganBertanggungjawab.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        kakitanganBertanggungjawab: prev.kakitanganBertanggungjawab.filter((_, i) => i !== idx),
                                                    }))
                                                }
                                                className="kemaskini-rawatan-button-circle kemaskini-rawatan-button-remove"
                                                aria-label="Buang Kakitangan"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        {idx === formData.kakitanganBertanggungjawab.length - 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        kakitanganBertanggungjawab: [...prev.kakitanganBertanggungjawab, ""],
                                                    }))
                                                }
                                                className="kemaskini-rawatan-button-circle kemaskini-rawatan-button-add" 
                                                aria-label="Tambah Kakitangan"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="kemaskini-rawatan-save-btn-wrapper">
                                <button
                                    type="submit"
                                    className="kemaskini-rawatan-save-btn-dark-blue" 
                                    disabled={saving}
                                >
                                    {saving ? "Menyimpan..." : (
                                        <>
                                            <Save size={18} style={{ marginRight: '8px' }} />
                                            Simpan Rawatan
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}