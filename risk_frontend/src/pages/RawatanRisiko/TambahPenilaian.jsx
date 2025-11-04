// src/components/PenilaianRawatan/TambahPenilaian.jsx (DIKEMASKINI)
import { useState, useEffect } from 'react'; 
import api from '../../api/api'; 
import { X, Save } from 'lucide-react';
import './TambahPenilaian.css';

// --- JADUAL DATA RISIKO (DIMASUKKAN TERUS) ---
const KebarangkalianData = {
    5: "Hampir Pasti", 4: "Kemungkinan Tinggi", 3: "Berpeluang Untuk Berlaku",
    2: "Kemungkinan Rendah", 1: "Hampir Tiada Kemungkinan",
};
const ImpakData = {
    5: "Sangat Besar", 4: "Besar", 3: "Ketara",
    2: "Boleh Diukur", 1: "Tidak Ketara",
};
const riskMatrix = {
    1: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Rendah", color:"#22c55e"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Sederhana", color:"#eab308"},5:{label:"Tinggi", color:"#f97316"}},
    2: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Rendah", color:"#22c55e"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Sederhana", color:"#eab308"},5:{label:"Tinggi", color:"#f97316"}},
    3: {1:{label:"Rendah", color:"#22c55e"},2:{label:"Sederhana", color:"#eab308"},3:{label:"Sederhana", color:"#eab308"},4:{label:"Tinggi", color:"#f97316"},5:{label:"Tinggi", color:"#f97316"}},
    4: {1:{label:"Sederhana", color:"#eab308"},2:{label:"Sederhana", color:"#eab308"},3:{label:"Tinggi", color:"#f97316"},4:{label:"Tinggi", color:"#f97316"},5:{label:"Sangat Tinggi", color:"#ef4444"}},
    5: {1:{label:"Sederhana", color:"#eab308"},2:{label:"Tinggi", color:"#f97316"},3:{label:"Tinggi", color:"#f97316"},4:{label:"Sangat Tinggi", color:"#ef4444"},5:{label:"Sangat Tinggi", color:"#ef4444"}},
};

// ---------------------------------

const getRiskMatrix = (k, i, matrix) => matrix[k]?.[i] || { label: "", color: "#f1f5f9" };
const getRiskAbbreviation = (label) => {
    switch(label) {
      case "Rendah": return "R";
      case "Sederhana": return "S";
      case "Tinggi": return "T";
      case "Sangat Tinggi": return "ST";
      default: return ""; 
    }
};

