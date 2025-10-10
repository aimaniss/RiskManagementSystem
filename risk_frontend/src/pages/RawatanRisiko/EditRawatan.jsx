import { useState, useEffect } from "react";
import { X, Trash2, Plus } from "lucide-react";
import "./EditRawatan.css";
import api from "../../api/api";

export default function EditRawatan({ isOpen, risk, subsidiariList = [], onClose, onSave }) {
  const [formData, setFormData] = useState({
    planTindakan: [""],
    kakitanganBertanggungjawab: [""],
  });
  const [riskColor, setRiskColor] = useState("#f1f5f9");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
  if (isOpen && risk?.risiko_id) {
    api
      .get(`/rawatan/${risk.risiko_id}`)
      .then(({ data }) => {
        setFormData({
          ...data,
          planTindakan: Array.isArray(data.plan_tindakan)
            ? data.plan_tindakan
            : [""],
          jenisKawalan: data.jenis_kawalan || "",
          tempohSiap: data.tempoh_jangkaan_siap || "",
          kakitanganBertanggungjawab: Array.isArray(data.kakitangan_bertanggungjawab)
            ? data.kakitangan_bertanggungjawab
            : [""],
          skor_kebarangkalian: data.skor_kebarangkalian,
          skor_impak: data.skor_impak,
        });

        setRiskColor(data.risk_color || "#f1f5f9");
      })
      .catch((err) => console.error("❌ Gagal fetch rawatan:", err));
  }
}, [isOpen, risk]);


  const riskMatrix = {
    1: {
      1: { label: "Rendah", color: "#22c55e" },
      2: { label: "Rendah", color: "#22c55e" },
      3: { label: "Sederhana", color: "#eab308" },
      4: { label: "Sederhana", color: "#eab308" },
      5: { label: "Tinggi", color: "#f97316" },
    },
    2: {
      1: { label: "Rendah", color: "#22c55e" },
      2: { label: "Rendah", color: "#22c55e" },
      3: { label: "Sederhana", color: "#eab308" },
      4: { label: "Sederhana", color: "#eab308" },
      5: { label: "Tinggi", color: "#f97316" },
    },
    3: {
      1: { label: "Rendah", color: "#22c55e" },
      2: { label: "Sederhana", color: "#eab308" },
      3: { label: "Sederhana", color: "#eab308" },
      4: { label: "Tinggi", color: "#f97316" },
      5: { label: "Tinggi", color: "#f97316" },
    },
    4: {
      1: { label: "Sederhana", color: "#eab308" },
      2: { label: "Sederhana", color: "#eab308" },
      3: { label: "Tinggi", color: "#f97316" },
      4: { label: "Tinggi", color: "#f97316" },
      5: { label: "Sangat Tinggi", color: "#ef4444" },
    },
    5: {
      1: { label: "Sederhana", color: "#eab308" },
      2: { label: "Tinggi", color: "#f97316" },
      3: { label: "Tinggi", color: "#f97316" },
      4: { label: "Sangat Tinggi", color: "#ef4444" },
      5: { label: "Sangat Tinggi", color: "#ef4444" },
    },
  };

  const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "", color: "#f1f5f9" };

  useEffect(() => {
    const k = parseInt(formData.skor_kebarangkalian);
    const i = parseInt(formData.skor_impak);
    if (k && i) {
      const { label, color } = getRiskMatrix(k, i);
      setFormData((prev) => ({
        ...prev,
        skor_risiko: k * i,
        tahap_risiko: label,
        status_risiko: label === "Rendah" ? "Tidak" : "Ya",
      }));
      setRiskColor(color);
    } else {
      setFormData((prev) => ({
        ...prev,
        skor_risiko: "",
        tahap_risiko: "",
        status_risiko: "",
      }));
      setRiskColor("#f1f5f9");
    }
  }, [formData.skor_kebarangkalian, formData.skor_impak]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/rawatan/${formData.rawatan_id}`, {
        plan_tindakan: formData.planTindakan,
        jenis_kawalan: formData.jenisKawalan,
        tempoh_jangkaan_siap: formData.tempohSiap,
        kakitangan_bertanggungjawab: formData.kakitanganBertanggungjawab,
      });
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
        <div className="box-header">
          <span>Kemaskini Rawatan Risiko</span>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {/* Maklumat Risiko */}
          <div className="box">
            <div className="box-header">Maklumat Risiko</div>
            <div className="flex-row">
              <div className="flex-item">
                <span className="label-inline">No Rujukan:</span>
                <span className="data-inline">{formData.no_rujukan || "-"}</span>
              </div>
              <div className="flex-item">
                <span className="label-inline">Tahun:</span>
                <span className="data-inline">{formData.tahun || "-"}</span>
              </div>
              <div className="flex-item">
                <span className="label-inline">Separuh Tahun:</span>
                <span className="data-inline">
                  {formData.separuh_tahun === 1
                    ? "Pertama"
                    : formData.separuh_tahun === 2
                    ? "Kedua"
                    : "-"}
                </span>
              </div>
              <div className="flex-item">
                <span className="label-inline">Subsidiari:</span>
                <span className="data-inline">
                  {subsidiariList.find((s) => s.subsidiari_id === formData.subsidiari_id)?.nama_subsidiari ||
                    "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Pengenalpastian Risiko */}
          <div className="box">
            <div className="box-header">Pengenalpastian Risiko</div>
            <div className="flex-row">
              <div className="flex-item">
                <span className="label-inline">Kategori Risiko:</span>
                <span className="data-inline">{formData.kategori || "-"}</span>
              </div>
              <div className="flex-item">
                <span className="label-inline">Bahagian/Unit:</span>
                <span className="data-inline">{formData.bahagian || "-"}</span>
              </div>
              <div className="flex-item" style={{ flex: "1 1 100%" }}>
                <span className="label-inline">Risiko:</span>
                <span className="data-inline">{formData.risiko || "-"}</span>
              </div>
              <div className="flex-item" style={{ flex: "1 1 100%" }}>
                <span className="label-inline">Punca:</span>
                <ol className="numbered-list">
                  {(formData.punca || []).map((p, idx) => (
                    <li key={idx}>{p || "-"}</li>
                  ))}
                </ol>
              </div>
              <div className="flex-item" style={{ flex: "1 1 100%" }}>
                <span className="label-inline">Kesan:</span>
                <ol className="numbered-list">
                  {(formData.kesan || []).map((k, idx) => (
                    <li key={idx}>{k || "-"}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Penilaian Risiko */}
          <div className="box">
            <div className="box-header">Penilaian Risiko</div>
            <div className="flex-row">
              <div className="flex-item">
                <span className="label-inline">Skor Kebarangkalian:</span>
                <span className="data-inline">{formData.skor_kebarangkalian || "-"}</span>
              </div>
              <div className="flex-item">
                <span className="label-inline">Skor Impak:</span>
                <span className="data-inline">{formData.skor_impak || "-"}</span>
              </div>
              <div className="flex-item">
                <span className="label-inline">Skor Risiko:</span>
                <span className="data-inline risk-score-text" style={{ backgroundColor: riskColor }}>
                  {formData.tahap_risiko || "-"}
                </span>
              </div>
              <div className="flex-item">
                <span className="label-inline">Status Risiko:</span>
                <span className="data-inline">{formData.status_risiko || "-"}</span>
              </div>
            </div>
          </div>

          {/* Rawatan Risiko */}
          <div className="box">
            <div className="box-header">Rawatan Risiko</div>
            <div style={{ padding: "10px" }}>
              {/* Plan Tindakan */}
              <div style={{ marginBottom: "12px" }}>
                <label className="label">Plan Tindakan:</label>
                {formData.planTindakan?.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "6px",
                      gap: "6px",
                    }}
                  >
                    <input
                      value={p}
                      onChange={(e) => {
                        const newList = [...formData.planTindakan];
                        newList[idx] = e.target.value;
                        setFormData((prev) => ({ ...prev, planTindakan: newList }));
                      }}
                      placeholder={`Plan Tindakan ${idx + 1}`}
                      className="input"
                    />
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            planTindakan: prev.planTindakan.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="button-circle button-remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {idx === formData.planTindakan.length - 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            planTindakan: [...prev.planTindakan, ""],
                          }))
                        }
                        className="button-circle button-add"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Jenis Kawalan */}
              <div style={{ marginBottom: "12px" }}>
                <label className="label">Jenis Kawalan:</label>
                <select
                  value={formData.jenisKawalan || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, jenisKawalan: e.target.value }))}
                  className="input"
                >
                  <option value="">-- Pilih Jenis Kawalan --</option>
                  <option value="Terima">Terima – Menyediakan pelan</option>
                  <option value="Kurang">Kurang – Mengurangkan kebarangkalian / impak risiko</option>
                  <option value="Pindah">Pindah – Pindahkan risiko kepada pihak ketiga</option>
                  <option value="Elak">Elak – Hentikan atau ubah aktiviti yang menyebabkan risiko</option>
                </select>
              </div>

              {/* Tempoh Jangkaan Siap */}
              <div style={{ marginBottom: "12px" }}>
                <label className="label">Tempoh Jangkaan Siap:</label>
                <input
                  value={formData.tempohSiap || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tempohSiap: e.target.value }))}
                  className="input"
                />
              </div>

              {/* Kakitangan Bertanggungjawab */}
              <div style={{ marginBottom: "12px" }}>
                <label className="label">Kakitangan Bertanggungjawab:</label>
                {formData.kakitanganBertanggungjawab?.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "6px",
                      gap: "6px",
                    }}
                  >
                    <input
                      value={s}
                      onChange={(e) => {
                        const newList = [...formData.kakitanganBertanggungjawab];
                        newList[idx] = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          kakitanganBertanggungjawab: newList,
                        }));
                      }}
                      placeholder={`Kakitangan ${idx + 1}`}
                      className="input"
                    />
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            kakitanganBertanggungjawab: prev.kakitanganBertanggungjawab.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="button-circle button-remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {idx === formData.kakitanganBertanggungjawab.length - 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            kakitanganBertanggungjawab: [...prev.kakitanganBertanggungjawab, ""],
                          }))
                        }
                        className="button-circle button-add"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button type="submit" className="submit-button" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
