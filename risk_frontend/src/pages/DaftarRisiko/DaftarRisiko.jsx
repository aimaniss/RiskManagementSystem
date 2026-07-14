import { useState, useEffect } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";
import api from "../../api/api";
import "./DaftarRisiko.css";
import { getAuthUser } from "../../utils/auth";
import { useSyarikats } from "../../hooks/useSyarikats";
import { usePanduan } from "../../hooks/usePanduan";

// --- JADUAL RUJUKAN SKOR (DIBUANG) ---
// (Konstanta KebarangkalianData dan ImpakData dibuang kerana kotak penilaian dibuang)
// ---------------------------------

function DaftarRisiko() {
  const [formData, setFormData] = useState({
    noRujukan: "",
    tahun: "",
    separuhTahun: "",
    syarikat: "",
    kategori: "",
    bahagian: "",
    risiko: "",
    // --- Skor dibuang dari state ---
    // skorKebarangkalian: "",
    // skorImpak: "",
    // skorRisiko: "", 
    // statusRisiko: "",
    // tahapRisiko: "" 
  });

  const [puncaList, setPuncaList] = useState([""]);
  const [kesanList, setKesanList] = useState([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { syarikatList } = useSyarikats();
  const { openPanduan, PanduanTrigger, PanduanRenderer } = usePanduan();

  // Ambil userRole dari JWT token
  const authUser = getAuthUser();
  const userRole = authUser?.role || "";
  const syarikatId = authUser?.syarikatId || "";

  // --- Logik Penilaian Dibuang ---
  // const canEditPenilaian = ["ADMIN", "EXECUTIVE"].includes(userRole);
  // const riskMatrix = { ... };
  // const getRiskMatrix = (k, i) => ...;
  // const getRiskAbbreviation = (label) => ...;

  useEffect(() => {
    if (syarikatList.length > 0 && ["STAFF", "KETUA SUBSIDIARI"].includes(userRole)) {
      setFormData(prev => ({ ...prev, syarikat: syarikatId }));
    }
  }, [syarikatList, userRole, syarikatId]);

  // --- useEffect untuk skor dibuang ---
  // useEffect(() => {
  //   const k = parseInt(formData.skorKebarangkalian);
  //   ...
  // }, [formData.skorKebarangkalian, formData.skorImpak]);

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const addPunca = () => setPuncaList([...puncaList, ""]);
  const addKesan = () => setKesanList([...kesanList, ""]);
  const updatePunca = (i, val) => { const tmp=[...puncaList]; tmp[i]=val; setPuncaList(tmp); };
  const updateKesan = (i, val) => { const tmp=[...kesanList]; tmp[i]=val; setKesanList(tmp); };
  const removePunca = i => { const tmp=[...puncaList]; tmp.splice(i,1); setPuncaList(tmp); };
  const removeKesan = i => { const tmp=[...kesanList]; tmp.splice(i,1); setKesanList(tmp); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.noRujukan || !formData.tahun || !formData.separuhTahun || !formData.syarikat) {
    return alert("⚠️ Sila lengkapkan semua maklumat dalam Maklumat Risiko.");
  }
  if (!formData.kategori || !formData.bahagian || !formData.risiko || puncaList.every(p => p.trim() === "") || kesanList.every(k => k.trim() === "")) {
    return alert("⚠️ Sila lengkapkan semua maklumat dalam Pengenalpastian Risiko.");
  }

    // --- KOD LOGIK CUSTOM SKOR DIBUANG ---
    // if (canEditPenilaian) { ... }
    // ------------------------------------

    const finalSyarikat = formData.syarikat
      ? parseInt(formData.syarikat)
      : ["STAFF", "KETUA SUBSIDIARI"].includes(userRole)
        ? parseInt(syarikatId)
        : null;

    if (!finalSyarikat) return alert("⚠️ Syarikat tidak sah.");

          const noRujukanTrimmed = formData.noRujukan.trim();
      const tahunInt = formData.tahun !== "" ? parseInt(formData.tahun) : null;

      if (!noRujukanTrimmed) return alert("⚠️ Sila masukkan No Rujukan.");
      if (!tahunInt) return alert("⚠️ Sila masukkan Tahun yang sah.");

      const finalData = { 
        ...formData,
        noRujukan: noRujukanTrimmed,
        tahun: tahunInt,
        separuhTahun: formData.separuhTahun !== "" ? parseInt(formData.separuhTahun) : null,
        syarikat: finalSyarikat,
        // --- Skor dibuang dari finalData ---
        // skorKebarangkalian: formData.skorKebarangkalian !== "" ? parseInt(formData.skorKebarangkalian) : null,
        // skorImpak: formData.skorImpak !== "" ? parseInt(formData.skorImpak) : null,
        punca: puncaList.filter(p => p.trim() !== ""),
        kesan: kesanList.filter(k => k.trim() !== ""),
        // skorRisiko: getRiskAbbreviation(formData.tahapRisiko) // Dibuang
    };

    // delete finalData.tahapRisiko; // Dibuang


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
      
      // Reset state, kini tanpa skor
      setFormData({
        noRujukan:"", tahun:"", separuhTahun:"", 
        syarikat: (["STAFF","KETUA SUBSIDIARI"].includes(userRole)) ? syarikatId : "",
        kategori:"", bahagian:"", risiko:""
        // --- Skor dibuang ---
      });
      setPuncaList([""]);
      setKesanList([""]);
      // setRiskColor("#f1f5f9"); // Dibuang
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
                onClick={openPanduan}
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
                {/* --- DIKEMASKINI --- */}
                <option value="1">Pertama (Jan-Jun)</option> 
                <option value="2">Kedua (Jul-Dis)</option>   
              </select>
            </div>
            <div className="info-row" style={{ display:"flex", gap:"12px" }}>
              <label className="label">Syarikat:</label>
              <select 
                name="syarikat" 
                value={formData.syarikat} 
                onChange={handleChange} 
                className="input select-dropdown"
                disabled={["STAFF","KETUA SUBSIDIARI"].includes(userRole)}
              >
                <option value="">-- Pilih --</option>
                {syarikatList.length > 0
                  ? syarikatList.map((s)=>(<option key={s.syarikat_id} value={s.syarikat_id}>{s.nama_syarikat}</option>))
                  : <option disabled>Tiada syarikat</option>}
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
                  <option>Pematuhan / Perundangan</option>
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

        {/* --- KOTAK PENILAIAN RISIKO DIBUANG --- */}
        {/* {canEditPenilaian && ( ... )} */}

        <div style={{ textAlign:"center" }}>
        <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner"></span> : "Daftar Risiko"}
          </button>
        </div>
      </form>

      {PanduanRenderer}

    </div>
  );
}

export default DaftarRisiko;