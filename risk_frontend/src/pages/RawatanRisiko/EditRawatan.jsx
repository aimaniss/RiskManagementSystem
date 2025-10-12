import { useState, useEffect } from "react";
import { X, Trash2, Plus, BookOpen, Save } from "lucide-react"; 
import "./EditRawatan.css";
// Gantikan dengan laluan fail API anda yang betul
import api from "../../api/api"; 

// =======================================================
// IMPORT KOMPONEN PANDUANMODAL DARI FOLDER SEBELAH
// =======================================================
import PanduanModal from '../Panduan/Panduan'; 
// =======================================================


// Komponen Pembantu untuk Memaparkan Senarai Bernombor
const ListDisplay = ({ data }) => {
    // Pastikan data adalah array dan ditapis (filter) untuk buang item kosong
    const cleanedData = Array.isArray(data) ? data.filter(item => item?.trim() !== "") : [];

    if (cleanedData.length === 0) return <span style={{ color: '#64748b' }}>-</span>;

    return (
        <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '0' }}>
            {cleanedData.map((item, index) => (
                <li key={index} className="rawatan-list-item">
                    <span className="rawatan-data-inline">
                        {`${index + 1}. ${item}`}
                    </span>
                </li>
            ))}
        </ul>
    );
};


// Risk Matrix data
const riskMatrix = {
    1: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Rendah", color: "#14b8a6" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
    2: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Rendah", color: "#14b8a6" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
    3: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Tinggi", color: "#f97316" } },
    4: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
    5: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Tinggi", color: "#f97316" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Sangat Tinggi", color: "#ef4444" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
};

const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "", color: "#f1f5f9" };


