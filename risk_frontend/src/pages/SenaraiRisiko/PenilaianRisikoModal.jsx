import { useState, useEffect } from "react";
import { X, BookOpen, Save, ClipboardCheck, Loader2 } from "lucide-react";
import api from "../../api/api";
import { getAuthUser, canEditPenilaian as checkCanEditPenilaian } from "../../utils/auth";
import { riskMatrix, getRiskMatrix, getRiskAbbreviation, KebarangkalianData, ImpakData } from "../../constants/riskMatrix";
import { usePanduan } from "../../hooks/usePanduan";
import Toast from "@/components/ui/toast";
import RiskMatrixVisual from "@/components/ui/risk-matrix-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function PenilaianRisikoModal({ isOpen, onClose, initialData = {} }) {
    if (!isOpen) return null;

    // Hanya ambil data Penilaian Risiko yang BOLEH DIUBAH (serta data display minimal)
    const [formData, setFormData] = useState({
        noRujukan: initialData.no_rujukan || "",
        skorKebarangkalian: initialData.skor_kebarangkalian ? String(initialData.skor_kebarangkalian) : "", 
        skorImpak: initialData.skor_impak ? String(initialData.skor_impak) : "",
        skorRisiko: initialData.skor_risiko || "", 
        statusRisiko: initialData.status_risiko || "", 
        tahapRisiko: initialData.tahap_risiko || "" 
    });

    const [riskColor, setRiskColor] = useState("#f1f5f9");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const { openPanduan, PanduanTrigger, PanduanRenderer } = usePanduan(); 
    
    // Auth Check
    const authUser = getAuthUser();
    const userRole = authUser?.role || "";
    const canEditPenilaian = checkCanEditPenilaian();

    // Effect untuk mengira skor Risiko berdasarkan K & I
    useEffect(() => {
        const k = parseInt(formData.skorKebarangkalian);
        const i = parseInt(formData.skorImpak);

        let newSkorRisiko = formData.skorRisiko;
        let newTahapRisiko = formData.tahapRisiko;
        let newStatusRisiko = formData.statusRisiko;
        let newColor = "#f1f5f9"; 

        if (k && i) {
            const { label, color } = getRiskMatrix(k, i);
            newTahapRisiko = label;
            newSkorRisiko = getRiskAbbreviation(label); 
            newStatusRisiko = (label === "Rendah" || label === "") ? "Tidak" : "Ya";
            newColor = color;
        } else if (!k && !i) {
            newSkorRisiko = "";
            newTahapRisiko = "";
            newStatusRisiko = "";
            newColor = "#f1f5f9";
        }

        setFormData(prev => ({ 
            ...prev, 
            skorRisiko: newSkorRisiko, 
            tahapRisiko: newTahapRisiko, 
            statusRisiko: newStatusRisiko 
        }));
        setRiskColor(newColor);
        
    }, [formData.skorKebarangkalian, formData.skorImpak]);

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        
        if (!canEditPenilaian) return setToast({ variant: "warning", title: "Tidak Dibenarkan", message: "Anda tidak mempunyai kebenaran untuk mengemaskini penilaian risiko." });
        if (!initialData.risiko_id) return setToast({ variant: "error", title: "Ralat", message: "ID Risiko tidak sah untuk dikemaskini." });

        const k = formData.skorKebarangkalian;
        const i = formData.skorImpak;
        if ((k && !i) || (!k && i)) {
            return setToast({ variant: "warning", title: "Medan Tidak Lengkap", message: "Anda mesti mengisi KEDUA-DUA Skor Kebarangkalian dan Skor Impak, atau TIDAK MENGISI KEDUA-DUANYA." });
        }

        // Kita HANYA mengemas kini skor, tetapi API memerlukan SEMUA data lama
        const finalData = { 
            // Data Asal (dari initialData) - MESTI dihantar
            noRujukan: initialData.no_rujukan,
            tahun: initialData.tahun,
            separuhTahun: initialData.separuh_tahun,
            syarikat: initialData.syarikat_id || initialData.syarikat, 
            kategori: initialData.kategori,
            bahagian: initialData.bahagian_unit || initialData.bahagian,
            risiko: initialData.risiko,
            punca: initialData.punca || [],
            kesan: initialData.kesan || [],

            // Data penilaian yang dikemaskini (dari formData)
            skorKebarangkalian: k !== "" ? parseInt(k) : null,
            skorImpak: i !== "" ? parseInt(i) : null,
            skorRisiko: formData.skorRisiko, 
            statusRisiko: formData.statusRisiko, 
            tahapRisiko: formData.tahapRisiko,
        };

        setIsSubmitting(true);
        try {
            await api.put(`/risiko/${initialData.risiko_id}`, finalData); 
            setToast({ variant: "success", title: "Berjaya", message: "Penilaian Risiko berjaya dikemaskini!" });
            setTimeout(() => onClose(true), 1500);
        } catch (err) {
            console.error("❌ Error kemaskini penilaian:", err.response?.data || err.message);
            setToast({ variant: "error", title: "Gagal Mengemaskini", message: "Gagal mengemaskini penilaian risiko." });
        } finally { setIsSubmitting(false); }
    };

    const readOnlyFieldCls = "cursor-default bg-muted/50 text-muted-foreground";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ClipboardCheck className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-semibold text-foreground">Kemaskini Penilaian Risiko</h3>
                            <p className="truncate text-xs text-muted-foreground">No. Rujukan: {formData.noRujukan || "-"}</p>
                        </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onClose(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 space-y-4 overflow-y-auto p-5">
                        <div className="rounded-lg border border-border p-4">
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penilaian Risiko</h4>
                                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={openPanduan}>
                                    <BookOpen className="h-3.5 w-3.5" />
                                    Panduan Matriks
                                </Button>
                            </div>

                            <div className="rounded-lg border border-border bg-accent/60 p-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {/* Skor Kebarangkalian */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Skor Kebarangkalian:</Label>
                                        <Select name="skorKebarangkalian" value={formData.skorKebarangkalian} onChange={handleChange} disabled={!canEditPenilaian}>
                                            <option value="">-- Pilih --</option>
                                            {Object.entries(KebarangkalianData).map(([value, label])=> (
                                                <option key={value} value={value}>
                                                    {value} - {label} 
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    {/* Skor Impak */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Skor Impak:</Label>
                                        <Select name="skorImpak" value={formData.skorImpak} onChange={handleChange} disabled={!canEditPenilaian}>
                                            <option value="">-- Pilih --</option>
                                            {Object.entries(ImpakData).map(([value, label])=> (
                                                <option key={value} value={value}>
                                                    {value} - {label} 
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    {/* Hasil Skor Risiko (Read-Only) */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Tahap Risiko:</Label>
                                        <Input 
                                            type="text" 
                                            value={formData.skorRisiko} 
                                            readOnly 
                                            className="cursor-default text-center font-semibold"
                                            style={{ background: riskColor, color: riskColor === "#f1f5f9" ? "#334155" : "#ffffff" }} 
                                        />
                                    </div>

                                    {/* Hasil Status Risiko (Read-Only) */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Status Risiko:</Label>
                                        <Input
                                            type="text"
                                            readOnly
                                            value={
                                                formData.statusRisiko === "Ya"
                                                    ? "Ya (Memerlukan tindakan segera)" 
                                                    : formData.statusRisiko === "Tidak"
                                                        ? "Tidak (Tidak memerlukan tindakan segera)"
                                                            : ""
                                            }
                                            className={`${readOnlyFieldCls} text-xs`}
                                        />
                                    </div>
                                </div>

                                {/* Matriks risiko - kedudukan live mengikut skor dipilih */}
                                <div className="mt-4 flex flex-col items-center border-t border-border pt-4">
                                    <Label className="mb-3 text-xs font-medium">Kedudukan pada Matriks Risiko:</Label>
                                    <RiskMatrixVisual kebarangkalian={formData.skorKebarangkalian} impak={formData.skorImpak} compact />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-white px-5 py-3">
                        <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !canEditPenilaian}>
                            {isSubmitting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</>
                            ) : (
                                <><Save className="h-4 w-4" />Simpan Penilaian</>
                            )}
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

export default PenilaianRisikoModal;
