import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { formatSeparuhTahun } from "../../utils/formatters";
import api from "../../api/api";
import Toast from "@/components/ui/toast";
import "./SenaraiTugasanDetailModal.css";

const fieldNameMapping = {
  skor_kebarangkalian: "Skor Kebarangkalian",
  skor_impak: "Skor Impak",
  skor_risiko_penilaian: "Tahap Risiko (Penilaian)",
  skor_kebarangkalian_selepas: "Skor Kebarangkalian (Selepas)",
  skor_impak_selepas: "Skor Impak (Selepas)",
  skor_risiko_keberkesanan: "Tahap Risiko (Selepas)",
};

function SenaraiTugasanDetailModal({ isOpen, item, onClose, onActionComplete }) {
  const [adminComment, setAdminComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setAdminComment("");
    setIsProcessing(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const tutup = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", tutup);
    return () => window.removeEventListener("keydown", tutup);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const isRisiko = item._type === "risiko";
  const isPindaan = item._type === "pindaan";
  const raw = item._raw;
  const risikoId = isRisiko ? raw.risiko_id || raw.id : raw.risiko_id;
  const ralatApi = (err, lalai) => err.response?.data?.error || lalai;

  const formatTime = (dateStr) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      if (isRisiko) {
        await api.put(`/risiko/${raw.risiko_id || raw.id}/approve`);
      } else {
        await api.put(`/pindaan/${raw.pindaan_id}/approve`);
      }
      setToast({ variant: "success", title: "Berjaya", message: isRisiko ? "Risiko telah diluluskan." : "Pindaan telah diluluskan." });
      setTimeout(() => onActionComplete(), 800);
    } catch (err) {
      setToast({ variant: "error", title: "Ralat", message: ralatApi(err, "Gagal meluluskan.") });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!adminComment.trim()) {
      setToast({ variant: "warning", title: "Amaran", message: "Sila isi sebab penolakan." });
      return;
    }
    setIsProcessing(true);
    try {
      if (isRisiko) {
        await api.put(`/risiko/${raw.risiko_id || raw.id}/reject`, { sebab: adminComment });
      } else {
        await api.put(`/pindaan/${raw.pindaan_id}/reject`, { komen_pelulus: adminComment });
      }
      setToast({ variant: "success", title: "Berjaya", message: isRisiko ? "Risiko telah ditolak." : "Pindaan telah ditolak." });
      setTimeout(() => onActionComplete(), 800);
    } catch (err) {
      setToast({ variant: "error", title: "Ralat", message: ralatApi(err, "Gagal menolak.") });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
    <div className="stmd-overlay" onClick={onClose}>
      <div
        className="stmd-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stmd-tajuk"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="stmd-header">
          <span className="stmd-header-title" id="stmd-tajuk">
            {isRisiko ? "Kelulusan Risiko Baru" : "Kelulusan Pindaan"}
          </span>
          <button className="stmd-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="stmd-body">
          {/* Ringkasan */}
          <div className="stmd-box">
            <div className="stmd-box-header">Ringkasan</div>
            <div className="stmd-flex-row">
              <div className="stmd-flex-item">
                <span className="stmd-label">No. Rujukan</span>
                <span className="stmd-data" style={{ fontWeight: 700 }}>{item._rujukan}</span>
                {risikoId && (
                  <button
                    type="button"
                    className="stmd-link"
                    onClick={() => navigate(`/risiko/${risikoId}`)}
                  >
                    Lihat butiran risiko <ExternalLink size={12} />
                  </button>
                )}
              </div>
              <div className="stmd-flex-item">
                <span className="stmd-label">Syarikat</span>
                <span className="stmd-data">
                  {isRisiko
                    ? raw.syarikat || raw.singkatan_syarikat
                    : raw.nama_syarikat || raw.singkatan_syarikat}
                </span>
              </div>
            </div>
            <div className="stmd-flex-row">
              <div className="stmd-flex-item">
                <span className="stmd-label">Penerangan</span>
                <span className="stmd-data">
                  {isRisiko ? raw.risiko : `Pindaan untuk ${raw.no_rujukan}`}
                </span>
              </div>
            </div>
            <div className="stmd-flex-row">
              <div className="stmd-flex-item">
                <span className="stmd-label">Didaftarkan Oleh</span>
                <span className="stmd-data">
                  {isRisiko ? raw.didaftarkan_oleh : raw.nama_pemohon}
                </span>
              </div>
              <div className="stmd-flex-item">
                <span className="stmd-label">Tarikh</span>
                <span className="stmd-data">{formatTime(item._date)}</span>
              </div>
            </div>
            {isRisiko && (
              <div className="stmd-flex-row">
                <div className="stmd-flex-item">
                  <span className="stmd-label">Sesi</span>
                  <span className="stmd-data">
                    {raw.tahun} / {formatSeparuhTahun(raw.separuh_tahun)}
                  </span>
                </div>
                {raw.kategori && (
                  <div className="stmd-flex-item">
                    <span className="stmd-label">Kategori</span>
                    <span className="stmd-data">{raw.kategori}</span>
                  </div>
                )}
              </div>
            )}
            {isRisiko && raw.bahagian && (
              <div className="stmd-flex-row">
                <div className="stmd-flex-item">
                  <span className="stmd-label">Bahagian</span>
                  <span className="stmd-data">{raw.bahagian}</span>
                </div>
              </div>
            )}
          </div>

          {/* Risiko: Punca & Kesan */}
          {isRisiko && (Array.isArray(raw.punca) || Array.isArray(raw.kesan)) && (
            <div className="stmd-box">
              <div className="stmd-box-header">Punca & Kesan</div>
              {Array.isArray(raw.punca) && raw.punca.length > 0 && (
                <div className="stmd-list-section">
                  <span className="stmd-label">Punca</span>
                  <ul className="stmd-list">
                    {raw.punca.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(raw.kesan) && raw.kesan.length > 0 && (
                <div className="stmd-list-section">
                  <span className="stmd-label">Kesan</span>
                  <ul className="stmd-list">
                    {raw.kesan.map((k, i) => <li key={i}>{k}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Pindaan: Perbandingan */}
          {isPindaan && (
            <div className="stmd-box">
              <div className="stmd-box-header">Perbandingan Pindaan</div>
              {raw.data_sebelum && Object.keys(raw.data_sebelum).length > 0 ? (
                <div className="stmd-comparison">
                  {Object.entries(raw.data_sebelum).map(([key, beforeVal]) => {
                    const afterVal = raw.data_selepas?.[key];
                    const label = fieldNameMapping[key] || key;
                    return (
                      <div className="stmd-comparison-row" key={key}>
                        <span className="stmd-comparison-label">{label}</span>
                        <span className="stmd-comparison-before">{beforeVal || "\u2014"}</span>
                        <span className="stmd-comparison-arrow">\u2192</span>
                        <span className="stmd-comparison-after">{afterVal || "\u2014"}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: "#94a3b8", fontSize: "13px" }}>Tiada data perbandingan.</p>
              )}
            </div>
          )}

          {/* Pindaan: Justifikasi */}
          {isPindaan && (raw.justifikasi_penilaian || raw.justifikasi_keberkesanan) && (
            <div className="stmd-box">
              <div className="stmd-box-header">Justifikasi Pemohon</div>
              {raw.justifikasi_penilaian && (
                <div className="stmd-justifikasi-section">
                  <span className="stmd-label">Justifikasi Penilaian</span>
                  <p className="stmd-highlight">{raw.justifikasi_penilaian}</p>
                </div>
              )}
              {raw.justifikasi_keberkesanan && (
                <div className="stmd-justifikasi-section">
                  <span className="stmd-label">Justifikasi Keberkesanan</span>
                  <p className="stmd-highlight">{raw.justifikasi_keberkesanan}</p>
                </div>
              )}
            </div>
          )}

          {/* Hanya digunakan semasa menolak; lulus tidak menyimpan ulasan */}
          <div className="stmd-box">
            <label className="stmd-box-header" htmlFor="stmd-sebab-tolak">
              Sebab Penolakan
            </label>
            <div className="stmd-form-group">
              <textarea
                id="stmd-sebab-tolak"
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                className="stmd-textarea"
                placeholder="Wajib diisi jika menolak. Tidak diperlukan untuk meluluskan."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="stmd-footer">
          <button type="button" onClick={onClose} className="stmd-btn stmd-btn-default">
            Tutup
          </button>
          <div className="stmd-footer-actions">
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="stmd-btn stmd-btn-danger"
            >
              <XCircle size={14} /> Tolak
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="stmd-btn stmd-btn-success"
            >
              <CheckCircle size={14} /> Luluskan
            </button>
          </div>
        </div>
      </div>
    </div>
    {toast && (
      <div className="fixed top-[64px] right-4 z-[60] max-w-sm">
        <Toast variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
      </div>
    )}
    </>
  );
}

export default SenaraiTugasanDetailModal;
