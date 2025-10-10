import { useState, useEffect } from "react";
import { X } from "lucide-react";
import "./EditRawatan.css";
import api from "../../api/api";

export default function EditRawatan({
  isOpen,
  risk, 
  subsidiariList = [],
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({});
  const [riskColor, setRiskColor] = useState("#f1f5f9");
  const [saving, setSaving] = useState(false);

  // Fetch detail rawatan dari backend bila modal dibuka
  useEffect(() => {
    const fetchRiskDetails = async () => {
      if (isOpen && risk?.risiko_id) {
        try {
          const { data } = await api.get(`/rawatan/${risk.risiko_id}`);
          setFormData({
            ...data,
            planTindakan: data.plan_tindakan,
            jenisKawalan: data.jenis_kawalan,
            tempohSiap: data.tempoh_jangkaan_siap,
            kakitanganBertanggungjawab: data.kakitangan_bertanggungjawab,
          });
          setRiskColor(data.risk_color || "#f1f5f9");
        } catch (err) {
          console.error("❌ Gagal fetch rawatan:", err);
        }
      }
    };
    fetchRiskDetails();
  }, [isOpen, risk]);

  // Risk matrix auto update
  const riskMatrix = {
    1:{1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    2:{1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    3:{1:{label:"Rendah",color:"#22c55e"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Tinggi",color:"#f97316"}},
    4:{1:{label:"Sederhana",color:"#eab308"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
    5:{1:{label:"Sederhana",color:"#eab308"},2:{label:"Tinggi",color:"#f97316"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Sangat Tinggi",color:"#ef4444"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
  };

  const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "", color: "#f1f5f9" };

  useEffect(() => {
    const k = parseInt(formData.skor_kebarangkalian);
    const i = parseInt(formData.skor_impak);
    if (k && i) {
      const { label, color } = getRiskMatrix(k, i);
      setFormData(prev => ({
        ...prev,
        skor_risiko: k * i,
        tahap_risiko: label,
        status_risiko: label === "Rendah" ? "Tidak" : "Ya",
      }));
      setRiskColor(color);
    } else {
      setFormData(prev => ({ ...prev, skor_risiko: "", tahap_risiko: "", status_risiko: "" }));
      setRiskColor("#f1f5f9");
    }
  }, [formData.skor_kebarangkalian, formData.skor_impak]);

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        plan_tindakan: formData.planTindakan,
        jenis_kawalan: formData.jenisKawalan,
        tempoh_jangkaan_siap: formData.tempohSiap,
        kakitangan_bertanggungjawab: formData.kakitanganBertanggungjawab,
      };
      await api.put(`/rawatan/${formData.rawatan_id}`, payload);
      onSave({ ...formData, risk_color: riskColor });
      onClose();
    } catch (err) {
      console.error("❌ Gagal update rawatan:", err);
      alert("Gagal menyimpan perubahan. Sila cuba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="box-header" style={{ justifyContent: "space-between" }}>
          <span>Kemaskini Rawatan Risiko</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <X />
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
          {/* Maklumat Risiko */}
          <div className="box">
            <div className="box-header">Maklumat Risiko</div>
            <div style={{ padding: "10px" }}>
              <div><span className="label">No Rujukan:</span> {formData.no_rujukan || "-"}</div>
              <div><span className="label">Tahun:</span> {formData.tahun || "-"}</div>
              <div><span className="label">Separuh Tahun:</span> {formData.separuh_tahun === 1 ? "Pertama" : formData.separuh_tahun === 2 ? "Kedua" : "-"}</div>
              <div><span className="label">Subsidiari:</span> {subsidiariList.find(s => s.subsidiari_id === formData.subsidiari_id)?.nama_subsidiari || "-"}</div>
            </div>
          </div>

          {/* Pengenalpastian Risiko */}
          <div className="box">
            <div className="box-header">Pengenalpastian Risiko</div>
            <div style={{ padding: "10px" }}>
              <div><span className="label">Kategori Risiko:</span> {formData.kategori || "-"}</div>
              <div><span className="label">Bahagian/Unit:</span> {formData.bahagian || "-"}</div>
              <div><span className="label">Risiko:</span> {formData.risiko || "-"}</div>

              <div><span className="label">Punca:</span>
                <ul>{(formData.punca || []).map((p, idx) => <li key={idx}>{p || "-"}</li>)}</ul>
              </div>
              <div><span className="label">Kesan:</span>
                <ul>{(formData.kesan || []).map((k, idx) => <li key={idx}>{k || "-"}</li>)}</ul>
              </div>
            </div>
          </div>

          {/* Penilaian Risiko */}
          <div className="box">
            <div className="box-header">Penilaian Risiko</div>
            <div style={{ padding: "10px" }}>
              <div><span className="label">Skor Kebarangkalian:</span> {formData.skor_kebarangkalian || "-"}</div>
              <div><span className="label">Skor Impak:</span> {formData.skor_impak || "-"}</div>
              <div>
                <span className="label">Skor Risiko:</span>
                <span style={{ backgroundColor: riskColor, padding:"2px 6px", borderRadius:"4px" }}>{formData.tahap_risiko || "-"}</span>
              </div>
              <div><span className="label">Status Risiko:</span> {formData.status_risiko || "-"}</div>
            </div>
          </div>

          {/* Rawatan Risiko */}
          <div className="box">
            <div className="box-header">Rawatan Risiko</div>
            <div style={{ padding:"10px" }}>
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

          <div style={{ textAlign:"center", marginTop:"16px" }}>
            <button type="submit" className="submit-button" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
