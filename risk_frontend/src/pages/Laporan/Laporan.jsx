import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import './LaporanRisiko.css';

const API_BASE = '/api';

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
  const printableRef = useRef(null);

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
      setSubsidiaries([{ id: 'all', name: 'Semua Subsidiari' }, ...data]);
    } catch (err) {
      setSubsidiaries([
        { id: 'all', name: 'Semua Subsidiari' },
        { id: 'subs1', name: 'Subsidiari A' },
        { id: 'subs2', name: 'Subsidiari B' },
      ]);
    }
  }

  async function fetchRisks() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.subsidiary !== 'all') params.set('subsidiary', filters.subsidiary);
      params.set('year_from', filters.yearFrom);
      params.set('year_to', filters.yearTo);

      const res = await fetch(`${API_BASE}/risks?${params.toString()}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setRisks(data);
    } catch (err) {
      setRisks(sampleData(filters.yearFrom, filters.yearTo));
    } finally {
      setLoading(false);
    }
  }

  function sampleData(yearFrom, yearTo) {
    return [
      {
        id: 1,
        title: 'Kebocoran data pelanggan',
        subsidiary: 'Subsidiari A',
        level: 'Tinggi',
        category: 'Keselamatan',
        date_registered: `${yearTo}-03-10`,
        owner: 'Encik Ahmad',
      },
      {
        id: 2,
        title: 'Kelewatan penghantaran',
        subsidiary: 'Subsidiari B',
        level: 'Sederhana',
        category: 'Operasi',
        date_registered: `${yearFrom}-07-21`,
        owner: 'Puan Siti',
      },
    ];
  }

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((s) => ({ ...s, [name]: value }));
  }

  function printSingle(risk) {
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Laporan Risiko - ${risk.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            td { border: 1px solid #999; padding: 8px; }
          </style>
        </head>
        <body>
          <h2>Laporan Risiko Individu</h2>
          <table>
            <tr><td><b>Nama Risiko</b></td><td>${risk.title}</td></tr>
            <tr><td><b>Subsidiari</b></td><td>${risk.subsidiary}</td></tr>
            <tr><td><b>Kategori</b></td><td>${risk.category}</td></tr>
            <tr><td><b>Tahap Risiko</b></td><td>${risk.level}</td></tr>
            <tr><td><b>Tarikh Daftar</b></td><td>${risk.date_registered}</td></tr>
            <tr><td><b>Pemilik Risiko</b></td><td>${risk.owner}</td></tr>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function downloadSinglePDF(risk) {
    const container = document.createElement('div');
    container.className = 'pdf-container';
    container.innerHTML = `
      <div style="padding:20px; font-family:Arial;">
        <h2 style="text-align:center;">Laporan Risiko Individu</h2>
        <table style="width:100%; border-collapse:collapse;">
          <tr><td><b>Nama Risiko</b></td><td>${risk.title}</td></tr>
          <tr><td><b>Subsidiari</b></td><td>${risk.subsidiary}</td></tr>
          <tr><td><b>Kategori</b></td><td>${risk.category}</td></tr>
          <tr><td><b>Tahap Risiko</b></td><td>${risk.level}</td></tr>
          <tr><td><b>Tarikh Daftar</b></td><td>${risk.date_registered}</td></tr>
          <tr><td><b>Pemilik Risiko</b></td><td>${risk.owner}</td></tr>
        </table>
      </div>
    `;
    document.body.appendChild(container);

    const canvas = await html2canvas(container);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`Laporan_Risiko_${risk.id}.pdf`);
    document.body.removeChild(container);
  }

  return (
    <div className="laporan-container">
      <h2 className="laporan-title">📊 Laporan Risiko</h2>

      {/* Filter */}
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

      {/* Table */}
      <div className="table-card" ref={printableRef}>
        {loading ? (
          <p>Memuatkan data...</p>
        ) : (
          <table className="risk-table">
            <thead>
              <tr>
                <th>Nama Risiko</th>
                <th>Subsidiari</th>
                <th>Kategori</th>
                <th>Tahap</th>
                <th>Tarikh Daftar</th>
                <th>Pemilik Risiko</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {risks
                .filter((r) => r.title.toLowerCase().includes(filters.search.toLowerCase()))
                .map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.subsidiary}</td>
                    <td>{r.category}</td>
                    <td>{r.level}</td>
                    <td>{r.date_registered}</td>
                    <td>{r.owner}</td>
                    <td className="action-icons">
                      <button title="Cetak" onClick={() => printSingle(r)}>🖨️</button>
                      <button title="Muat Turun PDF" onClick={() => downloadSinglePDF(r)}>⬇️</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
