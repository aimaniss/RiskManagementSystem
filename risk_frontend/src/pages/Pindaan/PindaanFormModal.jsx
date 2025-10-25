import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";

// Import CSS KHUSUS untuk modal ini
import './PindaanFormModal.css';

function PindaanFormModal({ isOpen, risk, userRole, onClose, onPindaanSubmitted }) {
    const [originalData, setOriginalData] = useState({}); 
    const [formData, setFormData] = useState({}); 
    const [puncaList, setPuncaList] = useState([]); 
    const [kesanList, setKesanList] = useState([]); 
    const [justifikasi, setJustifikasi] = useState(""); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => { 
        if (risk && isOpen) { 
            const original = { no_rujukan: risk.no_rujukan, tahun: risk.tahun, separuh_tahun: risk.separuh_tahun, subsidiari: risk.subsidiari_id || risk.subsidiari, kategori: risk.kategori, bahagian: risk.bahagian, risiko: risk.risiko, skor_kebarangkalian: risk.skor_kebarangkalian, skor_impak: risk.skor_impak, punca: risk.punca || [], kesan: risk.kesan || [], }; 
            setOriginalData(original); 
            setFormData(original); 
            setPuncaList(original.punca.length > 0 ? [...original.punca] : [""]); 
            setKesanList(original.kesan.length > 0 ? [...original.kesan] : [""]); 
            setJustifikasi(""); 
        }
    }, [risk, isOpen]);
    
    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value }); 
    const updateList = (listSetter, index, value) => { listSetter(prev => { const newList = [...prev]; newList[index] = value; return newList; }); }; 
    const addListItem = (listSetter) => { listSetter(prev => [...prev, ""]); }; 
    const removeListItem = (listSetter, index) => { listSetter(prev => { const newList = [...prev]; newList.splice(index, 1); return newList.length > 0 ? newList : [""]; }); };
    
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        if (!justifikasi.trim()) { alert("Sila isi justifikasi"); return; } 
        const currentData = { ...formData, punca: puncaList.filter(p => p && p.trim() !== ""), kesan: kesanList.filter(k => k && k.trim() !== "") }; 
        const findChanges = (original, current) => { const sebelum = {}; const selepas = {}; const allKeys = new Set([...Object.keys(original), ...Object.keys(current)]); allKeys.forEach(key => { if (JSON.stringify(original[key]) !== JSON.stringify(current[key])) { sebelum[key] = original[key] ?? null; selepas[key] = current[key] ?? null; }}); return { sebelum, selepas }; }; 
        const { sebelum, selepas } = findChanges(originalData, currentData); 
        if (Object.keys(sebelum).length === 0) { alert("ℹ️ Tiada perubahan dikesan."); return; } 
        const perubahanDicadang = { data_sebelum: sebelum, data_selepas: selepas }; 
        setIsSubmitting(true); 
        onPindaanSubmitted(justifikasi, perubahanDicadang) .catch(() => {}) .finally(() => setIsSubmitting(false)); 
    };
    
    const submitButtonText = userRole === "Admin" ? "Hantar & Luluskan Terus" : "Hantar Permohonan"; 
    
    if (!isOpen) return null;
    
    return ( 
        <div className="modal-overlay"> 
            <div className="modal-dialog modal-form"> 
                <div className="modal-header"> 
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Borang Pindaan: {risk.no_rujukan}</h3> 
                    <button onClick={onClose} className="modal-close-x"><X size={24} /></button> 
                </div> 
                <form onSubmit={handleSubmit} className="modal-content modal-form-body"> 
                    <div className="form-group">
                        <label>Risiko:</label>
                        <textarea name="risiko" value={formData.risiko || ''} onChange={handleChange} className="form-textarea"/>
                    </div> 
                    <div className="form-group">
                        <label>Kategori:</label>
                        <select name="kategori" value={formData.kategori || ''} onChange={handleChange} className="form-select">
                            <option value="">-- Pilih --</option>
                            <option>Operasi</option>
                            <option>Kewangan</option>
                            <option>Strategik</option>
                            <option>Pematuhan/Perundangan</option>
                        </select>
                    </div> 
                    <div className="form-group"> 
                        <label>Punca:</label> 
                        {puncaList.map((p, idx) => ( 
                            <div key={idx} className="form-list-item"> 
                                <input value={p} onChange={e => updateList(setPuncaList, idx, e.target.value)} className="form-input" placeholder={`Punca ${idx+1}`}/> 
                                {puncaList.length > 1 && <button type="button" onClick={() => removeListItem(setPuncaList, idx)} className="btn-icon btn-icon-danger"><Trash2 size={16} /></button>} 
                                {idx === puncaList.length - 1 && <button type="button" onClick={() => addListItem(setPuncaList)} className="btn-icon btn-icon-success"><Plus size={16} /></button>} 
                            </div> 
                        ))} 
                    </div> 
                    <div className="form-group"> 
                        <label style={{ fontWeight: 'bold' }}>Justifikasi Pindaan (Wajib):</label> 
                        <textarea value={justifikasi} onChange={e => setJustifikasi(e.target.value)} className="form-textarea" placeholder="Terangkan sebab pindaan..." /> 
                    </div> 
                    
                    <div className="modal-footer" style={{marginTop: '20px'}}> 
                        <button type="button" onClick={onClose} className="btn btn-default">Batal</button> 
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Menghantar..." : submitButtonText}</button> 
                    </div> 
                </form> 
            </div> 
        </div> 
    );
}

export default PindaanFormModal;