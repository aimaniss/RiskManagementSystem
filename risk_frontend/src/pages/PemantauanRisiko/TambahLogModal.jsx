import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Save, Loader2, BookOpen } from "lucide-react";
import api from "../../api/api";
import "./TambahLogModal.css";

import PanduanModal from '../Panduan/Panduan';


// Risk matrix (tahap risiko selepas kawalan)
const riskMatrix = {
    // Kebarangkalian (y-axis) : { Impak (x-axis) : { label, color } }
    1: { 1: { label: "R", color: "#22c55e" }, 2: { label: "R", color: "#22c55e" }, 3: { label: "S", color: "#eab308" }, 4: { label: "S", color: "#eab308" }, 5: { label: "T", color: "#f97316" } },
    2: { 1: { label: "R", color: "#22c55e" }, 2: { label: "R", color: "#22c55e" }, 3: { label: "S", color: "#eab308" }, 4: { label: "S", color: "#eab308" }, 5: { label: "T", color: "#f97316" } },
    3: { 1: { label: "R", color: "#22c55e" }, 2: { label: "S", color: "#eab308" }, 3: { label: "S", color: "#eab308" }, 4: { label: "T", color: "#f97316" }, 5: { label: "T", color: "#f97316" } },
    4: { 1: { label: "S", color: "#eab308" }, 2: { label: "S", color: "#eab308" }, 3: { label: "T", color: "#f97316" }, 4: { label: "T", color: "#f97316" }, 5: { label: "ST", color: "#ef4444" } },
    5: { 1: { label: "S", color: "#eab308" }, 2: { label: "T", color: "#f97316" }, 3: { label: "T", color: "#f97316" }, 4: { label: "ST", color: "#ef4444" }, 5: { label: "ST", color: "#ef4444" } },
};

const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "Tiada Data", color: "#f1f5f9" };

/** * Fungsi untuk mendapatkan warna berdasarkan label risiko 
 */
const getColorByTahapRisikoLabel = (label) => {
    if (label === "Tiada Data") return "#f1f5f9";

    for (const k in riskMatrix) {
        for (const i in riskMatrix[k]) {
            if (riskMatrix[k][i].label === label) {
                return riskMatrix[k][i].color;
            }
        }
    }
    return "#f1f5f9";
};


// Tahap Risiko: R < S < T < ST
const TAHAP_RISIKO_ORDER = {
    "R": 1,
    "S": 2,
    "T": 3,
    "ST": 4,
    "Tiada Data": 0,
};

const KEBERKESANAN_MAPPING = {
    "Ya": "Berkesan (Menurun atau Kekal)",
    "Tidak": "Tidak Berkesan (Meningkat)",
};

// ================================================================
// Deskripsi untuk Skor
// ================================================================
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
// ================================================================


