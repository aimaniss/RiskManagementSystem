import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Save, Loader2, BookOpen, Eye, Pencil, ClipboardPlus } from "lucide-react";
import Toast from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import RiskMatrixVisual from "@/components/ui/risk-matrix-visual";
import api from "../../api/api";

import { getRiskMatrix, TAHAP_RISIKO_ORDER, KEBERKESANAN_MAPPING } from "../../constants/riskMatrix";
import { usePanduan } from "../../hooks/usePanduan";

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

export default function TambahLogModal({
    isOpen,
    onClose,
    risikoId,
    onLogAdded,
    onSaveSuccess,
    logDataToEdit = null,
    mode = "tambah", // 'tambah', 'edit', atau 'papar'
    userRole = null,
}) {
    const isEditMode = mode === 'edit';
    const isViewMode = mode === 'papar';

    const isExecutive = userRole === 'Executive';
    const isStaff = userRole === 'Staff';

    const modalTitle = isEditMode
        ? "Kemaskini Pemantauan"
        : isViewMode
            ? "Papar  Pemantauan"
            : "Tambah Pemantauan Baharu";

    const [isLoading, setIsLoading] = useState(false);
    const { openPanduan, PanduanTrigger, PanduanRenderer } = usePanduan();

    const [risikoTeks, setRisikoTeks] = useState("");
    const [risikoNoRujukan, setRisikoNoRujukan] = useState("-");
    const [risikoInfo, setRisikoInfo] = useState(null);
    const [validationMessage, setValidationMessage] = useState("");

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

    const [toast, setToast] = useState(null);

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

    useEffect(() => {
        if (!isOpen) return;

        const formatList = (list, key) => {
            const formatted = list?.length > 0 && Array.isArray(list)
                ? list.map(item => ({ [key]: item || "" }))
                : [{ [key]: "" }];
            return formatted;
        };

        if (logDataToEdit) {
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
            setFormData(getInitialFormData());
            setTahapRisikoSelepas({ label: "Tiada Data", color: "#f1f5f9" });
            setValidationMessage("");
        }
    }, [isOpen, logDataToEdit, getInitialFormData]);

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

        setIsLoading(true);

        const isEdit = isEditMode;
        const logId = formData.log_id;
        const method = isEdit ? "put" : "post";
        const url = isEdit ? `/pemantauan-risiko/log/${logId}` : "/pemantauan-risiko/log";

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
            setToast({ variant: "warning", title: "Medan Wajib", message: `Sila lengkapkan maklumat wajib berikut: ${missingFields.join(", ")}.` });
            setIsLoading(false);
            return;
        }

        const k = formData.skor_kebarangkalian_selepas;
        const i = formData.skor_impak_selepas;

        if ((k && !i) || (!k && i)) {
            setToast({ variant: "warning", title: "Skor Tidak Lengkap", message: "Sila lengkapkan kedua-dua Skor Kebarangkalian dan Skor Impak, atau biarkan kedua-duanya kosong." });
            setIsLoading(false);
            return;
        }

        if (!isEdit && validationMessage.includes("❌")) {
            setToast({ variant: "error", title: "Ralat Pengesahan", message: `Sila betulkan ralat pada tahun atau separuh tahun: ${validationMessage.replace("❌ ", "")}` });
            setIsLoading(false);
            return;
        }

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
            setToast({ variant: "success", title: "Berjaya", message: `Log Pemantauan untuk Risiko ${risikoTeks || risikoNoRujukan} berjaya ${actionText}!` });

            const notify = onSaveSuccess || onLogAdded;
            if (typeof notify === "function") {
                try { notify(savedLog); } catch (err) { console.warn("callback error:", err); }
            }

            onClose?.();
        } catch (err) {
            console.error(`❌ Ralat ${isEdit ? "mengedit" : "menambah"} log:`, err);
            setToast({ variant: "error", title: "Gagal", message: `Gagal ${isEdit ? "mengedit" : "menambah"} log. ${err.response?.data?.error || err.message || "Sila cuba lagi."}` });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const periodLocked = isEditMode || isViewMode;
    const staffLocked = isViewMode || (isEditMode && isStaff);
    const skorLocked = isViewMode || (isEditMode && (isExecutive || isStaff));

    const renderSectionHeading = (title) => (
        <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
            <span className="h-px grow bg-border" />
        </div>
    );

    const renderListEditor = (listName, itemKey, placeholderPrefix) => (
        <div className="space-y-2">
            {formData[listName].map((item, index) => (
                <div className="flex items-start gap-2" key={index}>
                    <Input
                        type="text"
                        value={item[itemKey]}
                        onChange={(e) => handleListChange(listName, index, itemKey, e.target.value)}
                        placeholder={staffLocked ? "" : `${placeholderPrefix} ${index + 1}`}
                        readOnly={staffLocked}
                        className={staffLocked ? "bg-muted text-muted-foreground" : ""}
                    />
                    {!staffLocked && formData[listName].length > 1 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Buang"
                            onClick={() => handleRemoveListItem(listName, index)}
                            className="h-8 w-8 shrink-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            <Trash2 />
                        </Button>
                    )}
                    {!staffLocked && index === formData[listName].length - 1 && (
                        <Button
                            type="button"
                            size="icon"
                            aria-label="Tambah"
                            onClick={() => handleAddListItem(listName)}
                            className="h-8 w-8 shrink-0 rounded-lg"
                        >
                            <Plus />
                        </Button>
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <>
            <style>{`@keyframes prmFadeIn{from{opacity:0}to{opacity:1}}`}</style>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-[prmFadeIn_.18s_ease-out]">
                <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl animate-[prmFadeIn_.22s_ease-out]">
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    {isViewMode ? <Eye size={16} /> : isEditMode ? <Pencil size={16} /> : <ClipboardPlus size={16} />}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate text-[15px] font-semibold leading-tight text-foreground">{modalTitle}</h2>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {risikoNoRujukan}{risikoTeks ? ` · ${risikoTeks}` : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button type="button" variant="ghost" size="sm" onClick={openPanduan} className="gap-1.5 text-muted-foreground">
                                    <BookOpen />
                                    Panduan
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Tutup Borang" className="h-8 w-8 rounded-lg">
                                    <X />
                                </Button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">

                            <section className="space-y-3">
                                {renderSectionHeading("Maklumat Pemantauan")}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Tahun Pemantauan <span className="text-destructive">*</span></Label>
                                        <Input
                                            type="number"
                                            name="tahun_pemantauan"
                                            value={formData.tahun_pemantauan}
                                            onChange={handleChange}
                                            required
                                            readOnly={periodLocked}
                                            className={periodLocked ? "bg-muted text-muted-foreground" : ""}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Separuh Tahun <span className="text-destructive">*</span></Label>
                                        <Select
                                            name="separuh_tahun_pemantauan"
                                            value={formData.separuh_tahun_pemantauan}
                                            onChange={handleChange}
                                            disabled={periodLocked}
                                            className={periodLocked ? "bg-muted text-muted-foreground" : ""}
                                        >
                                            <option value={1}>Pertama</option>
                                            <option value={2}>Kedua</option>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Kelulusan</Label>
                                        <Input
                                            type="text"
                                            name="no_bil_kelulusan"
                                            value={formData.no_bil_kelulusan}
                                            onChange={handleChange}
                                            readOnly={staffLocked}
                                            className={staffLocked ? "bg-muted text-muted-foreground" : ""}
                                        />
                                    </div>
                                </div>

                                {validationMessage && !isEditMode && !isViewMode && (
                                    <p className={`text-[13px] font-medium ${
                                        validationMessage.includes("✅")
                                            ? "text-success"
                                            : validationMessage.includes("❌") || validationMessage.includes("⚠️")
                                                ? "text-destructive"
                                                : "text-warning"
                                    }`}>
                                        {validationMessage}
                                    </p>
                                )}

                                <div className="space-y-2 pt-1">
                                    <Label className="text-xs font-medium">Pelan Tindakan Pemantauan</Label>
                                    {renderListEditor("pelan_tindakan_list", "butiran_aktiviti", "Butiran Pelan Tindakan")}
                                </div>

                                <div className="space-y-2 pt-1">
                                    <Label className="text-xs font-medium">Kakitangan Bertanggungjawab</Label>
                                    {renderListEditor("kakitangan_list", "butiran_kakitangan", "Kakitangan Bertanggungjawab")}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Kekerapan</Label>
                                    <Input
                                        type="text"
                                        name="kekerapan_pemantauan"
                                        value={formData.kekerapan_pemantauan}
                                        onChange={handleChange}
                                        placeholder={staffLocked ? "" : "Contoh: 3 Bulan / Tahunan"}
                                        readOnly={staffLocked}
                                        className={staffLocked ? "bg-muted text-muted-foreground" : ""}
                                    />
                                </div>
                            </section>

                            <section className="space-y-3">
                                {renderSectionHeading("Penilaian & Keberkesanan")}
                                <div className="rounded-lg border border-border bg-accent/60 p-3">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium">Skor Kebarangkalian</Label>
                                                <Select
                                                    name="skor_kebarangkalian_selepas"
                                                    value={formData.skor_kebarangkalian_selepas}
                                                    onChange={handleChange}
                                                    disabled={skorLocked}
                                                    className={skorLocked ? "bg-muted text-muted-foreground" : ""}
                                                >
                                                    <option value="">- Sila Pilih -</option>
                                                    {SKOR_KEBARANGKALIAN_DESC.map((item) => (
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium">Skor Impak</Label>
                                                <Select
                                                    name="skor_impak_selepas"
                                                    value={formData.skor_impak_selepas}
                                                    onChange={handleChange}
                                                    disabled={skorLocked}
                                                    className={skorLocked ? "bg-muted text-muted-foreground" : ""}
                                                >
                                                    <option value="">- Sila Pilih -</option>
                                                    {SKOR_IMPAK_DESC.map((item) => (
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5 sm:col-span-2">
                                                <Label className="text-xs font-medium">Tahap Risiko Semasa</Label>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex h-7 min-w-[72px] items-center justify-center rounded-md border border-black/5 px-3 text-xs font-bold uppercase tracking-wide ${
                                                            tahapRisikoSelepas.color === "#f1f5f9" ? "text-slate-500" : "text-white"
                                                        }`}
                                                        style={{ backgroundColor: tahapRisikoSelepas.color }}
                                                    >
                                                        {tahapRisikoSelepas.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5 sm:col-span-2">
                                                <Label className="text-xs font-medium">Keberkesanan (Automatik)</Label>
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
                                                    className="cursor-default bg-muted text-muted-foreground"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-center gap-2 lg:w-[200px]">
                                            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Matriks Risiko</span>
                                            <RiskMatrixVisual
                                                compact
                                                kebarangkalian={formData.skor_kebarangkalian_selepas}
                                                impak={formData.skor_impak_selepas}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-3">
                                {renderSectionHeading("Status & Catatan")}
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Status Pemantauan Semasa <span className="text-destructive">*</span></Label>
                                        <Select
                                            name="status_pemantauan"
                                            value={formData.status_pemantauan}
                                            onChange={handleChange}
                                            required
                                            disabled={isViewMode}
                                            className={isViewMode ? "bg-muted text-muted-foreground" : ""}
                                        >
                                            <option value="">- Sila Pilih -</option>
                                            <option>Buka</option>
                                            <option>Sedang Dilaksanakan</option>
                                            <option>Pemantauan</option>
                                            <option>Selesai</option>
                                            <option>Tutup</option>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Catatan</Label>
                                        <Textarea
                                            name="catatan"
                                            value={formData.catatan}
                                            onChange={handleChange}
                                            rows={5}
                                            readOnly={isViewMode}
                                            className={`min-h-[100px] resize-y ${isViewMode ? "bg-muted text-muted-foreground" : ""}`}
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-white px-5 py-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                {isViewMode ? "Tutup" : "Batal"}
                            </Button>
                            {!isViewMode && (
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                    {isLoading ? "Menyimpan..." : (isEditMode ? "Simpan Perubahan" : "Simpan Log")}
                                </Button>
                            )}
                        </div>
                    </form>

                    {PanduanRenderer}
                </div>
            </div>

            {toast && (
                <div className="fixed top-[64px] right-4 z-[60] max-w-sm">
                    <Toast variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
                </div>
            )}
        </>
    );
}
