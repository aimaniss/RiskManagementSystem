// KemaskiniPemantauan.jsx - COMPLETE FULL CODE

import React, { useState, useEffect, useCallback } from "react";
import { X, Save, Loader2, BookOpen, Plus } from "lucide-react"; 
import api from "../../api/api";
import "./KemaskiniPemantauan.css"; 
import PanduanModal from '../Panduan/Panduan';

const riskMatrix = {
    1: { 1: { label: "R", color: "#22c55e" }, 2: { label: "R", color: "#22c55e" }, 3: { label: "S", color: "#eab308" }, 4: { label: "S", color: "#eab308" }, 5: { label: "T", color: "#f97316" } },
    2: { 1: { label: "R", color: "#22c55e" }, 2: { label: "R", color: "#22c55e" }, 3: { label: "S", color: "#eab308" }, 4: { label: "S", color: "#eab308" }, 5: { label: "T", color: "#f97316" } },
    3: { 1: { label: "R", color: "#22c55e" }, 2: { label: "S", color: "#eab308" }, 3: { label: "S", color: "#eab308" }, 4: { label: "T", color: "#f97316" }, 5: { label: "T", color: "#f97316" } },
    4: { 1: { label: "S", color: "#eab308" }, 2: { label: "S", color: "#eab308" }, 3: { label: "T", color: "#f97316" }, 4: { label: "T", color: "#f97316" }, 5: { label: "ST", color: "#ef4444" } },
    5: { 1: { label: "S", color: "#eab308" }, 2: { label: "T", color: "#f97316" }, 3: { label: "T", color: "#f97316" }, 4: { label: "ST", color: "#ef4444" }, 5: { label: "ST", color: "#ef4444" } },
};

const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "Tiada Data", color: "#f1f5f9" };

const TAHAP_RISIKO_ORDER = {
    "R": 1, "S": 2, "T": 3, "ST": 4, "Tiada Data": 0,
};

const KEBERKESANAN_MAPPING = {
    "Ya": "Berkesan (Menurun atau Kekal)",
    "Tidak": "Tidak Berkesan (Meningkat)",
};

const SKOR_KEBARANGKALIAN_DESC = [
    { value: 1, label: "1 - Hampir Tiada Kemungkinan" },
    { value: 2, label: "2 - Kemungkinan Rendah" },
    { value: 3, label: "3 - Berpeluang Untuk Berlaku" },
    { value: 4, label: "4 - Kemungkinan Tinggi" },
    { value: 5, label: "5 - Hampir Pasti" },
];

const SKOR_IMPAK_DESC = [
    { value: 1, label: "1 - Tidak Ketara" },
    { value: 2, label: "2 - Boleh Diukur" },
    { value: 3, label: "3 - Ketara" },
    { value: 4, label: "4 - Besar" },
    { value: 5, label: "5 - Sangat Besar" },
];

