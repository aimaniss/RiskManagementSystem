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

    // ✅ PEMBETULAN: Fetch data rawatan existing dengan betul
    useEffect(() => {
        if (!isOpen || !risk?.risiko_id) {
            console.log("❌ Modal tidak buka atau tiada risiko_id");
            return;
        }

        console.log("🔍 Fetching rawatan data for risiko_id:", risk.risiko_id);
        console.log("📦 Risk data received:", risk);

        const fetchRawatanData = async () => {
            setIsLoadingData(true);
            
            try {
                // Cuba fetch rawatan berdasarkan risiko_id
                const response = await api.get(`/rawatan/risiko/${risk.risiko_id}`);
                console.log("✅ Rawatan data fetched:", response.data);
                
                if (response.data && response.data.rawatan_id) {
                    // Data rawatan wujud - KEMASKINI MODE
                    const rawatanData = response.data;
                    
                    setFormData({
                        risiko_id: risk.risiko_id,
                        rawatan_id: rawatanData.rawatan_id,
                        planTindakan: Array.isArray(rawatanData.plan_tindakan) && rawatanData.plan_tindakan.length > 0 
                            ? rawatanData.plan_tindakan.map(p => typeof p === 'string' ? p : (p.pelan_tindakan || p.butiran_aktiviti || ""))
                            : [""],
                        jenisKawalan: rawatanData.jenis_kawalan || "",
                        tempohSiap: rawatanData.tempoh_jangkaan_siap || rawatanData.tempoh_siap || "",
                        kakitanganBertanggungjawab: Array.isArray(rawatanData.kakitangan_bertanggungjawab) && rawatanData.kakitangan_bertanggungjawab.length > 0
                            ? rawatanData.kakitangan_bertanggungjawab.map(k => typeof k === 'string' ? k : (k.nama_kakitangan || k.butiran_kakitangan || ""))
                            : [""],
                    });
                    
                    console.log("✅ Form data set (KEMASKINI MODE):", {
                        rawatan_id: rawatanData.rawatan_id,
                        planTindakan: rawatanData.plan_tindakan,
                        jenisKawalan: rawatanData.jenis_kawalan
                    });
                } else {
                    throw new Error("Rawatan tidak dijumpai");
                }
                
            } catch (err) {
                console.warn("⚠️ Rawatan tidak dijumpai atau ralat fetch:", err.message);
                
                // ✅ PEMBETULAN: Gunakan data dari props jika fetch gagal
                if (risk.plan_tindakan || risk.jenis_kawalan) {
                    console.log("📋 Using data from risk props");
                    setFormData({
                        risiko_id: risk.risiko_id,
                        rawatan_id: risk.rawatan_id || null,
                        planTindakan: Array.isArray(risk.plan_tindakan) && risk.plan_tindakan.length > 0 
                            ? risk.plan_tindakan.map(p => typeof p === 'string' ? p : (p.text || p.butiran_aktiviti || ""))
                            : [""],
                        jenisKawalan: risk.jenis_kawalan || "",
                        tempohSiap: risk.tempoh_jangkaan_siap || "",
                        kakitanganBertanggungjawab: Array.isArray(risk.kakitangan_bertanggungjawab) && risk.kakitangan_bertanggungjawab.length > 0
                            ? risk.kakitangan_bertanggungjawab.map(k => typeof k === 'string' ? k : (k.text || k.butiran_kakitangan || ""))
                            : [""],
                    });
                } else {
                    // Mode TAMBAH BARU
                    console.log("➕ TAMBAH BARU MODE - no existing data");
                    setFormData({
                        risiko_id: risk.risiko_id,
                        rawatan_id: null,
                        planTindakan: [""],
                        kakitanganBertanggungjawab: [""],
                        jenisKawalan: "",
                        tempohSiap: "",
                    });
                }
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchRawatanData();
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

        console.log(`🔄 ${isUpdate ? 'Updating' : 'Creating'} rawatan:`, { url, payload });

        try {
            setSaving(true);
            
            const response = await api[method](url, payload);
            
            console.log("✅ Rawatan saved successfully:", response.data);
            
            alert(`✅ Rawatan risiko berjaya di${isUpdate ? 'kemaskini' : 'tambah'}!`);
            
            // ✅ PEMBETULAN: Trigger refresh dengan passing true
            onClose(true);
            
        } catch (err) {
            console.error("❌ Gagal menyimpan rawatan:", err.response?.data || err.message);
            alert(`⚠️ Gagal menyimpan perubahan. ${err.response?.data?.message || 'Sila cuba lagi.'}`);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    // ✅ PEMBETULAN: Loading state
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
                {/* ✅ PEMBETULAN: Header dinamik berdasarkan mode */}
                <div className="kemaskini-rawatan-box-header-main">
                    <span>{formData.rawatan_id ? "Kemaskini Rawatan Risiko" : "Tambah Rawatan Risiko Baru"}</span>
                    <button className="kemaskini-rawatan-close-btn" onClick={() => onClose(false)} aria-label="Tutup Borang">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="kemaskini-rawatan-box kemaskini-rawatan-form-section" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
                        <div style={{ padding: "0 18px 18px 18px" }}> 
                            
                            {/* Plan Tindakan */}
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

                            {/* Jenis Kawalan */}
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

                            {/* Tempoh Siap */}
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

                            {/* Kakitangan */}
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

                            {/* Butang Simpan */}
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