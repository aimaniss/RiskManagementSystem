import { useState, useEffect } from "react";
import { X, BookOpen, Save } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import api from "../../api/api";
import "./PenilaianModal.css";
import PanduanModal from '../Panduan/Panduan'; 

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

function PenilaianModal({ isOpen, onClose, initialData = {} }) {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        noRujukan: initialData.no_rujukan || "",
        tahun: initialData.tahun || "",
        separuhTahun: initialData.separuh_tahun || "",
        subsidiari: initialData.subsidiari_id || initialData.subsidiari || "",
        kategori: initialData.kategori || "",
        bahagian: initialData.bahagian_unit || initialData.bahagian || "",
        risiko: initialData.risiko || "",
        skorKebarangkalian: initialData.skor_kebarangkalian || "", 
        skorImpak: initialData.skor_impak || "",
        skorRisiko: initialData.skor_risiko || "",
        statusRisiko: initialData.status_risiko || "",
        tahapRisiko: initialData.tahap_risiko || ""
    });

    const [puncaList] = useState(initialData.punca || []); 
    const [kesanList] = useState(initialData.kesan || []);

    const [riskColor, setRiskColor] = useState("#f1f5f9");
    const [subsidiariList, setSubsidiariList] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPanduanOpen, setIsPanduanOpen] = useState(false); 

    const token = localStorage.getItem("token");
    let userRole = "";
    if (token) {
        try {
            const decoded = jwtDecode(token);
            const roleMapping = { 1: "ADMIN", 2: "EXECUTIVE", 3: "KETUA SUBSIDIARI", 4: "STAFF", 5: "VIEWER" };
            userRole = roleMapping[decoded.peranan_id] || "";
        } catch (err) {
            console.error("❌ Invalid token", err);
            localStorage.removeItem("token");
        }
    }

    const canEditPenilaian = ["ADMIN", "EXECUTIVE"].includes(userRole);

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

    useEffect(() => {
        const k = parseInt(formData.skorKebarangkalian);
        const i = parseInt(formData.skorImpak);

        let newSkorRisiko = formData.skorRisiko;
        let newTahapRisiko = formData.tahapRisiko;
        let newStatusRisiko = formData.statusRisiko;
        let newColor = "#f1f5f9";

        if (!k && !i && formData.tahapRisiko) {
            const initialLabel = formData.tahapRisiko;
            for(let keyK in riskMatrix) {
                for(let keyI in riskMatrix[keyK]) {
                    if(riskMatrix[keyK][keyI].label === initialLabel) {
                        newColor = riskMatrix[keyK][keyI].color;
                        break;
                    }
                }
                if(newColor !== "#f1f5f9") break;
            }
        }

        if (k && i) {
            const { label, color } = getRiskMatrix(k, i);
            newTahapRisiko = label;
            newSkorRisiko = getRiskAbbreviation(label);
            newStatusRisiko = (label === "Rendah" || label === "") ? "Tidak" : "Ya";
            newColor = color;
        } else if (formData.skorKebarangkalian === "" && formData.skorImpak === "") {
            newSkorRisiko = "";
            newTahapRisiko = "";
            newStatusRisiko = "";
            newColor = "#f1f5f9";
        }

        setFormData(prev => ({ 
            ...prev, 
            skorRisiko: newSkorRisiko, 
            tahapRisiko: newTahapRisiko, 
            statusRisiko: newStatusRisiko 
        }));
        setRiskColor(newColor);
        
    }, [formData.skorKebarangkalian, formData.skorImpak]);

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        
        if (!canEditPenilaian) return alert("⚠️ Anda tidak mempunyai kebenaran untuk mengemaskini penilaian risiko.");
        if (!initialData.risiko_id) return alert("⚠️ ID Risiko tidak sah untuk dikemaskini.");

        const k = formData.skorKebarangkalian;
        const i = formData.skorImpak;
        if ((k && !i) || (!k && i)) {
            return alert("⚠️ Anda mesti mengisi KEDUA-DUA Skor Kebarangkalian dan Skor Impak, atau TIDAK MENGISI KEDUA-DUANYA.");
        }

        const finalData = { 
            skorKebarangkalian: formData.skorKebarangkalian !== "" ? parseInt(formData.skorKebarangkalian) : null,
            skorImpak: formData.skorImpak !== "" ? parseInt(formData.skorImpak) : null,
            skorRisiko: formData.skorRisiko,
            statusRisiko: formData.statusRisiko,
            tahapRisiko: formData.tahapRisiko,
        };

        setIsSubmitting(true);
        try {
            await api.put(`/rawatan/penilaian/${initialData.risiko_id}`, finalData); 
            
            alert("✅ Penilaian Risiko berjaya dikemaskini! Status pemantauan dikemaskini kepada: Sedang Dilaksanakan");
            onClose(true);
        } catch (err) {
            console.error("❌ Error kemaskini penilaian:", err.response?.data || err.message);
            alert("⚠️ Gagal mengemaskini penilaian risiko.");
        } finally { setIsSubmitting(false); }
    };

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
                                        <input readOnly value={formData.separuhTahun == 1 ? "Pertama" : formData.separuhTahun == 2 ? "Kedua" : ""} className="penilaian-input" />
                                    </div>
                                </div>
                                <div className="penilaian-info-row" style={{ marginTop: '0px' }}>
                                    <div className="penilaian-input-group full-width">
                                        <label className="penilaian-label">Syarikat:</label>
                                        <input readOnly value={subsidiariName} className="penilaian-input" />
                                    </div>
                                </div>

                                <hr className="penilaian-divider-line" />

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

                                <div style={{ marginTop:"12px" }}>
                                    <label className="penilaian-label">Punca:</label>
                                    {puncaList.filter(p => p && p.trim() !== "").map((p, idx) => (
                                        <div key={idx} style={{ display:"flex", alignItems:"center", marginBottom:"6px" }}>
                                            <input readOnly value={`${idx + 1}. ${p}`} className="penilaian-input" />
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop:"12px" }}>
                                    <label className="penilaian-label">Kesan:</label>
                                    {kesanList.filter(k => k && k.trim() !== "").map((k, idx) => (
                                        <div key={idx} style={{ display:"flex", alignItems:"center", marginBottom:"6px" }}>
                                            <input readOnly value={`${idx + 1}. ${k}`} className="penilaian-input" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

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

                                    <div className="penilaian-risk-field">
                                        <label className="penilaian-label">Tahap Risiko:</label>
                                        <input 
                                            type="text" 
                                            value={formData.skorRisiko}
                                            readOnly 
                                            className="penilaian-input penilaian-risk-score" 
                                            style={{ background: riskColor, textAlign:"center" }} 
                                        />
                                    </div>

                                    <div className="penilaian-risk-field">
                                        <label className="penilaian-label">Status Risiko:</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={
                                                formData.statusRisiko === "Ya"
                                                    ? "Ya (Risiko memerlukan tindakan)" 
                                                    : formData.statusRisiko === "Tidak"
                                                        ? "Tidak (Risiko rendah-tiada tindakan)"
                                                        : ""
                                            }
                                            className="penilaian-input penilaian-status-risk"
                                            style={{ textAlign: "center", backgroundColor: "#f1f5f9", color: "#004071" }}
                                        />
                                    </div>
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