export default function KemaskiniPemantauanModal({
    isOpen,
    onClose,
    risikoId,
    onSaveSuccess,
    logDataToEdit,
    mode = "edit",
    userRole = null,
}) {
    
    const isEditMode = mode === 'edit';
    const isViewMode = mode === 'papar';
    const isExecutive = userRole === 'Executive';
    const isStaff = userRole === 'Staff';
    const modalTitle = isEditMode ? "Kemaskini Pemantauan" : "Papar Pemantauan";

    const [isLoading, setIsLoading] = useState(false);
    const [isPanduanOpen, setIsPanduanOpen] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [risikoTeks, setRisikoTeks] = useState("");
    const [risikoNoRujukan, setRisikoNoRujukan] = useState("-");
    const [risikoInfo, setRisikoInfo] = useState(null); 
    const [tahapRisikoRujukan, setTahapRisikoRujukan] = useState("Tiada Data");

    const getInitialFormData = useCallback(() => ({
        log_id: null,
        risiko_id: risikoId || null,
        tahun_pemantauan: new Date().getFullYear(),
        separuh_tahun_pemantauan: 1,
        skor_kebarangkalian_selepas: "", 
        skor_impak_selepas: "", 
        keberkesanan: "", 
        status_pemantauan: "", 
        catatan: "",
        no_bil_kelulusan: "",
        kekerapan_pemantauan: "",
        pelan_tindakan_list: [{ butiran_aktiviti: "" }],
        kakitangan_list: [{ butiran_kakitangan: "" }],
    }), [risikoId]);

    const [formData, setFormData] = useState(getInitialFormData);
    const [tahapRisikoSelepas, setTahapRisikoSelepas] = useState({ label: "Tiada Data", color: "#f1f5f9" });

    const getKeberkesananLabel = (value) => KEBERKESANAN_MAPPING[value] || value;

    useEffect(() => {
        const k = formData.skor_kebarangkalian_selepas; 
        const i = formData.skor_impak_selepas; 

        if (k && i) {
            const kInt = parseInt(k, 10);
            const iInt = parseInt(i, 10);
            const tahapSelepas = getRiskMatrix(kInt, iInt);
            setTahapRisikoSelepas(tahapSelepas);

            if (tahapRisikoRujukan) {
                const tahapOrderRujukan = TAHAP_RISIKO_ORDER[tahapRisikoRujukan] || 0;
                const tahapOrderSelepas = TAHAP_RISIKO_ORDER[tahapSelepas.label] || 0;
                let autoKeberkesanan = (tahapOrderSelepas <= tahapOrderRujukan) ? "Ya" : "Tidak";
                setFormData((prev) => ({ ...prev, keberkesanan: autoKeberkesanan }));
            }
        } else {
            setTahapRisikoSelepas({ label: "Tiada Data", color: "#f1f5f9" });
            setFormData((prev) => ({ ...prev, keberkesanan: "" })); 
        }
    }, [formData.skor_kebarangkalian_selepas, formData.skor_impak_selepas, tahapRisikoRujukan]);

    useEffect(() => {
        if (!isOpen || !logDataToEdit) {
            console.log("❌ Modal tidak buka atau tiada log data");
            return;
        }

        console.log("🔍 Loading log data:", logDataToEdit);
        setIsLoadingData(true);

        try {
            const formatList = (list, key) => {
                if (!Array.isArray(list) || list.length === 0) {
                    return [{ [key]: "" }];
                }
                
                return list.map(item => {
                    if (typeof item === 'string') {
                        return { [key]: item };
                    }
                    return { [key]: item[key] || item.text || item.butiran_aktiviti || item.butiran_kakitangan || "" };
                });
            };

            const k = logDataToEdit.skor_kebarangkalian_selepas || "";
            const i = logDataToEdit.skor_impak_selepas || "";
            const logId = logDataToEdit.log_id || logDataToEdit.id;

            const loadedData = {
                log_id: logId,
                risiko_id: logDataToEdit.risiko_id || risikoId,
                tahun_pemantauan: logDataToEdit.tahun_pemantauan || new Date().getFullYear(),
                separuh_tahun_pemantauan: logDataToEdit.separuh_tahun_pemantauan || 1,
                skor_kebarangkalian_selepas: k, 
                skor_impak_selepas: i, 
                keberkesanan: logDataToEdit.keberkesanan || "", 
                status_pemantauan: logDataToEdit.status_pemantauan || "Buka", 
                catatan: logDataToEdit.catatan || "",
                no_bil_kelulusan: logDataToEdit.no_bil_kelulusan || "",
                kekerapan_pemantauan: logDataToEdit.kekerapan_pemantauan || "",
                pelan_tindakan_list: formatList(logDataToEdit.pelan_tindakan_log, "butiran_aktiviti"),
                kakitangan_list: formatList(logDataToEdit.kakitangan_log, "butiran_kakitangan"),
            };

            console.log("✅ Form data loaded:", loadedData);
            setFormData(loadedData);

            if (k && i) {
                setTahapRisikoSelepas(getRiskMatrix(parseInt(k, 10), parseInt(i, 10)));
            } else {
                setTahapRisikoSelepas({ label: "Tiada Data", color: "#f1f5f9" });
            }

        } catch (error) {
            console.error("❌ Error loading log data:", error);
        } finally {
            setIsLoadingData(false);
        }

    }, [isOpen, logDataToEdit, risikoId]);

    useEffect(() => {
        if (!isOpen || !risikoId || !formData.tahun_pemantauan) return;

        let mounted = true;
        const fetchRisikoInfo = async () => {
            try {
                const infoRes = await api.get(`/pemantauan-risiko/${risikoId}/info`);
                const info = infoRes.data || {};

                const excludeId = logDataToEdit?.log_id || logDataToEdit?.id;

                const rujukanRes = await api.get(`/pemantauan-risiko/${risikoId}/tahap-rujukan`, {
                    params: {
                        tahun: formData.tahun_pemantauan,
                        separuh: formData.separuh_tahun_pemantauan,
                        exclude_log_id: excludeId,
                    }
                });
                const rujukanInfo = rujukanRes.data || {};

                if (!mounted) return;

                setRisikoTeks(info.nama_risiko || info.risiko || info.nama || "");
                setRisikoNoRujukan(info.no_rujukan || info.noRujukan || "-");
                setRisikoInfo(info); 

                let tahapRujukan;
                if (rujukanInfo && rujukanInfo.tahap_risiko_rujukan && rujukanInfo.tahap_risiko_rujukan !== "Tiada Data") {
                    tahapRujukan = rujukanInfo.tahap_risiko_rujukan;
                } else {
                    const kAsal = parseInt(info.kebarangkalian_selepas || info.kebarangkalian_asal || 1, 10);
                    const iAsal = parseInt(info.impak_selepas || info.impak_asal || 1, 10);
                    tahapRujukan = getRiskMatrix(kAsal, iAsal).label;
                }

                setTahapRisikoRujukan(tahapRujukan); 

            } catch (err) {
                console.error("❌ Gagal fetch info risiko:", err);
            }
        };
        fetchRisikoInfo();
        return () => { mounted = false; };
    }, [isOpen, risikoId, formData.tahun_pemantauan, formData.separuh_tahun_pemantauan, logDataToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name.includes("skor_") ? (value === "" ? "" : parseInt(value, 10)) : value,
        }));
    };

    const handleListChange = (listName, index, field, value) => {
        const list = [...formData[listName]];
        list[index][field] = value;
        setFormData((prev) => ({ ...prev, [listName]: list }));
    };

    const handleAddListItem = (listName) => {
        const key = listName === "pelan_tindakan_list" ? "butiran_aktiviti" : "butiran_kakitangan";
        setFormData((prev) => ({ ...prev, [listName]: [...prev[listName], { [key]: "" }] }));
    };

    const handleRemoveListItem = (listName, index) => {
        const list = formData[listName].filter((_, i) => i !== index);
        const key = listName === "pelan_tindakan_list" ? "butiran_aktiviti" : "butiran_kakitangan";
        setFormData((prev) => ({ ...prev, [listName]: list.length ? list : [{ [key]: "" }] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isViewMode) return; 
        if (!isEditMode) return; 

        setIsLoading(true);

        const logId = formData.log_id;
        const url = `/risiko/${risikoId}/pemantauan/log/${logId}`;

        const pelanLog = formData.pelan_tindakan_list.map(item => item.butiran_aktiviti).filter(Boolean);
        const kakitanganLog = formData.kakitangan_list.map(item => item.butiran_kakitangan).filter(Boolean);

        const alwaysRequired = {
            'Tahun Pemantauan': formData.tahun_pemantauan,
            'Separuh Tahun Pemantauan': formData.separuh_tahun_pemantauan,
            'Status Pemantauan': formData.status_pemantauan,
        };

        const missingFields = Object.keys(alwaysRequired).filter(key => {
            const value = alwaysRequired[key];
            return value === null || value === undefined || value === "" || value === 0;
        });

        if (missingFields.length > 0) {
            alert(`Sila lengkapkan maklumat wajib berikut: ${missingFields.join(", ")}.`);
            setIsLoading(false);
            return;
        }

        const k = formData.skor_kebarangkalian_selepas; 
        const i = formData.skor_impak_selepas; 

        if ((k && !i) || (!k && i)) {
            alert("Sila lengkapkan kedua-dua Skor Kebarangkalian dan Skor Impak, atau biarkan kedua-duanya kosong.");
            setIsLoading(false);
            return;
        }

        try {
            const payload = {
                risiko_id: risikoId,
                tahun_pemantauan: formData.tahun_pemantauan,
                separuh_tahun_pemantauan: formData.separuh_tahun_pemantauan,
                skor_kebarangkalian_selepas: formData.skor_kebarangkalian_selepas === "" ? null : formData.skor_kebarangkalian_selepas,
                skor_impak_selepas: formData.skor_impak_selepas === "" ? null : formData.skor_impak_selepas,
                keberkesanan: formData.keberkesanan === "" ? null : formData.keberkesanan,
                status_pemantauan: formData.status_pemantauan,
                catatan: formData.catatan,
                justifikasi_pindaan_pemantauan: formData.justifikasi_pindaan_pemantauan,
                no_bil_kelulusan: formData.no_bil_kelulusan,
                kekerapan_pemantauan: formData.kekerapan_pemantauan,
                pelan_tindakan_log: pelanLog,
                kakitangan_log: kakitanganLog,
            };
            
            console.log("📤 Sending payload:", payload);
            
            const res = await api.put(url, payload);
            const savedLog = res.data?.data ?? res.data;

            alert(`✅ Log Pemantauan untuk Risiko ${risikoTeks || risikoNoRujukan} berjaya dikemaskini!`);

            if (typeof onSaveSuccess === "function") {
                try { onSaveSuccess(savedLog); } catch (err) { console.warn("callback error:", err); }
            }

            onClose?.();
        } catch (err) {
            console.error(`❌ Ralat mengemaskini log:`, err);
            alert(`⚠️ Gagal mengemaskini log. ${err.response?.data?.message || err.message || "Sila cuba lagi."}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    if (isLoadingData) {
        return (
            <div className="kemaskinipemantauan-modal-overlay">
                <div className="kemaskinipemantauan-modal">
                    <div className="kemaskinipemantauan-header">
                        <span>Memuat data...</span>
                    </div>
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <Loader2 size={32} className="spin" />
                        <p style={{ marginTop: '16px' }}>Sila tunggu...</p>
                    </div>
                </div>
            </div>
        );
    }

   // PART 2 - Return Statement untuk KemaskiniPemantauan.jsx
// Copy code ni SELEPAS code Part 1

    return (
        <div className="kemaskinipemantauan-modal-overlay">
            <div className="kemaskinipemantauan-modal">
                <form onSubmit={handleSubmit}>
                    <div className="kemaskinipemantauan-header">
                        <span>{modalTitle}</span>
                        <button type="button" className="kemaskinipemantauan-close-btn" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>

                    <div className="kemaskinipemantauan-body">
                        
                        <div className="kemaskinipemantauan-box">
                            <div className="kemaskinipemantauan-box-header kemaskinipemantauan-header-with-btn">
                                <span>Maklumat Pemantauan</span>
                                <button type="button" className="kemaskinipemantauan-panduan-btn" onClick={() => setIsPanduanOpen(true)}>
                                    <BookOpen size={16} style={{ marginRight: '6px' }} />
                                    Panduan
                                </button>
                            </div>
                            
                            <div className="kemaskinipemantauan-row">
                                <div className="kemaskinipemantauan-item">
                                    <label>Tahun Pemantauan:*</label>
                                    <input
                                        type="number"
                                        name="tahun_pemantauan"
                                        value={formData.tahun_pemantauan}
                                        onChange={handleChange}
                                        required
                                        readOnly
                                        style={{ backgroundColor: '#f3f4f6' }}
                                    />
                                </div>
                                <div className="kemaskinipemantauan-item">
                                    <label>Separuh Tahun Pemantauan:*</label>
                                    <select
                                        name="separuh_tahun_pemantauan"
                                        value={formData.separuh_tahun_pemantauan}
                                        onChange={handleChange}
                                        disabled
                                        style={{ backgroundColor: '#f3f4f6' }}
                                    >
                                        <option value={1}>Pertama</option>
                                        <option value={2}>Kedua</option>
                                    </select>
                                </div>
                                <div className="kemaskinipemantauan-item">
                                    <label>Kelulusan:</label>
                                    <input 
                                        type="text" 
                                        name="no_bil_kelulusan" 
                                        value={formData.no_bil_kelulusan} 
                                        onChange={handleChange} 
                                        readOnly={isViewMode || isStaff} 
                                    />
                                </div>
                            </div>

                            <div className="kemaskinipemantauan-box-subheader" style={{ marginTop: '15px' }}>Pelan Tindakan Pemantauan:</div>
                            {formData.pelan_tindakan_list.map((item, index) => {
                                const listName = "pelan_tindakan_list";
                                const key = "butiran_aktiviti";
                                const isLocked = isViewMode || isStaff;
                                return (
                                    <div className="kemaskinipemantauan-input-row" key={index}>
                                        <input
                                            type="text"
                                            value={item[key]}
                                            onChange={(e) => handleListChange(listName, index, key, e.target.value)}
                                            placeholder={isLocked ? "" : `Butiran Pelan Tindakan ${index + 1}`} 
                                            readOnly={isLocked}
                                        />
                                        {(!isLocked) && formData[listName].length > 1 && (
                                            <button type="button" className="kemaskinipemantauan-btn-circle kemaskinipemantauan-btn-remove" onClick={() => handleRemoveListItem(listName, index)}>
                                                <X size={14} />
                                            </button>
                                        )}
                                        {(!isLocked) && index === formData[listName].length - 1 && (
                                            <button type="button" className="kemaskinipemantauan-btn-circle kemaskinipemantauan-btn-add" onClick={() => handleAddListItem(listName)}>
                                                <Plus size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            <div className="kemaskinipemantauan-box-subheader" style={{ marginTop: '15px' }}>Kakitangan Bertanggungjawab:</div>
                            {formData.kakitangan_list.map((item, index) => {
                                const listName = "kakitangan_list";
                                const key = "butiran_kakitangan";
                                const isLocked = isViewMode || isStaff;
                                return (
                                    <div className="kemaskinipemantauan-input-row" key={index}>
                                        <input
                                            type="text"
                                            value={item[key]}
                                            onChange={(e) => handleListChange(listName, index, key, e.target.value)}
                                            placeholder={isLocked ? "" : `Kakitangan Bertanggungjawab ${index + 1}`} 
                                            readOnly={isLocked}
                                        />
                                        {(!isLocked) && formData[listName].length > 1 && (
                                            <button type="button" className="kemaskinipemantauan-btn-circle kemaskinipemantauan-btn-remove" onClick={() => handleRemoveListItem(listName, index)}>
                                                <X size={14} />
                                            </button>
                                        )}
                                        {(!isLocked) && index === formData[listName].length - 1 && (
                                            <button type="button" className="kemaskinipemantauan-btn-circle kemaskinipemantauan-btn-add" onClick={() => handleAddListItem(listName)}>
                                                <Plus size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            <div className="kemaskinipemantauan-row" style={{ marginTop: '10px' }}>
                                <div className="kemaskinipemantauan-item" style={{ flex: '1 1 100%' }}>
                                    <label>Kekerapan:</label>
                                    <input 
                                        type="text" 
                                        name="kekerapan_pemantauan" 
                                        value={formData.kekerapan_pemantauan} 
                                        onChange={handleChange} 
                                        placeholder={isViewMode || isStaff ? "" : "Contoh: 3 Bulan / Tahunan"} 
                                        readOnly={isViewMode || isStaff} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="kemaskinipemantauan-box">
                            <div className="kemaskinipemantauan-box-header">Penilaian dan Keberkesanan Tindakan</div>
                            <div className="kemaskinipemantauan-row">
                                <div className="kemaskinipemantauan-item">
                                    <label>Skor Kebarangkalian:</label>
                                    <select 
                                        name="skor_kebarangkalian_selepas" 
                                        value={formData.skor_kebarangkalian_selepas} 
                                        onChange={handleChange} 
                                        disabled={isViewMode || isExecutive || isStaff}
                                    >
                                        <option value="">- Sila Pilih -</option>
                                        {SKOR_KEBARANGKALIAN_DESC.map((item) => (
                                            <option key={item.value} value={item.value}>{item.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="kemaskinipemantauan-item">
                                    <label>Skor Impak:</label>
                                    <select 
                                        name="skor_impak_selepas" 
                                        value={formData.skor_impak_selepas} 
                                        onChange={handleChange} 
                                        disabled={isViewMode || isExecutive || isStaff}
                                    >
                                        <option value="">- Sila Pilih -</option>
                                        {SKOR_IMPAK_DESC.map((item) => (
                                            <option key={item.value} value={item.value}>{item.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="kemaskinipemantauan-item">
                                    <span className="kemaskinipemantauan-score-label">Skor Risiko :</span>
                                    <span className="kemaskinipemantauan-risk-badge" style={{ backgroundColor: tahapRisikoSelepas.color }}>{tahapRisikoSelepas.label}</span>
                                </div>
                            </div>
                            <div className="kemaskinipemantauan-row">
                                <div className="kemaskinipemantauan-item">
                                    <label>Keberkesanan:</label>
                                    <input
                                        type="text"
                                        name="keberkesanan"
                                        value={
                                            (formData.skor_kebarangkalian_selepas && formData.skor_impak_selepas)
                                                ? `${formData.keberkesanan} (${getKeberkesananLabel(formData.keberkesanan)})`
                                                : "-"
                                        }
                                        readOnly
                                        disabled
                                        style={{ cursor: 'default', backgroundColor: '#f3f4f6' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="kemaskinipemantauan-box">
                            <div className="kemaskinipemantauan-box-header">Status Pemantauan</div>
                            <div className="kemaskinipemantauan-row">
                                <div className="kemaskinipemantauan-item" style={{ flex: '1 1 100%' }}>
                                    <label>Status Pemantauan Semasa:*</label>
                                    <select 
                                        name="status_pemantauan" 
                                        value={formData.status_pemantauan} 
                                        onChange={handleChange} 
                                        required 
                                        disabled={isViewMode}
                                    >
                                        <option value="">- Sila Pilih -</option>
                                        <option>Buka</option>
                                        <option>Sedang Dilaksanakan</option>
                                        <option>Pemantauan</option>
                                        <option>Selesai</option>
                                        <option>Tutup</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="kemaskinipemantauan-box">
                            <div className="kemaskinipemantauan-box-header">Catatan</div>
                            <label>Sila masukkan catatan :</label>
                            <textarea 
                                name="catatan" 
                                value={formData.catatan} 
                                onChange={handleChange} 
                                rows="5" 
                                readOnly={isViewMode} 
                            />
                        </div>
                    </div>

                    <div className="kemaskinipemantauan-footer kemaskinipemantauan-footer-centered">
                        <button type="button" className="kemaskinipemantauan-btn-cancel" onClick={onClose}>
                            {isViewMode ? "Tutup" : "Batal"}
                        </button>
                        
                        <button 
                            type="submit" 
                            className="kemaskinipemantauan-btn-submit" 
                            disabled={isLoading || isViewMode}
                        >
                            {isLoading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                            {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </div>
                </form>

                <PanduanModal
                    isOpen={isPanduanOpen}
                    onClose={() => setIsPanduanOpen(false)}
                    title="Panduan Log Pemantauan"
                    content="Sila rujuk panduan operasi standard (SOP) untuk mengisi maklumat pemantauan, pelan tindakan, kakitangan, dan penilaian risiko selepas kawalan."
                />
            </div>
        </div>
    );
}