export default function TambahLogModal({
    isOpen,
    onClose,
    risikoId,
    onLogAdded,
    onSaveSuccess,
    logDataToEdit = null,
    mode = "tambah", // 'tambah', 'edit', atau 'papar'
    userRole = null,  // ⭐️ BARU: Terima peranan pengguna
}) {
    // ================================================================
    
    // Tentukan mod
    const isEditMode = mode === 'edit';
    const isViewMode = mode === 'papar';

    // ⭐️ BARU: Logik Kebenaran (Role Based Access)
    const isExecutive = userRole === 'Executive';
    const isStaff = userRole === 'Staff';

    // Kemaskini Tajuk Modal
    const modalTitle = isEditMode
        ? "Kemaskini Log Pemantauan"
        : isViewMode
            ? "Papar Log Pemantauan"
            : "Tambah Log Pemantauan Baharu";
    // ================================================================

    const [isLoading, setIsLoading] = useState(false);
    const [isPanduanOpen, setIsPanduanOpen] = useState(false);


    const [risikoTeks, setRisikoTeks] = useState("");
    const [risikoNoRujukan, setRisikoNoRujukan] = useState("-");
    const [risikoInfo, setRisikoInfo] = useState(null); // Dikekalkan untuk logik
    const [validationMessage, setValidationMessage] = useState("");


    const [tahapRisikoRujukan, setTahapRisikoRujukan] = useState("Tiada Data"); // Dikekalkan untuk logik


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

    // Mulakan dengan "Tiada Data"
    const [tahapRisikoSelepas, setTahapRisikoSelepas] = useState({ label: "Tiada Data", color: "#f1f5f9" });

    // Fungsi untuk mendapatkan label yang dipaparkan di UI
    const getKeberkesananLabel = (value) => KEBERKESANAN_MAPPING[value] || value;


    // ================================================================
    // Logic Update Tahap Risiko Selepas & Auto-Keberkesanan (Kekal Sama)
    // ================================================================
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

                let autoKeberkesanan;

                if (tahapOrderSelepas <= tahapOrderRujukan) {
                    autoKeberkesanan = "Ya";
                } else {
                    autoKeberkesanan = "Tidak";
                }

                setFormData((prev) => ({ ...prev, keberkesanan: autoKeberkesanan }));
            }
        } else {
            setTahapRisikoSelepas({ label: "Tiada Data", color: "#f1f5f9" });
            setFormData((prev) => ({ ...prev, keberkesanan: "" })); 
        }

    }, [formData.skor_kebarangkalian_selepas, formData.skor_impak_selepas, tahapRisikoRujukan]);


    // ================================================================
    // useEffect untuk Pra-Isi Data Edit / Reset Data Tambah (Kekal Sama)
    // ================================================================
    useEffect(() => {
        if (!isOpen) return;

        const formatList = (list, key) => {
            const formatted = list?.length > 0 && Array.isArray(list)
                ? list.map(item => ({ [key]: item || "" }))
                : [{ [key]: "" }];
            return formatted;
        };


        if (logDataToEdit) { // Ini terpakai untuk mode 'edit' dan 'papar'
            const k = logDataToEdit.skor_kebarangkalian_selepas || "";
            const i = logDataToEdit.skor_impak_selepas || "";
            const logId = logDataToEdit.log_id || logDataToEdit.id;

            setFormData({
                log_id: logId,
                risiko_id: logDataToEdit.risiko_id || risikoId,
                tahun_pemantauan: logDataToEdit.tahun_pemantauan || '',
                separuh_tahun_pemantauan: logDataToEdit.separuh_tahun_pemantauan || 1,
                skor_kebarangkalian_selepas: k, 
                skor_impak_selepas: i, 
                keberkesanan: logDataToEdit.keberkesanan || "", 
                status_pemantauan: logDataToEdit.status_pemantauan || "Selesai", 
                catatan: logDataToEdit.catatan || "",
                no_bil_kelulusan: logDataToEdit.no_bil_kelulusan || "",
                kekerapan_pemantauan: logDataToEdit.kekerapan_pemantauan || "",
                pelan_tindakan_list: formatList(logDataToEdit.pelan_tindakan_log, "butiran_aktiviti"),
                kakitangan_list: formatList(logDataToEdit.kakitangan_log, "butiran_kakitangan"),
            });

            if (k && i) {
                setTahapRisikoSelepas(getRiskMatrix(parseInt(k, 10), parseInt(i, 10)));
            } else {
                setTahapRisikoSelepas({ label: "Tiada Data", color: "#f1f5f9" });
            }

            setValidationMessage("");

        } else {
            // Mod TAMBAH
            setFormData(getInitialFormData()); 
            setTahapRisikoSelepas({ label: "Tiada Data", color: "#f1f5f9" });
            setValidationMessage("");
        }
    }, [isOpen, logDataToEdit, getInitialFormData]);


    // ================================================================
    // Fetch Info Risiko & Tahap Rujukan (DIKEKALKAN UNTUK LOGIK)
    // ================================================================
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


    // ================================================================
    // Semak Duplikasi (Hanya untuk Mod TAMBAH) (Kekal Sama)
    // ================================================================
    useEffect(() => {
        if (isEditMode || isViewMode) {
            setValidationMessage("");
            return;
        }

        const { tahun_pemantauan, separuh_tahun_pemantauan } = formData;
        if (!tahun_pemantauan || !separuh_tahun_pemantauan || !risikoId) {
            setValidationMessage("");
            return;
        }

        const semak = async () => {
            try {
                const res = await api.get(`/pemantauan-risiko/check-duplicate`, {
                    params: {
                        risiko_id: risikoId,
                        tahun: tahun_pemantauan,
                        separuh: separuh_tahun_pemantauan,
                    },
                });

                const { duplicate, invalid, message } = res.data;

                if (invalid) {
                    setValidationMessage(`❌ ${message}`);
                } else if (duplicate) {
                    setValidationMessage(`⚠️ ${message}`);
                } else {
                    setValidationMessage(`✅ ${message}`);
                }
            } catch (err) {
                console.error("❌ Ralat semakan:", err);
                setValidationMessage("⚠️ Gagal menyemak data. Cuba lagi.");
            }
        };

        semak();
    }, [
        formData.tahun_pemantauan,
        formData.separuh_tahun_pemantauan,
        risikoId,
        isEditMode, 
        isViewMode,
    ]);


    // ================================================================
    //  Handlers (Kekal Sama)
    // ================================================================
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


    // ================================================================
    // handleSubmit (Kekal Sama)
    // ================================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isViewMode) return; 

        setIsLoading(true);

        const isEdit = isEditMode;
        const logId = formData.log_id;
        const method = isEdit ? "put" : "post";
        const url = isEdit ? `/pemantauan-risiko/log/${logId}` : "/pemantauan-risiko/log";

        const pelanLog = formData.pelan_tindakan_list.map(item => item.butiran_aktiviti).filter(Boolean);
        const kakitanganLog = formData.kakitangan_list.map(item => item.butiran_kakitangan).filter(Boolean);

        // ======================================================
        // 1. SEMAKAN MEDAN WAJIB (SENTIASA)
        // ======================================================
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

        // ======================================================
        // 2. SEMAKAN MEDAN BERSYARAT (SKOR)
        // ======================================================
        const k = formData.skor_kebarangkalian_selepas; 
        const i = formData.skor_impak_selepas; 

        if ((k && !i) || (!k && i)) {
            alert("Sila lengkapkan kedua-dua Skor Kebarangkalian dan Skor Impak, atau biarkan kedua-duanya kosong.");
            setIsLoading(false);
            return;
        }

        // ======================================================
        // 3. SEMAKAN PERIODE SAH (VALIDATION)
        // ======================================================
        if (!isEdit && validationMessage.includes("❌")) {
            alert(`Sila betulkan ralat pada tahun atau separuh tahun: ${validationMessage.replace("❌ ", "")}`);
            setIsLoading(false);
            return;
        }
        // ------------------------------------------------------------------

        try {

            const payload = {
                ...formData,
                pelan_tindakan_log: pelanLog,
                kakitangan_log: kakitanganLog,
                skor_kebarangkalian_selepas: formData.skor_kebarangkalian_selepas === "" ? null : formData.skor_kebarangkalian_selepas,
                skor_impak_selepas: formData.skor_impak_selepas === "" ? null : formData.skor_impak_selepas,
                keberkesanan: formData.keberkesanan === "" ? null : formData.keberkesanan, 
            };

            if (!isEdit) {
                delete payload.log_id;
            }

            const res = await api[method](url, payload);
            const savedLog = res.data?.data ?? res.data;

            const actionText = isEdit ? "dikemaskini" : "ditambah";
            alert(`✅ Log Pemantauan untuk Risiko ${risikoTeks || risikoNoRujukan} berjaya ${actionText}!`);

            const notify = onSaveSuccess || onLogAdded;
            if (typeof notify === "function") {
                try { notify(savedLog); } catch (err) { console.warn("callback error:", err); }
            }

            onClose?.();
        } catch (err) {
            console.error(`❌ Ralat ${isEdit ? "mengedit" : "menambah"} log:`, err);
            alert(`Gagal ${isEdit ? "mengedit" : "menambah"} log. ${err.response?.data?.message || err.message || "Sila cuba lagi."}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;


    return (
        <div className="tambahlog-modal-overlay">
            <div className="tambahlog-modal">
                <form onSubmit={handleSubmit}>
                    <div className="tambahlog-header">
                        <span>{modalTitle}</span>
                        <button type="button" className="tambahlog-close-btn" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>

                    <div className="tambahlog-body">
                        
                        {/*Maklumat Pemantauan*/}
                        <div className="tambahlog-box">
                            <div className="tambahlog-box-header tambahlog-header-with-btn">
                                <span>Maklumat Pemantauan</span>
                                <button type="button" className="tambahlog-panduan-btn" onClick={() => setIsPanduanOpen(true)}>
                                    <BookOpen size={16} style={{ marginRight: '6px' }} />
                                    Panduan
                                </button>
                            </div>
                            
                            <div className="tambahlog-row">
                                <div className="tambahlog-item">
                                    <label>Tahun Pemantauan:*</label>
                                    <input
                                        type="number"
                                        name="tahun_pemantauan"
                                        value={formData.tahun_pemantauan}
                                        onChange={handleChange}
                                        required
                                        readOnly={isEditMode || isViewMode} // ⭐️ DIKEMASKINI (Sentiasa readOnly jika 'edit' atau 'view')
                                        style={(isEditMode || isViewMode) ? { backgroundColor: '#f3f4f6' } : {}}
                                    />
                                </div>
                                <div className="tambahlog-item">
                                    <label>Separuh Tahun Pemantauan:*</label>
                                    <select
                                        name="separuh_tahun_pemantauan"
                                        value={formData.separuh_tahun_pemantauan}
                                        onChange={handleChange}
                                        disabled={isEditMode || isViewMode} // ⭐️ DIKEMASKINI (Sentiasa disabled jika 'edit' atau 'view')
                                        style={(isEditMode || isViewMode) ? { backgroundColor: '#f3f4f6' } : {}}
                                    >
                                        <option value={1}>Pertama</option>
                                        <option value={2}>Kedua</option>
                                    </select>
                                </div>
                                <div className="tambahlog-item">
                                    <label>Kelulusan:</label>
                                    <input 
                                        type="text" 
                                        name="no_bil_kelulusan" 
                                        value={formData.no_bil_kelulusan} 
                                        onChange={handleChange} 
                                        readOnly={isViewMode || (isEditMode && isStaff)} // ⭐️ DIKEMASKINI (Staff tak boleh edit)
                                    />
                                </div>
                            </div>

                            {/* Hanya papar dalam mod 'tambah' */}
                            {validationMessage && !isEditMode && !isViewMode && (
                                <p
                                    style={{
                                        marginTop: "8px",
                                        fontSize: "0.9rem",
                                        color: validationMessage.includes("✅") ? "#16a34a" : (validationMessage.includes("❌") || validationMessage.includes("⚠️") ? "#dc2626" : "#eab308"),
                                    }}
                                >
                                    {validationMessage}
                                </p>
                            )}

                            {/* Pelan Tindakan Pemantauan */}
                            <div className="tambahlog-box-subheader" style={{ marginTop: '15px' }}>Pelan Tindakan Pemantauan:</div>
                            {formData.pelan_tindakan_list.map((item, index) => {
                                const listName = "pelan_tindakan_list";
                                const key = "butiran_aktiviti";
                                return (
                                    <div className="tambahlog-input-row" key={index}>
                                        <input
                                            type="text"
                                            value={item[key]}
                                            onChange={(e) => handleListChange(listName, index, key, e.target.value)}
                                            placeholder={isViewMode || (isEditMode && isStaff) ? "" : `Butiran Pelan Tindakan ${index + 1}`} 
                                            readOnly={isViewMode || (isEditMode && isStaff)} // ⭐️ DIKEMASKINI (Staff tak boleh edit)
                                        />
                                        {/* ⭐️ DIKEMASKINI (Sembunyi butang jika 'view' atau 'Staff' dalam mode edit) */}
                                        {(!isViewMode && !(isEditMode && isStaff)) && formData[listName].length > 1 && (
                                            <button type="button" className="tambahlog-btn-circle tambahlog-btn-remove" onClick={() => handleRemoveListItem(listName, index)}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                        {(!isViewMode && !(isEditMode && isStaff)) && index === formData[listName].length - 1 && (
                                            <button type="button" className="tambahlog-btn-circle tambahlog-btn-add" onClick={() => handleAddListItem(listName)}>
                                                <Plus size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Kakitangan Bertanggungjawab */}
                            <div className="tambahlog-box-subheader" style={{ marginTop: '15px' }}>Kakitangan Bertanggungjawab:</div>
                            {formData.kakitangan_list.map((item, index) => {
                                const listName = "kakitangan_list";
                                const key = "butiran_kakitangan";
                                return (
                                    <div className="tambahlog-input-row" key={index}>
                                        <input
                                            type="text"
                                            value={item[key]}
                                            onChange={(e) => handleListChange(listName, index, key, e.target.value)}
                                            placeholder={isViewMode || (isEditMode && isStaff) ? "" : `Kakitangan Bertanggungjawab ${index + 1}`} 
                                            readOnly={isViewMode || (isEditMode && isStaff)} // ⭐️ DIKEMASKINI (Staff tak boleh edit)
                                        />
                                        {/* ⭐️ DIKEMASKINI (Sembunyi butang jika 'view' atau 'Staff' dalam mode edit) */}
                                        {(!isViewMode && !(isEditMode && isStaff)) && formData[listName].length > 1 && (
                                            <button type="button" className="tambahlog-btn-circle tambahlog-btn-remove" onClick={() => handleRemoveListItem(listName, index)}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                        {(!isViewMode && !(isEditMode && isStaff)) && index === formData[listName].length - 1 && (
                                            <button type="button" className="tambahlog-btn-circle tambahlog-btn-add" onClick={() => handleAddListItem(listName)}>
                                                <Plus size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Kekerapan Pemantauan */}
                            <div className="tambahlog-row" style={{ marginTop: '10px' }}>
                                <div className="tambahlog-item" style={{ flex: '1 1 100%' }}>
                                    <label>Kekerapan:</label>
                                    <input 
                                        type="text" 
                                        name="kekerapan_pemantauan" 
                                        value={formData.kekerapan_pemantauan} 
                                        onChange={handleChange} 
                                        placeholder={isViewMode || (isEditMode && isStaff) ? "" : "Contoh: 3 Bulan / Tahunan"} 
                                        readOnly={isViewMode || (isEditMode && isStaff)} // ⭐️ DIKEMASKINI (Staff tak boleh edit)
                                    />
                                </div>
                            </div>
                        </div>

                        {/*Penilaian dan Keberkesanan Tindakan */}
                        <div className="tambahlog-box">
                            <div className="tambahlog-box-header">Penilaian dan Keberkesanan Tindakan</div>
                            <div className="tambahlog-row">
                                <div className="tambahlog-item">
                                    <label>Skor Kebarangkalian:</label>
                                    <select 
                                        name="skor_kebarangkalian_selepas" 
                                        value={formData.skor_kebarangkalian_selepas} 
                                        onChange={handleChange} 
                                        disabled={isViewMode || (isEditMode && (isExecutive || isStaff))} // ⭐️ DIKEMASKINI (Exec & Staff tak boleh edit)
                                    >
                                        <option value="">- Sila Pilih -</option>
                                        {SKOR_KEBARANGKALIAN_DESC.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="tambahlog-item">
                                    <label>Skor Impak:</label>
                                    <select 
                                        name="skor_impak_selepas" 
                                        value={formData.skor_impak_selepas} 
                                        onChange={handleChange} 
                                        disabled={isViewMode || (isEditMode && (isExecutive || isStaff))} // ⭐️ DIKEMASKINI (Exec & Staff tak boleh edit)
                                    >
                                        <option value="">- Sila Pilih -</option>
                                        {SKOR_IMPAK_DESC.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="tambahlog-item">
                                    <span className="tambahlog-score-label">Skor Risiko :</span>
                                    <span className="tambahlog-risk-badge" style={{ backgroundColor: tahapRisikoSelepas.color }}>{tahapRisikoSelepas.label}</span>
                                </div>
                            </div>
                            <div className="tambahlog-row">
                                <div className="tambahlog-item">
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

                        {/*Status Pemantauan */}
                        <div className="tambahlog-box">
                            <div className="tambahlog-box-header">Status Pemantauan</div>
                            <div className="tambahlog-row">
                                <div className="tambahlog-item" style={{ flex: '1 1 100%' }}>
                                    <label>Status Pemantauan Semasa:*</label>
                                    <select 
                                        name="status_pemantauan" 
                                        value={formData.status_pemantauan} 
                                        onChange={handleChange} 
                                        required 
                                        disabled={isViewMode} // ⭐️ DIKEMASKINI (Staff & Exec BOLEH edit)
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

                        {/*Catatan */}
                        <div className="tambahlog-box">
                            <div className="tambahlog-box-header">Catatan</div>
                            <label>Sila masukkan catatan :</label>
                            <textarea 
                                name="catatan" 
                                value={formData.catatan} 
                                onChange={handleChange} 
                                rows="5" 
                                readOnly={isViewMode} // ⭐️ DIKEMASKINI (Staff & Exec BOLEH edit)
                            />
                        </div>
                    </div>

                    {/* Footer dikemaskini untuk 'view mode' */}
                    <div className="tambahlog-footer tambahlog-footer-centered">
                        <button type="button" className="tambahlog-btn-cancel" onClick={onClose}>
                            {isViewMode ? "Tutup" : "Batal"}
                        </button>
                        
                        {!isViewMode && (
                            <button type="submit" className="tambahlog-btn-submit" disabled={isLoading}>
                                {isLoading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                                {isLoading ? "Menyimpan..." : (isEditMode ? "Simpan Perubahan" : "Simpan Log")}
                            </button>
                        )}
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