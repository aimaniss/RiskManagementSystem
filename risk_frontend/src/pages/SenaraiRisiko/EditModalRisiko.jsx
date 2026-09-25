import { useState, useEffect } from "react";
import { Plus, Trash2, X, FilePenLine } from "lucide-react";
import { getRiskMatrix, getRiskAbbreviation } from "../../constants/riskMatrix";
import RiskMatrixVisual from "@/components/ui/risk-matrix-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSenaraiRujukan, pilihanDenganNilaiSemasa } from "@/hooks/useSenaraiRujukan";

export default function EditModalRisiko({ isOpen, risk, syarikatList, userRole, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...risk });
  const { senarai: senaraiKategori } = useSenaraiRujukan("kategori_risiko");
  const [puncaList, setPuncaList] = useState(risk.punca || [""]);
  const [kesanList, setKesanList] = useState(risk.kesan || [""]);
  const [riskColor, setRiskColor] = useState(risk.risk_color || "#f1f5f9");
  const canEditPenilaian = ["ADMIN", "EXECUTIVE"].includes(userRole);

  // Auto update skor & color bila user pilih skor
  useEffect(() => {
    const k = parseInt(formData.skorKebarangkalian);
    const i = parseInt(formData.skorImpak);
    if (k && i) {
      const total = k * i;
      const { label, color } = getRiskMatrix(k,i);
      setFormData(prev => ({ ...prev, skorRisiko: total, tahapRisiko: label, statusRisiko: label==="Rendah"?"Tidak":"Ya" }));
      setRiskColor(color);
    } else {
      setFormData(prev => ({ ...prev, skorRisiko:"", tahapRisiko:"", statusRisiko:"" }));
      setRiskColor("#f1f5f9");
    }
  }, [formData.skorKebarangkalian, formData.skorImpak]);

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });
  const addPunca = () => setPuncaList([...puncaList, ""]);
  const addKesan = () => setKesanList([...kesanList, ""]);
  const updatePunca = (i,val) => { const tmp=[...puncaList]; tmp[i]=val; setPuncaList(tmp); };
  const updateKesan = (i,val) => { const tmp=[...kesanList]; tmp[i]=val; setKesanList(tmp); };
  const removePunca = i => { const tmp=[...puncaList]; tmp.splice(i,1); setPuncaList(tmp); };
  const removeKesan = i => { const tmp=[...kesanList]; tmp.splice(i,1); setKesanList(tmp); };

  const handleSave = () => {
    onSave({ ...formData, punca: puncaList, kesan: kesanList, risk_color: riskColor });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FilePenLine className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-foreground">Kemaskini Risiko</h3>
              <p className="truncate text-xs text-muted-foreground">No. Rujukan: {formData.noRujukan || "-"}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={e=>{ e.preventDefault(); handleSave(); }} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* Maklumat Risiko */}
            <div className="rounded-lg border border-border p-4">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Maklumat Risiko</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">No Rujukan:</Label>
                  <Input name="noRujukan" value={formData.noRujukan} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tahun:</Label>
                  <Input name="tahun" value={formData.tahun} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Separuh Tahun:</Label>
                  <Select name="separuhTahun" value={formData.separuhTahun} onChange={handleChange}>
                    <option value="">-- Pilih --</option>
                    <option value="1">Pertama</option>
                    <option value="2">Kedua</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Syarikat:</Label>
                  <Select name="syarikat" value={formData.syarikat} onChange={handleChange} disabled={["STAFF","KETUA SUBSIDIARI"].includes(userRole)}>
                    <option value="">-- Pilih --</option>
                    {syarikatList.map(s=><option key={s.syarikat_id} value={s.syarikat_id}>{s.nama_syarikat}</option>)}
                  </Select>
                </div>
              </div>
            </div>

            {/* Pengenalpastian Risiko */}
            <div className="rounded-lg border border-border p-4">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pengenalpastian Risiko</h4>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Kategori Risiko:</Label>
                  <Select name="kategori" value={formData.kategori} onChange={handleChange}>
                    <option value="">-- Pilih --</option>
                    {pilihanDenganNilaiSemasa(senaraiKategori, formData.kategori).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Bahagian/Unit:</Label>
                  <Textarea name="bahagian" value={formData.bahagian} onChange={handleChange} className="h-[70px] resize-none" />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <Label className="text-xs font-medium">Risiko:</Label>
                <Textarea name="risiko" value={formData.risiko} onChange={handleChange} placeholder="Huraian Risiko" />
              </div>

              <div className="mt-4">
                <Label className="text-xs font-medium">Punca:</Label>
                <div className="mt-2 space-y-2">
                  {puncaList.map((p, idx)=>(
                    <div key={idx} className="flex items-center gap-2">
                      <Input value={p} onChange={e=>updatePunca(idx,e.target.value)} placeholder={`Punca ${idx + 1}`} />
                      {idx!==0 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={()=>removePunca(idx)} aria-label="Buang Punca">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {idx===puncaList.length-1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10" onClick={addPunca} aria-label="Tambah Punca">
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-xs font-medium">Kesan:</Label>
                <div className="mt-2 space-y-2">
                  {kesanList.map((k, idx)=>(
                    <div key={idx} className="flex items-center gap-2">
                      <Input value={k} onChange={e=>updateKesan(idx,e.target.value)} placeholder={`Kesan ${idx + 1}`} />
                      {idx!==0 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={()=>removeKesan(idx)} aria-label="Buang Kesan">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {idx===kesanList.length-1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10" onClick={addKesan} aria-label="Tambah Kesan">
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Penilaian Risiko (auto update) */}
            {canEditPenilaian && (
              <div className="rounded-lg border border-border p-4">
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penilaian Risiko</h4>
                <div className="rounded-lg border border-border bg-accent/60 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Skor Kebarangkalian:</Label>
                      <Select name="skorKebarangkalian" value={formData.skorKebarangkalian} onChange={handleChange}>
                        <option value="">-- Pilih --</option>
                        {[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Skor Impak:</Label>
                      <Select name="skorImpak" value={formData.skorImpak} onChange={handleChange}>
                        <option value="">-- Pilih --</option>
                        {[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Skor Risiko:</Label>
                      <Input type="text" readOnly value={getRiskAbbreviation(formData.tahapRisiko)} className="cursor-default text-center font-semibold" style={{ background: riskColor, color: riskColor === "#f1f5f9" ? "#334155" : "#ffffff" }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Status Risiko:</Label>
                      <Input type="text" readOnly value={formData.statusRisiko==="Ya"?"Ya (Risiko memerlukan tindakan)":formData.statusRisiko==="Tidak"?"Tidak (Risiko rendah-tiada tindakan)":" "} className="cursor-default bg-muted/50 text-muted-foreground text-xs" />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col items-center border-t border-border pt-4">
                    <Label className="mb-3 text-xs font-medium">Kedudukan pada Matriks Risiko:</Label>
                    <RiskMatrixVisual compact kebarangkalian={formData.skorKebarangkalian} impak={formData.skorImpak} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-white px-5 py-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
