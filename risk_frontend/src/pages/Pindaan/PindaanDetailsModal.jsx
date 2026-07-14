import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import ComparisonView from './ComparisonView';
// Import CSS KHUSUS for this modal
import './PindaanDetailsModal.css'; // Make sure this CSS is loaded

// StatusBadge Component
const StatusBadge = ({ status }) => {
    let badgeClass = "badge-default";
    if (status === "Diluluskan") badgeClass = "badge-success";
    if (status === "Ditolak") badgeClass = "badge-danger";
    if (status === "Menunggu Kelulusan") badgeClass = "badge-warning";

    // Use CSS variables for colors
    let colorVar = '--color-default-text';
    let bgVar = '--color-default-bg';
    let borderVar = '--color-default-border';

    if (status === "Diluluskan") { colorVar = '--color-success-text'; bgVar = '--color-success-bg'; borderVar = '--color-success-border'; }
    if (status === "Ditolak") { colorVar = '--color-danger-text'; bgVar = '--color-danger-bg'; borderVar = '--color-danger-border'; }
    if (status === "Menunggu Kelulusan") { colorVar = '--color-warning-text'; bgVar = '--color-warning-bg'; borderVar = '--color-warning-border'; }

    const style = {
        color: `var(${colorVar})`,
        backgroundColor: `var(${bgVar})`,
        borderColor: `var(${borderVar})`
    };

    return <span className={`badge ${badgeClass}`} style={style}>{status || 'N/A'}</span>;
};
// --- End StatusBadge ---


