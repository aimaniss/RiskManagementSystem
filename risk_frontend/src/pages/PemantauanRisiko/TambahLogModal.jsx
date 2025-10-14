import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Loader2 } from "lucide-react";
import api from "../../api/api";
import "./TambahLogModal.css";

// Risk matrix (tahap risiko selepas kawalan)
const riskMatrix = {
  1: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Rendah", color: "#14b8a6" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
  2: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Rendah", color: "#14b8a6" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Sederhana", color: "#eab308" }, 5: { label: "Tinggi", color: "#f97316" } },
  3: { 1: { label: "Rendah", color: "#14b8a6" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Sederhana", color: "#eab308" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Tinggi", color: "#f97316" } },
  4: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Sederhana", color: "#eab308" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Tinggi", color: "#f97316" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
  5: { 1: { label: "Sederhana", color: "#eab308" }, 2: { label: "Tinggi", color: "#f97316" }, 3: { label: "Tinggi", color: "#f97316" }, 4: { label: "Sangat Tinggi", color: "#ef4444" }, 5: { label: "Sangat Tinggi", color: "#ef4444" } },
};

const getRiskMatrix = (k, i) => riskMatrix[k]?.[i] || { label: "Tiada Data", color: "#f1f5f9" };

export default function TambahLogModal({ isOpen, onClose, risikoTeks = "", risikoNoRujukan = "-", risikoId, onLogAdded }) {
  const currentYear = new Date().getFullYear();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    risiko_id: risikoId,
    tahun_pemantauan: currentYear,
    separuh_tahun_pemantauan: 1,
    skor_kebarangkalian_selepas: 1,
    skor_impak_selepas: 1,
    keberkesanan: "Berkesan",
    status_pemantauan: "Selesai",
    catatan: "",
    no_bil_kelulusan: "",
    kekerapan_audit_log: "",
    pelan_tindakan_list: [{ butiran_aktiviti: "" }],
    kakitangan_list: [{ butiran_kakitangan: "" }],
  });

  const [tahapRisikoSelepas, setTahapRisikoSelepas] = useState(getRiskMatrix(1, 1));

  useEffect(() => {
    const k = parseInt(formData.skor_kebarangkalian_selepas);
    const i = parseInt(formData.skor_impak_selepas);
    setTahapRisikoSelepas(getRiskMatrix(k, i));
  }, [formData.skor_kebarangkalian_selepas, formData.skor_impak_selepas]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, risiko_id: risikoId }));
  }, [risikoId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("skor_") ? parseInt(value, 10) : value,
    }));
  };

  const handleListChange = (listName, index, field, value) => {
    const list = [...formData[listName]];
    list[index][field] = value;
    setFormData((prev) => ({ ...prev, [listName]: list }));
  };

  const handleAddListItem = (listName) => {
    const key = listName === "pelan_tindakan_list" ? "butiran_aktiviti" : "butiran_kakitangan";
    setFormData((prev) => ({
      ...prev,
      [listName]: [...prev[listName], { [key]: "" }],
    }));
  };

  const handleRemoveListItem = (listName, index) => {
    const list = formData[listName].filter((_, i) => i !== index);
    const key = listName === "pelan_tindakan_list" ? "butiran_aktiviti" : "butiran_kakitangan";
    setFormData((prev) => ({
      ...prev,
      [listName]: list.length ? list : [{ [key]: "" }],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!formData.risiko_id || !formData.status_pemantauan || !formData.kekerapan_audit_log) {
        alert("Sila lengkapkan maklumat wajib (Risiko ID, Status Pemantauan, Kekerapan Audit).");
        setIsLoading(false);
        return;
      }
      await api.post("/pemantauan-risiko/log", formData);
      alert(`✅ Log Pemantauan untuk Risiko ${risikoTeks} berjaya ditambah!`);
      onLogAdded();
      onClose();
    } catch (err) {
      console.error("❌ Ralat menambah log:", err);
      alert(`Gagal menambah log. ${err.response?.data?.message || "Sila cuba lagi."}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tambahlog-modal-overlay">
      <div className="tambahlog-modal">
        <form onSubmit={handleSubmit}>
          <div className="tambahlog-header">
            <span>Tambah Log Pemantauan Baharu</span>
            <button type="button" className="tambahlog-close-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          <div className="tambahlog-body">
            {/* Maklumat Risiko */}
            <div className="tambahlog-box">
              <div className="tambahlog-box-header">Maklumat Risiko</div>
              <div className="tambahlog-row">
                <div className="tambahlog-item">
                  <label>No. Rujukan:</label>
                  <input type="text" value={risikoNoRujukan} readOnly className="tambahlog-readonly" />
                </div>
                <div className="tambahlog-item">
                  <label>Risiko:</label>
                  <input type="text" value={risikoTeks} readOnly className="tambahlog-readonly" />
                </div>
              </div>
            </div>

            {/* Maklumat Pemantauan */}
            <div className="tambahlog-box">
              <div className="tambahlog-box-header">Maklumat Pemantauan</div>
              <div className="tambahlog-row">
                <div className="tambahlog-item">
                  <label>Tahun:</label>
                  <input type="number" name="tahun_pemantauan" value={formData.tahun_pemantauan} onChange={handleChange} required />
                </div>
                <div className="tambahlog-item">
                  <label>Separuh Tahun:</label>
                  <select name="separuh_tahun_pemantauan" value={formData.separuh_tahun_pemantauan} onChange={handleChange}>
                    <option value={1}>Pertama</option>
                    <option value={2}>Kedua</option>
                  </select>
                </div>
                <div className="tambahlog-item">
                  <label>Kelulusan:</label>
                  <input type="text" name="no_bil_kelulusan" value={formData.no_bil_kelulusan} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Pelan & Kakitangan */}
            <div className="tambahlog-box">
              <div className="tambahlog-box-header">Pelan Tindakan Pemantauan & Kakitangan Bertanggungjawab</div>

              {["pelan_tindakan_list", "kakitangan_list"].map((listName, idx) => (
                <div key={listName} className="tambahlog-list-section">
                  <label>{idx === 0 ? "Pelan Tindakan Pemantauan:" : "Kakitangan Bertanggungjawab:"}</label>
                  {/* Bungkus input dalam tambahlog-item untuk gaya yang konsisten */}
                  <div className="tambahlog-item" style={{ flex: '1 1 100%' }}>
                    {formData[listName].map((item, index) => {
                      const key = idx === 0 ? "butiran_aktiviti" : "butiran_kakitangan";
                      return (
                        <div className="tambahlog-input-row" key={index}>
                          <input
                            type="text"
                            value={item[key]}
                            onChange={(e) => handleListChange(listName, index, key, e.target.value)}
                            placeholder={idx === 0 ? `Pelan Tindakan ${index + 1}` : `Kakitangan Bertanggungjawab ${index + 1}`}
                            required
                          />
                          {formData[listName].length > 1 && (
                            <button type="button" className="tambahlog-btn-circle tambahlog-btn-remove" onClick={() => handleRemoveListItem(listName, index)}>
                              <Trash2 size={14} />
                            </button>
                          )}
                          {index === formData[listName].length - 1 && (
                            <button type="button" className="tambahlog-btn-circle tambahlog-btn-add" onClick={() => handleAddListItem(listName)}>
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="tambahlog-row" style={{ marginTop: '10px' }}>
                <div className="tambahlog-item">
                  <label>Kekerapan:</label>
                  <input type="text" name="kekerapan_audit_log" value={formData.kekerapan_audit_log} onChange={handleChange} required placeholder="Contoh: 3 Bulan" />
                </div>
              </div>
            </div>

            {/* Keberkesanan */}
            <div className="tambahlog-box">
              <div className="tambahlog-box-header">Penilaian Pemantauan & Keberkesanan Tindakan</div>
                {/* Skor Risiko */}
              <div className="tambahlog-row">
                <div className="tambahlog-item">
                  <label>Skor Kebarangkalian:</label>
                  <select name="skor_kebarangkalian_selepas" value={formData.skor_kebarangkalian_selepas} onChange={handleChange}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="tambahlog-item">
                  <label> Skor Impak:</label>
                  <select name="skor_impak_selepas" value={formData.skor_impak_selepas} onChange={handleChange}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="tambahlog-item">
                  <span className="tambahlog-score-label">Tahap Risiko:</span>
                  <span className="tambahlog-risk-badge" style={{ backgroundColor: tahapRisikoSelepas.color }}>
                    {tahapRisikoSelepas.label}
                  </span>
                </div>
              </div>
                
                {/* Keberkesanan Kawalan & Status Pemantauan */}
              <div className="tambahlog-row">
                <div className="tambahlog-item">
                  <label>Keberkesanan:</label>
                  <select name="keberkesanan" value={formData.keberkesanan} onChange={handleChange}>
                    <option>Ya</option>
                    <option>Tidak</option>
                  </select>
                </div>
                <div className="tambahlog-item">
                  <label>Status Pemantauan:</label>
                  <select name="status_pemantauan" value={formData.status_pemantauan} onChange={handleChange}>
                    <option>Buka</option>
                    <option>Sedang Dilaksanakan</option>
                    <option>Pemantauan</option>
                    <option>Selesai</option>
                    <option>Tutup</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Catatan (Label di atas, saiz diperbesarkan) */}
            <div className="tambahlog-box">
              <label>Catatan:</label>
              <textarea name="catatan" value={formData.catatan} onChange={handleChange} rows="5" />
            </div>
          </div>

          <div className="tambahlog-footer tambahlog-footer-centered">
            <button type="button" className="tambahlog-btn-cancel" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="tambahlog-btn-submit" disabled={isLoading}>
              {isLoading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              {isLoading ? "Menyimpan..." : "Simpan Log"}
            </button>
          </div>
        </form>
        </div>
    </div>
  );
}