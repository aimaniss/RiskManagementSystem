import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

// Import komponen (mereka akan memuatkan CSS mereka sendiri)
import ComparisonView from './ComparisonView';
// Anda perlukan komponen StatusBadge dari fail PindaanRisiko.js
// Jika ia fail berasingan, import di sini. Jika tidak, salin kodnya ke sini.
// Annnggap StatusBadge diimport dari fail lain atau fail induk:
// import StatusBadge from './StatusBadge'; 

// Import CSS KHUSUS untuk modal ini
import './PindaanDetailsModal.css';

// Komponen StatusBadge (Disalin dari PindaanRisiko.js jika ia bukan fail berasingan)
// Jika StatusBadge.js ialah fail sendiri, anda boleh padam bahagian ini.
const StatusBadge = ({ status }) => {
  let badgeClass = "badge-default";
  if (status === "Diluluskan") badgeClass = "badge-success";
  if (status === "Ditolak") badgeClass = "badge-danger";
  if (status === "Menunggu Kelulusan") badgeClass = "badge-warning";
  
  return <span className={`badge ${badgeClass}`}>{status || 'N/A'}</span>;
};
// --- Tamat Salinan StatusBadge ---


function PindaanDetailsModal({ isOpen, amendment, userRole, onClose, onAction }) {
    const [adminComment, setAdminComment] = useState(""); 
    
    useEffect(() => { 
        setAdminComment(""); 
    }, [isOpen]); 

    if (!isOpen) return null;
    
    // --- (MULA) Gunakan nama data yang BETUL dari API ---
    const pindaanId = amendment.pindaan_id;
    const statusPermohonan = amendment.status_permohonan;
    const namaPemohon = amendment.nama_pemohon;
    const justifikasiPenilaian = amendment.justifikasi_penilaian;
    const justifikasiKeberkesanan = amendment.justifikasi_keberkesanan;
    // --- (TAMAT) ---

    return ( 
        <div className="modal-overlay"> 
            <div className="modal-dialog modal-details"> 
                <div className="modal-header"> 
                    {/* Betulkan ID */}
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Butiran Permohonan Pindaan #{pindaanId}</h3> 
                    <button onClick={onClose} className="modal-close-x"><X size={24} /></button> 
                </div> 
                <div className="modal-content"> 
                    <p><strong>No Rujukan Risiko:</strong> {amendment.no_rujukan || 'N/A'}</p> 
                    {/* Betulkan nama pemohon */}
                    <p><strong>Pemohon:</strong> {namaPemohon || 'N/A'}</p> 
                    <hr className="modal-divider"/> 
                    
                    {/* ======================= */}
                    {/* PAPARAN ADMIN */}
                    {/* ======================= */}
                    {userRole === "Admin" && (<> 
                        <h4 style={{marginBottom: '8px'}}>Perbandingan Pindaan</h4> 
                        {amendment.data_sebelum && amendment.data_selepas ? <ComparisonView before={amendment.data_sebelum} after={amendment.data_selepas} /> : <p style={{ color: '#64748b' }}>Tiada data perbandingan.</p>} 
                        
                        {/* Betulkan paparan justifikasi */}
                        <h4 style={{marginBottom: '8px'}}>Justifikasi Pemohon</h4> 
                        {justifikasiPenilaian && (
                            <div className="justifikasi-section">
                                <span className="justifikasi-title">Justifikasi Penilaian:</span>
                                <p className="highlight-box">{justifikasiPenilaian}</p> 
                            </div>
                        )}
                        {justifikasiKeberkesanan && (
                            <div className="justifikasi-section">
                                <span className="justifikasi-title">Justifikasi Keberkesanan:</span>
                                <p className="highlight-box">{justifikasiKeberkesanan}</p> 
                            </div>
                        )}
                        {!justifikasiPenilaian && !justifikasiKeberkesanan && (
                            <p className="highlight-box" style={{color: '#64748b'}}>Tiada justifikasi diberikan.</p>
                        )}
                        
                        
                        {/* Betulkan semakan status */}
                        {statusPermohonan === "Menunggu Kelulusan" && (<> 
                            <h4 style={{marginBottom: '8px'}}>Komen Pelulus (Wajib jika ditolak)</h4> 
                            <textarea value={adminComment} onChange={e => setAdminComment(e.target.value)} className="form-textarea" placeholder="Berikan maklum balas..."/> 
                            <div className="modal-footer" style={{padding: '20px 0 0 0'}}> 
                                
                                {/* Betulkan ID dan logik semakan komen */}
                                <button 
                                    onClick={() => { 
                                        if(!adminComment.trim()){ 
                                            alert("Sila isi komen untuk menolak."); 
                                            return; 
                                        } 
                                        onAction(pindaanId, 'menolak', adminComment)
                                    }} 
                                    className="btn btn-danger">Tolak</button> 
                                
                                {/* Betulkan ID */}
                                <button 
                                    onClick={() => onAction(pindaanId, 'meluluskan', adminComment || "Diluluskan.")} 
                                    className="btn btn-success">Luluskan</button> 
                            </div> 
                        </>)} 
                    </>)} 
                    
                    {/* ======================= */}
                    {/* PAPARAN EXECUTIVE */}
                    {/* ======================= */}
                    {userRole === "Executive" && (<> 
                        <h4 style={{marginBottom: '8px'}}>Status Permohonan</h4> 
                        {/* Betulkan status prop */}
                        <p style={{fontSize: '18px', fontWeight: 'bold'}}><StatusBadge status={statusPermohonan} /></p> 
                        
                        {amendment.komen_pelulus && (<> 
                            <h4 style={{marginBottom: '8px'}}>Maklum Balas Pelulus</h4> 
                            <p className="highlight-box">{amendment.komen_pelulus}</p> 
                        </>)} 
                    </>)} 
                    
                    {/* Bahagian ini untuk Admin melihat semula komen lama selepas diluluskan/ditolak */}
                    {statusPermohonan !== "Menunggu Kelulusan" && amendment.komen_pelulus && userRole === "Admin" && (<> 
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