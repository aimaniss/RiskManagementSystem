import { useState, useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";
import "./EditRawatan.css";

export default function EditRawatan({
  isOpen,
  risk,
  subsidiariList = [],
  userRole,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({});
  const [puncaList, setPuncaList] = useState([""]);
  const [kesanList, setKesanList] = useState([""]);
  const [riskColor, setRiskColor] = useState("#f1f5f9");

  useEffect(() => {
    if (isOpen && risk) {
      setFormData({ ...risk });
      setPuncaList(risk.punca || [""]);
      setKesanList(risk.kesan || [""]);
      setRiskColor(risk.risk_color || "#f1f5f9");
    }
  }, [isOpen, risk]);

  // ================= RISK MATRIX ==================
  const riskMatrix = {
    1:{1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    2:{1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    3:{1:{label:"Rendah",color:"#22c55e"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Tinggi",color:"#f97316"}},
    4:{1:{label:"Sederhana",color:"#eab308"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
    5:{1:{label:"Sederhana",color:"#eab308"},2:{label:"Tinggi",color:"#f97316"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Sangat Tinggi",color:"#ef4444"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
  };

  const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "", color: "#f1f5f9" };
  const getRiskAbbreviation = (label) => {
    switch (label) {
      case "Rendah": return "R";
      case "Sederhana": return "S";
      case "Tinggi": return "T";
      case "Sangat Tinggi": return "ST";
      default: return "";
    }
  };

  // ================= AUTO UPDATE ==================
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
        statusRisiko: label === "Rendah" ? "Tidak" : "Ya",
      }));
      setRiskColor(color);
    } else {
      setFormData(prev => ({ ...prev, skorRisiko: "", tahapRisiko: "", statusRisiko: "" }));
      setRiskColor("#f1f5f9");
    }
  }, [formData.skorKebarangkalian, formData.skorImpak]);

  // ================= HANDLERS ==================
  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });
  const addPunca = () => setPuncaList([...puncaList, ""]);
  const addKesan = () => setKesanList([...kesanList, ""]);
  const updatePunca = (i, val) => { const tmp = [...puncaList]; tmp[i] = val; setPuncaList(tmp); };
  const updateKesan = (i, val) => { const tmp = [...kesanList]; tmp[i] = val; setKesanList(tmp); };
  const removePunca = i => { const tmp = [...puncaList]; tmp.splice(i, 1); setPuncaList(tmp); };
  const removeKesan = i => { const tmp = [...kesanList]; tmp.splice(i, 1); setKesanList(tmp); };
  const handleSave = () => onSave({ ...formData, punca: puncaList, kesan: kesanList, risk_color: riskColor });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* HEADER */}
        <div className="box-header" style={{ justifyContent: "space-between" }}>
          <span>Kemaskini Risiko & Rawatan</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <X />
          </button>
        </div>

        <form style={{ padding: "16px" }} onSubmit={e => { e.preventDefault(); handleSave(); }}>

          {/* 1️⃣ Maklumat Risiko (text sahaja) */}
          <div className="box">
            <div className="box-header">Maklumat Risiko</div>
            <div style={{ padding: "10px", display: "grid", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap:"wrap" }}>
                <span className="label">No Rujukan:</span>
                <span>{formData.noRujukan || "-"}</span>

                <span className="label">Tahun:</span>
                <span>{formData.tahun || "-"}</span>

                <span className="label">Separuh Tahun:</span>
                <span>{formData.separuhTahun === "1" ? "Pertama" : formData.separuhTahun === "2" ? "Kedua" : "-"}</span>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap:"wrap" }}>
                <span className="label">Subsidiari:</span>
                <span>
                  {subsidiariList.find(s => s.subsidiari_id === formData.subsidiari)?.nama_subsidiari || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* 2️⃣ Pengenalpastian Risiko (text sahaja) */}
          <div className="box">
            <div className="box-header">Pengenalpastian Risiko</div>
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ flex:1, minWidth:"200px" }}>
                  <span className="label">Kategori Risiko:</span>
                  <span>{formData.kategori || "-"}</span>
                </div>
                <div style={{ flex:1, minWidth:"200px" }}>
                  <span className="label">Bahagian/Unit:</span>
                  <span>{formData.bahagian || "-"}</span>
                </div>
              </div>

              <div style={{ marginTop:"12px" }}>
                <span className="label">Risiko:</span>
                <div>{formData.risiko || "-"}</div>
              </div>

              {/* Punca */}
              <div style={{ marginTop:"12px" }}>
                <span className="label">Punca:</span>
                <ul>
                  {puncaList.map((p, idx)=><li key={idx}>{p || "-"}</li>)}
                </ul>
              </div>

              {/* Kesan */}
              <div style={{ marginTop:"12px" }}>
                <span className="label">Kesan:</span>
                <ul>
                  {kesanList.map((k, idx)=><li key={idx}>{k || "-"}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* 3️⃣ Penilaian Risiko (text sahaja, sentiasa keluar) */}
          <div className="box">
            <div className="box-header">Penilaian Risiko</div>
            <div style={{ display:"grid", gap:"8px", padding:"10px" }}>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                <span className="label">Skor Kebarangkalian:</span>
                <span>{formData.skorKebarangkalian || "-"}</span>

                <span className="label">Skor Impak:</span>
                <span>{formData.skorImpak || "-"}</span>
              </div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                <span className="label">Skor Risiko:</span>
                <span style={{ backgroundColor: riskColor, padding:"2px 6px", borderRadius:"4px" }}>
                  {formData.tahapRisiko || "-"}
                </span>

                <span className="label">Status Risiko:</span>
                <span>{formData.statusRisiko || "-"}</span>
              </div>
            </div>
          </div>

          {/* 4️⃣ Rawatan Risiko (editable) */}
          <div className="box">
            <div className="box-header">Rawatan Risiko</div>
            <div style={{ padding:"16px", display:"grid", gap:"12px" }}>
              <div>
                <label className="label">Plan Tindakan:</label>
                <textarea name="planTindakan" value={formData.planTindakan || ""} onChange={handleChange} className="textarea-risiko" />
              </div>
              <div>
                <label className="label">Jenis Kawalan:</label>
                <select name="jenisKawalan" value={formData.jenisKawalan || ""} onChange={handleChange} className="input select-dropdown">
                  <option value="">-- Pilih --</option>
                  <option value="Pencegahan">Pencegahan</option>
                  <option value="Pengurangan">Pengurangan</option>
                  <option value="Pemindahan">Pemindahan</option>
                  <option value="Penerimaan">Penerimaan</option>
                </select>
              </div>
              <div>
                <label className="label">Tempoh Jangkaan Siap Tindakan:</label>
                <input type="date" name="tempohSiap" value={formData.tempohSiap || ""} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="label">Kakitangan Bertanggungjawab:</label>
                <input name="kakitanganBertanggungjawab" value={formData.kakitanganBertanggungjawab || ""} onChange={handleChange} className="input" />
              </div>
            </div>
          </div>

          {/* BUTTON */}
          <div style={{ textAlign:"center", marginTop:"16px" }}>
            <button type="submit" className="submit-button">Simpan Perubahan</button>
          </div>

        </form>
      </div>
    </div>
  );
}
