import { useState, useEffect } from "react";
import { X, BookOpen, Save, ClipboardList, Loader2 } from "lucide-react";
import api from "../../api/api";
import Toast from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { canEditPenilaian as checkCanEditPenilaian } from "../../utils/auth";
import { riskMatrix, getRiskMatrix, getRiskAbbreviation, KebarangkalianData, ImpakData } from "../../constants/riskMatrix";
import { useSyarikats } from "../../hooks/useSyarikats";
import { usePanduan } from "../../hooks/usePanduan";

function PenilaianModal({ isOpen, onClose, initialData = {} }) {

    const [formData, setFormData] = useState({
        noRujukan: initialData.no_rujukan || "",
        tahun: initialData.tahun || "",
        separuhTahun: initialData.separuh_tahun || "",
        syarikat_id: initialData.syarikat_id || initialData.syarikat_id || "",
        kategori: initialData.kategori || "",
        bahagian: initialData.bahagian_unit || initialData.bahagian || "",
        risiko: initialData.risiko || "",
        skorKebarangkalian: initialData.skor_kebarangkalian || "", 
        skorImpak: initialData.skor_impak || "",
        skorRisiko: initialData.skor_risiko || "",
        statusRisiko: initialData.status_risiko || "",
        tahapRisiko: initialData.tahap_risiko || ""
    });

    const [puncaList] = useState(initialData.punca || []); 
    const [kesanList] = useState(initialData.kesan || []);

    const [riskColor, setRiskColor] = useState("#f1f5f9");
    const { syarikatList } = useSyarikats();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const { openPanduan, PanduanTrigger, PanduanRenderer } = usePanduan(); 

    const canEditPenilaian = checkCanEditPenilaian();

    useEffect(() => {
        const k = parseInt(formData.skorKebarangkalian);
        const i = parseInt(formData.skorImpak);

        let newSkorRisiko = formData.skorRisiko;
        let newTahapRisiko = formData.tahapRisiko;
        let newStatusRisiko = formData.statusRisiko;
        let newColor = "#f1f5f9";

        if (!k && !i && formData.tahapRisiko) {
            const initialLabel = formData.tahapRisiko;
            for(let keyK in riskMatrix) {
                for(let keyI in riskMatrix[keyK]) {
                    if(riskMatrix[keyK][keyI].label === initialLabel) {
                        newColor = riskMatrix[keyK][keyI].color;
                        break;
                    }
                }
                if(newColor !== "#f1f5f9") break;
            }
        }

        if (k && i) {
            const { label, color } = getRiskMatrix(k, i);
            newTahapRisiko = label;
            newSkorRisiko = getRiskAbbreviation(label);
            newStatusRisiko = (label === "Rendah" || label === "") ? "Tidak" : "Ya";
            newColor = color;
        } else if (formData.skorKebarangkalian === "" && formData.skorImpak === "") {
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
        
        if (!canEditPenilaian) return setToast({ variant: "error", title: "Akses Ditolak", message: "Anda tidak mempunyai kebenaran untuk mengemaskini penilaian risiko." });
        if (!initialData.risiko_id) return setToast({ variant: "error", title: "Ralat", message: "ID Risiko tidak sah untuk dikemaskini." });

        const k = formData.skorKebarangkalian;
        const i = formData.skorImpak;
        if ((k && !i) || (!k && i)) {
            return setToast({ variant: "warning", title: "Amaran", message: "Anda mesti mengisi KEDUA-DUA Skor Kebarangkalian dan Skor Impak, atau TIDAK MENGISI KEDUA-DUANYA." });
        }

        const finalData = { 
            skorKebarangkalian: formData.skorKebarangkalian !== "" ? parseInt(formData.skorKebarangkalian) : null,
            skorImpak: formData.skorImpak !== "" ? parseInt(formData.skorImpak) : null,
            skorRisiko: formData.skorRisiko,
            statusRisiko: formData.statusRisiko,
            tahapRisiko: formData.tahapRisiko,
        };

        setIsSubmitting(true);
        try {
            await api.put(`/rawatan/penilaian/${initialData.risiko_id}`, finalData); 
            
            setToast({ variant: "success", title: "Berjaya", message: "Penilaian Risiko berjaya dikemaskini! Status pemantauan dikemaskini kepada: Sedang Dilaksanakan" });
            onClose(true);
        } catch (err) {
            console.error("❌ Error kemaskini penilaian:", err.response?.data || err.message);
            setToast({ variant: "error", title: "Ralat", message: "Gagal mengemaskini penilaian risiko." });
        } finally { setIsSubmitting(false); }
    };

    const syarikatName = syarikatList.find(s => s.syarikat_id == formData.syarikat_id)?.nama_syarikat || "Memuat...";
    const readOnlyFieldCls = "cursor-default bg-muted/50 text-muted-foreground";

    if (!isOpen) return null;

    return (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl animate-in slide-in-from-bottom-4 duration-200">
                <div className="flex shrink-0 items-center justify-between border-b px-5 py-3.5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ClipboardList className="h-4 w-4" />
                        </span>
                        <div>
                            <h3 className="text-[15px] font-semibold text-foreground">Penilaian Risiko: {formData.noRujukan}</h3>
                            <p className="text-xs text-muted-foreground">Semak maklumat dan lengkapkan penilaian</p>
                        </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onClose(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 space-y-4 overflow-y-auto p-5">

                        <div className="rounded-lg border border-border p-4">
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pengenalpastian Risiko <span className="normal-case tracking-normal">(maklumat dipaparkan)</span></h4>
                                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={openPanduan}>
                                    <BookOpen className="h-3.5 w-3.5" />
                                    Panduan
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">No Rujukan:</Label>
                                    <Input readOnly value={formData.noRujukan} className={readOnlyFieldCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Tahun:</Label>
                                    <Input readOnly value={formData.tahun} className={readOnlyFieldCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Separuh Tahun:</Label>
                                    <Input readOnly value={formData.separuhTahun == 1 ? "Pertama" : formData.separuhTahun == 2 ? "Kedua" : ""} className={readOnlyFieldCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Syarikat:</Label>
                                    <Input readOnly value={syarikatName} className={readOnlyFieldCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Kategori Risiko:</Label>
                                    <Input readOnly value={formData.kategori} className={readOnlyFieldCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Bahagian/Unit:</Label>
                                    <Textarea readOnly value={formData.bahagian} className={`h-[70px] resize-none ${readOnlyFieldCls}`} />
                                </div>
                            </div>

                            <div className="mt-4 space-y-1.5">
                                <Label className="text-xs font-medium">Risiko:</Label>
                                <Textarea readOnly value={formData.risiko} placeholder="Huraian Risiko" className={`min-h-[70px] ${readOnlyFieldCls}`} />
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Punca:</Label>
                                    {puncaList.filter(p => p && p.trim() !== "").map((p, idx) => (
                                        <Input key={idx} readOnly value={`${idx + 1}. ${p}`} className={`mb-2 ${readOnlyFieldCls}`} />
                                    ))}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Kesan:</Label>
                                    {kesanList.filter(k => k && k.trim() !== "").map((k, idx) => (
                                        <Input key={idx} readOnly value={`${idx + 1}. ${k}`} className={`mb-2 ${readOnlyFieldCls}`} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {canEditPenilaian && (
                            <div className="rounded-lg border border-border p-4">
                                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penilaian Risiko</h4>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Skor Kebarangkalian:</Label>
                                        <select name="skorKebarangkalian" value={formData.skorKebarangkalian} onChange={handleChange} className="flex h-9 w-full appearance-none rounded-lg border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                            <option value="">-- Pilih --</option>
                                            {Object.entries(KebarangkalianData).map(([value, label])=> (
                                                <option key={value} value={value}>
                                                    {value} - {label} 
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Skor Impak:</Label>
                                        <select name="skorImpak" value={formData.skorImpak} onChange={handleChange} className="flex h-9 w-full appearance-none rounded-lg border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                            <option value="">-- Pilih --</option>
                                            {Object.entries(ImpakData).map(([value, label])=> (
                                                <option key={value} value={value}>
                                                    {value} - {label} 
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Tahap Risiko:</Label>
                                        <Input 
                                            type="text" 
                                            value={formData.skorRisiko}
                                            readOnly 
                                            className="cursor-default text-center font-semibold"
                                            style={{ background: riskColor, textAlign:"center", color: riskColor === "#f1f5f9" ? '#475569' : '#ffffff' }} 
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Status Risiko:</Label>
                                        <Input
                                            type="text"
                                            readOnly
                                            value={
                                                formData.statusRisiko === "Ya"
                                                    ? "Ya (Risiko memerlukan tindakan)" 
                                                    : formData.statusRisiko === "Tidak"
                                                        ? "Tidak (Risiko rendah-tiada tindakan)"
                                                        : ""
                                            }
                                            className={`${readOnlyFieldCls} text-xs`}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex shrink-0 justify-end gap-2 border-t bg-white px-5 py-3">
                        <Button type="submit" disabled={isSubmitting || !canEditPenilaian}>
                            {isSubmitting ? (<><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</>) : (<><Save className="h-4 w-4" />Simpan Penilaian</>)}
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

export default PenilaianModal;
