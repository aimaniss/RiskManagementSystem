// KemaskiniPemantauan.jsx - COMPLETE FULL CODE

import React, { useState, useEffect, useCallback } from "react";
import { X, Save, Loader2, BookOpen, Plus, Trash2, Eye } from "lucide-react"; 
import api from "../../api/api";
import { getRiskMatrix, TAHAP_RISIKO_ORDER, KEBERKESANAN_MAPPING, SKOR_KEBARANGKALIAN_DESC, SKOR_IMPAK_DESC } from "../../constants/riskMatrix";
import { usePanduan } from "../../hooks/usePanduan";
import Toast from "@/components/ui/toast";
import LoadingSpinner from "@/components/ui/loading-spinner";
import RiskMatrixVisual from "@/components/ui/risk-matrix-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
    const { openPanduan, PanduanTrigger, PanduanRenderer } = usePanduan();
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [toast, setToast] = useState(null);

    const [risikoTeks, setRisikoTeks] = useState("");
    const [risikoNoRujukan, setRisikoNoRujukan] = useState("-");
    const [, setRisikoInfo] = useState(null); 
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
            setToast({ variant: "warning", title: "Medan Tidak Lengkap", message: `Sila lengkapkan maklumat wajib berikut: ${missingFields.join(", ")}.` });
            setIsLoading(false);
            return;
        }

        const k = formData.skor_kebarangkalian_selepas; 
        const i = formData.skor_impak_selepas; 

        if ((k && !i) || (!k && i)) {
            setToast({ variant: "warning", title: "Medan Tidak Lengkap", message: "Sila lengkapkan kedua-dua Skor Kebarangkalian dan Skor Impak, atau biarkan kedua-duanya kosong." });
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

            setToast({ variant: "success", title: "Berjaya", message: `Log Pemantauan untuk Risiko ${risikoTeks || risikoNoRujukan} berjaya dikemaskini!` });

            if (typeof onSaveSuccess === "function") {
                try { onSaveSuccess(savedLog); } catch (err) { console.warn("callback error:", err); }
            }

            onClose?.();
        } catch (err) {
            console.error(`❌ Ralat mengemaskini log:`, err);
            setToast({ variant: "error", title: "Gagal Mengemaskini", message: `Gagal mengemaskini log. ${err.response?.data?.error || err.message || "Sila cuba lagi."}` });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    if (isLoadingData) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="flex max-h-[92vh] w-full max-w-sm flex-col rounded-xl bg-white shadow-xl">
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Eye className="h-4 w-4" />
                            </span>
                            <h3 className="truncate text-[15px] font-semibold text-foreground">Memuat data...</h3>
                        </div>
                    </div>
                    <div className="p-10">
                        <LoadingSpinner text="Sila tunggu..." size="md" />
                    </div>
                </div>

                {toast && (
                    <Toast
                        variant={toast.variant}
                        title={toast.title}
                        message={toast.message}
                        onClose={() => setToast(null)}
                        autoClose={4000}
                    />
                )}
            </div>
        );
    }

   // PART 2 - Return Statement untuk KemaskiniPemantauan.jsx
