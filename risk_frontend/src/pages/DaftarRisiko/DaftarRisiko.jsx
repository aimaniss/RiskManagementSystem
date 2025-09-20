import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import api from "../../api/api"; // Adjust path if needed
import "./DaftarRisiko.css";

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
  });

  const [puncaList, setPuncaList] = useState([""]);
  const [kesanList, setKesanList] = useState([""]);
  const [riskColor, setRiskColor] = useState("#f1f5f9");
  const [riskLevel, setRiskLevel] = useState("");
  const [subsidiariList, setSubsidiariList] = useState([]);

  // Fetch subsidiari dengan token
  useEffect(() => {
    const fetchSubsidiari = async () => {
      try {
        const res = await api.get("/subsidiari");
        const data = Array.isArray(res.data) ? res.data : res.data.subsidiari || [];
        setSubsidiariList(data);

        // auto pilih subsidiari kalau user role staff/ketua
        const tokenUser = JSON.parse(localStorage.getItem("user"));
        if (tokenUser?.peranan === "Staff" || tokenUser?.peranan === "Ketua Subsidiari") {
          setFormData((prev) => ({ ...prev, subsidiari: tokenUser.subsidiari_id }));
        }
      } catch (err) {
        console.error("❌ Error fetch subsidiari:", err);
        alert("⚠️ Tidak dapat memuat subsidiari. Sila log masuk semula.");
        window.location.href = "/login";
      }
    };
    fetchSubsidiari();
  }, []);

  // Calculate risk score and color
  useEffect(() => {
    const k = parseInt(formData.skorKebarangkalian);
    const i = parseInt(formData.skorImpak);
    if (k && i) {
      const total = k * i;
      setFormData((prev) => ({ ...prev, skorRisiko: total }));
      setRiskColor(getRiskColor(total));
      setRiskLevel(getRiskLabel(total));
    } else {
      setFormData((prev) => ({ ...prev, skorRisiko: "" }));
      setRiskColor("#f1f5f9");
      setRiskLevel("");
    }
  }, [formData.skorKebarangkalian, formData.skorImpak]);

  const getRiskColor = (score) => {
    if (score <= 3) return "#22c55e";
    if (score <= 7) return "#eab308";
    if (score <= 12) return "#f97316";
    return "#ef4444";
  };

  const getRiskLabel = (score) => {
    if (score <= 3) return "Rendah";
    if (score <= 7) return "Sederhana";
    if (score <= 12) return "Tinggi";
    return "Sangat Tinggi";
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const addPunca = () => setPuncaList([...puncaList, ""]);
  const addKesan = () => setKesanList([...kesanList, ""]);
  const updatePunca = (i, val) => { const newList = [...puncaList]; newList[i] = val; setPuncaList(newList); };
  const updateKesan = (i, val) => { const newList = [...kesanList]; newList[i] = val; setKesanList(newList); };
  const removePunca = (i) => { const newList = [...puncaList]; newList.splice(i, 1); setPuncaList(newList); };
  const removeKesan = (i) => { const newList = [...kesanList]; newList.splice(i, 1); setKesanList(newList); };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.noRujukan || !formData.tahun || !formData.subsidiari) {
      alert("⚠️ Sila lengkapkan maklumat penting (No Rujukan, Tahun, Subsidiari).");
      return;
    }

    const finalData = { 
      ...formData, 
      tahun: parseInt(formData.tahun), 
      subsidiari: parseInt(formData.subsidiari), // ✅ guna ID, bukan nama
      punca: puncaList, 
      kesan: kesanList 
    };

    console.log("📦 Data dihantar ke backend:", finalData);

    try {
      await api.post("/risiko", finalData);
      alert("✅ Risiko berjaya didaftarkan!");

      // Reset form
      setFormData({
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
      });
      setPuncaList([""]);
      setKesanList([""]);
      setRiskColor("#f1f5f9");
      setRiskLevel("");
    } catch (err) {
      console.error("❌ Error semasa submit:", err.response?.data || err.message);
      if (err.response && err.response.status === 401) {
        alert("⚠️ Sesi tamat. Sila log masuk semula.");
        window.location.href = "/login";
      } else {
        alert("⚠️ Gagal mendaftar risiko. Sila cuba semula.");
      }
    }
  };

  return (
    <div className="daftar-risiko-container">
      <h2>Daftar Risiko</h2>
      <form onSubmit={handleSubmit}>
        {/* Maklumat Risiko */}
        <div className="box">
          <div className="box-header">Maklumat Risiko</div>
          <div style={{ padding: "16px", display: "grid", gap: "14px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <label className="label">No Rujukan:</label>
              <input name="noRujukan" value={formData.noRujukan} onChange={handleChange} className="input" placeholder="Contoh: UKMH-001/2025" />
              <label className="label">Tahun:</label>
              <input name="tahun" value={formData.tahun} onChange={handleChange} className="input" placeholder="2025" />
              <label className="label">Separuh Tahun:</label>
              <select name="separuhTahun" value={formData.separuhTahun} onChange={handleChange} className="input select-dropdown">
                <option value="">-- Pilih --</option>
                <option value="H1">Separuh Pertama</option>
                <option value="H2">Separuh Kedua</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <label className="label">Subsidiari:</label>
              <select 
                name="subsidiari" 
                value={formData.subsidiari} 
                onChange={handleChange} 
                className="input select-dropdown"
                disabled={["Staff", "Ketua Subsidiari"].includes(JSON.parse(localStorage.getItem("user"))?.peranan)}
              >
                <option value="">-- Pilih --</option>
                {subsidiariList.length > 0
                  ? subsidiariList.map((s) => (
                      <option key={s.subsidiari_id} value={s.subsidiari_id}>
                        {s.nama_subsidiari}
                      </option>
                    ))
                  : <option disabled>Tiada subsidiari</option>}
              </select>
            </div>
          </div>
        </div>

        {/* Pengenalpastian Risiko */}
        <div className="box">
          <div className="box-header">Pengenalpastian Risiko</div>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column" }}>
                <label className="label">Kategori Risiko:</label>
                <select name="kategori" value={formData.kategori} onChange={handleChange} className="input select-dropdown">
                  <option value="">-- Pilih --</option>
                  <option>Operasi</option>
                  <option>Kewangan</option>
                  <option>Strategik</option>
                  <option>Pematuhan/Perundangan</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column" }}>
                <label className="label">Bahagian/Unit:</label>
                <textarea name="bahagian" value={formData.bahagian} onChange={handleChange} className="input" placeholder="Masukkan bahagian/unit" />
              </div>
            </div>


             {/* Risiko */}           
            <label className="label">Risiko:</label>
                <textarea 
                  name="risiko" 
                  value={formData.risiko} 
                  onChange={handleChange} 
                  className="textarea-risiko" 
                  placeholder="Huraikan risiko" 
      />


            {/* Punca */}
            <div style={{ marginTop: "12px" }}>
              <label className="label">Punca:</label>
              {puncaList.map((p, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
                  <input value={p} onChange={(e) => updatePunca(idx, e.target.value)} placeholder={`Punca ${idx+1}`} className="input" />
                  {idx !== 0 && <button type="button" onClick={() => removePunca(idx)} className="button-circle button-remove"><Trash2 size={16}/></button>}
                  {idx === puncaList.length-1 && <button type="button" onClick={addPunca} className="button-circle button-add"><Plus size={16}/></button>}
                </div>
              ))}
            </div>

            {/* Kesan */}
            <div style={{ marginTop: "12px" }}>
              <label className="label">Kesan:</label>
              {kesanList.map((k, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
                  <input value={k} onChange={(e) => updateKesan(idx, e.target.value)} placeholder={`Kesan ${idx+1}`} className="input" />
                  {idx !== 0 && <button type="button" onClick={() => removeKesan(idx)} className="button-circle button-remove"><Trash2 size={16}/></button>}
                  {idx === kesanList.length-1 && <button type="button" onClick={addKesan} className="button-circle button-add"><Plus size={16}/></button>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Penilaian Risiko */}
        <div className="box">
          <div className="box-header">Penilaian Risiko</div>
          <div style={{ padding: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <label className="label">Skor Kebarangkalian:</label>
            <select name="skorKebarangkalian" value={formData.skorKebarangkalian} onChange={handleChange} className="input select-dropdown">
              <option value="">-- Pilih --</option>
              {[1,2,3,4,5].map((v)=> <option key={v} value={v}>{v}</option>)}
            </select>

            <label className="label">Skor Impak:</label>
            <select name="skorImpak" value={formData.skorImpak} onChange={handleChange} className="input select-dropdown">
              <option value="">-- Pilih --</option>
              {[1,2,3,4,5].map((v)=> <option key={v} value={v}>{v}</option>)}
            </select>

            <label className="label">Skor Risiko:</label>
            <input type="text" value={formData.skorRisiko} readOnly className="input risk-score" style={{ background: riskColor }} />

            <label className="label">Status Risiko:</label>
            <select name="statusRisiko" value={formData.statusRisiko} onChange={handleChange} className="input select-dropdown">
              <option value="">-- Pilih --</option>
              <option>Ya</option>
              <option>Tidak</option>
            </select>
          </div>

          {riskLevel && (
            <div style={{ marginTop: "12px", fontWeight: "600", color: riskColor, fontSize: "16px", textAlign: "center" }}>
              Tahap Risiko: {riskLevel}
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ textAlign: "center" }}>
          <button type="submit" className="submit-button">🚀 Daftar Risiko</button>
        </div>
      </form>
    </div>
  );
}

export default DaftarRisiko;
