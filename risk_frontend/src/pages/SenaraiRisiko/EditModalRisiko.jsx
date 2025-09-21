import { useState, useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import api from "../../api/api";
import "./EditModalRisiko.css";

function EditModalDaftarRisiko({ riskData = {}, onClose }) {
  const [formData, setFormData] = useState({
    noRujukan: "",
    tahun: "",
    separuhTahun: "",
    subsidiari: "",
    kategori: "",
    bahagian: "",
    risiko: "",
    skorKebarangkalian: "",
    skorImpak: "",
    skorRisiko: "",
    statusRisiko: "",
    tahapRisiko: ""
  });

  const [puncaList, setPuncaList] = useState([""]);
  const [kesanList, setKesanList] = useState([""]);
  const [riskColor, setRiskColor] = useState("#f1f5f9");
  const [subsidiariList, setSubsidiariList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ambil userRole dari JWT token
  const token = localStorage.getItem("token");
  let userRole = "";
  let subsidiariId = "";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      const roleMapping = { 1:"ADMIN", 2:"EXECUTIVE",3:"KETUA SUBSIDIARI",4:"STAFF",5:"VIEWER"};
      userRole = roleMapping[decoded.peranan_id] || "";
      subsidiariId = decoded.subsidiari_id || "";
    } catch (err) {
      console.error("❌ Invalid token", err);
      localStorage.removeItem("token");
    }
  }

  const canEditPenilaian = ["ADMIN","EXECUTIVE"].includes(userRole);

  const riskMatrix = {
    1: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Rendah", color:"#22c55e"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Sederhana", color:"#eab308"},5:{label:"Tinggi", color:"#f97316"}},
    2: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Rendah", color:"#22c55e"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Sederhana", color:"#eab308"},5:{label:"Tinggi", color:"#f97316"}},
    3: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Sederhana", color:"#eab308"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Tinggi", color:"#f97316"},5:{label:"Tinggi", color:"#f97316"}},
    4: {1:{label:"Sederhana", color:"#eab308"},2:{label:"Sederhana", color:"#eab308"},3:{label:"Tinggi", color:"#f97316"},4:{label:"Tinggi", color:"#f97316"},5:{label:"Sangat Tinggi", color:"#ef4444"}},
    5: {1:{label:"Sederhana", color:"#eab308"},2:{label:"Tinggi", color:"#f97316"},3:{label:"Tinggi", color:"#f97316"},4:{label:"Sangat Tinggi", color:"#ef4444"},5:{label:"Sangat Tinggi", color:"#ef4444"}},
  };

  const getRiskMatrix = (k,i)=>riskMatrix[k]?.[i]||{label:"", color:"#f1f5f9"};

  useEffect(()=>{
    if(riskData && Object.keys(riskData).length){
      setFormData({
        noRujukan:riskData.no_rujukan||"",
        tahun:riskData.tahun||"",
        separuhTahun:riskData.separuh_tahun||"",
        subsidiari:riskData.subsidiari||"",
        kategori:riskData.kategori||"",
        bahagian:riskData.bahagian||"",
        risiko:riskData.risiko||"",
        skorKebarangkalian:riskData.skor_kebarangkalian||"",
        skorImpak:riskData.skor_impak||"",
        skorRisiko:riskData.skor_risiko||"",
        statusRisiko:riskData.status_risiko||"",
        tahapRisiko:riskData.tahap_risiko||""
      });
      setPuncaList(riskData.punca?.length?riskData.punca:[""]);
      setKesanList(riskData.kesan?.length?riskData.kesan:[""]);
    }
  },[riskData]);

  useEffect(()=>{
    const k=parseInt(formData.skorKebarangkalian);
    const i=parseInt(formData.skorImpak);
    if(k && i){
      const total=k*i;
      const {label,color}=getRiskMatrix(k,i);
      setFormData(prev=>({...prev, skorRisiko:total, tahapRisiko:label, statusRisiko:label==="Rendah"?"Tidak":"Ya"}));
      setRiskColor(color);
    }else{
      setFormData(prev=>({...prev, skorRisiko:"", tahapRisiko:"", statusRisiko:""}));
      setRiskColor("#f1f5f9");
    }
  },[formData.skorKebarangkalian, formData.skorImpak]);

  const handleChange = e=>setFormData({...formData, [e.target.name]: e.target.value});
  const addPunca=()=>setPuncaList([...puncaList,""]);
  const addKesan=()=>setKesanList([...kesanList,""]);
  const updatePunca=(i,val)=>{const tmp=[...puncaList];tmp[i]=val;setPuncaList(tmp);}
  const updateKesan=(i,val)=>{const tmp=[...kesanList];tmp[i]=val;setKesanList(tmp);}
  const removePunca=i=>{const tmp=[...puncaList];tmp.splice(i,1);setPuncaList(tmp);}
  const removeKesan=i=>{const tmp=[...kesanList];tmp.splice(i,1);setKesanList(tmp);}

  const handleSubmit=e=>{
    e.preventDefault();
    // panggil API update atau callback parent
    alert("✅ Risiko dikemaskini! (Simulasi)");
    if(onClose) onClose();
  }

  return(
    <div className="modal-overlay-fullscreen">
      <div className="modal-fullscreen">
        <button className="modal-close" onClick={onClose}><X size={24}/></button>
        <div className="daftar-risiko-container">
          <h2>Kemaskini Risiko (Full Screen)</h2>
          <form onSubmit={handleSubmit}>

            {/* Maklumat Risiko */}
            <div className="box">
              <div className="box-header">Maklumat Risiko</div>
              <div style={{padding:"16px"}}>
                <div style={{display:"flex", gap:"12px"}}>
                  <input name="noRujukan" value={formData.noRujukan} onChange={handleChange} className="input" placeholder="No Rujukan"/>
                  <input name="tahun" value={formData.tahun} onChange={handleChange} className="input" placeholder="Tahun"/>
                  <select name="separuhTahun" value={formData.separuhTahun} onChange={handleChange} className="input select-dropdown">
                    <option value="">-- Pilih --</option>
                    <option value="Pertama">Pertama</option>
                    <option value="Kedua">Kedua</option>
                  </select>
                </div>
                <div style={{marginTop:"12px"}}>
                  <select name="subsidiari" value={formData.subsidiari} onChange={handleChange} className="input select-dropdown">
                    <option value="">-- Pilih Subsidiari --</option>
                    {subsidiariList.map(s=>(<option key={s.subsidiari_id} value={s.subsidiari_id}>{s.nama_subsidiari}</option>))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pengenalpastian Risiko */}
            <div className="box">
              <div className="box-header">Pengenalpastian Risiko</div>
              <div style={{padding:"16px"}}>
                <div style={{display:"flex", gap:"12px"}}>
                  <select name="kategori" value={formData.kategori} onChange={handleChange} className="input select-dropdown">
                    <option value="">-- Kategori Risiko --</option>
                    <option>Operasi</option>
                    <option>Kewangan</option>
                    <option>Strategik</option>
                    <option>Pematuhan/Perundangan</option>
                  </select>
                  <textarea name="bahagian" value={formData.bahagian} onChange={handleChange} className="textarea-bahagian" placeholder="Bahagian/Unit"/>
                </div>
                <textarea name="risiko" value={formData.risiko} onChange={handleChange} className="textarea-risiko" placeholder="Risiko"/>
                
                <label>Punca:</label>
                {puncaList.map((p,idx)=>(
                  <div key={idx} style={{display:"flex", alignItems:"center", marginBottom:"6px"}}>
                    <input value={p} onChange={e=>updatePunca(idx,e.target.value)} className="input"/>
                    {idx!==0 && <button type="button" onClick={()=>removePunca(idx)} className="button-circle button-remove"><Trash2 size={16}/></button>}
                    {idx===puncaList.length-1 && <button type="button" onClick={addPunca} className="button-circle button-add"><Plus size={16}/></button>}
                  </div>
                ))}

                <label>Kesan:</label>
                {kesanList.map((k,idx)=>(
                  <div key={idx} style={{display:"flex", alignItems:"center", marginBottom:"6px"}}>
                    <input value={k} onChange={e=>updateKesan(idx,e.target.value)} className="input"/>
                    {idx!==0 && <button type="button" onClick={()=>removeKesan(idx)} className="button-circle button-remove"><Trash2 size={16}/></button>}
                    {idx===kesanList.length-1 && <button type="button" onClick={addKesan} className="button-circle button-add"><Plus size={16}/></button>}
                  </div>
                ))}
              </div>
            </div>

            {/* Penilaian Risiko */}
            {canEditPenilaian && (
              <div className="box">
                <div className="box-header">Penilaian Risiko</div>
                <div style={{padding:"16px", display:"flex", gap:"12px", flexWrap:"wrap"}}>
                  <select name="skorKebarangkalian" value={formData.skorKebarangkalian} onChange={handleChange} className="input select-dropdown">
                    <option value="">-- Skor Kebarangkalian --</option>
                    {[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                  <select name="skorImpak" value={formData.skorImpak} onChange={handleChange} className="input select-dropdown">
                    <option value="">-- Skor Impak --</option>
                    {[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                  <input value={formData.skorRisiko} readOnly className="input risk-score" style={{background:riskColor}}/>
                  <input value={formData.statusRisiko} readOnly className="input" placeholder="Status Risiko"/>
                </div>
                {formData.tahapRisiko && <div style={{textAlign:"center", fontWeight:"600", color:riskColor, marginTop:"6px"}}>{formData.tahapRisiko}</div>}
              </div>
            )}

            <div style={{textAlign:"center", marginTop:"12px"}}>
              <button type="submit" className="submit-button">💾 Kemaskini Risiko</button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}

export default EditModalDaftarRisiko;
