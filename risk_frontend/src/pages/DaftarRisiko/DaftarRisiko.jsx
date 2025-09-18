import { useState, useEffect } from "react";

function DaftarRisiko() {
  const [formData, setFormData] = useState({
    noRujukan: "",
    tahun: "",
    separuhTahun: "",
    syarikat: "",
    kategori: "",
    bahagian: "",
    risiko: "",
    punca: "",
    kesan: "",
    skorKebarangkalian: "",
    skorImpak: "",
    skorRisiko: "",
    statusRisiko: "",
  });

  const [riskColor, setRiskColor] = useState("#f1f5f9");
  const [riskLevel, setRiskLevel] = useState("");

  // Tentukan warna berdasarkan skor risiko
  const getRiskColor = (score) => {
    if (score <= 3) return "#22c55e"; // hijau
    if (score <= 7) return "#eab308"; // kuning
    if (score <= 12) return "#f97316"; // oren
    return "#ef4444"; // merah
  };

  const getRiskLabel = (score) => {
    if (score <= 3) return "Rendah";
    if (score <= 7) return "Sederhana";
    if (score <= 12) return "Tinggi";
    return "Sangat Tinggi";
  };

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.noRujukan || !formData.tahun || !formData.syarikat) {
      alert("⚠️ Sila lengkapkan maklumat penting (No Rujukan, Tahun, Syarikat).");
      return;
    }
    alert("✅ Risiko berjaya didaftarkan!");
    console.log("Data Risiko:", formData);
  };

  const boxStyle = {
    borderRadius: "14px",
    marginBottom: "22px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
    backdropFilter: "blur(14px)",
    transition: "0.3s",
  };

  const headerStyle = {
    background: "#0074c8", // blue
    color: "white",
    padding: "12px",
    fontWeight: "600",
    fontSize: "15px",
    borderTopLeftRadius: "14px",
    borderTopRightRadius: "14px",
    boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.2)",
    letterSpacing: "0.5px",
  };

  const inputStyle = {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(148,163,184,0.4)",
    background: "rgba(255,255,255,0.85)",
    fontSize: "14px",
    outline: "none",
    transition: "0.3s",
  };

  const labelStyle = {
    fontSize: "13px",
    fontWeight: "500",
    color: "#0f172a",
    minWidth: "120px",
    display: "flex",
    alignItems: "center",
  };

  const getDropdownStyle = (value) => ({
    ...inputStyle,
    background: inputStyle.background,
    color: "#0f172a",
    fontWeight: "400",
  });

  return (
    <div style={{ padding: "22px", fontFamily: "Roboto, sans-serif" }}>
      {/* Header */}
      <h2
        style={{
          fontSize: "24px",
          fontWeight: "700",
          marginBottom: "18px",
          color: "#0074c8", // blue
        }}
      >
        Daftar Risiko
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Maklumat Risiko */}
        <div style={boxStyle}>
          <div style={headerStyle}>Maklumat Risiko</div>
          <div style={{ padding: "16px", display: "grid", gap: "14px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <label style={labelStyle}>No Rujukan:</label>
              <input
                name="noRujukan"
                value={formData.noRujukan}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Contoh: RSK-001"
              />
              <label style={labelStyle}>Tahun:</label>
              <input
                name="tahun"
                type="number"
                value={formData.tahun}
                onChange={handleChange}
                style={inputStyle}
                placeholder="2025"
              />
              <label style={labelStyle}>Separuh Tahun:</label>
              <select
                name="separuhTahun"
                value={formData.separuhTahun}
                onChange={handleChange}
                style={getDropdownStyle(formData.separuhTahun)}
              >
                <option value="">-- Pilih --</option>
                <option value="H1">H1</option>
                <option value="H2">H2</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <label style={labelStyle}>Syarikat:</label>
              <select
                name="syarikat"
                value={formData.syarikat}
                onChange={handleChange}
                style={getDropdownStyle(formData.syarikat)}
              >
                <option value="">-- Pilih --</option>
                <option>Subsidiari A</option>
                <option>Subsidiari B</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pengenalpastian Risiko */}
        <div style={boxStyle}>
          <div style={headerStyle}>Pengenalpastian Risiko</div>
          <div style={{ padding: "16px", display: "grid", gap: "14px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <label style={labelStyle}>Kategori Risiko:</label>
              <select
                name="kategori"
                value={formData.kategori}
                onChange={handleChange}
                style={getDropdownStyle(formData.kategori)}
              >
                <option value="">-- Pilih --</option>
                <option>Operasi</option>
                <option>Kewangan</option>
                <option>Strategik</option>
                <option>Pematuhan/Perundangan</option>
              </select>

              <label style={labelStyle}>Bahagian/Unit:</label>
              <textarea
                name="bahagian"
                value={formData.bahagian}
                onChange={handleChange}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Masukkan bahagian/unit"
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <label style={labelStyle}>Risiko:</label>
              <textarea
                name="risiko"
                value={formData.risiko}
                onChange={handleChange}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Huraikan risiko"
              />
              <label style={labelStyle}>Punca:</label>
              <textarea
                name="punca"
                value={formData.punca}
                onChange={handleChange}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Punca risiko"
              />
            </div>

            <div>
              <label style={labelStyle}>Kesan:</label>
              <textarea
                name="kesan"
                value={formData.kesan}
                onChange={handleChange}
                style={{ ...inputStyle, width: "100%" }}
                placeholder="Kesan risiko"
              />
            </div>
          </div>
        </div>

        {/* Penilaian Risiko */}
        <div style={boxStyle}>
          <div style={headerStyle}>Penilaian Risiko</div>
          <div style={{ padding: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <label style={labelStyle}>Skor Kebarangkalian:</label>
            <select
              name="skorKebarangkalian"
              value={formData.skorKebarangkalian}
              onChange={handleChange}
              style={getDropdownStyle(formData.skorKebarangkalian)}
            >
              <option value="">-- Pilih --</option>
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <label style={labelStyle}>Skor Impak:</label>
            <select
              name="skorImpak"
              value={formData.skorImpak}
              onChange={handleChange}
              style={getDropdownStyle(formData.skorImpak)}
            >
              <option value="">-- Pilih --</option>
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <label style={labelStyle}>Skor Risiko:</label>
            <input
              type="text"
              value={formData.skorRisiko}
              readOnly
              style={{
                ...inputStyle,
                fontWeight: "600",
                textAlign: "center",
                color: "white",
                background: riskColor,
                minWidth: "80px",
              }}
            />

            <label style={labelStyle}>Status Risiko:</label>
            <select
              name="statusRisiko"
              value={formData.statusRisiko}
              onChange={handleChange}
              style={getDropdownStyle(formData.statusRisiko)}
            >
              <option value="">-- Pilih --</option>
              <option>Ya</option>
              <option>Tidak</option>
            </select>
          </div>

          {riskLevel && (
            <div
              style={{
                marginTop: "12px",
                fontWeight: "600",
                color: riskColor,
                fontSize: "16px",
                textAlign: "center",
              }}
            >
              Tahap Risiko: {riskLevel}
            </div>
          )}
        </div>

        {/* Submit button */}
        <div style={{ textAlign: "center" }}>
          <button
            type="submit"
            style={{
              padding: "12px 30px",
              background: "#0074c8",
              color: "white",
              border: "none",
              borderRadius: "30px",
              fontWeight: "600",
              fontSize: "15px",
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(0,116,200,0.5)",
              transition: "0.3s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,116,200,0.6)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,116,200,0.5)")
            }
          >
            🚀 Daftar Risiko
          </button>
        </div>
      </form>
    </div>
  );
}

export default DaftarRisiko;
