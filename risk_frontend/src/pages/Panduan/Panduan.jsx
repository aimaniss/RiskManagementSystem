import React from 'react';
import { X } from 'lucide-react';
import './Panduan.css'; 

// --- Warna dan Label Risiko (Kekal) ---
const WARNA_RISIKO = {
    'SANGAT TINGGI': '#ef4444', 
    'TINGGI': '#f97316',        
    'SEDERHANA': '#eab308',     
    'RENDAH': '#22c55e',        
};

// Data Rujukan (Kekal)
const kategoriRisikoData = [
    { kategori: 'Strategik', penerangan: 'Potensi halangan atau isu secara material yang mempengaruhi pencapaian objektif strategik' },
    { kategori: 'Kewangan', penerangan: 'Potensi risiko yang mungkin menjejaskan kewangan organisasi seperti belanjawan, pendapatan dan kos' },
    { kategori: 'Operasi', penerangan: 'Risiko timbul daripada kegagalan proses organisasi, polisi, sistem dan/atau peristiwa yang mengganggu operasi perniagaan' },
    { kategori: 'Pematuhan/Perundangan', penerangan: 'Potensi pendedahan kepada keperluan undang-undang dan pematuhan peraturan' },
];

// Data Kebarangkalian (Mula dari 5 ke 1)
const skorKebarangkalianData = [
    { skor: 5, label: 'Hampir Pasti', penerangan: 'Peristiwa dijangka berlaku dalam kebanyakan keadaan (lebih kurang 95% kemungkinan berlaku dalam 12 bulan akan datang)' },
    { skor: 4, label: 'Kemungkinan Tinggi', penerangan: 'Peristiwa mungkin akan berlaku dalam kebanyakan keadaan (lebih kurang di bawah 95% tetapi melebihi 50% kemungkinan berlaku dalam 12 bulan akan datang)' },
    { skor: 3, label: 'Berpeluang Untuk Berlaku', penerangan: 'Peristiwa mungkin berlaku pada satu-satu masa (kira-kira di bawah 50% tetapi melebihi 25% kemungkinan berlaku dalam 12 bulan akan datang)' },
    { skor: 2, label: 'Kemungkinan Rendah', penerangan: 'Peristiwa mungkin berlaku pada satu-satu masa (kira-kira bawah 25% tetapi melebihi 5% kemungkinan berlaku dalam 12 bulan akan datang)' },
    { skor: 1, label: 'Hampir Tiada Kemungkinan', penerangan: 'Peristiwa mungkin berlaku hanya dalam keadaan luar biasa (kira-kira di bawah 5% kemungkinan berlaku dalam 12 bulan akan datang)' },
];

// Data Impak (Kekal)
const skorImpakData = [
    { skor: 5, label: 'Sangat Besar', penerangan: 'Jika berlaku risiko, akan memberi kesan yang teruk untuk mencapai objektif yang ditetapkan' },
    { skor: 4, label: 'Besar', penerangan: 'Jika berlaku risiko, akan memberi kesan yang ketara ke atas pencapaian objektif yang ditetapkan' },
    { skor: 3, label: 'Ketara', penerangan: 'Jika berlaku risiko, akan memberi kesan sederhana ke atas pencapaian objektif yang ditetapkan' },
    { skor: 2, label: 'Boleh Diukur', penerangan: 'Jika berlaku risiko, akan memberi kesan kecil untuk mencapai objektif yang ditetapkan' },
    { skor: 1, label: 'Tidak Ketara', penerangan: 'Jika berlaku risiko, tidak akan memberi kesan yang ketara atau tiada kesan ke atas pencapaian objektif yang ditetapkan' },
];

