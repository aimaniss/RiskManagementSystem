import { useState, useEffect } from "react";
import { X, Trash2, Plus, Save, Stethoscope, Loader2 } from "lucide-react";
import api from "../../api/api";
import Toast from "@/components/ui/toast";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!isOpen || !risk?.risiko_id) {
            console.log("❌ Modal tidak buka atau tiada risiko_id");
            return;
        }

        console.log("🔍 Fetching rawatan data for risiko_id:", risk.risiko_id);

        const fetchRawatanData = async () => {
            setIsLoadingData(true);
            
            try {
                const response = await api.get(`/risiko/${risk.risiko_id}/rawatan`);
                console.log("✅ Rawatan data fetched:", response.data);
                
                if (response.data && response.data.rawatan_id) {
                    const rawatanData = response.data;
                    
                    setFormData({
                        risiko_id: risk.risiko_id,
                        rawatan_id: rawatanData.rawatan_id,
                        planTindakan: Array.isArray(rawatanData.plan_tindakan) && rawatanData.plan_tindakan.length > 0 
                            ? rawatanData.plan_tindakan
                            : [""],
                        jenisKawalan: rawatanData.jenis_kawalan || "",
                        tempohSiap: rawatanData.tempoh_jangkaan_siap || "",
                        kakitanganBertanggungjawab: Array.isArray(rawatanData.kakitangan_bertanggungjawab) && rawatanData.kakitangan_bertanggungjawab.length > 0
                            ? rawatanData.kakitangan_bertanggungjawab
                            : [""],
                    });
                    
                    console.log("✅ Form data set:", {
                        rawatan_id: rawatanData.rawatan_id,
                        planTindakan: rawatanData.plan_tindakan,
                        jenisKawalan: rawatanData.jenis_kawalan
                    });
                } else {
                    throw new Error("Rawatan tidak dijumpai");
                }
                
            } catch (err) {
                console.warn("⚠️ Rawatan tidak dijumpai:", err.message);
                setToast({ variant: "warning", title: "Rawatan Tidak Dijumpai", message: "Rawatan risiko belum wujud. Sila tambah rawatan terlebih dahulu." });
                setTimeout(() => onClose(false), 2000);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchRawatanData();
    }, [isOpen, risk, onClose]);

    const handleSave = async () => {
        const cleanedPlanTindakan = formData.planTindakan.filter(p => p.trim() !== "");
        const cleanedKakitangan = formData.kakitanganBertanggungjawab.filter(k => k.trim() !== "");

        if (!formData.rawatan_id) {
            setToast({ variant: "error", title: "Ralat", message: "Rawatan ID tidak dijumpai. Sila tutup modal dan cuba lagi." });
            return;
        }

        if (
            cleanedPlanTindakan.length === 0 || 
            cleanedKakitangan.length === 0 || 
            !formData.jenisKawalan || 
            !formData.tempohSiap
        ) {
            setToast({ variant: "warning", title: "Medan Tidak Lengkap", message: "Sila lengkapkan semua medan wajib." });
            return;
        }

        const payload = {
            plan_tindakan: cleanedPlanTindakan, 
            jenis_kawalan: formData.jenisKawalan,
            tempoh_jangkaan_siap: formData.tempohSiap, 
            kakitangan_bertanggungjawab: cleanedKakitangan,
        };

        const url = `/risiko/${formData.risiko_id}/rawatan`;

        console.log(`🔄 Updating rawatan:`, { url, payload });

        try {
            setSaving(true);
            
            await api.put(url, payload);
            
            console.log("✅ Rawatan saved successfully");
            
            setToast({ variant: "success", title: "Berjaya", message: "Rawatan risiko berjaya dikemaskini!" });
            
            setTimeout(() => onClose(true), 1500);
            
        } catch (err) {
            console.error("❌ Gagal menyimpan rawatan:", err.response?.data || err.message);
            setToast({ variant: "error", title: "Gagal Menyimpan", message: `Gagal menyimpan perubahan. ${err.response?.data?.message || 'Sila cuba lagi.'}` });
        } finally {
            setSaving(false);
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
                                <Stethoscope className="h-4 w-4" />
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Stethoscope className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-semibold text-foreground">Kemaskini Rawatan Risiko</h3>
                            <p className="truncate text-xs text-muted-foreground">Pelan tindakan dan kawalan risiko</p>
                        </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onClose(false)} aria-label="Tutup Borang">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 space-y-4 overflow-y-auto p-5">
                        <div className="rounded-lg border border-border p-4">
                            <Label className="text-xs font-medium">Pelan Tindakan: <span className="text-destructive">*</span></Label>
                            <div className="mt-2 space-y-2">
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
                                            required={idx === 0} 
                                        />
                                        {formData.planTindakan.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        planTindakan: prev.planTindakan.filter((_, i) => i !== idx),
                                                    }))
                                                }
                                                aria-label="Buang Plan Tindakan"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {idx === formData.planTindakan.length - 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        planTindakan: [...prev.planTindakan, ""],
                                                    }))
                                                }
                                                aria-label="Tambah Plan Tindakan"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Jenis Kawalan: <span className="text-destructive">*</span></Label>
                                    <Select
                                        value={formData.jenisKawalan || ""}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, jenisKawalan: e.target.value }))}
                                        required
                                    >
                                        <option value="">-- Pilih Strategi Kawalan --</option>
                                        <option value="Terima">Terima – Menerima risiko </option>
                                        <option value="Kurang">Kurang – Mengurangkan kebarangkalian dan impak risiko</option>
                                        <option value="Pindah">Pindah – Pindahkan risiko </option>
                                        <option value="Elak">Elak – Berhenti menjalankan aktiviti / program atau mengubah objektif aktiviti yang boleh menyebabkan risiko</option>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Tempoh Jangkaan Siap Tindakan: <span className="text-destructive">*</span></Label>
                                    <Input
                                        type="text" 
                                        value={formData.tempohSiap || ""}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, tempohSiap: e.target.value }))}
                                        placeholder="Cth: 2 bulan"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-4">
                            <Label className="text-xs font-medium">Kakitangan Bertanggungjawab: <span className="text-destructive">*</span></Label> 
                            <div className="mt-2 space-y-2">
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
                                            required={idx === 0} 
                                        />
                                        {formData.kakitanganBertanggungjawab.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        kakitanganBertanggungjawab: prev.kakitanganBertanggungjawab.filter((_, i) => i !== idx),
                                                    }))
                                                }
                                                aria-label="Buang Kakitangan"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {idx === formData.kakitanganBertanggungjawab.length - 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        kakitanganBertanggungjawab: [...prev.kakitanganBertanggungjawab, ""],
                                                    }))
                                                }
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

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-white px-5 py-3">
                        <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={saving}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</>
                            ) : (
                                <><Save className="h-4 w-4" />Simpan Rawatan</>
                            )}
                        </Button>
                    </div>
                </form>
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
