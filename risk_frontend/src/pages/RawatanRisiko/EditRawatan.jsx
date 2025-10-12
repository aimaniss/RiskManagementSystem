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
        planTindakan: [""],
        kakitanganBertanggungjawab: [""],
        jenisKawalan: "",
        tempohSiap: "",
        punca: [], // Default array kosong
        kesan: [], // Default array kosong
        // Tambah key baru untuk menyimpan description status risiko
        status_risiko_desc: "", 
    });
    const [riskColor, setRiskColor] = useState("#f1f5f9");
    const [saving, setSaving] = useState(false);

    // Fetch data bila modal buka
    useEffect(() => {
        if (isOpen && risk?.risiko_id) {
            // Set data risiko sedia ada (static)
            setFormData(prev => ({ 
                ...prev, 
                ...risk, 
                // Pastikan key yang betul dari risk object diambil
                skor_kebarangkalian: risk.skor_kebarangkalian,
                skor_impak: risk.skor_impak,
                tahap_risiko: risk.tahap_risiko
            }));

            // Fetch data rawatan (dynamic)
            api
                .get(`/rawatan/${risk.risiko_id}`)
                .then(({ data }) => {
                    setFormData((prev) => ({
                        ...prev,
                        rawatan_id: data.rawatan_id, // Penting untuk PUT request
                        // Update subsidiari_id dan nama_subsidiari
                        subsidiari_id: data.subsidiari_id || prev.subsidiari_id,
                        nama_subsidiari: data.nama_subsidiari || prev.nama_subsidiari, 
                        // Pastikan ia adalah array, jika tidak, set kepada [""]
                        planTindakan: Array.isArray(data.plan_tindakan) && data.plan_tindakan.length > 0 ? data.plan_tindakan : [""],
                        jenisKawalan: data.jenis_kawalan || "",
                        tempohSiap: data.tempoh_jangkaan_siap || "",
                        kakitanganBertanggungjawab:
                            Array.isArray(data.kakitangan_bertanggungjawab) && data.kakitangan_bertanggungjawab.length > 0
                                ? data.kakitangan_bertanggungjawab
                                : [""],
                        punca: data.punca || [], // <-- DATA PUNCA
                        kesan: data.kesan || [], // <-- DATA KESAN
                    }));
                })
                .catch((err) => console.error("❌ Gagal fetch rawatan:", err));
        }
    }, [isOpen, risk]);

    // Risk Matrix data
    const riskMatrix = {
        1: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Rendah", color: "#14b8a6" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
        2: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Rendah", color: "#14b8a6" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
        3: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Tinggi", color: "#f97316" } },
        4: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
        5: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Tinggi", color: "#f97316" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Sangat Tinggi", color: "#ef4444" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
    };

    const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "", color: "#f1f5f9" };

    // Update warna tahap risiko automatik
    useEffect(() => {
        const k = parseInt(formData.skor_kebarangkalian);
        const i = parseInt(formData.skor_impak);
        
        let status = "";
        let statusDesc = "";

        if (k && i) {
            const { label, color } = getRiskMatrix(k, i);
            
            status = label === "Rendah" ? "Tidak" : "Ya";
            // LOGIK DESCRIPTION BARU
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

    // Save function (tiada perubahan diperlukan pada logik ini)
    const handleSave = async () => {
        // Semak jika rawatan_id wujud (diperolehi dari fetch rawatan)
        if (!formData.rawatan_id) {
            alert("Ralat: ID rawatan tidak ditemui. Tidak dapat menyimpan.");
            return;
        }

        // 1. Bersihkan array: buang string kosong dari planTindakan dan kakitanganBertanggungjawab
        const cleanedPlanTindakan = formData.planTindakan.filter(p => p.trim() !== "");
        const cleanedKakitangan = formData.kakitanganBertanggungjawab.filter(k => k.trim() !== "");

        // 2. Data payload untuk API
        const payload = {
            plan_tindakan: cleanedPlanTindakan, 
            jenis_kawalan: formData.jenisKawalan,
            tempoh_jangkaan_siap: formData.tempohSiap,
            kakitangan_bertanggungjawab: cleanedKakitangan,
        };

        try {
            setSaving(true);
            
            // Lakukan PUT request menggunakan rawatan_id
            await api.put(`/rawatan/${formData.rawatan_id}`, payload);
            
            // Panggil onSave dengan data yang dikemaskini
            onSave({ 
                ...risk, 
                ...formData, 
                plan_tindakan: cleanedPlanTindakan,
                kakitangan_bertanggungjawab: cleanedKakitangan,
                risk_color: riskColor 
            });

            onClose();
        } catch (err) {
            console.error("❌ Gagal update rawatan:", err);
            alert("Gagal menyimpan perubahan. Sila cuba lagi.");
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
                    <span>Kemaskini Rawatan Risiko</span>
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
                            {/* SUBSIDIARI - Disemak semula untuk memastikan ia tidak ke bawah */}
                            <div className="rawatan-flex-item">
                                <span className="rawatan-label-inline">Subsidiari:</span>
                                <span className="rawatan-data-inline">{formData.nama_subsidiari || "-"}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* 2. Pengenalpastian Risiko (Termasuk Punca & Kesan) */}
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
                    
                    {/* 3. Penilaian Risiko - Perubahan Struktur Utama di sini */}
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


                    {/* 4. Rawatan Risiko (Form Input) - Kekal Sama */}
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
                                    type="text" // Diubah kepada teks, kerana format date mungkin lari layout/tidak seragam
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
                        </div>
                    </div>

                    <div style={{ textAlign: "center", marginTop: "16px" }}>
                        <button type="submit" className="rawatan-submit-button" disabled={saving}>
                            {saving ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}