// Data Matriks (Kekal)
const risikoMatrix = {
    // Skor Impak (1: Tidak Ketara, 2: Boleh Diukur, 3: Ketara, 4: Besar, 5: Sangat Besar)
    5: { // Kebarangkalian 5: Hampir Pasti
        1: { label: 'SEDERHANA', warna: WARNA_RISIKO['SEDERHANA'] },
        2: { label: 'TINGGI', warna: WARNA_RISIKO['TINGGI'] },
        3: { label: 'TINGGI', warna: WARNA_RISIKO['TINGGI'] },
        4: { label: 'SANGAT TINGGI', warna: WARNA_RISIKO['SANGAT TINGGI'] },
        5: { label: 'SANGAT TINGGI', warna: WARNA_RISIKO['SANGAT TINGGI'] },
    },
    4: { // Kebarangkalian 4: Kemungkinan Tinggi
        1: { label: 'SEDERHANA', warna: WARNA_RISIKO['SEDERHANA'] },
        2: { label: 'SEDERHANA', warna: WARNA_RISIKO['SEDERHANA'] },
        3: { label: 'TINGGI', warna: WARNA_RISIKO['TINGGI'] },
        4: { label: 'TINGGI', warna: WARNA_RISIKO['TINGGI'] },
        5: { label: 'SANGAT TINGGI', warna: WARNA_RISIKO['SANGAT TINGGI'] },
    },
    3: { // Kebarangkalian 3: Berpeluang Untuk Berlaku
        1: { label: 'RENDAH', warna: WARNA_RISIKO['RENDAH'] },
        2: { label: 'SEDERHANA', warna: WARNA_RISIKO['SEDERHANA'] },
        3: { label: 'SEDERHANA', warna: WARNA_RISIKO['SEDERHANA'] },
        4: { label: 'TINGGI', warna: WARNA_RISIKO['TINGGI'] },
        5: { label: 'TINGGI', warna: WARNA_RISIKO['TINGGI'] },
    },
    2: { // Kebarangkalian 2: Kemungkinan Rendah
        1: { label: 'RENDAH', warna: WARNA_RISIKO['RENDAH'] },
        2: { label: 'RENDAH', warna: WARNA_RISIKO['RENDAH'] },
        3: { label: 'SEDERHANA', warna: WARNA_RISIKO['SEDERHANA'] },
        4: { label: 'SEDERHANA', warna: WARNA_RISIKO['SEDERHANA'] },
        5: { label: 'TINGGI', warna: WARNA_RISIKO['TINGGI'] },
    },
    1: { // Kebarangkalian 1: Hampir Tiada Kemungkinan
        1: { label: 'RENDAH', warna: WARNA_RISIKO['RENDAH'] },
        2: { label: 'RENDAH', warna: WARNA_RISIKO['RENDAH'] },
        3: { label: 'SEDERHANA', warna: WARNA_RISIKO['SEDERHANA'] },
        4: { label: 'SEDERHANA', warna: WARNA_RISIKO['SEDERHANA'] },
        5: { label: 'TINGGI', warna: WARNA_RISIKO['TINGGI'] },
    },
};

const tahapRisikoData = [
    { tahap: 'SANGAT TINGGI', warna: WARNA_RISIKO['SANGAT TINGGI'], penerangan: 'Very Significant Risk: Tindakan segera diperlukan untuk mengurangkan risiko' },
    { tahap: 'TINGGI', warna: WARNA_RISIKO['TINGGI'], penerangan: 'High Risk: Tindakan perlu diambil untuk mengimbangi risiko' },
    { tahap: 'SEDERHANA', warna: WARNA_RISIKO['SEDERHANA'], penerangan: 'Moderate Risk: Tindakan perlu diambil berhati-hati dengan risiko & memantau risiko' },
    { tahap: 'RENDAH', warna: WARNA_RISIKO['RENDAH'], penerangan: 'Low Risk: Penerimaan rutin risiko' },
];

const jenisKawalanData = [
    { status: 'Terima', penerangan: 'Menyediakan pelan' },
    { status: 'Kurang', penerangan: 'Mengurangkan kebarangkalian risiko/Mengurangkan impak risiko' },
    { status: 'Pindah', penerangan: 'Pindahkan risiko kepada pihak ketiga' },
    { status: 'Elak', penerangan: 'Berhenti menjalankan aktiviti/program atau mengubah suai aktiviti yang boleh menyebabkan risiko' },
];


