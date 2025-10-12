import { useState, useEffect } from "react";
import { X, Trash2, Plus } from "lucide-react";
import "./EditRawatan.css";
// Gantikan dengan laluan fail API anda yang betul
import api from "../../api/api"; 

// Komponen Pembantu untuk Memaparkan Senarai Bernombor
const ListDisplay = ({ data }) => {
    if (!data) return <span>-</span>;
    // Semak sama ada data adalah array
    if (Array.isArray(data)) {
        // Semak jika array kosong atau hanya mengandungi string kosong
        if (data.length === 0 || (data.length === 1 && data[0]?.trim() === "")) return <span>-</span>;
        return (
            <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '0' }}>
                {data.map((item, index) => (
                    <li key={index} style={{ marginBottom: '2px', lineHeight: '1.2' }}>
                        <span className="rawatan-data-inline" style={{ display: 'inline' }}>
                            {`${index + 1}. ${item}`}
                        </span>
                    </li>
                ))}
            </ul>
        );
    }
    // Jika bukan array (String), gunakan format biasa
    return <span className="rawatan-data-inline">{data || "-"}</span>;
};


// 💡 Keluarkan subsidiariList dari sini kerana kita menggunakan risk.nama_subsidiari
export default function EditRawatan({ isOpen, risk, onClose, onSave }) { 
    const [formData, setFormData] = useState({
        // Data input rawatan
        planTindakan: [""],
        kakitanganBertanggungjawab: [""],
        jenisKawalan: "",
        tempohSiap: "", 
        // Data risiko (statik)
        risiko_id: null, // Diambil dari prop risk
        rawatan_id: null, // Diisi selepas fetch atau POST
        punca: [], 
        kesan: [],
        status_risiko_desc: "", 
        // ... dan field risiko lain
    });
    const [riskColor, setRiskColor] = useState("#f1f5f9");
    const [saving, setSaving] = useState(false);

    // Fetch data bila modal buka
    useEffect(() => {
        if (isOpen && risk?.risiko_id) {
            // Reset state input untuk borang baru/kosong
            setFormData({
                planTindakan: [""],
                kakitanganBertanggungjawab: [""],
                jenisKawalan: "",
                tempohSiap: "", 
                risiko_id: risk.risiko_id, // Tetapkan ID risiko awal
                rawatan_id: null, // Reset ID rawatan
                punca: [], 
                kesan: [],
                status_risiko_desc: "",
                // Tetapkan data risiko sedia ada (statik)
                ...risk, 
            });

            // Fetch data rawatan (dynamic)
            api
                .get(`/rawatan/${risk.risiko_id}`)
                .then(({ data }) => {
                    // Data (risiko + rawatan) dikembalikan, mungkin rawatan_id adalah null
                    setFormData((prev) => ({
                        ...prev,
                        ...data, // Timpa maklumat risiko statik (risiko, punca, kesan, dll)
                        rawatan_id: data.rawatan_id || null, // PENTING: Jika tiada rawatan, set kepada null
                        planTindakan: Array.isArray(data.plan_tindakan) && data.plan_tindakan.length > 0 ? data.plan_tindakan : [""],
                        jenisKawalan: data.jenis_kawalan || "",
                        tempohSiap: data.tempoh_jangkaan_siap || "",
                        kakitanganBertanggungjawab:
                            Array.isArray(data.kakitangan_bertanggungjawab) && data.kakitangan_bertanggungjawab.length > 0
                                ? data.kakitangan_bertanggungjawab
                                : [""],
                        punca: data.punca || [], 
                        kesan: data.kesan || [], 
                    }));
                })
                .catch((err) => {
                    // Jika 404 (Risiko wujud, tetapi rawatan tidak wujud), biarkan state seperti yang di-reset di atas.
                    if (err.response?.status === 404) {
                        console.log(`Risiko ${risk.risiko_id} ditemui, tetapi tiada rawatan sedia ada. Mod Tambah Baru.`);
                    } else {
                        console.error("❌ Gagal fetch rawatan:", err);
                    }
                });
        }
    }, [isOpen, risk]);

    // Risk Matrix data (Kekal sama)
    const riskMatrix = {
        1: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Rendah", color: "#14b8a6" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
        2: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Rendah", color: "#14b8a6" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
        3: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Tinggi", color: "#f97316" } },
        4: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
        5: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Tinggi", color: "#f97316" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Sangat Tinggi", color: "#ef4444" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
    };

    const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "", color: "#f1f5f9" };

    // Update warna tahap risiko automatik (Kekal sama)
    useEffect(() => {
        const k = parseInt(formData.skor_kebarangkalian);
        const i = parseInt(formData.skor_impak);
        
        let status = "";
        let statusDesc = "";

        if (k && i) {
            const { label, color } = getRiskMatrix(k, i);
            
            status = label === "Rendah" ? "Tidak" : "Ya";
            statusDesc = status === "Ya" ? "Risiko memerlukan tindakan" : "Risiko rendah - tiada tindakan";

            setFormData((prev) => ({
                ...prev,
                skor_risiko: k * i,
                tahap_risiko: label,
                status_risiko: status,
                status_risiko_desc: statusDesc, // Simpan description
            }));
            setRiskColor(color);
        } else {
            setFormData((prev) => ({
                ...prev,
                skor_risiko: "",
                tahap_risiko: "",
                status_risiko: "",
                status_risiko_desc: "",
            }));
            setRiskColor("#f1f5f9");
        }
    }, [formData.skor_kebarangkalian, formData.skor_impak]);

    // ** FUNGSI HANDLE SAVE UTAMA (LOGIK UPSERT) **
    const handleSave = async () => {
        // 1. Bersihkan array: buang string kosong
        const cleanedPlanTindakan = formData.planTindakan.filter(p => p.trim() !== "");
        const cleanedKakitangan = formData.kakitanganBertanggungjawab.filter(k => k.trim() !== "");

        // 2. Tentukan sama ada ia adalah KEMASKINI (PUT) atau TAMBAH (POST)
        const isUpdate = !!formData.rawatan_id; 

        // 3. Semak Validasi Minimum untuk TAMBAH BARU
        if (!isUpdate && (!formData.jenisKawalan || cleanedPlanTindakan.length === 0)) {
            alert("Sila masukkan sekurang-kurangnya satu Plan Tindakan dan pilih Jenis Kawalan.");
            return;
        }

        // 4. Bina Payload
        const payload = {
            // risiko_id hanya digunakan oleh endpoint POST
            risiko_id: formData.risiko_id, 
            
            plan_tindakan: cleanedPlanTindakan, 
            jenis_kawalan: formData.jenisKawalan,
            // Kunci yang seragam digunakan untuk kedua-dua POST dan PUT endpoint
            tempoh_jangkaan_siap: formData.tempohSiap, 

            kakitangan_bertanggungjawab: cleanedKakitangan,
        };

        // 5. Tentukan URL dan Method
        const url = isUpdate ? `/rawatan/${formData.rawatan_id}` : "/rawatan";
        const method = isUpdate ? 'put' : 'post';

        try {
            setSaving(true);
            
            // Lakukan request (POST atau PUT)
            const response = await api[method](url, payload);
            
            let finalRawatanId = formData.rawatan_id;

            // Jika POST berjaya, ambil rawatan_id baru dari response.
            if (!isUpdate && response.data?.rawatan_id) {
                finalRawatanId = response.data.rawatan_id;
                // Update state supaya jika user tekan save kali kedua, ia akan jadi PUT
                setFormData(prev => ({ ...prev, rawatan_id: finalRawatanId })); 
            }

            // Panggil onSave untuk mengemaskini paparan utama (table)
            onSave({ 
                ...risk, 
                ...formData, 
                rawatan_id: finalRawatanId, // Gunakan ID baru/sedia ada
                jenis_kawalan: formData.jenisKawalan,
                tempoh_jangkaan_siap: formData.tempohSiap,
                plan_tindakan: cleanedPlanTindakan,
                kakitangan_bertanggungjawab: cleanedKakitangan,
                risk_color: riskColor 
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
        <div className="rawatan-modal-overlay">
            <div className="rawatan-modal-container">
                {/* Header Modal */}
                <div className="rawatan-box-header-main">
                    <span>{formData.rawatan_id ? "Kemaskini Rawatan Risiko" : "Tambah Rawatan Risiko Baru"}</span>
                    <button className="rawatan-close-btn" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSave();
                    }}
                >
                    {/* 1. Maklumat Risiko */}
                    {/* ... (Bahagian Maklumat Risiko Kekal Sama) ... */}
                    <div className="rawatan-box">
                        <div className="rawatan-box-header">Maklumat Risiko</div>
                        <div className="rawatan-flex-row">
                            <div className="rawatan-flex-item">
                                <span className="rawatan-label-inline">No Rujukan:</span>
                                <span className="rawatan-data-inline">{formData.no_rujukan || "-"}</span>
                            </div>
                            <div className="rawatan-flex-item">
                                <span className="rawatan-label-inline">Tahun:</span>
                                <span className="rawatan-data-inline">{formData.tahun || "-"}</span>
                            </div>
                            <div className="rawatan-flex-item">
                                <span className="rawatan-label-inline">Separuh Tahun:</span>
                                <span className="rawatan-data-inline">
                                    {formData.separuh_tahun === 1 ? "Pertama" : formData.separuh_tahun === 2 ? "Kedua" : "-"}
                                </span>
                            </div>
                            <div className="rawatan-flex-item">
                                <span className="rawatan-label-inline">Subsidiari:</span>
                                <span className="rawatan-data-inline">{formData.nama_subsidiari || "-"}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* 2. Pengenalpastian Risiko (Termasuk Punca & Kesan) */}
                    {/* ... (Bahagian Pengenalpastian Risiko Kekal Sama) ... */}
                    <div className="rawatan-box">
                        <div className="rawatan-box-header">Pengenalpastian Risiko</div>
                        <div className="rawatan-flex-row">
                            <div className="rawatan-flex-item">
                                <span className="rawatan-label-inline">Kategori Risiko:</span>
                                <span className="rawatan-data-inline">{formData.kategori || "-"}</span>
                            </div>
                            <div className="rawatan-flex-item">
                                <span className="rawatan-label-inline">Bahagian/Unit:</span>
                                <span className="rawatan-data-inline">{formData.bahagian || "-"}</span>
                            </div>
                            <div className="rawatan-flex-item" style={{ flex: "1 1 100%" }}>
                                <span className="rawatan-label-inline">Risiko:</span>
                                <span className="rawatan-data-inline">{formData.risiko || "-"}</span>
                            </div>
                        </div>

                        {/* Punca & Kesan Risiko Bersebelahan */}
                        <div className="rawatan-flex-row" style={{ marginTop: '10px' }}>
                            <div className="rawatan-flex-item" style={{ flex: "1 1 45%" }}>
                                <span className="rawatan-label-inline">Punca Risiko:</span>
                                <ListDisplay data={formData.punca} />
                            </div>
                            <div className="rawatan-flex-item" style={{ flex: "1 1 45%" }}>
                                <span className="rawatan-label-inline">Kesan Risiko:</span>
                                <ListDisplay data={formData.kesan} />
                            </div>
                        </div>
                    </div>
                    
                    {/* 3. Penilaian Risiko */}
                    {/* ... (Bahagian Penilaian Risiko Kekal Sama) ... */}
                    <div className="rawatan-box">
                        <div className="rawatan-box-header">Penilaian Risiko</div>
                        
                        {/* Baris Pertama: Skor & Tahap */}
                        <div className="rawatan-flex-row rawatan-score-row">
                            
                            {/* Kotak 1: Skor Kebarangkalian */}
                            <div className="rawatan-score-card">
                                <span className="rawatan-score-label">Skor Kebarangkalian</span>
                                <span className="rawatan-score-data">{formData.skor_kebarangkalian || "-"}</span>
                            </div>
                            
                            {/* Kotak 2: Skor Impak */}
                            <div className="rawatan-score-card">
                                <span className="rawatan-score-label">Skor Impak</span>
                                <span className="rawatan-score-data">{formData.skor_impak || "-"}</span>
                            </div>
                            
                            {/* Kotak 3: Tahap Risiko */}
                            <div className="rawatan-score-card">
                                <span className="rawatan-score-label">Tahap Risiko</span>
                                <span className="rawatan-score-data rawatan-risk-score-text" 
                                    style={{ backgroundColor: riskColor }}
                                    data-level={formData.tahap_risiko}
                                >
                                    {formData.tahap_risiko || "-"}
                                </span>
                            </div>
                        </div>

                        {/* Baris Kedua: Status Risiko (Satu Baris Penuh) */}
                        <div className="rawatan-flex-row" style={{ paddingTop: '0', paddingBottom: '15px' }}>
                            <div className="rawatan-flex-item" style={{ flex: "1 1 100%", marginTop: '8px' }}>
                                <span className="rawatan-label-inline">Status Risiko:</span>
                                <span className="rawatan-status-tag" data-status={formData.status_risiko}>
                                    {formData.status_risiko || "-"}
                                </span>
                                <span className="rawatan-status-desc" data-status={formData.status_risiko}>
                                    ({formData.status_risiko_desc || "-"})
                                </span>
                            </div>
                        </div>

                    </div>


                    {/* 4. Rawatan Risiko (Form Input) */}
                    {/* ... (Bahagian Rawatan Risiko Kekal Sama) ... */}
                    <div className="rawatan-box">
                        <div className="rawatan-box-header">Rawatan Risiko</div>
                        <div style={{ padding: "10px 16px 16px 16px" }}>
                            {/* Plan Tindakan */}
                            <div style={{ marginBottom: "12px" }}>
                                <label className="rawatan-label">Plan Tindakan:</label>
                                {formData.planTindakan.map((p, idx) => (
                                    <div key={idx} className="rawatan-dynamic-row">
                                        <input
                                            value={p}
                                            onChange={(e) => {
                                                const newList = [...formData.planTindakan];
                                                newList[idx] = e.target.value;
                                                setFormData((prev) => ({ ...prev, planTindakan: newList }));
                                            }}
                                            placeholder={`Plan Tindakan ${idx + 1}`}
                                            className="rawatan-input"
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
                                                className="rawatan-button-circle rawatan-button-remove"
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
                                                className="rawatan-button-circle rawatan-button-add"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Jenis Kawalan */}
                            <div style={{ marginBottom: "12px" }}>
                                <label className="rawatan-label">Jenis Kawalan:</label>
                                <select
                                    value={formData.jenisKawalan || ""}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, jenisKawalan: e.target.value }))}
                                    className="rawatan-select"
                                >
                                    <option value="">-- Pilih Jenis Kawalan --</option>
                                    <option value="Terima">Terima – Menyediakan pelan</option>
                                    <option value="Kurang">Kurang – Mengurangkan kebarangkalian / impak risiko</option>
                                    <option value="Pindah">Pindah – Pindahkan risiko kepada pihak ketiga</option>
                                    <option value="Elak">Elak – Hentikan atau ubah aktiviti yang menyebabkan risiko</option>
                                </select>
                            </div>

                            {/* Tempoh Jangkaan Siap */}
                            <div style={{ marginBottom: "12px" }}>
                                <label className="rawatan-label">Tempoh Jangkaan Siap:</label>
                                <input
                                    type="text" 
                                    value={formData.tempohSiap || ""}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, tempohSiap: e.target.value }))}
                                    className="rawatan-input"
                                    placeholder="Cth: 2 bulan / 31 Dis 2024"
                                />
                            </div>

                            {/* Kakitangan Bertanggungjawab */}
                            <div style={{ marginBottom: "12px" }}>
                                <label className="rawatan-label">Kakitangan Bertanggungjawab:</label>
                                {formData.kakitanganBertanggungjawab.map((s, idx) => (
                                    <div key={idx} className="rawatan-dynamic-row">
                                        <input
                                            value={s}
                                            onChange={(e) => {
                                                const newList = [...formData.kakitanganBertanggungjawab];
                                                newList[idx] = e.target.value;
                                                setFormData((prev) => ({ ...prev, kakitanganBertanggungjawab: newList }));
                                            }}
                                            placeholder={`Kakitangan ${idx + 1}`}
                                            className="rawatan-input"
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
                                                className="rawatan-button-circle rawatan-button-remove"
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
                                                className="rawatan-button-circle rawatan-button-add"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            {/* Butang Simpan */}
                            <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                <button 
                                    type="submit" 
                                    className="rawatan-save-btn"
                                    disabled={saving}
                                >
                                    {saving ? 'Menyimpan...' : (formData.rawatan_id ? 'Simpan Kemas Kini' : 'Tambah Rawatan')}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}