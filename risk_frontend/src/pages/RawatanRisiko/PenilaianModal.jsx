import { useState, useEffect } from "react";
import { X, BookOpen, Save } from "lucide-react"; // Tukar Plus, Trash2 ke X, Save
import { jwtDecode } from "jwt-decode";
import api from "../../api/api";
import "./PenilaianModal.css"; // Tukar import CSS
import PanduanModal from '../Panduan/Panduan'; 

// --- JADUAL RUJUKAN SKOR BARU (Dikekalkan) ---
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

// Terima props untuk berfungsi sebagai Modal
function PenilaianModal({ isOpen, onClose, initialData = {} }) {
    // Jika modal tidak terbuka, return null untuk elakkan rendering
    if (!isOpen) return null;

    // State awal diset berdasarkan initialData yang diluluskan dari luar
    const [formData, setFormData] = useState({
        noRujukan: initialData.noRujukan || "",
        tahun: initialData.tahun || "",
        separuhTahun: initialData.separuhTahun || "",
        subsidiari: initialData.subsidiari || "",
        kategori: initialData.kategori || "",
        bahagian: initialData.bahagian || "",
        risiko: initialData.risiko || "",
        // Nilai skor awal mungkin dari data risiko sedia ada
        skorKebarangkalian: initialData.skorKebarangkalian || "", 
        skorImpak: initialData.skorImpak || "",
        skorRisiko: initialData.skorRisiko || "", 
        statusRisiko: initialData.statusRisiko || "",
        tahapRisiko: initialData.tahapRisiko || "" 
    });

    // Punca dan Kesan dijadikan display sahaja (jika diluluskan)
    const [puncaList] = useState(initialData.punca || [""]); 
    const [kesanList] = useState(initialData.kesan || [""]);

    const [riskColor, setRiskColor] = useState("#f1f5f9");
    const [subsidiariList, setSubsidiariList] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPanduanOpen, setIsPanduanOpen] = useState(false); 

    // Ambil userRole dari JWT token (Dikekalkan)
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

    // Hanya ADMIN dan EXECUTIVE boleh edit Penilaian
    const canEditPenilaian = ["ADMIN", "EXECUTIVE"].includes(userRole);

    // Matrix Risiko (Dikekalkan)
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

    // Ambil Subsidiari (Dikekalkan)
    useEffect(() => {
        const fetchSubsidiari = async () => {
            try {
                const res = await api.get("/subsidiari");
                const data = Array.isArray(res.data) ? res.data : res.data.subsidiari || [];
                setSubsidiariList(data);
            } catch (err) {
                console.error("❌ Error fetch subsidiari:", err);
            }
        };
        fetchSubsidiari();
    }, []); 

    // Kalkulasi Skor Risiko (Dikekalkan)
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

    // Handle input changes untuk Penilaian Risiko sahaja
    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    // Fungsi ini hanya akan mengemaskini Penilaian Risiko
    const handleSubmit = async e => {
        e.preventDefault();
        
        if (!canEditPenilaian) return alert("⚠️ Anda tidak mempunyai kebenaran untuk mengemaskini penilaian risiko.");
        if (!initialData.risiko_id) return alert("⚠️ ID Risiko tidak sah untuk dikemaskini.");


        // Logik semak skor (Dikekalkan dari kod asal)
        const k = formData.skorKebarangkalian;
        const i = formData.skorImpak;
        if ((k && !i) || (!k && i)) {
            return alert("⚠️ Anda mesti mengisi KEDUA-DUA Skor Kebarangkalian dan Skor Impak, atau TIDAK MENGISI KEDUA-DUANYA.");
        }

        const finalData = { 
            // Hanya hantar data yang berkaitan dengan penilaian
            skorKebarangkalian: formData.skorKebarangkalian !== "" ? parseInt(formData.skorKebarangkalian) : null,
            skorImpak: formData.skorImpak !== "" ? parseInt(formData.skorImpak) : null,
            skorRisiko: getRiskAbbreviation(formData.tahapRisiko), // Guna Abbreviation
            tahapRisiko: formData.tahapRisiko, // Label penuh (untuk tujuan kemaskini jika perlu)
            statusRisiko: formData.statusRisiko, // 'Ya' atau 'Tidak'
            
            // Juga sertakan noRujukan untuk logging / rujukan backend jika perlu
            noRujukan: formData.noRujukan
        };

        setIsSubmitting(true);
        try {
            // UPDATE API: Guna PUT untuk mengemaskini rekod sedia ada
            await api.put(`/risiko/penilaian/${initialData.risiko_id}`, finalData); 
            alert("✅ Penilaian Risiko berjaya dikemaskini!");
            onClose(true); // Tutup modal dan isyaratkan kemaskini berjaya
        } catch (err) {
            console.error("❌ Error kemaskini penilaian:", err.response?.data || err.message);
            alert("⚠️ Gagal mengemaskini penilaian risiko.");
        } finally { setIsSubmitting(false); }
    };


    // Cari nama subsidiari dari senarai untuk display
    const subsidiariName = subsidiariList.find(s => s.subsidiari_id == formData.subsidiari)?.nama_subsidiari || "Memuat...";

    return (
        <div className="penilaian-modal-overlay">
            <div className="penilaian-modal-container">
                <div className="penilaian-box-header-main">
                    <span>Penilaian Risiko: {formData.noRujukan}</span>
                    <button type="button" onClick={() => onClose(false)} className="penilaian-close-btn"><X size={20}/></button>
                </div>

                <div className="penilaian-modal-content">
                    <form onSubmit={handleSubmit}>

                        {/* KOTAK GABUNGAN: Pengenalpastian Risiko & Maklumat Risiko (Display Sahaja) */}
                        <div className="penilaian-box">
                            <div className="penilaian-box-header penilaian-risk-header"> 
                                <span>Pengenalpastian Risiko (Maklumat Dipaparkan)</span>
                                <button 
                                    type="button" 
                                    className="penilaian-panduan-btn" 
                                    onClick={() => setIsPanduanOpen(true)}
                                >
                                    <BookOpen size={16} style={{ marginRight: '6px' }} />
                                    Panduan
                                </button>
                            </div>

                            <div className="penilaian-info-section">
                                    
                                {/* BAHAGIAN MAKLUMAT RISIKO (Pindah ke atas) - DISPLAY ONLY */}
                                <div className="penilaian-info-row">
                                    <div className="penilaian-input-group">
                                        <label className="penilaian-label">No Rujukan:</label>
                                        <input readOnly value={formData.noRujukan} className="penilaian-input" />
                                    </div>
                                    <div className="penilaian-input-group">
                                        <label className="penilaian-label">Tahun:</label>
                                        <input readOnly value={formData.tahun} className="penilaian-input" />
                                    </div>
                                    <div className="penilaian-input-group">
                                        <label className="penilaian-label">Separuh Tahun:</label>
                                        <input readOnly value={formData.separuhTahun === "1" ? "Pertama" : formData.separuhTahun === "2" ? "Kedua" : ""} className="penilaian-input" />
                                    </div>
                                </div>
                                <div className="penilaian-info-row" style={{ marginTop: '0px' }}>
                                    <div className="penilaian-input-group full-width">
                                        <label className="penilaian-label">Subsidiari:</label>
                                        <input readOnly value={subsidiariName} className="penilaian-input" />
                                    </div>
                                </div>

                                {/* GARIS PEMISAH VISUAL */}
                                <hr className="penilaian-divider-line" />

                                {/* BAHAGIAN PENGENALPASTIAN RISIKO - DISPLAY ONLY */}
                                <div className="penilaian-field-group">
                                    <div className="penilaian-input-group">
                                        <label className="penilaian-label">Kategori Risiko:</label>
                                        <input readOnly value={formData.kategori} className="penilaian-input" />
                                    </div>
                                    <div className="penilaian-input-group">
                                        <label className="penilaian-label">Bahagian/Unit:</label>
                                        <textarea readOnly value={formData.bahagian} className="penilaian-textarea" style={{ height: '70px' }} />
                                    </div>
                                </div>

                                <label className="penilaian-label" style={{ marginTop:"12px" }}>Risiko:</label>
                                <textarea readOnly value={formData.risiko} className="penilaian-textarea" placeholder="Huraian Risiko" />

                                {/* Punca (Display Sahaja) */}
                                <div style={{ marginTop:"12px" }}>
                                    <label className="penilaian-label">Punca:</label>
                                    {puncaList.filter(p => p.trim() !== "").map((p, idx) => (
                                        <div key={idx} style={{ display:"flex", alignItems:"center", marginBottom:"6px" }}>
                                            <input readOnly value={`${idx + 1}. ${p}`} className="penilaian-input" />
                                        </div>
                                    ))}
                                </div>

                                {/* Kesan (Display Sahaja) */}
                                <div style={{ marginTop:"12px" }}>
                                    <label className="penilaian-label">Kesan:</label>
                                    {kesanList.filter(k => k.trim() !== "").map((k, idx) => (
                                        <div key={idx} style={{ display:"flex", alignItems:"center", marginBottom:"6px" }}>
                                            <input readOnly value={`${idx + 1}. ${k}`} className="penilaian-input" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Penilaian Risiko (Boleh Diedit) */}
                        {canEditPenilaian && (
                            <div className="penilaian-box">
                                <div className="penilaian-box-header">Penilaian Risiko</div>
                                <div className="penilaian-risk-wrapper">
                                    <div className="penilaian-risk-field">
                                        <label className="penilaian-label">Skor Kebarangkalian:</label>
                                        <select name="skorKebarangkalian" value={formData.skorKebarangkalian} onChange={handleChange} className="penilaian-input penilaian-select-dropdown">
                                            <option value="">-- Pilih --</option>
                                            {Object.entries(KebarangkalianData).map(([value, label])=> (
                                                    <option key={value} value={value}>
                                                        {value} - {label} 
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div className="penilaian-risk-field">
                                        <label className="penilaian-label">Skor Impak:</label>
                                        <select name="skorImpak" value={formData.skorImpak} onChange={handleChange} className="penilaian-input penilaian-select-dropdown">
                                            <option value="">-- Pilih --</option>
                                            {Object.entries(ImpakData).map(([value, label])=> (
                                                    <option key={value} value={value}>
                                                        {value} - {label} 
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {/* START: PERUBAHAN DI SINI (Skor Risiko) */}
                                    <div className="penilaian-risk-field">
                                        <label className="penilaian-label">Skor Risiko:</label>
                                        <input 
                                            type="text" 
                                            value={getRiskAbbreviation(formData.tahapRisiko)} // KEMBALI KEPADA HANYA SINGKATAN
                                            readOnly 
                                            className="penilaian-input penilaian-risk-score" 
                                            style={{ background: riskColor, textAlign:"center" }} 
                                        />
                                    </div>
                                    {/* END: PERUBAHAN DI SINI (Skor Risiko) */}

                                    {/* START: PERUBAHAN DI SINI (Status Risiko) */}
                                    <div className="penilaian-risk-field">
                                        <label className="penilaian-label">Status Risiko:</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={
                                                formData.statusRisiko === "Ya"
                                                    ? "Ya (Risiko memerlukan tindakan)" // KEMBALI KEPADA LABEL PENUH
                                                    : formData.statusRisiko === "Tidak"
                                                        ? "Tidak (Risiko rendah-tiada tindakan)" // KEMBALI KEPADA LABEL PENUH
                                                        : ""
                                            }
                                            className="penilaian-input penilaian-status-risk"
                                            style={{ textAlign: "center", backgroundColor: "#f1f5f9", color: "#004071" }}
                                        />

                                    </div>
                                    {/* END: PERUBAHAN DI SINI (Status Risiko) */}
                                </div>
                            </div>
                        )}
                        
                        <div className="penilaian-button-group">
                            <button type="submit" className="penilaian-submit-button" disabled={isSubmitting || !canEditPenilaian}>
                                {isSubmitting ? <span className="penilaian-spinner"></span> : (<><Save size={16} style={{ marginRight: '8px' }}/>Simpan Penilaian</>)}
                            </button>
                        </div>
                    </form>
                </div>

                {isPanduanOpen && <PanduanModal isOpen={isPanduanOpen} onClose={() => setIsPanduanOpen(false)} />}

            </div>
        </div>
    );
}

export default PenilaianModal;