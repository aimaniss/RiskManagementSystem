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

export default function TambahLogModal({
  isOpen,
  onClose,
  risikoId,
  onLogAdded,
  onSaveSuccess,
}) {
  const currentYear = new Date().getFullYear();
  const [isLoading, setIsLoading] = useState(false);

  // Auto-populate No. Rujukan & Risiko
  const [risikoTeks, setRisikoTeks] = useState("");
  const [risikoNoRujukan, setRisikoNoRujukan] = useState("-");
  const [risikoInfo, setRisikoInfo] = useState(null); // 🟢 simpan info asal risiko
  const [validationMessage, setValidationMessage] = useState(""); // 🟢 mesej alert bawah input

  const [formData, setFormData] = useState({
    risiko_id: risikoId || null,
    tahun_pemantauan: currentYear,
    separuh_tahun_pemantauan: 1,
    skor_kebarangkalian_selepas: 1,
    skor_impak_selepas: 1,
    keberkesanan: "Berkesan",
    status_pemantauan: "Selesai",
    catatan: "",
    no_bil_kelulusan: "",
    kekerapan_pemantauan: "",
    pelan_tindakan_list: [{ butiran_aktiviti: "" }],
    kakitangan_list: [{ butiran_kakitangan: "" }],
  });

  const [tahapRisikoSelepas, setTahapRisikoSelepas] = useState(getRiskMatrix(1, 1));

  // Update tahap risiko selepas
  useEffect(() => {
    const k = parseInt(formData.skor_kebarangkalian_selepas, 10);
    const i = parseInt(formData.skor_impak_selepas, 10);
    setTahapRisikoSelepas(getRiskMatrix(k, i));
  }, [formData.skor_kebarangkalian_selepas, formData.skor_impak_selepas]);

  // Update risiko_id bila props berubah
  useEffect(() => {
    setFormData((prev) => ({ ...prev, risiko_id: risikoId || prev.risiko_id }));
  }, [risikoId]);

  // Fetch No. Rujukan & Risiko bila modal dibuka
  useEffect(() => {
    if (!isOpen || !risikoId) return;
    let mounted = true;
    const fetchRisikoInfo = async () => {
      try {
        const res = await api.get(`/pemantauan-risiko/${risikoId}/info`);
        const info = res.data || {};
        if (!mounted) return;
        setRisikoTeks(info.nama_risiko || info.risiko || info.nama || "");
        setRisikoNoRujukan(info.no_rujukan || info.noRujukan || "-");
        setRisikoInfo(info); // 🟢 simpan maklumat asal risiko
        setFormData((prev) => ({ ...prev, risiko_id: risikoId }));
      } catch (err) {
        console.error("❌ Gagal fetch info risiko:", err);
        setRisikoTeks("");
        setRisikoNoRujukan("-");
        setRisikoInfo(null);
      }
    };
    fetchRisikoInfo();
    return () => { mounted = false; };
  }, [isOpen, risikoId]);

  // 🟢 Auto semak bila tahun / separuh tahun berubah
useEffect(() => {
  const { tahun_pemantauan, separuh_tahun_pemantauan } = formData;
  if (!tahun_pemantauan || !separuh_tahun_pemantauan || !risikoId) {
    setValidationMessage("");
    return;
  }

  const semak = async () => {
    try {
      const res = await api.get(`/pemantauan-risiko/check-duplicate`, {
        params: {
          risiko_id: risikoId,
          tahun: tahun_pemantauan,
          separuh: separuh_tahun_pemantauan,
        },
      });

      const { duplicate, invalid, message } = res.data;

      if (invalid) {
        setValidationMessage(`❌ ${message}`);
      } else if (duplicate) {
        setValidationMessage(`⚠️ ${message}`);
      } else {
        setValidationMessage(`✅ ${message}`);
      }
    } catch (err) {
      console.error("❌ Ralat semakan:", err);
      setValidationMessage("⚠️ Gagal menyemak data. Cuba lagi.");
    }
  };

  semak();
}, [
  formData.tahun_pemantauan,
  formData.separuh_tahun_pemantauan,
  risikoInfo,
  risikoId,
]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("skor_") ? (value === "" ? "" : parseInt(value, 10)) : value,
    }));
  };

  const handleListChange = (listName, index, field, value) => {
    const list = [...formData[listName]];
    list[index][field] = value;
    setFormData((prev) => ({ ...prev, [listName]: list }));
  };

  const handleAddListItem = (listName) => {
    const key = listName === "pelan_tindakan_list" ? "butiran_aktiviti" : "butiran_kakitangan";
    setFormData((prev) => ({ ...prev, [listName]: [...prev[listName], { [key]: "" }] }));
  };

  const handleRemoveListItem = (listName, index) => {
    const list = formData[listName].filter((_, i) => i !== index);
    const key = listName === "pelan_tindakan_list" ? "butiran_aktiviti" : "butiran_kakitangan";
    setFormData((prev) => ({ ...prev, [listName]: list.length ? list : [{ [key]: "" }] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!formData.risiko_id || !formData.status_pemantauan || !formData.kekerapan_pemantauan) {
        alert("Sila lengkapkan maklumat wajib (Risiko, Status Pemantauan, Kekerapan Pemantauan).");
        setIsLoading(false);
        return;
      }

      // 🟢 Cegah submit kalau ada error
      if (validationMessage.includes("❌") || validationMessage.includes("⚠️")) {
        alert("Sila betulkan tahun atau separuh tahun sebelum simpan.");
        setIsLoading(false);
        return;
      }

      const res = await api.post("/pemantauan-risiko/log", formData);
      const newLog = res.data?.data ?? res.data;

      alert(`✅ Log Pemantauan untuk Risiko ${risikoTeks || risikoNoRujukan} berjaya ditambah!`);

      const notify = onSaveSuccess || onLogAdded;
      if (typeof notify === "function") {
        try { notify(newLog); } catch (err) { console.warn("callback error:", err); }
      }

      onClose?.();
    } catch (err) {
      console.error("❌ Ralat menambah log:", err);
      alert(`Gagal menambah log. ${err.response?.data?.message || err.message || "Sila cuba lagi."}`);
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
           {/* 1. Maklumat Risiko */}
<div className="tambahlog-box">
  <div className="tambahlog-box-header">Maklumat Risiko</div>
  <div className="tambahlog-row">
    <div className="tambahlog-item">
      <label>No. Rujukan Risiko:</label>
      <div className="tambahlog-textonly">{risikoNoRujukan || "-"}</div>
    </div>
    <div className="tambahlog-item">
      <label>Risiko:</label>
      <div className="tambahlog-textonly">{risikoTeks || "-"}</div>
    </div>
  </div>

  <div className="tambahlog-row">
    <div className="tambahlog-item">
      <label>Tahun Risiko Asal:</label>
      <div className="tambahlog-textonly">{risikoInfo?.tahun_risiko_asal || "-"}</div>
    </div>
    <div className="tambahlog-item">
      <label>Separuh Tahun Risiko Asal:</label>
      <div className="tambahlog-textonly">
        {risikoInfo?.separuh_tahun_risiko_asal
          ? risikoInfo.separuh_tahun_risiko_asal === 1
            ? "Pertama"
            : "Kedua"
          : "-"}
      </div>
    </div>
  </div>
</div>


            {/* 2. Maklumat Pemantauan (Tahun, Separuh Tahun, Kelulusan, Pelan Tindakan, Kakitangan, Kekerapan) */}
            <div className="tambahlog-box">
              <div className="tambahlog-box-header">Maklumat Pemantauan</div>
              {/* Tahun, Separuh Tahun & Kelulusan */}
              <div className="tambahlog-row">
                <div className="tambahlog-item">
                  <label>Tahun Pemantauan:</label>
                  <input type="number" name="tahun_pemantauan" value={formData.tahun_pemantauan} onChange={handleChange} required />
                </div>
                <div className="tambahlog-item">
                  <label>Separuh Tahun Pemantauan:</label>
                  <select name="separuh_tahun_pemantauan" value={formData.separuh_tahun_pemantauan} onChange={handleChange}>
                    <option value={1}>Pertama</option>
                    <option value={2}>Kedua</option>
                  </select>
                </div>
                <div className="tambahlog-item">
                  <label>Kelulusan (No. Bil):</label>
                  <input type="text" name="no_bil_kelulusan" value={formData.no_bil_kelulusan} onChange={handleChange} />
                </div>
              </div>

              {/* Alert Duplikasi */}
              {validationMessage && (
                <p
                  style={{
                    marginTop: "8px",
                    fontSize: "0.9rem",
                    color: validationMessage.includes("✅") ? "#16a34a" : (validationMessage.includes("❌") || validationMessage.includes("⚠️") ? "#dc2626" : "#eab308"),
                  }}
                >
                  {validationMessage}
                </p>
              )}

              {/* Pelan Tindakan Pemantauan */}
              <div className="tambahlog-box-subheader" style={{ marginTop: '15px' }}>Pelan Tindakan Pemantauan</div>
              {formData.pelan_tindakan_list.map((item, index) => {
                const listName = "pelan_tindakan_list";
                const key = "butiran_aktiviti";
                return (
                  <div className="tambahlog-input-row" key={index}>
                    <input
                      type="text"
                      value={item[key]}
                      onChange={(e) => handleListChange(listName, index, key, e.target.value)}
                      placeholder={`Butiran Pelan Tindakan ${index + 1}`}
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

              {/* Kakitangan Bertanggungjawab */}
              <div className="tambahlog-box-subheader" style={{ marginTop: '15px' }}>Kakitangan Bertanggungjawab</div>
              {formData.kakitangan_list.map((item, index) => {
                const listName = "kakitangan_list";
                const key = "butiran_kakitangan";
                return (
                  <div className="tambahlog-input-row" key={index}>
                    <input
                      type="text"
                      value={item[key]}
                      onChange={(e) => handleListChange(listName, index, key, e.target.value)}
                      placeholder={`Nama Kakitangan ${index + 1}`}
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

              {/* Kekerapan Pemantauan */}
              <div className="tambahlog-row" style={{ marginTop: '10px' }}>
                <div className="tambahlog-item" style={{ flex: '1 1 100%' }}>
                  <label>Kekerapan Pemantauan:</label>
                  <input type="text" name="kekerapan_pemantauan" value={formData.kekerapan_pemantauan} onChange={handleChange} required placeholder="Contoh: 3 Bulan / Tahunan" />
                </div>
              </div>
            </div>

            {/* 3. Penilaian dan Keberkesanan Tindakan */}
            <div className="tambahlog-box">
              <div className="tambahlog-box-header">Penilaian dan Keberkesanan Tindakan</div>
              <div className="tambahlog-row">
                <div className="tambahlog-item">
                  <label>Skor Kebarangkalian:</label>
                  <select name="skor_kebarangkalian_selepas" value={formData.skor_kebarangkalian_selepas} onChange={handleChange}>
                    {[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="tambahlog-item">
                  <label>Skor Impak:</label>
                  <select name="skor_impak_selepas" value={formData.skor_impak_selepas} onChange={handleChange}>
                    {[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="tambahlog-item">
                  <span className="tambahlog-score-label">Tahap Risiko:</span>
                  <span className="tambahlog-risk-badge" style={{ backgroundColor: tahapRisikoSelepas.color }}>{tahapRisikoSelepas.label}</span>
                </div>
              </div>
              <div className="tambahlog-row">
                <div className="tambahlog-item">
                  <label>Keberkesanan:</label>
                  <select name="keberkesanan" value={formData.keberkesanan} onChange={handleChange}>
                    <option>Berkesan</option>
                    <option>Tidak Berkesan</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Status Pemantauan */}
            <div className="tambahlog-box">
              <div className="tambahlog-box-header">Status Pemantauan</div>
              <div className="tambahlog-row">
                <div className="tambahlog-item" style={{ flex: '1 1 100%' }}>
                  <label>Status Pemantauan Semasa:</label>
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

            {/* 5. Catatan */}
            <div className="tambahlog-box">
              <div className="tambahlog-box-header">Catatan</div>
              <label>Sila masukkan catatan pemantauan:</label>
              <textarea name="catatan" value={formData.catatan} onChange={handleChange} rows="5" />
            </div>
          </div>

          <div className="tambahlog-footer tambahlog-footer-centered">
            <button type="button" className="tambahlog-btn-cancel" onClick={onClose}>Batal</button>
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