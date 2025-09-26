import { useState, useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";
import "./EditModalRisiko.css";

export default function EditModalRisiko({ isOpen, risk, subsidiariList, userRole, userSubsidiariId, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...risk });
  const [puncaList, setPuncaList] = useState(risk.punca || [""]);
  const [kesanList, setKesanList] = useState(risk.kesan || [""]);
  const [riskColor, setRiskColor] = useState(risk.risk_color || "#f1f5f9");
  const canEditPenilaian = ["ADMIN", "EXECUTIVE"].includes(userRole);

  // Risk matrix sama seperti main component
  const riskMatrix = {
    1: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Rendah", color:"#22c55e"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Sederhana", color:"#eab308"},5:{label:"Tinggi", color:"#f97316"}},
    2: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Rendah", color:"#22c55e"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Sederhana", color:"#eab308"},5:{label:"Tinggi", color:"#f97316"}},
    3: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Sederhana", color:"#eab308"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Tinggi", color:"#f97316"},5:{label:"Tinggi", color:"#f97316"}},
    4: {1:{label:"Sederhana", color:"#eab308"},2:{label:"Sederhana", color:"#eab308"},3:{label:"Tinggi", color:"#f97316"},4:{label:"Tinggi", color:"#f97316"},5:{label:"Sangat Tinggi", color:"#ef4444"}},
    5: {1:{label:"Sederhana", color:"#eab308"},2:{label:"Tinggi", color:"#f97316"},3:{label:"Tinggi", color:"#f97316"},4:{label:"Sangat Tinggi", color:"#ef4444"},5:{label:"Sangat Tinggi", color:"#ef4444"}},
  };

  const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "", color: "#f1f5f9" };
  const getRiskAbbreviation = (label) => {
    switch(label){case "Rendah": return "R"; case "Sederhana": return "S"; case "Tinggi": return "T"; case "Sangat Tinggi": return "ST"; default: return "";}
  };

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
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="box-header" style={{ justifyContent:"space-between" }}>
          <span>Kemaskini Risiko</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#fff", cursor:"pointer" }}><X /></button>
        </div>

        <form style={{ padding:"16px" }} onSubmit={e=>{ e.preventDefault(); handleSave(); }}>
          {/* Maklumat Risiko */}
          <div className="box">
            <div className="box-header">Maklumat Risiko</div>
            <div style={{ padding:"10px", display:"grid", gap:"8px", }}>
              <div style={{ display:"flex", gap:"8px" }}>
                <label className="label">No Rujukan:</label>
                <input name="noRujukan" value={formData.noRujukan} onChange={handleChange} className="input" />
                <label className="label">Tahun:</label>
                <input name="tahun" value={formData.tahun} onChange={handleChange} className="input" />
                <label className="label">Separuh Tahun:</label>
                <select name="separuhTahun" value={formData.separuhTahun} onChange={handleChange} className="input select-dropdown">
                  <option value="">-- Pilih --</option>
                  <option value="1">Pertama</option>
                  <option value="2">Kedua</option>
                </select>
              </div>
              <div style={{ display:"flex", gap:"12px" }}>
                <label className="label">Subsidiari:</label>
                <select name="subsidiari" value={formData.subsidiari} onChange={handleChange} className="input select-dropdown" disabled={["STAFF","KETUA SUBSIDIARI"].includes(userRole)}>
                  <option value="">-- Pilih --</option>
                  {subsidiariList.map(s=><option key={s.subsidiari_id} value={s.subsidiari_id}>{s.nama_subsidiari}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Pengenalpastian Risiko */}
          <div className="box">
            <div className="box-header">Pengenalpastian Risiko</div>
            <div style={{ padding:"16px" }}>
              <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:"200px", display:"flex", flexDirection:"column" }}>
                  <label className="label">Kategori Risiko:</label>
                  <select name="kategori" value={formData.kategori} onChange={handleChange} className="input select-dropdown">
                    <option value="">-- Pilih --</option>
                    <option>Operasi</option>
                    <option>Kewangan</option>
                    <option>Strategik</option>
                    <option>Pematuhan/Perundangan</option>
                  </select>
                </div>
                <div style={{ flex:1, minWidth:"200px", display:"flex", flexDirection:"column" }}>
                  <label className="label">Bahagian/Unit:</label>
                  <textarea name="bahagian" value={formData.bahagian} onChange={handleChange} className="textarea-bahagian" />
                </div>
              </div>
              <label className="label" style={{ marginTop:"12px" }}>Risiko:</label>
              <textarea name="risiko" value={formData.risiko} onChange={handleChange} className="textarea-risiko" />

              <div style={{ marginTop:"12px" }}>
                <label className="label">Punca:</label>
                {puncaList.map((p, idx)=>(
                  <div key={idx} style={{ display:"flex", alignItems:"center", marginBottom:"6px" }}>
                    <input value={p} onChange={e=>updatePunca(idx,e.target.value)} className="input" />
                    {idx!==0 && <button type="button" onClick={()=>removePunca(idx)} className="button-circle button-remove"><Trash2 size={16}/></button>}
                    {idx===puncaList.length-1 && <button type="button" onClick={addPunca} className="button-circle button-add"><Plus size={16}/></button>}
                  </div>
                ))}
              </div>

              <div style={{ marginTop:"12px" }}>
                <label className="label">Kesan:</label>
                {kesanList.map((k, idx)=>(
                  <div key={idx} style={{ display:"flex", alignItems:"center", marginBottom:"6px" }}>
                    <input value={k} onChange={e=>updateKesan(idx,e.target.value)} className="input" />
                    {idx!==0 && <button type="button" onClick={()=>removeKesan(idx)} className="button-circle button-remove"><Trash2 size={16}/></button>}
                    {idx===kesanList.length-1 && <button type="button" onClick={addKesan} className="button-circle button-add"><Plus size={16}/></button>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Penilaian Risiko (auto update) */}
          {canEditPenilaian && (
            <div className="box">
              <div className="box-header">Penilaian Risiko</div>
              <div className="risk-wrapper">
                <div className="risk-field">
                  <label className="label">Skor Kebarangkalian:</label>
                  <select name="skorKebarangkalian" value={formData.skorKebarangkalian} onChange={handleChange} className="input select-dropdown">
                    <option value="">-- Pilih --</option>
                    {[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="risk-field">
                  <label className="label">Skor Impak:</label>
                  <select name="skorImpak" value={formData.skorImpak} onChange={handleChange} className="input select-dropdown">
                    <option value="">-- Pilih --</option>
                    {[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="risk-field">
                  <label className="label">Skor Risiko:</label>
                  <input type="text" readOnly value={getRiskAbbreviation(formData.tahapRisiko)} className="input risk-score" style={{ background: riskColor, textAlign:"center" }} />
                </div>
                <div className="risk-field">
                  <label className="label">Status Risiko:</label>
                  <input type="text" readOnly value={formData.statusRisiko==="Ya"?"Ya (Risiko memerlukan tindakan)":formData.statusRisiko==="Tidak"?"Tidak (Risiko rendah-tiada tindakan)":" "} className="input status-risk" style={{ textAlign:"center", backgroundColor:"#f1f5f9", color:"#004071" }}/>
                </div>
              </div>
            </div>
          )}

          <div style={{ textAlign:"center", marginTop:"16px" }}>
            <button type="submit" className="submit-button">Simpan Perubahan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
