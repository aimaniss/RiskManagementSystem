import { useState, useEffect } from "react";
import { X, Trash2, Plus, Save } from "lucide-react"; 
import "./kemaskinirawatan.css"; // CSS baru (sudah disemak)
// Gantikan dengan laluan fail API anda yang betul
import api from "../../api/api"; 


// Gunakan nama komponen baru
export default function KemaskiniRawatan({ isOpen, risk, onClose, onSave }) { 
    // risk seharusnya mengandungi: { risiko_id: 123, rawatan_id: null | 456, ... }
    const [formData, setFormData] = useState({
        // Data input rawatan
        planTindakan: [""],
        kakitanganBertanggungjawab: [""],
        jenisKawalan: "",
        tempohSiap: "", 
        // Data ID untuk API
        risiko_id: null, 
        rawatan_id: null, 
    });
    const [saving, setSaving] = useState(false);

    // Fetch data rawatan sedia ada bila modal buka
    useEffect(() => {
        if (!isOpen || !risk?.risiko_id) return; 

        // Set ID risiko dan rawatan awal
        setFormData((prev) => ({
            ...prev,
            risiko_id: risk.risiko_id, 
            rawatan_id: risk.rawatan_id || null, 
        }));

        // Jika rawatan_id wujud, cuba fetch data sedia ada
        if (risk.rawatan_id) {
            api
                .get(`/rawatan/${risk.rawatan_id}`)
                .then(({ data }) => {
                    setFormData((prev) => ({
                        ...prev,
                        rawatan_id: data.rawatan_id || risk.rawatan_id, 
                        planTindakan: Array.isArray(data.plan_tindakan) && data.plan_tindakan.length > 0 ? data.plan_tindakan : [""],
                        jenisKawalan: data.jenis_kawalan || "",
                        tempohSiap: data.tempoh_jangkaan_siap || "",
                        kakitanganBertanggungjawab:
                            Array.isArray(data.kakitangan_bertanggungjawab) && data.kakitangan_bertanggungjawab.length > 0
                                ? data.kakitangan_bertanggungjawab
                                : [""],
                    }));
                })
                .catch((err) => {
                    if (err.response?.status !== 404) {
                        console.error("❌ Gagal fetch rawatan sedia ada:", err);
                    }
                });
        } else {
             // Reset form jika tiada Rawatan ID
             setFormData((prev) => ({
                ...prev,
                planTindakan: [""],
                kakitanganBertanggungjawab: [""],
                jenisKawalan: "",
                tempohSiap: "", 
             }));
        }
    }, [isOpen, risk]);

    
    const handleSave = async () => {
        const cleanedPlanTindakan = formData.planTindakan.filter(p => p.trim() !== "");
        const cleanedKakitangan = formData.kakitanganBertanggungjawab.filter(k => k.trim() !== "");

        const isUpdate = !!formData.rawatan_id; 

        if (
            cleanedPlanTindakan.length === 0 || 
            cleanedKakitangan.length === 0 || 
            !formData.jenisKawalan || 
            !formData.tempohSiap
        ) {
            alert("Sila lengkapkan semua medan wajib (Plan Tindakan, Kakitangan, Jenis Kawalan, Tempoh Siap).");
            return;
        }

        const payload = {
            risiko_id: formData.risiko_id, 
            plan_tindakan: cleanedPlanTindakan, 
            jenis_kawalan: formData.jenisKawalan,
            tempoh_jangkaan_siap: formData.tempohSiap, 
            kakitangan_bertanggungjawab: cleanedKakitangan,
        };

        const url = isUpdate ? `/rawatan/${formData.rawatan_id}` : "/rawatan";
        const method = isUpdate ? 'put' : 'post';

        try {
            setSaving(true);
            
            const response = await api[method](url, payload);
            
            let finalRawatanId = isUpdate ? formData.rawatan_id : response.data?.rawatan_id;

            onSave({ 
                ...risk, // Pastikan data risiko lain dikembalikan
                rawatan_id: finalRawatanId, 
                jenis_kawalan: formData.jenisKawalan,
                tempoh_jangkaan_siap: formData.tempohSiap,
                plan_tindakan: cleanedPlanTindakan,
                kakitangan_bertanggungjawab: cleanedKakitangan,
            });

            onClose();
            alert(`Rawatan risiko berjaya di${isUpdate ? 'kemaskini' : 'tambah'}!`);
        } catch (err) {
            console.error("❌ Gagal menyimpan rawatan:", err.response?.data?.message || err.message);
            alert(`Gagal menyimpan perubahan. ${err.response?.data?.message || 'Sila cuba lagi.'}`);
        } finally {
            setSaving(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="kemaskini-rawatan-modal-overlay">
            <div className="kemaskini-rawatan-modal-container">
                {/* Header Modal */}
                <div className="kemaskini-rawatan-box-header-main">
                    <span>{formData.rawatan_id ? "Kemaskini Rawatan Risiko" : "Tambah Rawatan Risiko Baru"}</span>
                    <button className="kemaskini-rawatan-close-btn" onClick={onClose} aria-label="Tutup Borang">
                        <X size={16} />
                    </button>
                </div>

                {/* Form Body */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSave();
                    }}
                >
                    {/* 1. Rawatan Risiko (Form Input) - FOKUS UTAMA MODAL INI */}
                    <div className="kemaskini-rawatan-box kemaskini-rawatan-form-section" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
                        
                        {/* Header Box dibuang, ganti dengan padding di box body */}
                        <div style={{ padding: "0 18px 18px 18px" }}> 
                            
                            {/* Plan Tindakan - Dynamic Input List */}
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

                            {/* Jenis Kawalan - Select */}
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

                            {/* Tempoh Jangkaan Siap - Input Text */}
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

                            {/* Kakitangan Bertanggungjawab - Dynamic Input List */}
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

                            {/* Butang Simpan (Biru Pekat) */}
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