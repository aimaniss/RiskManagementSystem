import { useState, useEffect } from "react";
import { X } from "lucide-react";
import "./EditModalRisiko.css";

function EditModalRisiko({ risk, subsidiariList = [], onClose, onSave, setModalOpen }) {
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

  // Trigger modalOpen state supaya AppLayout tahu bila modal dibuka
  useEffect(() => {
    if (setModalOpen) setModalOpen(true);
    return () => {
      if (setModalOpen) setModalOpen(false);
    };
  }, [setModalOpen]);

  // Load data risiko bila prop "risk" berubah
  useEffect(() => {
    if (risk) {
      setFormData({
        noRujukan: risk.no_rujukan || "",
        tahun: risk.tahun || "",
        separuhTahun: risk.separuh_tahun || "",
        subsidiari: risk.subsidiari_id || "",
        kategori: risk.kategori || "",
        bahagian: risk.bahagian || "",
        risiko: risk.risiko || "",
        skorKebarangkalian: risk.skor_kebarangkalian || "",
        skorImpak: risk.skor_impak || "",
        skorRisiko: risk.skor_risiko || "",
        statusRisiko: risk.status_risiko || "",
      });
      setPuncaList(risk.punca && risk.punca.length ? risk.punca : [""]);
      setKesanList(risk.kesan && risk.kesan.length ? risk.kesan : [""]);
    }
  }, [risk]);

  // Kira skor risiko secara automatik
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

  // Warna ikut tahap risiko
  const getRiskColor = (score) => {
    if (score <= 3) return "#22c55e";   // hijau
    if (score <= 7) return "#eab308";   // kuning
    if (score <= 12) return "#f97316";  // oren
    return "#ef4444";                   // merah
  };

  // Label ikut tahap risiko
  const getRiskLabel = (score) => {
    if (score <= 3) return "Rendah";
    if (score <= 7) return "Sederhana";
    if (score <= 12) return "Tinggi";
    return "Sangat Tinggi";
  };

  // Handle input
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Manage list Punca & Kesan
  const addPunca = () => setPuncaList([...puncaList, ""]);
  const addKesan = () => setKesanList([...kesanList, ""]);
  const updatePunca = (i, val) => { const arr = [...puncaList]; arr[i] = val; setPuncaList(arr); };
  const updateKesan = (i, val) => { const arr = [...kesanList]; arr[i] = val; setKesanList(arr); };
  const removePunca = (i) => { const arr = [...puncaList]; arr.splice(i, 1); setPuncaList(arr); };
  const removeKesan = (i) => { const arr = [...kesanList]; arr.splice(i, 1); setKesanList(arr); };

  // Submit data ke parent
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave({ ...formData, punca: puncaList, kesan: kesanList });
  };

  // Tutup modal
  const handleClose = () => {
    if (onClose) onClose();
    if (setModalOpen) setModalOpen(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={handleClose}><X size={20} /></button>
        <div className="modal-content">
          <h2>Edit Risiko</h2>
          <form onSubmit={handleSubmit}>
            <div className="box">
              <label className="label">No Rujukan:</label>
              <input name="noRujukan" value={formData.noRujukan} onChange={handleChange} className="input" />

              <label className="label">Tahun:</label>
              <input name="tahun" value={formData.tahun} onChange={handleChange} className="input" />

              <label className="label">Separuh Tahun:</label>
              <select name="separuhTahun" value={formData.separuhTahun} onChange={handleChange} className="input">
                <option value="">-- Pilih --</option>
                <option value="H1">H1</option>
                <option value="H2">H2</option>
              </select>

              <label className="label">Subsidiari:</label>
              <select name="subsidiari" value={formData.subsidiari} onChange={handleChange} className="input">
                <option value="">-- Pilih --</option>
                {subsidiariList.map((s) => (
                  <option key={s.subsidiari_id} value={s.subsidiari_id}>
                    {s.nama_subsidiari}
                  </option>
                ))}
              </select>

              <label className="label">Kategori Risiko:</label>
              <select name="kategori" value={formData.kategori} onChange={handleChange} className="input">
                <option value="">-- Pilih --</option>
                <option>Operasi</option>
                <option>Kewangan</option>
                <option>Strategik</option>
                <option>Pematuhan/Perundangan</option>
              </select>

              <label className="label">Bahagian/Unit:</label>
              <textarea name="bahagian" value={formData.bahagian} onChange={handleChange} className="textarea-risiko" />

              <label className="label">Risiko:</label>
              <textarea name="risiko" value={formData.risiko} onChange={handleChange} className="textarea-risiko" />

              <label className="label">Punca:</label>
              {puncaList.map((p, idx) => (
                <div key={idx} className="input-group">
                  <input value={p} onChange={(e) => updatePunca(idx, e.target.value)} className="input" placeholder={`Punca ${idx + 1}`} />
                  {idx !== 0 && (
                    <button type="button" className="button-remove" onClick={() => removePunca(idx)}>✕</button>
                  )}
                  {idx === puncaList.length - 1 && (
                    <button type="button" className="button-add" onClick={addPunca}>+</button>
                  )}
                </div>
              ))}

              <label className="label">Kesan:</label>
              {kesanList.map((k, idx) => (
                <div key={idx} className="input-group">
                  <input value={k} onChange={(e) => updateKesan(idx, e.target.value)} className="input" placeholder={`Kesan ${idx + 1}`} />
                  {idx !== 0 && (
                    <button type="button" className="button-remove" onClick={() => removeKesan(idx)}>✕</button>
                  )}
                  {idx === kesanList.length - 1 && (
                    <button type="button" className="button-add" onClick={addKesan}>+</button>
                  )}
                </div>
              ))}

              <label className="label">Skor Kebarangkalian:</label>
              <select name="skorKebarangkalian" value={formData.skorKebarangkalian} onChange={handleChange} className="input">
                <option value="">-- Pilih --</option>
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              <label className="label">Skor Impak:</label>
              <select name="skorImpak" value={formData.skorImpak} onChange={handleChange} className="input">
                <option value="">-- Pilih --</option>
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              <label className="label">Skor Risiko:</label>
              <input value={formData.skorRisiko} readOnly className="input" style={{ background: riskColor, fontWeight: 600 }} />

              <label className="label">Status Risiko:</label>
              <select name="statusRisiko" value={formData.statusRisiko} onChange={handleChange} className="input">
                <option value="">-- Pilih --</option>
                <option>Ya</option>
                <option>Tidak</option>
              </select>

              {riskLevel && (
                <div className="risk-level" style={{ color: riskColor }}>
                  Tahap Risiko: {riskLevel}
                </div>
              )}
            </div>

            <div className="submit-wrapper">
              <button type="submit" className="submit-button">💾 Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditModalRisiko;