const TambahPenilaian = ({ isOpen, risk, onClose, onSave }) => {
    const [skorKebarangkalian, setSkorKebarangkalian] = useState('');
    const [skorImpak, setSkorImpak] = useState('');
    
    const [tahapRisiko, setTahapRisiko] = useState('');
    const [skorRisiko, setSkorRisiko] = useState(''); 
    const [statusRisikoDisplay, setStatusRisikoDisplay] = useState(''); // State untuk paparan teks penuh
    const [riskColor, setRiskColor] = useState('#f1f5f9');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !risk) return null;
    
    // --- LOGIK PENGIRAAN SKOR DINAMIK (DIKEMASKINI STATUS RISIKO) ---
    useEffect(() => {
        const k = parseInt(skorKebarangkalian);
        const i = parseInt(skorImpak);
        
        if (k && i) {
            const { label, color } = getRiskMatrix(k, i, riskMatrix);
            const abbreviation = getRiskAbbreviation(label); 
            
            setTahapRisiko(label); 
            setSkorRisiko(abbreviation); 
            setRiskColor(color);
            
            // --- LOGIK BARU (TIRU DAFTAR RISIKO) ---
            if (label === "Rendah") {
                setStatusRisikoDisplay("Tidak (Risiko rendah-tiada tindakan)");
            } else {
                setStatusRisikoDisplay("Ya (Risiko memerlukan tindakan)");
            }
            // ---------------------------------------
            
        } else {
            setTahapRisiko('');
            setSkorRisiko(''); 
            setStatusRisikoDisplay('');
            setRiskColor('#f1f5f9');
        }
    }, [skorKebarangkalian, skorImpak]);

    // --- LOGIK HANDLE SUBMIT (DIKEMASKINI UNTUK BACKEND) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const k = parseInt(skorKebarangkalian);
        const i = parseInt(skorImpak);

        if (!k || !i || !tahapRisiko) {
            setError("Sila lengkapkan Skor Kebarangkalian dan Skor Impak.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            const payload = {
                skor_kebarangkalian: k,
                skor_impak: i,
                tahap_risiko: tahapRisiko, 
                skor_risiko: skorRisiko, 
                // Hantar YA/TIDAK ke backend (seperti yang dilakukan dalam DaftarRisiko.jsx)
                status_risiko: tahapRisiko === "Rendah" ? "Tidak" : "Ya",
            };
            
            await api.put(`/risiko/${risk.risk_id}/penilaian`, payload);
            onSave(); 
        } catch (err) {
            console.error("❌ Gagal menyimpan Penilaian:", err.response?.data || err.message);
            setError("Gagal menyimpan penilaian. Sila cuba sebentar lagi.");
        } finally { setLoading(false); }
    };

    const handleClose = () => {
        setSkorKebarangkalian('');
        setSkorImpak('');
        setTahapRisiko('');
        setSkorRisiko(''); 
        setStatusRisikoDisplay(''); 
        setRiskColor('#f1f5f9');
        setError(null);
        onClose();
    };
    
    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Tambah Penilaian Risiko: {risk.no_rujukan}</h2>
                    <button className="modal-close-btn" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="modal-risk-desc">
                        **Risiko:** {risk.risiko}
                    </p>
                    
                    {error && <p className="modal-error">{error}</p>}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group-grid">
                            {/* Pilihan Skor Kebarangkalian */}
                            <div className="form-group">
                                <label htmlFor="kebarangkalian">Skor Kebarangkalian (1-5)</label>
                                <select
                                    id="kebarangkalian"
                                    value={skorKebarangkalian}
                                    onChange={(e) => setSkorKebarangkalian(e.target.value)}
                                    required
                                    className="input-select"
                                >
                                    <option value="">-- Pilih --</option>
                                    {Object.entries(KebarangkalianData).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {value} - {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Pilihan Skor Impak */}
                            <div className="form-group">
                                <label htmlFor="impak">Skor Impak (1-5)</label>
                                <select
                                    id="impak"
                                    value={skorImpak}
                                    onChange={(e) => setSkorImpak(e.target.value)}
                                    required
                                    className="input-select"
                                >
                                    <option value="">-- Pilih --</option>
                                    {Object.entries(ImpakData).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {value} - {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        {/* KOTAK HASIL PENILAIAN */}
                        <div className="risk-result-box">
                            {/* Medan 1: Skor Risiko (R, S, T, ST) */}
                            <div className="risk-result-field">
                                <label>Skor Risiko:</label>
                                <div 
                                    className="risk-display-label" 
                                    style={{ 
                                        backgroundColor: riskColor, 
                                        color: riskColor === '#f1f5f9' ? '#4b5563' : '#ffffff',
                                        fontWeight: 800, 
                                        fontSize: '16px' 
                                    }}
                                >
                                    {skorRisiko || '---'} 
                                </div>
                            </div>
                            {/* Medan 2: Status Risiko (Teks Penuh) */}
                            <div className="risk-result-field">
                                <label>Status Risiko:</label> 
                                <div className="risk-display-label status-display">
                                    {statusRisikoDisplay || 'Sila Pilih Skor'} 
                                </div>
                            </div>
                        </div>

                        <p className="note-matrix">
                            **Nota:** Skor 1 (Paling Rendah) hingga 5 (Paling Tinggi).
                        </p>

                        <div className="modal-actions">
                            <button type="button" onClick={handleClose} className="btn-secondary">
                                Batal
                            </button>
                            <button 
                                type="submit" 
                                className="btn-primary" 
                                disabled={loading || !skorKebarangkalian || !skorImpak}
                            >
                                {loading ? 'Menyimpan...' : (
                                    <>
                                        <Save size={18} /> Simpan Penilaian
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TambahPenilaian;