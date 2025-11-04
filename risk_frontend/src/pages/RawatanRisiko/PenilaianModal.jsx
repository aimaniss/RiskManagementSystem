import { useState, useEffect } from "react";
import { X, BookOpen, Save } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import api from "../../api/api";
import "./PenilaianModal.css";
import PanduanModal from '../Panduan/Panduan'; 

// --- JADUAL RUJUKAN SKOR BARU ---
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

function PenilaianModal({ isOpen, onClose, initialData = {} }) {
    if (!isOpen) return null;

    // 🌟 KEMASKINI 1: Betulkan nama properti (props) 🌟
    // Membaca properti yang betul dari initialData (cth: subsidiari_id, separuh_tahun)
    const [formData, setFormData] = useState({
        noRujukan: initialData.no_rujukan || "",
        tahun: initialData.tahun || "",
        separuhTahun: initialData.separuh_tahun || "", // Guna 'separuh_tahun'
        subsidiari: initialData.subsidiari_id || initialData.subsidiari || "", // Guna 'subsidiari_id'
        kategori: initialData.kategori || "",
        bahagian: initialData.bahagian_unit || initialData.bahagian || "", // Guna 'bahagian_unit'
        risiko: initialData.risiko || "",
        skorKebarangkalian: initialData.skor_kebarangkalian || "", 
        skorImpak: initialData.skor_impak || "",
        skorRisiko: initialData.skor_risiko || "", // Sepatutnya singkatan (ST, T)
        statusRisiko: initialData.status_risiko || "", // Sepatutnya 'Ya' atau 'Tidak'
        tahapRisiko: initialData.tahap_risiko || "" // Sepatutnya label (Sangat Tinggi)
    });

    // Betulkan data Punca/Kesan (pastikan 'punca' & 'kesan' ada dalam initialData)
    const [puncaList] = useState(initialData.punca || []); 
    const [kesanList] = useState(initialData.kesan || []);

    const [riskColor, setRiskColor] = useState("#f1f5f9");
    const [subsidiariList, setSubsidiariList] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPanduanOpen, setIsPanduanOpen] = useState(false); 

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

  	// 🌟 KEMASKINI 2: Betulkan logik useEffect 🌟
    useEffect(() => {
        const k = parseInt(formData.skorKebarangkalian);
        const i = parseInt(formData.skorImpak);

      	 // Simpan nilai sedia ada jika tiada perubahan
        let newSkorRisiko = formData.skorRisiko;
        let newTahapRisiko = formData.tahapRisiko;
        let newStatusRisiko = formData.statusRisiko;
        let newColor = "#f1f5f9"; // Warna default

        // Tetapkan warna awal berdasarkan data sedia ada
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
            // Jika ada K dan I, kira semula
            const { label, color } = getRiskMatrix(k, i);
            newTahapRisiko = label;
            newSkorRisiko = getRiskAbbreviation(label); // Betulkan: skorRisiko ialah singkatan
            newStatusRisiko = (label === "Rendah" || label === "") ? "Tidak" : "Ya";
            newColor = color;
        } else if (formData.skorKebarangkalian === "" && formData.skorImpak === "") {
            // Jika kedua-duanya dikosongkan, reset
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
        
    }, [formData.skorKebarangkalian, formData.skorImpak, initialData.tahapRisiko]);

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  	// 🌟 KEMASKINI 3: Betulkan handleSubmit (API & Data) 🌟
    const handleSubmit = async e => {
        e.preventDefault();
        
        if (!canEditPenilaian) return alert("⚠️ Anda tidak mempunyai kebenaran untuk mengemaskini penilaian risiko.");
        if (!initialData.risiko_id) return alert("⚠️ ID Risiko tidak sah untuk dikemaskini.");

        const k = formData.skorKebarangkalian;
        const i = formData.skorImpak;
        if ((k && !i) || (!k && i)) {
            return alert("⚠️ Anda mesti mengisi KEDUA-DUA Skor Kebarangkalian dan Skor Impak, atau TIDAK MENGISI KEDUA-DUANYA.");
        }

        // API anda (PUT /risiko/:risiko_id) mengemas kini keseluruhan rekod.
        // Kita mesti hantar SEMUA data lama + data baru.
        const finalData = { 
            // Data asal (diambil dari state)
            noRujukan: formData.noRujukan,
            tahun: formData.tahun,
            separuhTahun: formData.separuhTahun,
            subsidiari: formData.subsidiari, // Hantar ID subsidiari
            kategori: formData.kategori,
            bahagian: formData.bahagian,
            risiko: formData.risiko,
            
            // Data penilaian yang dikemaskini
            skorKebarangkalian: formData.skorKebarangkalian !== "" ? parseInt(formData.skorKebarangkalian) : null,
            skorImpak: formData.skorImpak !== "" ? parseInt(formData.skorImpak) : null,
            skorRisiko: formData.skorRisiko, // Hantar singkatan (ST, T, S, R)
            statusRisiko: formData.statusRisiko, // Hantar 'Ya' atau 'Tidak'
            tahapRisiko: formData.tahapRisiko, // Hantar label penuh (jika perlu)
        };

        setIsSubmitting(true);
        try {
          	
            await api.put(`/risiko/${initialData.risiko_id}`, finalData); 
            
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
                                    	{/* Guna '==' untuk perbandingan longgar (cth: 1 == "1") */}
                                    	<input readOnly value={formData.separuhTahun == 1 ? "Pertama" : formData.separuhTahun == 2 ? "Kedua" : ""} className="penilaian-input" />
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
                                    {puncaList.filter(p => p && p.trim() !== "").map((p, idx) => (
                                        <div key={idx} style={{ display:"flex", alignItems:"center", marginBottom:"6px" }}>
                                            <input readOnly value={`${idx + 1}. ${p}`} className="penilaian-input" />
                                        </div>
                                    ))}
                                </div>

                                {/* Kesan (Display Sahaja) */}
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

                                    <div className="penilaian-risk-field">
                                        <label className="penilaian-label">Skor Risiko:</label>
                                        <input 
                                            type="text" 
                                            value={formData.skorRisiko} // Papar singkatan (hasil useEffect)
                                        M   readOnly 
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