function PindaanDetailsModal({ isOpen, amendment, userRole, onClose, onAction }) {
    const [adminComment, setAdminComment] = useState("");

    useEffect(() => {
        setAdminComment("");
    }, [isOpen]);

    if (!isOpen) return null;

    // --- Get correct data names from API ---
    const pindaanId = amendment.pindaan_id;
    const statusPermohonan = amendment.status_permohonan;
    const namaPemohon = amendment.nama_pemohon;
    const justifikasiPenilaian = amendment.justifikasi_penilaian;
    const justifikasiKeberkesanan = amendment.justifikasi_keberkesanan;
    const sebabDitolak = amendment.sebab_ditolak;

    // Additional data for the layout
    // Get original risk year/half (needed for ComparisonView)
    const tahunDaftar = amendment.tahun || null; // Still needed for ComparisonView
    const separuhTahunDaftar = amendment.separuh_tahun || null; // Still needed for ComparisonView
    const tahunPemantauan = amendment.tahun_pemantauan || null;
    const separuhTahunPemantauan = amendment.separuh_tahun_pemantauan || null;
    const namaRisiko = amendment.risiko || 'N/A';
    const namaSyarikat = amendment.nama_syarikat || 'N/A';
    // Get application date
    const tarikhMohon = amendment.created_at ? new Date(amendment.created_at).toLocaleDateString("ms-MY", { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
    // --- END ---

    const showAdminActions = userRole === "Admin" && statusPermohonan === "Menunggu Kelulusan";

    return (
        <div className="modal-overlay">
            <div className="modal-dialog modal-details">
                <div className="modal-header">
                    {/* Title color set via CSS */}
                    <h3 className="modal-title-text">Butiran Permohonan Pindaan </h3>
                    <button onClick={onClose} className="modal-close-x"><X size={24} /></button>
                </div>
                <div className="modal-content">

                    {/* ▼▼▼ TOP SECTION RESTRUCTURED ▼▼▼ */}
                    <div className="detail-section-top">
                        {/* Row 1: No Rujukan | Syarikat */}
                        <div className="detail-row">
                            <div className="detail-pair">
                                <span className="detail-label-inline">No Rujukan:</span>
                                <span className="detail-value-inline">{amendment.no_rujukan || 'N/A'}</span>
                            </div>
                            <div className="detail-pair">
                                <span className="detail-label-inline">Syarikat:</span>
                                <span className="detail-value-inline">{namaSyarikat}</span>
                            </div>
                        </div>
                        {/* Row 2: Risiko */}
                        <div className="detail-row">
                             <div className="detail-pair detail-pair-full">
                                 <span className="detail-label-inline">Risiko:</span>
                                 <span className="detail-value-inline">{namaRisiko}</span>
                             </div>
                        </div>
                          {/* Row 3: Pemohon | Tarikh Mohon */}
                        <div className="detail-row">
                            <div className="detail-pair">
                                <span className="detail-label-inline">Pemohon:</span>
                                <span className="detail-value-inline">{namaPemohon || 'N/A'}</span>
                            </div>
                              <div className="detail-pair">
                                 <span className="detail-label-inline">Tarikh Mohon:</span>
                                 <span className="detail-value-inline">{tarikhMohon}</span>
                             </div>
                        </div>
                          {/* Row 4: Status Permohonan (Added here for flow) */}
                          <div className="detail-row">
                              <div className="detail-pair detail-pair-full">
                                  <span className="detail-label-inline">Status Permohonan:</span>
                                  {/* Use StatusBadge directly */}
                                  <span className="detail-value-inline" style={{ fontWeight: 'bold' }}>
                                      <StatusBadge status={statusPermohonan} />
                                  </span>
                              </div>
                          </div>
                    </div>
                    {/* ▲▲▲ END TOP SECTION ▲▲▲ */}

                    <hr className="modal-divider"/>

                    {/* ======================= */}
                    {/* COMPARISON & JUSTIFICATION */}
                    {/* ======================= */}
                    <h4 className="section-title">Perbandingan Pindaan</h4>
                    {(amendment.data_sebelum || amendment.data_selepas) ?
                        <ComparisonView
                            before={amendment.data_sebelum || {}}
                            after={amendment.data_selepas || {}}
                            tahunDaftar={tahunDaftar}
                            separuhTahunDaftar={separuhTahunDaftar}
                            tahunPemantauan={tahunPemantauan}
                            separuhTahunPemantauan={separuhTahunPemantauan}
                        />
                        : <p className="no-data-text">Tiada data perbandingan.</p>
                    }

                    <h4 className="section-title">Justifikasi Pemohon</h4>
                    {justifikasiPenilaian && (
                        <div className="justifikasi-section">
                            <span className="justifikasi-title">Justifikasi Pindaan Penilaian:</span>
                            <p className="highlight-box">{justifikasiPenilaian}</p>
                        </div>
                    )}
                    {justifikasiKeberkesanan && (
                        <div className="justifikasi-section">
                            <span className="justifikasi-title">Justifikasi Pindaan Keberkesanan:</span>
                            <p className="highlight-box">{justifikasiKeberkesanan}</p>
                        </div>
                    )}
                    {!justifikasiPenilaian && !justifikasiKeberkesanan && (
                        <p className="highlight-box no-data-text" style={{marginTop:'0'}}>Tiada justifikasi diberikan.</p>
                    )}

                    {/* ======================= */}
                    {/* ROLE & STATUS SPECIFIC VIEWS */}
                    {/* ======================= */}
                    {userRole === "Admin" && statusPermohonan === "Menunggu Kelulusan" && (
                        <>
                            <h4 className="section-title">Justifikasi Pelulus (Wajib jika ditolak)</h4>
                            <textarea value={adminComment} onChange={e => setAdminComment(e.target.value)} className="form-textarea" placeholder="Berikan maklum balas..."/>
                        </>
                    )}

                    {/* Show reason for rejection */}
                    {statusPermohonan === "Ditolak" && sebabDitolak && (
                           <>
                              <h4 className="section-title">Sebab Ditolak</h4>
                              <p className="highlight-box">{sebabDitolak}</p>
                           </>
                    )}
                </div>

                {/* --- FOOTER BUTTONS --- */}
                <div className="modal-footer modal-footer-aligned">
                    <button type="button" onClick={onClose} className="btn btn-default">Tutup</button>
                    {showAdminActions && (
                        <div className="admin-actions">
                            <button
                                onClick={() => {
                                    if(!adminComment.trim()){ alert("Sila isi komen untuk menolak."); return; }
                                    onAction(pindaanId, 'menolak', adminComment);
                                }}
                                className="btn btn-danger">
                                Tolak
                            </button>
                            <button
                                onClick={() => onAction(pindaanId, 'meluluskan', adminComment)}
                                className="btn btn-success">
                                Luluskan
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PindaanDetailsModal;