// Copy code ni SELEPAS code Part 1

    const subtitleText = [
        risikoNoRujukan !== "-" ? `No. Rujukan: ${risikoNoRujukan}` : null,
        risikoTeks,
    ].filter(Boolean).join(" • ") || "Log pemantauan risiko";

    const readOnlyFieldCls = "cursor-default bg-muted/50 text-muted-foreground";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Eye className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                                <h3 className="truncate text-[15px] font-semibold text-foreground">{modalTitle}</h3>
                                <p className="truncate text-xs text-muted-foreground">{subtitleText}</p>
                            </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto p-5">
                        
                        <div className="rounded-lg border border-border p-4">
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Maklumat Pemantauan</h4>
                                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={openPanduan}>
                                    <BookOpen className="h-3.5 w-3.5" />
                                    Panduan
                                </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Tahun Pemantauan:*</Label>
                                    <Input
                                        type="number"
                                        name="tahun_pemantauan"
                                        value={formData.tahun_pemantauan}
                                        onChange={handleChange}
                                        required
                                        readOnly
                                        className={readOnlyFieldCls}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Separuh Tahun Pemantauan:*</Label>
                                    <Select
                                        name="separuh_tahun_pemantauan"
                                        value={formData.separuh_tahun_pemantauan}
                                        onChange={handleChange}
                                        disabled
                                    >
                                        <option value={1}>Pertama</option>
                                        <option value={2}>Kedua</option>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Kelulusan:</Label>
                                    <Input 
                                        type="text" 
                                        name="no_bil_kelulusan" 
                                        value={formData.no_bil_kelulusan} 
                                        onChange={handleChange} 
                                        readOnly={isViewMode || isStaff} 
                                        className={isViewMode || isStaff ? readOnlyFieldCls : ""}
                                    />
                                </div>
                            </div>

                            <Label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pelan Tindakan Pemantauan:</Label>
                            <div className="mt-2 space-y-2">
                                {formData.pelan_tindakan_list.map((item, index) => {
                                    const listName = "pelan_tindakan_list";
                                    const key = "butiran_aktiviti";
                                    const isLocked = isViewMode || isStaff;
                                    return (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                type="text"
                                                value={item[key]}
                                                onChange={(e) => handleListChange(listName, index, key, e.target.value)}
                                                placeholder={isLocked ? "" : `Butiran Pelan Tindakan ${index + 1}`} 
                                                readOnly={isLocked}
                                                className={isLocked ? readOnlyFieldCls : ""}
                                            />
                                            {(!isLocked) && formData[listName].length > 1 && (
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveListItem(listName, index)} aria-label="Buang Pelan Tindakan">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {(!isLocked) && index === formData[listName].length - 1 && (
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10" onClick={() => handleAddListItem(listName)} aria-label="Tambah Pelan Tindakan">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <Label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kakitangan Bertanggungjawab:</Label>
                            <div className="mt-2 space-y-2">
                                {formData.kakitangan_list.map((item, index) => {
                                    const listName = "kakitangan_list";
                                    const key = "butiran_kakitangan";
                                    const isLocked = isViewMode || isStaff;
                                    return (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                type="text"
                                                value={item[key]}
                                                onChange={(e) => handleListChange(listName, index, key, e.target.value)}
                                                placeholder={isLocked ? "" : `Kakitangan Bertanggungjawab ${index + 1}`} 
                                                readOnly={isLocked}
                                                className={isLocked ? readOnlyFieldCls : ""}
                                            />
                                            {(!isLocked) && formData[listName].length > 1 && (
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveListItem(listName, index)} aria-label="Buang Kakitangan">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {(!isLocked) && index === formData[listName].length - 1 && (
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10" onClick={() => handleAddListItem(listName)} aria-label="Tambah Kakitangan">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Kekerapan:</Label>
                                    <Input 
                                        type="text" 
                                        name="kekerapan_pemantauan" 
                                        value={formData.kekerapan_pemantauan} 
                                        onChange={handleChange} 
                                        placeholder={isViewMode || isStaff ? "" : "Contoh: 3 Bulan / Tahunan"} 
                                        readOnly={isViewMode || isStaff} 
                                        className={isViewMode || isStaff ? readOnlyFieldCls : ""}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-4">
                            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penilaian dan Keberkesanan Tindakan</h4>
                            <div className="rounded-lg border border-border bg-accent/60 p-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Skor Kebarangkalian:</Label>
                                        <Select 
                                            name="skor_kebarangkalian_selepas" 
                                            value={formData.skor_kebarangkalian_selepas} 
                                            onChange={handleChange} 
                                            disabled={isViewMode || isExecutive || isStaff}
                                        >
                                            <option value="">- Sila Pilih -</option>
                                            {SKOR_KEBARANGKALIAN_DESC.map((item) => (
                                                <option key={item.value} value={item.value}>{item.label}</option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Skor Impak:</Label>
                                        <Select 
                                            name="skor_impak_selepas" 
                                            value={formData.skor_impak_selepas} 
                                            onChange={handleChange} 
                                            disabled={isViewMode || isExecutive || isStaff}
                                        >
                                            <option value="">- Sila Pilih -</option>
                                            {SKOR_IMPAK_DESC.map((item) => (
                                                <option key={item.value} value={item.value}>{item.label}</option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Skor Risiko:</Label>
                                        <span
                                            className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input px-3 text-sm font-semibold"
                                            style={{ backgroundColor: tahapRisikoSelepas.color, color: tahapRisikoSelepas.textColor || "#334155" }}
                                        >
                                            {tahapRisikoSelepas.label}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Keberkesanan:</Label>
                                        <Input
                                            type="text"
                                            name="keberkesanan"
                                            value={
                                                (formData.skor_kebarangkalian_selepas && formData.skor_impak_selepas)
                                                    ? `${formData.keberkesanan} (${getKeberkesananLabel(formData.keberkesanan)})`
                                                    : "-"
                                            }
                                            readOnly
                                            disabled
                                            className={`${readOnlyFieldCls} cursor-default`}
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-col items-center border-t border-border pt-4">
                                    <Label className="mb-3 text-xs font-medium">Kedudukan pada Matriks Risiko:</Label>
                                    <RiskMatrixVisual compact kebarangkalian={formData.skor_kebarangkalian_selepas} impak={formData.skor_impak_selepas} />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-4">
                            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Pemantauan</h4>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Status Pemantauan Semasa:*</Label>
                                <Select 
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
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-4">
                            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan — sila masukkan catatan:</Label>
                            <Textarea 
                                name="catatan" 
                                value={formData.catatan} 
                                onChange={handleChange} 
                                rows={5} 
                                readOnly={isViewMode} 
                                className={isViewMode ? readOnlyFieldCls : ""}
                            />
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-white px-5 py-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            {isViewMode ? "Tutup" : "Batal"}
                        </Button>
                        
                        <Button 
                            type="submit" 
                            disabled={isLoading || isViewMode}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
                        </Button>
                    </div>
                </form>

                {PanduanRenderer}
            </div>

            {toast && (
                <Toast
                    variant={toast.variant}
                    title={toast.title}
                    message={toast.message}
                    onClose={() => setToast(null)}
                    autoClose={4000}
                />
            )}
        </div>
    );
}
