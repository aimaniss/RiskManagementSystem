import React, { useState, useEffect, useMemo } from 'react';
import ReportOptionsModal from './ReportOptionsModal';
import LogPreviewModal from './LogPreviewModal';
// ⭐️ Import 'api' (Axios instance)
import api from '../../api/api'; 
import './LaporanRisiko.css';

// =================================================================
// ⭐️ BARU: Matriks Warna (berdasarkan kod anda)
// =================================================================
const riskMatrixColors = {
  "R": "#22c55e",  // Rendah (Hijau)
  "S": "#eab308",  // Sederhana (Kuning)
  "T": "#f97316",  // Tinggi (Oren)
  "ST": "#ef4444", // Sangat Tinggi (Merah)
  "Default": "#94a3b8" // Kelabu (Fallback)
};

// ⭐️ BARU: Fungsi untuk dapatkan kod warna dari label (cth: "ST")
const getRiskColor = (label) => {
  return riskMatrixColors[label] || riskMatrixColors["Default"];
};
// =================================================================


// =================================================================
// Komponen Utama (LaporanRisiko)
// =================================================================
export default function LaporanRisiko() {
  const [loading, setLoading] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false); 
  const [subsidiaries, setSubsidiaries] = useState([]);
  
  const [filters, setFilters] = useState({
    subsidiary: 'all',
    tahun: 'all', 
    separuhTahun: 'all',
    search: '',
  });

  const [risks, setRisks] = useState([]);

  const [isLogOptionsOpen, setIsLogOptionsOpen] = useState(false);
  const [isLogPreviewOpen, setIsLogPreviewOpen] = useState(false);
  
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);

  // Helper function untuk format Separuh Tahun
  const renderSeparuhTahun = (val) => {
    if (val === 1 || val === '1') return 'Pertama';
    if (val === 2 || val === '2') return 'Kedua';
    return '-'; 
  };

  useEffect(() => {
    fetchSubsidiaries();
    // fetchRisks() akan dipanggil oleh useEffect di bawah
  }, []);

  useEffect(() => {
    fetchRisks();
  }, [filters.subsidiary, filters.tahun, filters.separuhTahun]);

  async function fetchSubsidiaries() {
    try {
      const defaultOption = { subsidiari_id: 'all', nama_subsidiari: 'Semua Subsidiari' };
      const res = await api.get("/subsidiari"); 
      const data = Array.isArray(res.data) ? res.data : [];
      setSubsidiaries([defaultOption, ...data]);
      
    } catch (err) {
      console.error("❌ Gagal fetch subsidiari:", err);
      setSubsidiaries([
        { subsidiari_id: 'all', nama_subsidiari: 'Semua Subsidiari' },
        { subsidiari_id: '1', nama_subsidiari: 'UKM HOLDINGS SDN. BHD.' },
        { subsidiari_id: '2', nama_subsidiari: 'Subsidiari B' },
      ]);
    }
  }

  async function fetchRisks() {
    setLoading(true);
    try {
      const params = {
        subsidiary: filters.subsidiary,
        tahun: filters.tahun,
        separuhTahun: filters.separuhTahun,
      };
      
      if (params.subsidiary === 'all') delete params.subsidiary;
      if (params.tahun === 'all') delete params.tahun;
      if (params.separuhTahun === 'all') delete params.separuhTahun;

      // Panggil API dari /laporan (yang betul)
      const res = await api.get("/laporan", { params });

      const data = Array.isArray(res.data) ? res.data : [];
      setRisks(data); 

    } catch (err) {
      console.error("❌ Gagal fetch risiko:", err);
      setRisks([]); 
      alert(err.response?.data?.message || err.message || 'Gagal memuatkan senarai risiko');
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((s) => ({ ...s, [name]: value }));
  }

  async function handleOpenReportModal(riskHeader) {
    setLoadingModal(true); 
    try {
      const res = await api.get(`/laporan/${riskHeader.id}/data-penuh`);
      const dataPenuh = res.data; 
      
      setSelectedRisk(dataPenuh); 
      setIsLogOptionsOpen(true);
      
    } catch (err) {
      console.error("❌ Gagal fetch data penuh laporan:", err);
      alert(err.response?.data?.message || err.message || 'Gagal memuatkan data penuh risiko');
    } finally {
      setLoadingModal(false); 
    }
  }

  function handleShowLogPreview(risk, range) {
    setSelectedRisk(risk);
    setSelectedRange(range);
    setIsLogOptionsOpen(false);
    setIsLogPreviewOpen(true);
  }
  
  function handleCloseModals() {
    setIsLogOptionsOpen(false);
    setIsLogPreviewOpen(false);
    setSelectedRisk(null);
    setSelectedRange(null);
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: 'all', label: 'Semua Tahun' },
    { value: currentYear, label: currentYear },
    { value: currentYear - 1, label: currentYear - 1 },
    { value: currentYear - 2, label: currentYear - 2 },
    { value: currentYear - 3, label: currentYear - 3 },
  ];


  return (
    <div className="laporan-container">
      {loadingModal && <div className="loading-overlay">Memuatkan Data Laporan...</div>}

      <h2 className="laporan-title">📊 Laporan Risiko</h2>

      <div className="filter-card">
         <div className="filter-group">
          <label>Subsidiari</label>
          <select name="subsidiary" value={filters.subsidiary} onChange={handleFilterChange}>
            {subsidiaries.map((s) => (
              <option key={s.subsidiari_id} value={s.subsidiari_id}>
                {s.nama_subsidiari}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Tahun Daftar</label>
          <select name="tahun" value={filters.tahun} onChange={handleFilterChange}>
             {yearOptions.map(y => (
              <option key={y.value} value={y.value}>{y.label}</option>
             ))}
          </select>
        </div>
        
        <div className="filter-group">
         <label>Separuh Tahun</label>
          <select name="separuhTahun" value={filters.separuhTahun} onChange={handleFilterChange}>
            <option value="all">Semua</option>
            <option value="1">Pertama (Jan-Jun)</option>
            <option value="2">Kedua (Jul-Dis)</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Cari</label>
          <input
            type="text"
            name="search"
            placeholder="Cari risiko atau no rujukan..."
            value={filters.search}
            onChange={handleFilterChange}
          />
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <p>Memuatkan data...</p>
        ) : (
          <table className="risk-table">
            <thead>
              <tr>
                <th>Bil</th>
                <th>No. Rujukan</th>
                <th>Nama Risiko</th>
                <th>Tahun / Separuh Tahun Daftar</th>
                <th>Subsidiari</th>
                <th>Skor Risiko (Terkini)</th>
                <th>Status Pemantauan</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {risks.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center' }}>Tiada data risiko ditemui.</td>
                </tr>
              ) : (
                risks
                  .filter((r) => 
                    (r.risiko || '').toLowerCase().includes(filters.search.toLowerCase()) ||
                    (r.no_rujukan || '').toLowerCase().includes(filters.search.toLowerCase())
                  )
                  .map((r, index) => {
                    return (
                      <tr key={r.id}>
                        <td>{index + 1}</td>
                        <td>{r.no_rujukan}</td>
                        <td>{r.risiko}</td> 
                        <td>
                          {r.tahun} <br /> {renderSeparuhTahun(r.separuh_tahun)}
                        </td>
                        <td>{r.nama_subsidiari}</td>
                        
                        {/* ================================================================= */}
                        {/* ⭐️ DIKEMASKINI: Paparan skor kini berwarna (seperti rawatan.jsx) */}
                        {/* ================================================================= */}
                        <td className="risk-score-cell"> {/* Guna className baru */}
                          <div 
                            className="risk-box" 
                            style={{ 
                              backgroundColor: getRiskColor(r.skor_risiko_terkini),
                              // ⭐️ BARU: Tukar warna teks jika kuning
                              color: r.skor_risiko_terkini === 'S' ? '#333' : 'white'
                            }}
                          >
                            {r.skor_risiko_terkini || '-'}
                          </div>
                        </td>
                        {/* ================================================================= */}

                        <td>{r.status_pemantauan_terkini}</td>
                        <td className="action-icons">
                          <button 
                            title="Jana Laporan" 
                            onClick={() => handleOpenReportModal(r)} 
                            className="btn-laporan-icon"
                            disabled={loadingModal} 
                          >
                            📄
                          </button>
                        </td>
                      </tr>
                    )
                  })
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {isLogOptionsOpen && selectedRisk && (
        <ReportOptionsModal
          risk={selectedRisk}
          onClose={handleCloseModals}
          logs={selectedRisk.logs || []} 
          onShowPreview={handleShowLogPreview}
        />
      )}

      {isLogPreviewOpen && selectedRisk && selectedRange && (
        <LogPreviewModal
          risk={selectedRisk}
          range={selectedRange}
          onClose={handleCloseModals}
        />
      )}
    </div>
  );
}