export default function Panduan({ isOpen, onClose }) {
    if (!isOpen) return null;

    // Susunan Baris Matriks (Y-Axis): Mula dari 5 (Atas) ke 1 (Bawah)
    const kebarangkalianUntukMatriks = skorKebarangkalianData; 

    // Susunan Lajur Matriks (X-Axis): Mula dari 1 (Kiri) ke 5 (Kanan)
    const impakLabelsInOrder = skorImpakData.slice().sort((a, b) => a.skor - b.skor);

    return (
        // zIndex diset tinggi dalam CSS (rawatan-modal-overlay)
        <div className="rawatan-modal-overlay"> 
            <div className="panduan-container"> 
                
                <div className="panduan-header">
                    <h2 className="panduan-title">Panduan Pengisian & Penilaian Risiko</h2>
                    <button className="panduan-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="panduan-content"> 
                    
                    {/* Jadual 1: Kategori Risiko */}
                    <section className="panduan-section">
                        <h3 className="panduan-section-title">Jadual 1: Kategori Risiko</h3>
                        <table className="panduan-table">
                            <thead>
                                <tr><th style={{ width: '20%' }}>Kategori</th><th>Penerangan</th></tr>
                            </thead>
                            <tbody>
                                {kategoriRisikoData.map((item) => (
                                    <tr key={item.kategori}>
                                        <td className="panduan-table-key">{item.kategori}</td>
                                        <td>{item.penerangan}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* Jadual 2 & 3: Skor Kebarangkalian dan Skor Impak */}
                    <section className="panduan-section">
                        <h3 className="panduan-section-title">Jadual 2 & 3: Skor Kebarangkalian dan Skor Impak</h3>
                        <div className="panduan-grid-2"> 
                            
                            {/* Jadual 2: Kebarangkalian */}
                            <div>
                                <h4 className="panduan-subtitle">Jadual 2: Skor Kebarangkalian</h4>
                                <table className="panduan-table">
                                    <thead>
                                        <tr><th style={{ width: '15%' }}>Skor</th><th style={{ width: '25%' }}>Label</th><th>Penerangan</th></tr>
                                    </thead>
                                    <tbody>
                                        {skorKebarangkalianData.map((item) => (
                                            <tr key={item.skor}>
                                                <td className="panduan-table-key" style={{textAlign: 'center'}}>{item.skor}</td>
                                                <td>{item.label}</td>
                                                <td>{item.penerangan}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Jadual 3: Impak */}
                            <div>
                                <h4 className="panduan-subtitle">Jadual 3: Skor Impak</h4>
                                <table className="panduan-table">
                                    <thead>
                                        <tr><th style={{ width: '15%' }}>Skor</th><th style={{ width: '25%' }}>Kesan</th><th>Penerangan</th></tr>
                                    </thead>
                                    <tbody>
                                        {skorImpakData.map((item) => (
                                            <tr key={item.skor}>
                                                <td className="panduan-table-key" style={{textAlign: 'center'}}>{item.skor}</td>
                                                <td>{item.label}</td>
                                                <td>{item.penerangan}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>


                    {/* 3. Jadual 4: Matriks Penilaian Risiko (Penting: Skor 5 di atas, 1 di bawah) */}
                    <section className="panduan-section">
                        <h3 className="panduan-section-title">Jadual 4: Matriks Penilaian Risiko</h3>
                        <div className="risk-matrix-wrapper">
                            <table className="panduan-table risk-matrix">
                                <thead>
                                    <tr>
                                        {/* Sudut kiri atas */}
                                        <th rowSpan="2" className="matrix-header-kiri">KEBARANGKALIAN</th> 
                                        {/* Baris Impak (Tajuk Utama) */}
                                        <th colSpan="5" className="matrix-x-axis">IMPAK</th>
                                    </tr>
                                    <tr className="matrix-x-scores">
                                        {/* Label Impak (X-Axis) */}
                                        {impakLabelsInOrder.map(item => (
                                            <th key={item.skor} className='matrix-x-label-impak'>
                                                {/* Pecahkan label Impak untuk pemisahan perkataan */}
                                                <div className="impak-text">
                                                    {item.label.split(' ').map((word, index) => (
                                                        <span key={index}>{word} </span>
                                                    ))}
                                                </div>
                                                <div className="matrix-skor-label">{item.skor}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Baris Data Matriks (Y-AXIS: 5 di atas, 1 di BAWAH) */}
                                    {kebarangkalianUntukMatriks.map(kItem => (
                                        <tr key={kItem.skor}>
                                            {/* Lajur Kebarangkalian (Label + Skor) */}
                                            <th className="matrix-y-score-label">
                                                {/* Pecahkan label Kebarangkalian */}
                                                <div className="kebarangkalian-text">
                                                    {kItem.label.split(' ').map((word, index) => (
                                                        <span key={index}>{word} </span>
                                                    ))}
                                                </div>
                                                <div className="matrix-skor-label">{kItem.skor}</div>
                                            </th>
                                            
                                            {/* Sel Matriks (Tahap Risiko & Warna) */}
                                            {impakLabelsInOrder.map(iItem => {
                                                const risiko = risikoMatrix[kItem.skor][iItem.skor];
                                                const textColor = risiko.warna === WARNA_RISIKO['RENDAH'] ? '#1f2937' : '#ffffff';
                                                
                                                return (
                                                <td 
                                                    key={`${kItem.skor}-${iItem.skor}`}
                                                    style={{ 
                                                        backgroundColor: risiko.warna,
                                                        color: textColor,
                                                    }}
                                                >
                                                    {risiko.label}
                                                </td>
                                            );})}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    
                    {/* Jadual 5: Tahap Risiko dan Kod Warna */}
                    <section className="panduan-section">
                        <h3 className="panduan-section-title">Jadual 5: Tahap Risiko dan Kod Warna</h3>
                        <table className="panduan-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '15%' }}>Tahap Risiko</th>
                                    <th style={{ width: '15%' }}>Kod Warna</th>
                                    <th>Penerangan Risiko</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tahapRisikoData.map((item) => {
                                    const textColor = item.warna === WARNA_RISIKO['RENDAH'] ? '#1f2937' : 'white';
                                    return (
                                    <tr key={item.tahap}>
                                        <td className="panduan-table-key" 
                                            style={{ 
                                                backgroundColor: item.warna, 
                                                color: textColor, 
                                                textAlign: 'center',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {item.tahap}
                                        </td>
                                        <td>
                                            <span 
                                                className="panduan-color-box" 
                                                style={{ backgroundColor: item.warna, border: `1px solid ${item.warna === WARNA_RISIKO['RENDAH'] ? WARNA_RISIKO['RENDAH'] : '#ccc'}` }}
                                            ></span>
                                        </td>
                                        <td>{item.penerangan}</td>
                                    </tr>
                                );})}
                            </tbody>
                        </table>
                    </section>
                    
                    {/* Jadual 6: Rawatan Atas Risiko: Jenis Kawalan (Input Borang) */}
                    <section className="panduan-section">
                        <h3 className="panduan-section-title">Jadual 6: Rawatan Atas Risiko: Jenis Kawalan (Input Borang)</h3>
                        <table className="panduan-table">
                            <thead>
                                <tr><th style={{ width: '15%' }}>Pilihan Kawalan</th><th>Penerangan</th></tr>
                            </thead>
                            <tbody>
                                {jenisKawalanData.map((item) => (
                                    <tr key={item.status}>
                                        <td className="panduan-table-key">{item.status}</td>
                                        <td>{item.penerangan}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                    
                </div>

                <div className="panduan-footer">
                    <button className="rawatan-save-btn" onClick={onClose}>Tutup Panduan</button>
                </div>
            </div>
        </div>
    );
}