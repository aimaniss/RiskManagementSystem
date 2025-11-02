import React, { useState, useEffect, useMemo } from 'react';
import ReportOptionsModal from './ReportOptionsModal';
import LogPreviewModal from './LogPreviewModal';
import './LaporanRisiko.css';

const API_BASE = '/api';

// =================================================================
// Komponen Utama (LaporanRisiko)
// =================================================================
export default function LaporanRisiko() {
  const [loading, setLoading] = useState(false);
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [filters, setFilters] = useState({
    subsidiary: 'all',
    yearFrom: new Date().getFullYear() - 1,
    yearTo: new Date().getFullYear(),
    search: '',
  });
  const [risks, setRisks] = useState([]);

  const [isLogOptionsOpen, setIsLogOptionsOpen] = useState(false);
  const [isLogPreviewOpen, setIsLogPreviewOpen] = useState(false);
  
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);

  useEffect(() => {
    fetchSubsidiaries();
    fetchRisks();
  }, []);

  useEffect(() => {
    fetchRisks();
  }, [filters.subsidiary, filters.yearFrom, filters.yearTo]);

  async function fetchSubsidiaries() {
    try {
      const res = await fetch(`${API_BASE}/subsidiaries`);
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setSubsidiaries([{ id: 'all', name: 'Semua SubsidiARI' }, ...data]);
    } catch (err) {
      setSubsidiaries([
        { id: 'all', name: 'Semua Subsidiari' },
        { id: 'subs1', name: 'UKM HOLDINGS SDN. BHD.' },
        { id: 'subs2', name: 'Subsidiari B' },
      ]);
    }
  }

  async function fetchRisks() {
    setLoading(true);
    try {
      setRisks(sampleData(filters.yearFrom, filters.yearTo));
    } catch (err) {
      setRisks(sampleData(filters.yearFrom, filters.yearTo));
    } finally {
      setLoading(false);
    }
  }

  // --- BARU: sampleData kini mempunyai data borang penuh & log ---
  function sampleData(yearFrom, yearTo) {
    return [
      {
        id: 1,
        title: 'Penggunaan elaun outpatient melebihi had',
        no_rujukan: 'UKMH/0019/08',
        subsidiary: 'UKM HOLDINGS SDN. BHD.',
        bahagian_unit: 'SUMBER MANUSIA',
        tahun_daftar: 2024,
        separuh_tahun_daftar: 2, // Didaftar pada separuh tahun kedua
        kategori_risiko: 'Kewangan',
        kelulusan: 'MJAPR BIL. 4/2024 [12 DIS 2024] - PERKARA 1.2.3',
        // Seksyen 1
        punca: 'Pengiraan baki elaun outpatient dibuat secara manual',
        kesan: 'Gaji kakitangan ditolak',
        // Seksyen 2 (Skor Asal / Inherent)
        skor_kebarangkalian_n: 3,
        kebarangkalian_lian: 'Berpeluang Untuk Berlaku',
        skor_impak_risiko: 3,
        impak: 'Ketara',
        skor_risiko: 5, // Skor risiko asal (sebelum kawalan)
        status_risiko: 'Ya',
        // Seksyen 3
        pelan_tindakan: [
          {
            tindakan: 'Penggunaan sistem gaji secara menyeluruh',
            jenis_kawalan: 'Terima',
            tempoh_jangkaan: '2024',
            kakitangan_bertanggungjawab: 'Sumber Manusia'
          }
        ],
        // Seksyen 4 - Senarai Log (untuk dipilih)
        logs: [
          { 
            tahun: 2024, separuh_tahun: 1, 
            label: 'SEPARUH TAHUN PERTAMA (JAN - JUN) 2024',
            kelulusan_log: 'MJAPR BIL. 2/2024',
            pemantauan: 'Sistem gaji masih dalam pembangunan', 
            kekerapan: 'Sukuan', 
            kakitangan_bertanggungjawab: 'Sumber Manusia',
            keberkesanan_tindakan: { skor_kebarangkalian: 2, kebarangkalian: 'Jarang Berlaku', skor_impak: 3, impak: 'Ketara', skor_risiko: 4, keberkesanan: 'Ya', status_pemantauan: 'Pemantauan' }
          },
          { 
            tahun: 2024, separuh_tahun: 2, 
            label: 'SEPARUH TAHUN KEDUA (JUL - DIS) 2024',
            kelulusan_log: 'MJAPR BIL. 4/2024 [12 DIS 2024]',
            pemantauan: 'Menyediakan sistem gaji yang menyeluruh', 
            kekerapan: '1', 
            kakitangan_bertanggungjawab: 'Sumber Manusia',
            keberkesanan_tindakan: { skor_kebarangkalian: 1, kebarangkalian: 'Hampir Tidak Kelihatan', skor_impak: 3, impak: 'Ketara', skor_risiko: 3, keberkesanan: 'Ya', status_pemantauan: 'Pemantauan' }
          }
        ],
        status_pemantauan: 'Aktif', // Status keseluruhan
      },
      // Risiko 2
      {
        id: 2,
        title: 'Kelewatan penghantaran projek',
        no_rujukan: 'R/B/005',
        subsidiary: 'Subsidiari B',
        bahagian_unit: 'OPERASI',
        tahun_daftar: yearFrom,
        separuh_tahun_daftar: 2,
        kategori_risiko: 'Operasi',
        kelulusan: 'MJAPR BIL. 2/2023 [10 JUN 2023]',
        punca: 'Kekurangan sumber manusia (vendor)',
        kesan: 'Penalti kewangan dari pelanggan',
        skor_kebarangkalian_n: 5,
        kebarangkalian_lian: 'Hampir Pasti Berlaku',
        skor_impak_risiko: 4,
        impak: 'Signifikan',
        skor_risiko: 8, 
        status_risiko: 'Ya',
        pelan_tindakan: [
          {
            tindakan: 'Melantik 2 vendor sandaran (backup)',
            jenis_kawalan: 'Kurangkan',
            tempoh_jangkaan: '2023 Q3',
            kakitangan_bertanggungjawab: 'Pengurus Operasi'
          }
        ],
        logs: [
          { 
            tahun: 2023, separuh_tahun: 2, 
            label: 'SEPARUH TAHUN KEDUA 2023',
            kelulusan_log: 'MJAPR BIL. 3/2023',
            pemantauan: 'Vendor 1 dilantik', 
            kekerapan: 'Bulanan', 
            kakitangan_bertanggungjawab: 'Pengurus Operasi',
            keberkesanan_tindakan: { skor_kebarangkalian: 4, kebarangkalian: 'Berlaku', skor_impak: 4, impak: 'Signifikan', skor_risiko: 7, keberkesanan: 'Tidak', status_pemantauan: 'Pemantauan' }
          },
          { 
            tahun: 2024, separuh_tahun: 1, 
            label: 'SEPARUH TAHUN PERTAMA 2024',
            kelulusan_log: 'MJAPR BIL. 1/2024',
            pemantauan: 'Vendor 2 dilantik. Projek kembali stabil.', 
            kekerapan: 'Bulanan', 
            kakitangan_bertanggungjawab: 'Pengurus Operasi',
            keberkesanan_tindakan: { skor_kebarangkalian: 2, kebarangkalian: 'Jarang Berlaku', skor_impak: 4, impak: 'Signifikan', skor_risiko: 5, keberkesanan: 'Ya', status_pemantauan: 'Selesai' }
          }
        ],
        status_pemantauan: 'Selesai',
      },
    ];
  }

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((s) => ({ ...s, [name]: value }));
  }

  // --- FUNGSI URUS MODAL ---
  
  async function handleOpenReportModal(risk) {
    setSelectedRisk(risk);
    setIsLogOptionsOpen(true);
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

  return (
    <div className="laporan-container">
      <h2 className="laporan-title">📊 Laporan Risiko</h2>

      <div className="filter-card">
         <div className="filter-group">
          <label>Subsidiari</label>
          <select name="subsidiary" value={filters.subsidiary} onChange={handleFilterChange}>
            {subsidiaries.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Dari Tahun</label>
          <input type="number" name="yearFrom" value={filters.yearFrom} onChange={handleFilterChange} />
        </div>
        <div className="filter-group">
         <label>Hingga Tahun</label>
          <input type="number" name="yearTo" value={filters.yearTo} onChange={handleFilterChange} />
        </div>
        <div className="filter-group">
          <label>Cari</label>
          <input
            type="text"
            name="search"
            placeholder="Cari risiko..."
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
              {risks
                .filter((r) => r.title.toLowerCase().includes(filters.search.toLowerCase()))
                .map((r, index) => {
                  // --- BARU: Logik untuk dapatkan skor terkini ---
                  const latestLog = r.logs && r.logs.length > 0 
                    ? r.logs[r.logs.length - 1] 
                    : null;
                  
                  const currentScore = latestLog 
                    ? latestLog.keberkesanan_tindakan.skor_risiko 
                    : r.skor_risiko; // Guna skor asal jika tiada log
                  
                  return (
                    <tr key={r.id}>
                      <td>{index + 1}</td>
                      <td>{r.no_rujukan}</td>
                      <td>{r.title}</td>
                      <td>{`${r.tahun_daftar} / S${r.separuh_tahun_daftar}`}</td>
                      <td>{r.subsidiary}</td>
                      <td>{currentScore}</td>
                      <td>{r.status_pemantauan}</td>
                      <td className="action-icons">
                        <button 
                          title="Jana Laporan" 
                          onClick={() => handleOpenReportModal(r)}
                          className="btn-laporan-icon"
                        >
                          📄
                        </button>
                      </td>
                    </tr>
                  )
                })}
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