export default function EditRawatan({ isOpen, risk, onClose, onSave }) { 
    const [isPanduanOpen, setIsPanduanOpen] = useState(false); 
    const [formData, setFormData] = useState({
        // Data input rawatan
        planTindakan: [""],
        kakitanganBertanggungjawab: [""],
        jenisKawalan: "",
        tempohSiap: "", 
        // Data risiko (statik - untuk display)
        risiko_id: null, 
        rawatan_id: null, 
        punca: [], 
        kesan: [],
        skor_kebarangkalian: null,
        skor_impak: null,
        // Ini akan di-overwrite oleh useEffect
        tahap_risiko: "", 
        // Perubahan: status_risiko = YA/TIDAK, status_risiko_desc = description
        status_risiko: "", 
        status_risiko_desc: "", 
    });
    const [riskColor, setRiskColor] = useState("#f1f5f9");
    const [saving, setSaving] = useState(false);

    // Fetch data bila modal buka & update Risk Status bila skor berubah
    useEffect(() => {
        if (!isOpen) return; // Keluar jika modal ditutup

        if (risk?.risiko_id) {
            // 1. Reset state input awal (penting jika modal digunakan semula)
            setFormData({
                planTindakan: [""],
                kakitanganBertanggungjawab: [""],
                jenisKawalan: "",
                tempohSiap: "", 
                risiko_id: risk.risiko_id, 
                rawatan_id: null, // Asumsi tiada rawatan lagi
                ...risk, // Spread data risiko sedia ada (no_rujukan, skor_kebarangkalian, dll)
            });

            // 2. Fetch data rawatan (dynamic)
            api
                .get(`/rawatan/${risk.risiko_id}`)
                .then(({ data }) => {
                    // Update dengan data rawatan jika ada
                    setFormData((prev) => ({
                        ...prev,
                        rawatan_id: data.rawatan_id || null, 
                        planTindakan: Array.isArray(data.plan_tindakan) && data.plan_tindakan.length > 0 ? data.plan_tindakan : [""],
                        jenisKawalan: data.jenis_kawalan || "",
                        tempohSiap: data.tempoh_jangkaan_siap || "",
                        kakitanganBertanggungjawab:
                            Array.isArray(data.kakitangan_bertanggungjawab) && data.kakitangan_bertanggungjawab.length > 0
                                ? data.kakitangan_bertanggungjawab
                                : [""],
                        // Pastikan data risiko statik diserap dari hasil fetch jika API mengembalikan data gabungan (risiko + rawatan)
                        punca: data.punca || prev.punca, 
                        kesan: data.kesan || prev.kesan, 
                    }));
                })
                .catch((err) => {
                    if (err.response?.status !== 404) {
                        console.error("❌ Gagal fetch rawatan:", err);
                    }
                    // Jika 404, biarkan state seperti yang di-reset di atas.
                });
        }
    }, [isOpen, risk]);

    // Update warna tahap risiko automatik
    useEffect(() => {
        const k = parseInt(formData.skor_kebarangkalian);
        const i = parseInt(formData.skor_impak);
        
        if (k && i) {
            const { label, color } = getRiskMatrix(k, i);
            
            // >>> PERUBAHAN LOGIK STATUS RISIKO <<<
            // Status 'Perlu' (YA) jika Tinggi atau Sangat Tinggi
            const isRequired = (label === "Tinggi" || label === "Sangat Tinggi");
            
            const status = isRequired ? "YA" : "TIDAK";
            const statusDesc = isRequired ? "Risiko memerlukan tindakan segera dan rekod rawatan." : "Risiko sedia terkawal, tiada tindakan rawatan mandatori.";

            setFormData((prev) => ({
                ...prev,
                skor_risiko: k * i,
                tahap_risiko: label,
                status_risiko: status,
                status_risiko_desc: statusDesc,
            }));
            setRiskColor(color);
        } else {
            // Reset jika skor tiada
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

        // 3. Semak Validasi Minimum 
        if (
            cleanedPlanTindakan.length === 0 || 
            cleanedKakitangan.length === 0 || // PERUBAHAN DI SINI: Semak kakitangan
            !formData.jenisKawalan || 
            !formData.tempohSiap
        ) {
            // PERUBAHAN DI SINI: Kemas kini mesej alert
            alert("Sila masukkan sekurang-kurangnya satu **Plan Tindakan** dan **Kakitangan Bertanggungjawab**, pilih **Jenis Kawalan**, dan isikan **Tempoh Jangkaan Siap**.");
            return;
        }

        // 4. Bina Payload
        const payload = {
            // risiko_id hanya untuk POST (tambah baru)
            risiko_id: formData.risiko_id, 
            plan_tindakan: cleanedPlanTindakan, 
            jenis_kawalan: formData.jenisKawalan,
            tempoh_jangkaan_siap: formData.tempohSiap, 
            kakitangan_bertanggungjawab: cleanedKakitangan,
        };

        // 5. Tentukan URL dan Method
        const url = isUpdate ? `/rawatan/${formData.rawatan_id}` : "/rawatan";
        const method = isUpdate ? 'put' : 'post';

        try {
            setSaving(true);
            
            const response = await api[method](url, payload);
            
            let finalRawatanId = isUpdate ? formData.rawatan_id : response.data?.rawatan_id;

            if (!isUpdate && response.data?.rawatan_id) {
                // Untuk POST, update rawatan_id untuk sesi ini
                setFormData(prev => ({ ...prev, rawatan_id: finalRawatanId })); 
            }

            // Panggil onSave dengan data terbaru
            onSave({ 
                ...risk, // Pastikan data risiko asal dikekalkan
                ...formData, 
                rawatan_id: finalRawatanId, 
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
                    <button className="rawatan-close-btn" onClick={onClose} aria-label="Tutup Borang">
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
                    {/* 2. Maklumat Risiko */}
                    <div className="rawatan-box">
                        <div className="rawatan-box-header rawatan-risk-header">
                            <span>Maklumat Risiko</span>
                            {/* KEDUDUKAN BARU BUTTON PANDUAN (kanan hujung) */}
                            <button 
                                type="button" 
                                className="rawatan-panduan-btn" 
                                onClick={() => setIsPanduanOpen(true)}
                            >
                                <BookOpen size={16} style={{ marginRight: '6px' }} />
                                Panduan 
                            </button>
                        </div>
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
                    
                    {/* ... (Bahagian Pengenalpastian & Penilaian Risiko Kekal Sama) ... */}
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
                        <div className="rawatan-flex-row rawatan-list-section">
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
                    <div className="rawatan-box">
                        <div className="rawatan-box-header">Penilaian Risiko</div>
                        
                        {/* Baris Pertama: Skor & Tahap */}
                        <div className="rawatan-flex-row rawatan-score-row">
                            
                            <div className="rawatan-score-card">
                                <span className="rawatan-score-label">Skor Kebarangkalian</span>
                                <span className="rawatan-score-data">{formData.skor_kebarangkalian || "-"}</span>
                            </div>
                            
                            <div className="rawatan-score-card">
                                <span className="rawatan-score-label">Skor Impak</span>
                                <span className="rawatan-score-data">{formData.skor_impak || "-"}</span>
                            </div>
                            
                            <div className="rawatan-score-card">
                                <span className="rawatan-score-label">Skor Risiko</span>
                                <span className="rawatan-score-data rawatan-risk-score-text" 
                                    style={{ backgroundColor: riskColor, color: riskColor === "#f1f5f9" ? '#475569' : '#ffffff' }}
                                    data-level={formData.tahap_risiko}
                                >
                                    {formData.tahap_risiko || "-"}
                                </span>
                            </div>
                        </div>

                        {/* Baris Kedua: Status Risiko (Satu Baris Penuh) */}
                        <div className="rawatan-flex-row rawatan-status-row">
                            <div className="rawatan-flex-item" style={{ flex: "1 1 100%", marginTop: '8px' }}>
                                {/* PERUBAHAN LABEL: Status Rawatan Diperlukan -> Status Risiko */}
                                <span className="rawatan-label-inline">Status Risiko:</span> 
                                <span className="rawatan-status-tag" data-status={formData.status_risiko}>
                                    {/* OUTPUT DARI LOGIK: YA/TIDAK */}
                                    {formData.status_risiko || "-"} 
                                </span>
                                {/* DESCRIPTION DARI LOGIK */}
                                <span className="rawatan-status-desc">
                                    ({formData.status_risiko_desc || "Tiada data skor"})
                                </span>
                            </div>
                        </div>

                    </div>


                    {/* 4. Rawatan Risiko (Form Input) */}
                    <div className="rawatan-box">
                        <div className="rawatan-box-header">Rawatan Risiko </div>
                        <div style={{ padding: "10px 18px 18px 18px" }}> {/* Tingkatkan padding sikit */}
                            
                            {/* Plan Tindakan - Dynamic Input List */}
                            <div style={{ marginBottom: "16px" }}>
                                <label className="rawatan-label rawatan-label-required">Pelan Tindakan:</label>
                                {formData.planTindakan.map((p, idx) => (
                                    <div key={`plan-${idx}`} className="rawatan-dynamic-row">
                                        <input
                                            value={p}
                                            onChange={(e) => {
                                                const newList = [...formData.planTindakan];
                                                newList[idx] = e.target.value;
                                                setFormData((prev) => ({ ...prev, planTindakan: newList }));
                                            }}
                                            placeholder={`Langkah Tindakan ${idx + 1}`}
                                            className="rawatan-input"
                                            required={idx === 0} // Buat sekurang-kurangnya yang pertama wajib
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
                                                aria-label="Buang Plan Tindakan"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        {/* Hanya tambah butang plus di input terakhir */}
                                        {idx === formData.planTindakan.length - 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        planTindakan: [...prev.planTindakan, ""],
                                                    }))
                                                }
                                                className="rawatan-button-circle rawatan-button-add rawatan-button-add-blue" // TAMBAH CLASS BARU
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
                                <label className="rawatan-label rawatan-label-required">Jenis Kawalan:</label>
                                <select
                                    value={formData.jenisKawalan || ""}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, jenisKawalan: e.target.value }))}
                                    className="rawatan-select"
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
                                <label className="rawatan-label rawatan-label-required">Tempoh Jangkaan Siap Tindakan:</label>
                                <input
                                    type="text" 
                                    value={formData.tempohSiap || ""}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, tempohSiap: e.target.value }))}
                                    className="rawatan-input"
                                    placeholder="Cth: 2 bulan "
                                    required
                                />
                            </div>

                            {/* Kakitangan Bertanggungjawab - Dynamic Input List */}
                            <div style={{ marginBottom: "20px" }}>
                                <label className="rawatan-label rawatan-label-required">Kakitangan Bertanggungjawab:</label> {/* PERUBAHAN DI SINI: Tambah rawatan-label-required */}
                                {formData.kakitanganBertanggungjawab.map((s, idx) => (
                                    <div key={`kakitangan-${idx}`} className="rawatan-dynamic-row">
                                        <input
                                            value={s}
                                            onChange={(e) => {
                                                const newList = [...formData.kakitanganBertanggungjawab];
                                                newList[idx] = e.target.value;
                                                setFormData((prev) => ({ ...prev, kakitanganBertanggungjawab: newList }));
                                            }}
                                            placeholder={`Nama kakitangan / jawatan ${idx + 1}`}
                                            className="rawatan-input"
                                            required={idx === 0} // PERUBAHAN DI SINI: Jadikan input pertama wajib
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
                                                className="rawatan-button-circle rawatan-button-add rawatan-button-add-blue" // TAMBAH CLASS BARU
                                                aria-label="Tambah Kakitangan"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Butang Simpan (Biru Pekat) */}
                            <div className="rawatan-save-btn-wrapper">
                                <button
                                    type="submit"
                                    className="rawatan-save-btn-dark-blue" // CLASS rawatan-save-btn TELAH DIBUANG
                                    disabled={saving}
                                >
                                    {saving ? "Menyimpan..." : (
                                        <>
                                            <Save size={18} style={{ marginRight: '8px' }} />
                                            Simpan Kemaskini
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
                
                {/* Modal Panduan (Tutup bila selesai) */}
                {isPanduanOpen && <PanduanModal isOpen={isPanduanOpen} onClose={() => setIsPanduanOpen(false)} />}
            </div>
        </div>
    );
}