import React from 'react';
import { X } from 'lucide-react';
import './PengesahanPindaanModal.css';

// Objek untuk menterjemah nama medan (key) kepada label yang mesra pengguna
const fieldLabels = {
  skor_kebarangkalian: "Skor Kebarangkalian (Penilaian)",
  skor_impak: "Skor Impak (Penilaian)",
  skor_kebarangkalian_semasa: "Skor Kebarangkalian (Keberkesanan)",
  skor_impak_semasa: "Skor Impak (Keberkesanan)",
};

function PengesahanPindaanModal({ isOpen, onClose, onConfirm, perubahan, isSubmitting }) {
  if (!isOpen) return null;

  // Dapatkan data sebelum & selepas, atau objek kosong jika 'perubahan' belum wujud
  const { data_sebelum = {}, data_selepas = {} } = perubahan || {};

  // Dapatkan senarai unik semua medan yang berubah
  const changedKeys = Object.keys(data_selepas);

  return (
    <div className="pengesahan-modal-overlay">
      <div className="pengesahan-modal-dialog">
        <div className="pengesahan-modal-header">
          <h3 className="pengesahan-modal-title">Sahkan Perubahan</h3>
          <button onClick={onClose} className="pengesahan-modal-close" disabled={isSubmitting}>
            <X size={24} />
          </button>
        </div>
        
        <div className="pengesahan-modal-content">
          <p>Sila sahkan perubahan yang dicadangkan di bawah sebelum menghantar:</p>
          
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="col-perkara">Perkara</th>
                <th className="col-sebelum">Sebelum</th>
                <th className="col-selepas">Selepas</th>
              </tr>
            </thead>
            <tbody>
              {changedKeys.length === 0 ? (
                <tr>
                  <td colSpan="3">Tiada perubahan dikesan.</td>
                </tr>
              ) : (
                changedKeys.map(key => (
                  <tr key={key}>
                    <td>{fieldLabels[key] || key}</td>
                    <td className="data-sebelum">{data_sebelum[key] || '-'}</td>
                    <td className="data-selepas">{data_selepas[key] || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pengesahan-modal-footer">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-default" 
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className="btn btn-primary" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menghantar..." : "Sahkan & Hantar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PengesahanPindaanModal;