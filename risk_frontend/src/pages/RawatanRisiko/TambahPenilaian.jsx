// src/components/PenilaianRawatan/TambahPenilaian.jsx
import { useState } from 'react';
import api from '../../api/api'; // Pastikan laluan API betul
import { X, Save } from 'lucide-react';
import './TambahPenilaian.css';

// Anda boleh menggunakan semula CSS modal dari EditRawatan, atau sediakan CSS yang sama
// jika anda belum membuatnya. Untuk kes ini, saya akan menggunakan gaya modal generik.

const TambahPenilaian = ({ isOpen, risk, onClose, onSave, riskMatrix }) => {
    // Skop Kebarangkalian dan Impak adalah antara 1 hingga 5
    const [skorKebarangkalian, setSkorKebarangkalian] = useState('');
    const [skorImpak, setSkorImpak] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !risk) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const k = parseInt(skorKebarangkalian);
        const i = parseInt(skorImpak);

        if (k < 1 || k > 5 || i < 1 || i > 5) {
            setError("Sila masukkan Skor Kebarangkalian dan Impak antara 1 hingga 5.");
            return;
        }

        const tahapRisikoData = riskMatrix[k]?.[i];
        if (!tahapRisikoData) {
             setError("Gagal menentukan Tahap Risiko. Sila cuba skor lain.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            // Data untuk dihantar ke API (contoh laluan API /risiko/{id}/penilaian)
            const payload = {
                skor_kebarangkalian: k,
                skor_impak: i,
                tahap_risiko: tahapRisikoData.label, // Cth: Tinggi, Sederhana
                // Anda mungkin perlu menghantar risk_id atau no_rujukan. Asumsi API memerlukan risk.risk_id
            };

            await api.put(`/risiko/${risk.risk_id}/penilaian`, payload);
            
            onSave(); // Tutup modal dan refresh data
        } catch (err) {
            console.error("❌ Gagal menyimpan Penilaian:", err);
            setError("Gagal menyimpan penilaian. Sila cuba sebentar lagi.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSkorKebarangkalian('');
        setSkorImpak('');
        setError(null);
        onClose();
    };
    
    // Gantikan ini dengan gaya modal yang konsisten dalam projek anda
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
                            <div className="form-group">
                                <label htmlFor="kebarangkalian">Skor Kebarangkalian (1-5)</label>
                                <input
                                    id="kebarangkalian"
                                    type="number"
                                    min="1" max="5"
                                    value={skorKebarangkalian}
                                    onChange={(e) => setSkorKebarangkalian(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="impak">Skor Impak (1-5)</label>
                                <input
                                    id="impak"
                                    type="number"
                                    min="1" max="5"
                                    value={skorImpak}
                                    onChange={(e) => setSkorImpak(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <p className="note-matrix">
                            **Nota:** Skor 1 (Paling Rendah) hingga 5 (Paling Tinggi).
                        </p>

                        <div className="modal-actions">
                            <button type="button" onClick={handleClose} className="btn-secondary">
                                Batal
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading}>
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