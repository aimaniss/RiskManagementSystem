import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

// Import komponen (mereka akan memuatkan CSS mereka sendiri)
import ComparisonView from './ComparisonView';

// Import CSS KHUSUS untuk modal ini
import './PindaanDetailsModal.css';

function PindaanDetailsModal({ isOpen, amendment, userRole, onClose, onAction }) {
    const [adminComment, setAdminComment] = useState(""); 
    useEffect(() => { setAdminComment(""); }, [isOpen]); 
    if (!isOpen) return null;
    
    return ( 
        <div className="modal-overlay"> 
            <div className="modal-dialog modal-details"> 
                <div className="modal-header"> 
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Butiran Permohonan Pindaan #{amendment.id}</h3> 
                    <button onClick={onClose} className="modal-close-x"><X size={24} /></button> 
                </div> 
                <div className="modal-content"> 
                    <p><strong>No Rujukan Risiko:</strong> {amendment.no_rujukan || amendment.risiko?.no_rujukan || 'N/A'}</p> 
                    <p><strong>Pemohon:</strong> {amendment.pemohon_nama || amendment.pemohon?.nama || 'N/A'}</p> 
                    <hr className="modal-divider"/> 
                    
                    {userRole === "Admin" && (<> 
                        <h4 style={{marginBottom: '8px'}}>Perbandingan Pindaan</h4> 
                        {amendment.data_sebelum && amendment.data_selepas ? <ComparisonView before={amendment.data_sebelum} after={amendment.data_selepas} /> : <p style={{ color: '#64748b' }}>Tiada data perbandingan.</p>} 
                        
                        <h4 style={{marginBottom: '8px'}}>Justifikasi Pemohon</h4> 
                        <p className="highlight-box">{amendment.justifikasi}</p> 
                        
                        {amendment.status === "Menunggu Kelulusan" && (<> 
                            <h4 style={{marginBottom: '8px'}}>Komen Pelulus (Wajib jika ditolak)</h4> 
                            <textarea value={adminComment} onChange={e => setAdminComment(e.target.value)} className="form-textarea" placeholder="Berikan maklum balas..."/> 
                            <div className="modal-footer" style={{padding: '20px 0 0 0'}}> 
                                <button onClick={() => { if(!adminComment.trim()){ alert("Sila isi komen untuk menolak."); return; } onAction(amendment.id, 'menolak', adminComment)}} className="btn btn-danger">Tolak</button> 
                                <button onClick={() => onAction(amendment.id, 'meluluskan', adminComment || "Diluluskan.")} className="btn btn-success">Luluskan</button> 
                            </div> 
                        </>)} 
                    </>)} 
                    
                    {userRole === "Executive" && (<> 
                        <h4 style={{marginBottom: '8px'}}>Status Permohonan</h4> 
                        <p style={{fontSize: '18px', fontWeight: 'bold'}}><StatusBadge status={amendment.status} /></p> 
                        {amendment.komen_pelulus && (<> 
                            <h4 style={{marginBottom: '8px'}}>Maklum Balas Pelulus</h4> 
                            <p className="highlight-box">{amendment.komen_pelulus}</p> 
                        </>)} 
                    </>)} 
                    
                    {amendment.status !== "Menunggu Kelulusan" && amendment.komen_pelulus && userRole === "Admin" && (<> 
                        <h4 style={{marginBottom: '8px'}}>Komen Pelulus</h4> 
                        <p className="highlight-box">{amendment.komen_pelulus}</p> 
                    </>)} 
                </div> 
                <div className="modal-footer"> 
                    <button type="button" onClick={onClose} className="btn btn-default">Tutup</button> 
                </div> 
            </div> 
        </div> 
    );
}

export default PindaanDetailsModal;