import React, { useState, useEffect, useMemo } from 'react';
import './ReportOptionsModal.css';

// =================================================================
// KOMPONEN 1: ReportOptionsModal (Pilihan Log)
// =================================================================
export default function ReportOptionsModal({
  risk,
  onClose,
  logs, // Terima 'logs'
  onShowPreview
}) {
  const [reportType, setReportType] = useState('all'); 
  const [isSingleLogMode, setIsSingleLogMode] = useState(false);
  const [singleValue, setSingleValue] = useState('');
  const [isLogOnlyMode, setIsLogOnlyMode] = useState(false);

  const logOptions = useMemo(() => {
    if (!logs || logs.length === 0) {
      return [];
    }
    // --- BARU: 'label' ditukar ---
    return logs.map(log => ({
      value: `${log.tahun}-${log.separuh_tahun}`,
      // Cipta label yang mesra pengguna
      label: `${log.tahun} - Separuh ${log.separuh_tahun === 1 ? 'Pertama' : 'Kedua'}`
    }));
  }, [logs]);

  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');

  useEffect(() => {
    if (logOptions.length > 0) {
      setFromValue(logOptions[0].value); 
      setToValue(logOptions[logOptions.length - 1].value);
      setSingleValue(logOptions[logOptions.length - 1].value);
    }
  }, [logOptions]);

  function handleGenerateClick() {
    const range = {
      reportType,
      isSingleLog: reportType === 'range' && isSingleLogMode,
      fromValue: isSingleLogMode ? singleValue : fromValue,
      toValue: isSingleLogMode ? singleValue : toValue,
      fromLabel: logOptions.find(o => o.value === (isSingleLogMode ? singleValue : fromValue))?.label,
      toLabel: logOptions.find(o => o.value === (isSingleLogMode ? singleValue : toValue))?.label,
      isLogOnly: reportType === 'range' && isLogOnlyMode
    };
    onShowPreview(risk, range); 
  }

  const hasLogs = logs.length > 0;

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal-container" onClick={e => e.stopPropagation()}>
        
        <h3>Laporan ({risk.no_rujukan})</h3>
        <div className="report-modal-risk-details">
          <p className="report-modal-subsidiary">{risk.subsidiary}</p>
          <p className="report-modal-risk-title">{risk.title}</p>
        </div>

        <div className="report-modal-content">
          <div className="report-modal-option">
            <input
              type="radio"
              id="report-all"
              name="reportType"
              value="all"
              checked={reportType === 'all'}
              onChange={() => {
                setReportType('all');
                setIsLogOnlyMode(false); 
              }}
            />
            <label htmlFor="report-all">Keseluruhan Laporan</label>
            <p className="report-modal-desc">Jana keseluruhan laporan dan pemantauan.</p>
          </div>
          
          <div className="report-modal-option">
            <input
              type="radio"
              id="report-range"
              name="reportType"
              value="range"
              checked={reportType === 'range'}
              onChange={() => setReportType('range')}
              disabled={!hasLogs}
            />
            <label htmlFor="report-range">Laporan Khusus</label>
            
            {!hasLogs && (
              <p className="report-modal-status"><i>Tiada pemantauan ditemui untuk risiko ini.</i></p>
            )}
            
            {hasLogs && (
              <div 
                className={`report-modal-range-picker-controls ${reportType === 'range' ? 'visible' : ''}`}
              >
                <div className="report-modal-checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="single-log-check"
                    checked={isSingleLogMode}
                    onChange={(e) => setIsSingleLogMode(e.target.checked)}
                    disabled={reportType !== 'range'}
                  />
                  <label htmlFor="single-log-check">Pilih satu pemantauan sahaja</label>
                </div>
                
                <div className="report-modal-checkbox-wrapper">
                    <input
                        type="checkbox"
                        id="log-only-check"
                        checked={isLogOnlyMode}
                        onChange={(e) => setIsLogOnlyMode(e.target.checked)}
                        disabled={reportType !== 'range'}
                    />
                    <label htmlFor="log-only-check">
                        Jana Pemantauan Sahaja
                        <span>(Hanya paparkan pemantauan)</span>
                    </label>
                </div>

                {isSingleLogMode ? (
                  <div className="report-modal-range-picker visible">
                    <div className="report-modal-select-group">
                      <label>Pilih Log</label>
                      <select 
                        value={singleValue} 
                        onChange={e => setSingleValue(e.target.value)}
                        disabled={reportType !== 'range'}
                      >
                        {logOptions.map(opt => (
                          <option key={`single-${opt.value}`} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="report-modal-range-picker visible">
                    <div className="report-modal-select-group">
                      <label>Dari</label>
                      <select 
                        value={fromValue} 
                        onChange={e => setFromValue(e.target.value)}
                        disabled={reportType !== 'range'}
                      >
                        {logOptions.map(opt => (
                          <option key={`from-${opt.value}`} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="report-modal-select-group">
                      <label>Hingga</label>
                      <select 
                        value={toValue} 
                        onChange={e => setToValue(e.target.value)}
                      	  disabled={reportType !== 'range'}
                      >
                        {logOptions.map(opt => (
                           <option key={`to-${opt.value}`} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="report-modal-actions">
          <button className="btn-secondary" onClick={onClose}>Tutup</button>
          <button 
            className="btn-primary" 
            onClick={handleGenerateClick}
            disabled={reportType === 'range' && !hasLogs}
          >
            Jana Laporan
          </button>
        </div>
      </div>
    </div>
  );
}