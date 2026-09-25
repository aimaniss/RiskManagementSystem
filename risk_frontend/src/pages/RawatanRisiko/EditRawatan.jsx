import { useState, useEffect } from "react";
import { X, Trash2, Plus, BookOpen, Save, Loader2 } from "lucide-react"; 
import api from "../../api/api"; 
import Toast from "@/components/ui/toast";
import ListDisplay from "../../components/ListDisplay";
import { getRiskMatrix, TAHAP_RISIKO_ORDER } from "../../constants/riskMatrix";
import { usePanduan } from "../../hooks/usePanduan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function EditRawatan({ isOpen, risk, onClose, onSave }) { 
    const { openPanduan, PanduanTrigger, PanduanRenderer } = usePanduan();
    const [formData, setFormData] = useState({
        planTindakan: [""],
        kakitanganBertanggungjawab: [""],
        jenisKawalan: "",
        tempohSiap: "", 
        risiko_id: null, 
        rawatan_id: null, 
        punca: [], 
        kesan: [],
        skor_kebarangkalian: null,
        skor_impak: null,
        tahap_risiko: "", 
        status_risiko: "", 
        status_risiko_desc: "", 
    });
    const [riskColor, setRiskColor] = useState("#f1f5f9");
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!isOpen) return; 

        if (risk?.risiko_id) {
            setFormData({
                planTindakan: [""],
                kakitanganBertanggungjawab: [""],
                jenisKawalan: "",
                tempohSiap: "", 
                risiko_id: risk.risiko_id, 
                rawatan_id: null, 
                ...risk, 
            });

            api
                .get(`/rawatan/${risk.risiko_id}`)
                .then(({ data }) => {
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
                        punca: data.punca || prev.punca, 
                        kesan: data.kesan || prev.kesan, 
                    }));
                })
                .catch((err) => {
                    if (err.response?.status !== 404) {
                        console.error("❌ Gagal fetch rawatan:", err);
                    }
                });
        }
    }, [isOpen, risk]);

    useEffect(() => {
        const k = parseInt(formData.skor_kebarangkalian);
        const i = parseInt(formData.skor_impak);
        
        if (k && i) {
            const { label, color, fullLabel } = getRiskMatrix(k, i);
            
            const isRequired = (fullLabel === "Tinggi" || fullLabel === "Sangat Tinggi");
            
            const status = isRequired ? "YA" : "TIDAK";
            const statusDesc = isRequired ? "Risiko memerlukan tindakan segera ." : "Risiko tidak memerlukan tindakan segera .";

            setFormData((prev) => ({
                ...prev,
                skor_risiko: k * i,
                tahap_risiko: label,
                status_risiko: status,
                status_risiko_desc: statusDesc,
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
            setToast({ variant: "warning", title: "Amaran", message: "Sila masukkan sekurang-kurangnya satu Plan Tindakan dan Kakitangan Bertanggungjawab, pilih Jenis Kawalan, dan isikan Tempoh Jangkaan Siap." });
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

            if (!isUpdate && response.data?.rawatan_id) {
                setFormData(prev => ({ ...prev, rawatan_id: finalRawatanId })); 
            }

            onSave({ 
                ...risk, 
                ...formData, 
                rawatan_id: finalRawatanId, 
                jenis_kawalan: formData.jenisKawalan,
                tempoh_jangkaan_siap: formData.tempohSiap,
                plan_tindakan: cleanedPlanTindakan,
                kakitangan_bertanggungjawab: cleanedKakitangan,
                risk_color: riskColor 
            });

            onClose();
            
            const statusMsg = isUpdate 
                ? "dikemaskini" 
                : "ditambah! Status pemantauan dikemaskini kepada: Pemantauan";
            setToast({ variant: "success", title: "Berjaya", message: `Rawatan risiko berjaya ${statusMsg}!` });
        } catch (err) {
            console.error("❌ Gagal menyimpan rawatan:", err.response?.data?.error || err.message);
            setToast({ variant: "error", title: "Ralat", message: `Gagal menyimpan perubahan. ${err.response?.data?.error || 'Sila cuba lagi.'}` });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl animate-in slide-in-from-bottom-4 duration-200">
                <div className="flex shrink-0 items-center justify-between border-b px-5 py-3.5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Plus className="h-4 w-4" />
                        </span>
                        <div>
                            <h3 className="text-[15px] font-semibold text-foreground">{formData.rawatan_id ? "Kemaskini Rawatan Risiko" : "Tambah Rawatan Risiko Baru"}</h3>
                            <p className="text-xs text-muted-foreground">No Rujukan: {formData.no_rujukan || "-"}</p>
                        </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Tutup Borang">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSave();
                    }}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="flex-1 space-y-4 overflow-y-auto p-5">

                        <div className="rounded-lg border border-border p-4">
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Maklumat Risiko</h4>
                                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={openPanduan}>
                                    <BookOpen className="h-3.5 w-3.5" />
                                    Panduan
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">No Rujukan:</Label>
                                    <p className="flex h-9 items-center rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground">{formData.no_rujukan || "-"}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Tahun:</Label>
                                    <p className="flex h-9 items-center rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground">{formData.tahun || "-"}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Separuh Tahun:</Label>
                                    <p className="flex h-9 items-center rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                                        {formData.separuh_tahun === 1 ? "Pertama" : formData.separuh_tahun === 2 ? "Kedua" : "-"}
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Syarikat:</Label>
                                    <p className="flex h-9 items-center rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground">{formData.nama_syarikat || "-"}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="rounded-lg border border-border p-4">
                            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pengenalpastian Risiko</h4>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Kategori Risiko:</Label>
                                    <p className="flex min-h-9 items-center rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground">{formData.kategori || "-"}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Bahagian/Unit:</Label>
                                    <p className="flex min-h-9 items-center rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground">{formData.bahagian || "-"}</p>
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label className="text-xs font-medium">Risiko:</Label>
                                    <p className="flex min-h-9 items-start rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground leading-relaxed">{formData.risiko || "-"}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Punca Risiko:</Label>
                                    <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm"><ListDisplay data={formData.punca} /></div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Kesan Risiko:</Label>
                                    <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm"><ListDisplay data={formData.kesan} /></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="rounded-lg border border-border p-4">
                            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penilaian Risiko</h4>
                            
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                                    <span className="block text-xs font-medium text-muted-foreground">Skor Kebarangkalian</span>
                                    <span className="mt-0.5 block text-lg font-semibold text-foreground">{formData.skor_kebarangkalian || "-"}</span>
                                </div>
                                
                                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                                    <span className="block text-xs font-medium text-muted-foreground">Skor Impak</span>
                                    <span className="mt-0.5 block text-lg font-semibold text-foreground">{formData.skor_impak || "-"}</span>
                                </div>
                                
                                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                                    <span className="block text-xs font-medium text-muted-foreground">Tahap Risiko</span>
                                    <span className="mt-1 inline-flex rounded-md px-2 py-1 text-sm font-semibold"
                                        style={{ backgroundColor: riskColor, color: riskColor === "#f1f5f9" ? '#475569' : '#ffffff' }}
                                        data-level={formData.tahap_risiko}
                                    >
                                        {formData.tahap_risiko || "-"}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 space-y-1.5"> 
                                <Label className="text-xs font-medium">Status Risiko:</Label> 
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={formData.status_risiko === "YA" ? "warning" : "secondary"} data-status={formData.status_risiko}>
                                        {formData.status_risiko || "-"} 
                                    </Badge>
                                    <span className="text-xs text-muted-foreground"> 
                                        ({formData.status_risiko_desc || "Tiada data skor"})
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-4">
                            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rawatan Risiko</h4>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Pelan Tindakan: <span className="text-destructive">*</span></Label>
                                    {formData.planTindakan.map((p, idx) => (
                                        <div key={`plan-${idx}`} className="flex items-center gap-2">
                                            <Input
                                                value={p}
                                                onChange={(e) => {
                                                    const newList = [...formData.planTindakan];
                                                    newList[idx] = e.target.value;
                                                    setFormData((prev) => ({ ...prev, planTindakan: newList }));
                                                }}
                                                placeholder={`Langkah Tindakan ${idx + 1}`}
                                                className="rounded-lg"
                                                required={idx === 0} 
                                            />
                                            {formData.planTindakan.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            planTindakan: prev.planTindakan.filter((_, i) => i !== idx),
                                                        }))
                                                    }
                                                    className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                    aria-label="Buang Plan Tindakan"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {idx === formData.planTindakan.length - 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            planTindakan: [...prev.planTindakan, ""],
                                                        }))
                                                    }
                                                    className="h-9 w-9 shrink-0 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                                                    aria-label="Tambah Plan Tindakan"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Jenis Kawalan: <span className="text-destructive">*</span></Label>
                                    <Select
                                        value={formData.jenisKawalan || ""}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, jenisKawalan: e.target.value }))}
                                        className="rounded-lg"
                                        required
                                    >
                                        <option value="">-- Pilih Strategi Kawalan --</option>
                                        <option value="Terima">Terima – Menerima risiko</option>
                                        <option value="Kurang">Kurang – Mengurangkan kebarangkalian dan impak risiko</option>
                                        <option value="Pindah">Pindah – Pindahkan risiko</option>
                                        <option value="Elak">Elak – Berhenti menjalankan aktiviti / program atau mengubah objektif aktiviti yang boleh menyebabkan risiko</option>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Tempoh Jangkaan Siap Tindakan: <span className="text-destructive">*</span></Label>
                                    <Input
                                        type="text" 
                                        value={formData.tempohSiap || ""}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, tempohSiap: e.target.value }))}
                                        placeholder="Cth: 2 bulan"
                                        className="rounded-lg"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Kakitangan Bertanggungjawab: <span className="text-destructive">*</span></Label> 
                                    {formData.kakitanganBertanggungjawab.map((s, idx) => (
                                        <div key={`kakitangan-${idx}`} className="flex items-center gap-2">
                                            <Input
                                                value={s}
                                                onChange={(e) => {
                                                    const newList = [...formData.kakitanganBertanggungjawab];
                                                    newList[idx] = e.target.value;
                                                    setFormData((prev) => ({ ...prev, kakitanganBertanggungjawab: newList }));
                                                }}
                                                placeholder={`Nama kakitangan / jawatan ${idx + 1}`}
                                                className="rounded-lg"
                                                required={idx === 0} 
                                            />
                                            {formData.kakitanganBertanggungjawab.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            kakitanganBertanggungjawab: prev.kakitanganBertanggungjawab.filter((_, i) => i !== idx),
                                                        }))
                                                    }
                                                    className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                    aria-label="Buang Kakitangan"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {idx === formData.kakitanganBertanggungjawab.length - 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            kakitanganBertanggungjawab: [...prev.kakitanganBertanggungjawab, ""],
                                                        }))
                                                    }
                                                    className="h-9 w-9 shrink-0 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                                                    aria-label="Tambah Kakitangan"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 justify-end gap-2 border-t bg-white px-5 py-3">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (<><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</>) : (<><Save className="h-4 w-4" />Simpan Kemaskini</>)}
                        </Button>
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
