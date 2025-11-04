import { useState, useEffect } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import api from "../../api/api";
import "./DaftarRisiko.css";
import PanduanModal from '../Panduan/Panduan'; 

// --- JADUAL RUJUKAN SKOR BARU ---
const KebarangkalianData = {
    5: "Hampir Pasti",
    4: "Kemungkinan Tinggi",
    3: "Berpeluang Untuk Berlaku",
    2: "Kemungkinan Rendah",
    1: "Hampir Tiada Kemungkinan",
};

const ImpakData = {
    5: "Sangat Besar",
    4: "Besar",
    3: "Ketara",
    2: "Boleh Diukur",
    1: "Tidak Ketara",
};
// ---------------------------------

function DaftarRisiko() {
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
  const [isPanduanOpen, setIsPanduanOpen] = useState(false); 

  // Ambil userRole dari JWT token
  const token = localStorage.getItem("token");
  let userRole = "";
  let subsidiariId = "";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      const roleMapping = { 1: "ADMIN", 2: "EXECUTIVE", 3: "KETUA SUBSIDIARI", 4: "STAFF", 5: "VIEWER" };
      userRole = roleMapping[decoded.peranan_id] || "";
      subsidiariId = decoded.subsidiari_id || "";
    } catch (err) {
      console.error("❌ Invalid token", err);
      localStorage.removeItem("token");
    }
  }

  const canEditPenilaian = ["ADMIN", "EXECUTIVE"].includes(userRole);

  const riskMatrix = {
    1: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Rendah", color:"#22c55e"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Sederhana", color:"#eab308"},5:{label:"Tinggi", color:"#f97316"}},
    2: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Rendah", color:"#22c55e"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Sederhana", color:"#eab308"},5:{label:"Tinggi", color:"#f97316"}},
    3: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Sederhana", color:"#eab308"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Tinggi", color:"#f97316"},5:{label:"Tinggi", color:"#f97316"}},
    4: {1:{label:"Sederhana", color:"#eab308"},2:{label:"Sederhana", color:"#eab308"},3:{label:"Tinggi", color:"#f97316"},4:{label:"Tinggi", color:"#f97316"},5:{label:"Sangat Tinggi", color:"#ef4444"}},
    5: {1:{label:"Sederhana", color:"#eab308"},2:{label:"Tinggi", color:"#f97316"},3:{label:"Tinggi", color:"#f97316"},4:{label:"Sangat Tinggi", color:"#ef4444"},5:{label:"Sangat Tinggi", color:"#ef4444"}},
  };

  const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "", color: "#f1f5f9" };

  const getRiskAbbreviation = (label) => {
    switch(label) {
      case "Rendah": return "R";
      case "Sederhana": return "S";
      case "Tinggi": return "T";
      case "Sangat Tinggi": return "ST";
      default: return ""; 
    }
  };

  useEffect(() => {
    const fetchSubsidiari = async () => {
      try {
        const res = await api.get("/subsidiari");
        const data = Array.isArray(res.data) ? res.data : res.data.subsidiari || [];
        setSubsidiariList(data);

        if (["STAFF", "KETUA SUBSIDIARI"].includes(userRole)) {
          setFormData(prev => ({ ...prev, subsidiari: subsidiariId }));
        }
      } catch (err) {
        console.error("❌ Error fetch subsidiari:", err);
        alert("⚠️ Tidak dapat memuat subsidiari. Sila log masuk semula.");
        window.location.href = "/login";
      }
    };
    fetchSubsidiari();
  }, []); 

  useEffect(() => {
    const k = parseInt(formData.skorKebarangkalian);
    const i = parseInt(formData.skorImpak);
    if (k && i) {
      const total = k * i;
      const { label, color } = getRiskMatrix(k, i);
      setFormData(prev => ({ 
        ...prev, 
        skorRisiko: total, 
        tahapRisiko: label, 
        statusRisiko: label==="Rendah"?"Tidak":"Ya" 
      }));
      setRiskColor(color);
  } else {
      setFormData(prev => ({ ...prev, skorRisiko: "", tahapRisiko: "", statusRisiko: "" }));
      setRiskColor("#f1f5f9");
    }
  }, [formData.skorKebarangkalian, formData.skorImpak]);

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const addPunca = () => setPuncaList([...puncaList, ""]);
  const addKesan = () => setKesanList([...kesanList, ""]);
  const updatePunca = (i, val) => { const tmp=[...puncaList]; tmp[i]=val; setPuncaList(tmp); };
  const updateKesan = (i, val) => { const tmp=[...kesanList]; tmp[i]=val; setKesanList(tmp); };
  const removePunca = i => { const tmp=[...puncaList]; tmp.splice(i,1); setPuncaList(tmp); };
  const removeKesan = i => { const tmp=[...kesanList]; tmp.splice(i,1); setKesanList(tmp); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.noRujukan || !formData.tahun || !formData.separuhTahun || !formData.subsidiari) {
    return alert("⚠️ Sila lengkapkan semua maklumat dalam Maklumat Risiko.");
  }
  if (!formData.kategori || !formData.bahagian || !formData.risiko || puncaList.every(p => p.trim() === "") || kesanList.every(k => k.trim() === "")) {
    return alert("⚠️ Sila lengkapkan semua maklumat dalam Pengenalpastian Risiko.");
  }

    const finalSubsidiari = formData.subsidiari
      ? parseInt(formData.subsidiari)
      : ["STAFF", "KETUA SUBSIDIARI"].includes(userRole)
        ? parseInt(subsidiariId)
        : null;

    if (!finalSubsidiari) return alert("⚠️ Subsidiari tidak sah.");

          const noRujukanTrimmed = formData.noRujukan.trim();
      const tahunInt = formData.tahun !== "" ? parseInt(formData.tahun) : null;

      if (!noRujukanTrimmed) return alert("⚠️ Sila masukkan No Rujukan.");
      if (!tahunInt) return alert("⚠️ Sila masukkan Tahun yang sah.");

      const finalData = { 
        ...formData,
        noRujukan: noRujukanTrimmed,
        tahun: tahunInt,
        separuhTahun: formData.separuhTahun !== "" ? parseInt(formData.separuhTahun) : null,
        subsidiari: finalSubsidiari,
        skorKebarangkalian: formData.skorKebarangkalian !== "" ? parseInt(formData.skorKebarangkalian) : null,
        skorImpak: formData.skorImpak !== "" ? parseInt(formData.skorImpak) : null,
        punca: puncaList.filter(p => p.trim() !== ""),
        kesan: kesanList.filter(k => k.trim() !== ""),
        skorRisiko: getRiskAbbreviation(formData.tahapRisiko)
    };

    delete finalData.tahapRisiko;


    setIsSubmitting(true);
    try {

      // ✅ Semak NoRujukan unik
try {
  const encodedNoRujukan = encodeURIComponent(noRujukanTrimmed);
  const check = await api.get(`/risiko/check-no-rujukan/${encodedNoRujukan}`);

  if (check.data.exists) {
    alert("⚠️ No Rujukan ini telah digunakan. Sila masukkan yang lain.");
    setIsSubmitting(false);
    return;
  }
} catch(err) {
  console.error("❌ Error semak No Rujukan:", err.response?.data || err.message);
  alert("⚠️ Gagal semak No Rujukan. Sila cuba lagi.");
  setIsSubmitting(false);
  return;
}

      await api.post("/risiko", finalData);
      alert("✅ Risiko berjaya didaftarkan!");
      setFormData({
        noRujukan:"", tahun:"", separuhTahun:"", subsidiari: canEditPenilaian ? "" : subsidiariId,
        kategori:"", bahagian:"", risiko:"", skorKebarangkalian:"",
        skorImpak:"", skorRisiko:"", statusRisiko:"", tahapRisiko:""
      });
      setPuncaList([""]);
      setKesanList([""]);
      setRiskColor("#f1f5f9");
    } catch (err) {
      console.error("❌ Error:", err.response?.data || err.message);
      alert("⚠️ Gagal mendaftar risiko.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="daftar-risiko-container">
      <h2>Daftar Risiko</h2>
      <form onSubmit={handleSubmit}>

        {/* KOTAK GABUNGAN: Pengenalpastian Risiko & Maklumat Risiko */}
        <div className="box">
          <div className="box-header pemantauan-risk-header"> 
            <span>Pengenalpastian Risiko</span>
            <button 
              type="button" 
              className="pemantauan-panduan-btn" 
              onClick={() => setIsPanduanOpen(true)}
            >
              <BookOpen size={16} style={{ marginRight: '6px' }} />
              Panduan
            </button>
          </div>

          <div className="combined-info-section" style={{ padding:"16px", display:"grid", gap:"14px" }}>
                
            {/* BAHAGIAN MAKLUMAT RISIKO (Pindah ke atas) */}
            <div className="info-row" style={{ display:"flex", gap:"12px" }}>
              <label className="label">No Rujukan:</label>
              <input name="noRujukan" value={formData.noRujukan} onChange={handleChange} className="input" placeholder="Contoh: UKMH-001/2025" />
              <label className="label">Tahun:</label>
              <input name="tahun" value={formData.tahun} onChange={handleChange} className="input" placeholder="Masukkan Tahun" />
               <label className="label">Separuh Tahun:</label>
              <select
                name="separuhTahun"
                value={formData.separuhTahun}
                onChange={handleChange}
                className="input select-dropdown"
              >
                <option value="">-- Pilih --</option>
                <option value="1">Pertama</option> 
                <option value="2">Kedua</option>   
              </select>
            </div>
            <div className="info-row" style={{ display:"flex", gap:"12px" }}>
              <label className="label">Subsidiari:</label>
              <select 
                name="subsidiari" 
                value={formData.subsidiari} 
                onChange={handleChange} 
                className="input select-dropdown"
                disabled={["STAFF","KETUA SUBSIDIARI"].includes(userRole)}
              >
                <option value="">-- Pilih --</option>
                {subsidiariList.length > 0
                  ? subsidiariList.map((s)=>(<option key={s.subsidiari_id} value={s.subsidiari_id}>{s.nama_subsidiari}</option>))
                  : <option disabled>Tiada subsidiari</option>}
              </select>
            </div>

                {/* GARIS PEMISAH VISUAL */}
                <hr className="divider-line" />

            {/* BAHAGIAN PENGENALPASTIAN RISIKO */}
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
                <textarea name="bahagian" value={formData.bahagian} onChange={handleChange} className="textarea-bahagian" placeholder="Masukkan bahagian/unit" />
              </div>
            </div>

            <label className="label" style={{ marginTop:"12px" }}>Risiko:</label>
            <textarea name="risiko" value={formData.risiko} onChange={handleChange} className="textarea-risiko" placeholder="Huraikan risiko" />

            {/* Punca */}
            <div style={{ marginTop:"12px" }}>
              <label className="label">Punca:</label>
              {puncaList.map((p, idx) => (
                <div key={idx} style={{ display:"flex", alignItems:"center", marginBottom:"6px" }}>
                  <input value={p} onChange={(e)=>updatePunca(idx,e.target.value)} placeholder={`Punca ${idx+1}`} className="input" />
                  {idx!==0 && <button type="button" onClick={()=>removePunca(idx)} className="button-circle button-remove"><Trash2 size={16}/></button>}
                  {idx===puncaList.length-1 && <button type="button" onClick={addPunca} className="button-circle button-add"><Plus size={16}/></button>}
                </div>
              ))}
            </div>

            {/* Kesan */}
            <div style={{ marginTop:"12px" }}>
              <label className="label">Kesan:</label>
              {kesanList.map((k, idx) => (
                <div key={idx} style={{ display:"flex", alignItems:"center", marginBottom:"6px" }}>
                  <input value={k} onChange={(e)=>updateKesan(idx,e.target.value)} placeholder={`Kesan ${idx+1}`} className="input" />
                  {idx!==0 && <button type="button" onClick={()=>removeKesan(idx)} className="button-circle button-remove"><Trash2 size={16}/></button>}
                  {idx===kesanList.length-1 && <button type="button" onClick={addKesan} className="button-circle button-add"><Plus size={16}/></button>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Penilaian Risiko (Kekal sebagai kotak berasingan) */}
        {canEditPenilaian && (
  <div className="box">
    <div className="box-header">Penilaian Risiko</div>
    <div className="risk-wrapper">
      <div className="risk-field">
        <label className="label">Skor Kebarangkalian:</label>
        <select name="skorKebarangkalian" value={formData.skorKebarangkalian} onChange={handleChange} className="input select-dropdown">
          <option value="">-- Pilih --</option>
          {Object.entries(KebarangkalianData).map(([value, label])=> (
                <option key={value} value={value}>
                    {value} - {label} 
                </option>
            ))}
        </select>
      </div>

      <div className="risk-field">
        <label className="label">Skor Impak:</label>
        <select name="skorImpak" value={formData.skorImpak} onChange={handleChange} className="input select-dropdown">
          <option value="">-- Pilih --</option>
          {Object.entries(ImpakData).map(([value, label])=> (
                <option key={value} value={value}>
                    {value} - {label} 
                </option>
            ))}
        </select>
      </div>

      <div className="risk-field">
        <label className="label">Skor Risiko:</label>
        <input 
          type="text" 
          value={getRiskAbbreviation(formData.tahapRisiko)} 
          readOnly 
          className="input risk-score" 
          style={{ background: riskColor, textAlign:"center" }} 
       />
      </div>

      <div className="risk-field">
        <label className="label">Status Risiko:</label>
<input
  type="text"
  readOnly
  value={
    formData.statusRisiko === "Ya"
      ? "Ya (Risiko memerlukan tindakan)"
      : formData.statusRisiko === "Tidak"
      ? "Tidak (Risiko rendah-tiada tindakan)"
      : ""
  }
  className="input status-risk"
  style={{ textAlign: "center", backgroundColor: "#f1f5f9", color: "#004071" }}
/>

      </div>
    </div>
  </div>
)}

        <div style={{ textAlign:"center" }}>
        <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner"></span> : "Daftar Risiko"}
          </button>
        </div>
      </form>

      {isPanduanOpen && <PanduanModal isOpen={isPanduanOpen} onClose={() => setIsPanduanOpen(false)} />}

    </div>
  );
}

export default DaftarRisiko;