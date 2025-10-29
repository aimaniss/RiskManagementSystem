import React from 'react';

// ▼▼▼ SALIN FUNGSI HELPER & MATRIKS DARI pindaan.js ▼▼▼
const riskMatrixDetails = {
    1: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    2: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    3: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, 2:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 3:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 4:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    4: {1:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 2:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 3:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 4:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 5:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}},
    5: {1:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, 2:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 3:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}, 4:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}, 5:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}},
};
const getRiskStylingFromMatrix = (likelihood, impact, matrix) => {
    const k_val = parseInt(likelihood, 10);
    const i_val = parseInt(impact, 10);
    if (!isNaN(k_val) && !isNaN(i_val) && k_val >= 1 && k_val <= 5 && i_val >= 1 && i_val <= 5 && matrix[k_val] && matrix[k_val][i_val]) {
        return matrix[k_val][i_val];
    }
    return { label: "Tiada", shortLabel: "-", color: "#f1f5f9", textColor: "#334155" };
};
// ▲▲▲ TAMAT SALINAN FUNGSI HELPER ▲▲▲


// Pemetaan Nama Medan Teknikal kepada Label Mesra Pengguna
const fieldNameMapping = {
    'skor_kebarangkalian': 'Skor Kebarangkalian (Penilaian)',
    'skor_impak': 'Skor Impak (Penilaian)',
    'skor_risiko_penilaian': 'Skor Risiko (Penilaian)', // Label baru
    'skor_kebarangkalian_selepas': 'Skor Kebarangkalian (Keberkesanan)',
    'skor_impak_selepas': 'Skor Impak (Keberkesanan)',
    'skor_risiko_keberkesanan': 'Skor Risiko (Keberkesanan)', // Label baru
};

// Fungsi untuk format nilai skor risiko (R, S, T, ST) dengan gaya
const renderRiskScore = (val) => {
    if (val === null || val === undefined || val === '-') return '-';

    // Cari butiran gaya berdasarkan shortLabel (R/S/T/ST)
    const scoreDetails = Object.values(riskMatrixDetails)
        .flatMap(row => Object.values(row)) // Gabungkan semua butiran skor
        .find(detail => detail.shortLabel === val); // Cari yang sepadan

    const bgColor = scoreDetails ? scoreDetails.color : '#f1f5f9'; // Warna latar belakang
    const textColor = scoreDetails ? scoreDetails.textColor : '#334155'; // Warna teks

    // Gunakan gaya inline atau kelas CSS
    const style = {
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontWeight: 'bold',
        textAlign: 'center',
        minWidth: '30px', // Pastikan lebar minimum
        backgroundColor: bgColor,
        color: textColor,
    };

    return (
        <span style={style}>
            {String(val)}
        </span>
    );
};


// --- Komponen Perbandingan Data ---
function ComparisonView({ before, after }) {
    const validBefore = typeof before === 'object' && before !== null ? before : {};
    const validAfter = typeof after === 'object' && after !== null ? after : {};

    // Dapatkan SEMUA kunci dari kedua-dua objek
    const allKeys = [...new Set([...Object.keys(validBefore), ...Object.keys(validAfter)])];

    // Susun kunci supaya skor risiko muncul selepas skor inputnya
    const sortedKeys = allKeys.sort((a, b) => {
        const order = [
            'skor_kebarangkalian', 'skor_impak', 'skor_risiko_penilaian',
            'skor_kebarangkalian_selepas', 'skor_impak_selepas', 'skor_risiko_keberkesanan'
        ];
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    // Tapis keluar kunci yang nilainya SAMA sebelum dan selepas, KECUALI skor risiko
    const changedKeys = sortedKeys.filter(key => {
        const beforeValue = validBefore[key];
        const afterValue = validAfter[key];
        const isRiskScoreKey = key === 'skor_risiko_penilaian' || key === 'skor_risiko_keberkesanan';

        // Sentiasa tunjukkan skor risiko jika inputnya ada dalam senarai kunci
        if (isRiskScoreKey) {
             if (key === 'skor_risiko_penilaian' && (allKeys.includes('skor_kebarangkalian') || allKeys.includes('skor_impak'))) return true;
             if (key === 'skor_risiko_keberkesanan' && (allKeys.includes('skor_kebarangkalian_selepas') || allKeys.includes('skor_impak_selepas'))) return true;
             return false; // Jangan tunjuk skor risiko jika inputnya tiada
        }

        // Untuk kunci lain, hanya papar jika nilai berbeza
        return JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
    });


    if (changedKeys.length === 0) {
        return <p style={{ color: '#64748b' }}>Tiada perubahan data direkodkan.</p>;
    }

    return (
        <table className="comparison-table">
            <thead>
                <tr>
                    <th className="comparison-th">Perkara Dipinda</th>
                    <th className="comparison-th">Sebelum</th>
                    <th className="comparison-th">Selepas</th>
                </tr>
            </thead>
            <tbody>
                {changedKeys.map(key => {
                    const beforeValue = validBefore[key];
                    const afterValue = validAfter[key];

                    // Format nilai biasa atau skor risiko
                    const renderValue = (val) => {
                         if (key === 'skor_risiko_penilaian' || key === 'skor_risiko_keberkesanan') {
                             return renderRiskScore(val); // Guna fungsi render khas
                         }
                         // Format biasa untuk nilai lain
                         return val === null || val === undefined ? '-' : Array.isArray(val) ? val.join(', ') : String(val);
                     };

                    const displayName = fieldNameMapping[key] || key; // Guna nama dipetakan atau asal

                    return (
                        // Guna 'changed-row' untuk semua baris yang dipaparkan
                        <tr key={key} className={'changed-row'}>
                            <td className="comparison-td comparison-td-key">{displayName}</td>
                            <td className="comparison-td comparison-td-before">{renderValue(beforeValue)}</td>
                            <td className="comparison-td comparison-td-after">{renderValue(afterValue)}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export default ComparisonView;