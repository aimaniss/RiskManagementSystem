import { useState, useEffect } from "react";
import { X, Save, FilePenLine, Plus, Trash2, Loader2 } from "lucide-react";
import api from "../../api/api";
import { getAuthUser, canEditPenilaian as checkCanEditPenilaian } from "../../utils/auth";
import Toast from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function PengenalpastianModal({ isOpen, onClose, initialData = {} }) {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        noRujukan: initialData.no_rujukan || "",
        tahun: initialData.tahun || "",
        separuhTahun: initialData.separuh_tahun || "",
        syarikat: initialData.syarikat_id || initialData.syarikat || "",
        kategori: initialData.kategori || "",
        bahagian: initialData.bahagian_unit || initialData.bahagian || "",
        risiko: initialData.risiko || "",
        punca: initialData.punca || ["", ""],
        kesan: initialData.kesan || ["", ""],
    });

    const [syarikatList, setSyarikatList] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    
    const authUser = getAuthUser();
    const userRole = authUser?.role || "";
    const canEditPengenalpastian = checkCanEditPenilaian();

    useEffect(() => {
        const fetchSyarikat = async () => {
            try {
                const res = await api.get("/syarikat");
                const data = Array.isArray(res.data) ? res.data : res.data.syarikat || [];
                setSyarikatList(data);
            } catch (err) {
                console.error("❌ Error fetch syarikat:", err);
            }
        };
        fetchSyarikat();
    }, []); 

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleListChange = (listName, index, value) => {
        const list = [...formData[listName]];
        list[index] = value;
        setFormData(prev => ({ ...prev, [listName]: list }));
    };

    const handleAddListItem = (listName) => {
        setFormData(prev => ({ ...prev, [listName]: [...prev[listName], ""] }));
    };

    const handleRemoveListItem = (listName, index) => {
        const list = formData[listName].filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, [listName]: list }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        
        if (!canEditPengenalpastian) return setToast({ variant: "warning", title: "Tidak Dibenarkan", message: "Anda tidak mempunyai kebenaran untuk mengemaskini maklumat risiko." });
        if (!initialData.risiko_id) return setToast({ variant: "error", title: "Ralat", message: "ID Risiko tidak sah untuk dikemaskini." });

        const finalData = { 
            noRujukan: formData.noRujukan,
            tahun: formData.tahun,
            separuhTahun: formData.separuhTahun,
            syarikat: formData.syarikat, 
            kategori: formData.kategori,
            bahagian: formData.bahagian,
            risiko: formData.risiko,
            punca: formData.punca.filter(p => p && p.trim() !== ""),
            kesan: formData.kesan.filter(k => k && k.trim() !== ""),
            
            skorKebarangkalian: initialData.skor_kebarangkalian !== undefined ? initialData.skor_kebarangkalian : null,
            skorImpak: initialData.skor_impak !== undefined ? initialData.skor_impak : null,
            skorRisiko: initialData.skor_risiko || "",
            statusRisiko: initialData.status_risiko || "",
            tahapRisiko: initialData.tahap_risiko || ""
        };

        setIsSubmitting(true);
        try {
            await api.put(`/risiko/${initialData.risiko_id}`, finalData); 
            setToast({ variant: "success", title: "Berjaya", message: "Pengenalpastian Risiko berjaya dikemaskini!" });
            setTimeout(() => onClose(true), 1500);
        } catch (err) {
            console.error("❌ Error kemaskini pengenalpastian:", err.response?.data || err.message);
            setToast({ variant: "error", title: "Gagal Mengemaskini", message: "Gagal mengemaskini pengenalpastian risiko." });
        } finally { setIsSubmitting(false); }
    };

    const syarikatName = syarikatList.find(s => s.syarikat_id == formData.syarikat)?.nama_syarikat || "Memuat...";
    const readOnlyFieldCls = "cursor-default bg-muted/50 text-muted-foreground";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FilePenLine className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-semibold text-foreground">Kemaskini Pengenalpastian Risiko</h3>
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
                            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Maklumat Asas Risiko</h4>

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
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Kategori Risiko:</Label>
                                    <Select 
                                        name="kategori" 
                                        value={formData.kategori} 
                                        onChange={handleChange} 
                                        disabled={!canEditPengenalpastian}
                                    >
                                        <option value="">-- Pilih --</option>
                                        <option>Operasi</option>
                                        <option>Kewangan</option>
                                        <option>Strategik</option>
                                        <option>Pematuhan / Perundangan</option>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Bahagian/Unit:</Label>
                                    <Textarea name="bahagian" value={formData.bahagian} onChange={handleChange} className="h-[70px] resize-none" disabled={!canEditPengenalpastian} />
                                </div>
                            </div>

                            <div className="mt-4 space-y-1.5">
                                <Label className="text-xs font-medium">Risiko:</Label>
                                <Textarea name="risiko" value={formData.risiko} onChange={handleChange} placeholder="Huraian Risiko" disabled={!canEditPengenalpastian} />
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-4">
                            <Label className="text-xs font-medium">Punca:</Label>
                            <div className="mt-2 space-y-2">
                                {formData.punca.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <Input 
                                            value={p} 
                                            onChange={(e) => handleListChange('punca', idx, e.target.value)}
                                            placeholder={`Punca ${idx + 1}`}
                                            disabled={!canEditPengenalpastian} 
                                        />
                                        {canEditPengenalpastian && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveListItem('punca', idx)}
                                                aria-label="Buang Punca"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {canEditPengenalpastian && (
                                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => handleAddListItem('punca')}>
                                    <Plus className="h-4 w-4" />
                                    Tambah Punca
                                </Button>
                            )}
                        </div>

                        <div className="rounded-lg border border-border p-4">
                            <Label className="text-xs font-medium">Kesan:</Label>
                            <div className="mt-2 space-y-2">
                                {formData.kesan.map((k, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <Input 
                                            value={k} 
                                            onChange={(e) => handleListChange('kesan', idx, e.target.value)}
                                            placeholder={`Kesan ${idx + 1}`}
                                            disabled={!canEditPengenalpastian} 
                                        />
                                        {canEditPengenalpastian && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveListItem('kesan', idx)}
                                                aria-label="Buang Kesan"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {canEditPengenalpastian && (
                                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => handleAddListItem('kesan')}>
                                    <Plus className="h-4 w-4" />
                                    Tambah Kesan
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-white px-5 py-3">
                        <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !canEditPengenalpastian}>
                            {isSubmitting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</>
                            ) : (
                                <><Save className="h-4 w-4" />Simpan Pengenalpastian</>
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

export default PengenalpastianModal;
