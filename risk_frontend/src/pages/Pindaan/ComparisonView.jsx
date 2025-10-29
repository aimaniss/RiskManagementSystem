import React from 'react';

// --- (SALIN FUNGSI HELPER & MATRIKS DARI pindaan.js) ---
const riskMatrixDetails = { /* ... matriks penuh ... */
    1: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, /*...*/ 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    2: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, /*...*/ 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    3: {1:{label:"Rendah", shortLabel:"R", color:"#22c55e", textColor:"#ffffff"}, /*...*/ 5:{label:"Tinggi", shortLabel:"T", color:"#f97316", textColor:"#ffffff"}},
    4: {1:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, /*...*/ 5:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}},
    5: {1:{label:"Sederhana", shortLabel:"S", color:"#eab308", textColor:"#854d0e"}, /*...*/ 5:{label:"Sangat Tinggi", shortLabel:"ST", color:"#ef4444", textColor:"#ffffff"}},
};
const getRiskStylingFromMatrix = (likelihood, impact, matrix) => { /* ... kod fungsi ... */
    const k_val = parseInt(likelihood, 10);
    const i_val = parseInt(impact, 10);
    if (!isNaN(k_val) && !isNaN(i_val) && k_val >= 1 && k_val <= 5 && i_val >= 1 && i_val <= 5 && matrix[k_val] && matrix[k_val][i_val]) {
        return matrix[k_val][i_val];
    }
    return { label: "Tiada", shortLabel: "-", color: "#f1f5f9", textColor: "#334155" };
};
// --- (TAMAT SALINAN) ---


// Pemetaan Nama Medan
const fieldNameMapping = {
    'skor_kebarangkalian': 'Skor Kebarangkalian (Penilaian)',
    'skor_impak': 'Skor Impak (Penilaian)',
    'skor_risiko_penilaian': 'Skor Risiko (Penilaian)',
    'skor_kebarangkalian_selepas': 'Skor Kebarangkalian (Keberkesanan)',
    'skor_impak_selepas': 'Skor Impak (Keberkesanan)',
    'skor_risiko_keberkesanan': 'Skor Risiko (Keberkesanan)',
};

// Fungsi format skor risiko
const renderRiskScore = (val) => { /* ... kod fungsi ... */
    if (val === null || val === undefined || val === '-') return '-';
    const scoreDetails = Object.values(riskMatrixDetails).flatMap(row => Object.values(row)).find(detail => detail.shortLabel === val);
    const bgColor = scoreDetails ? scoreDetails.color : '#f1f5f9';
    const textColor = scoreDetails ? scoreDetails.textColor : '#334155';
    const style = { display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', textAlign: 'center', minWidth: '30px', backgroundColor: bgColor, color: textColor, };
    return (<span style={style}>{String(val)}</span>);
};


// --- Komponen Perbandingan Data ---
function ComparisonView({
    before,
    after,
    tahunDaftar,
    separuhTahunDaftar,
    tahunPemantauan,
    separuhTahunPemantauan
}) {

    const validBefore = typeof before === 'object' && before !== null ? before : {};
    const validAfter = typeof after === 'object' && after !== null ? after : {};
    const allKeys = [...new Set([...Object.keys(validBefore), ...Object.keys(validAfter)])];

    const sortedKeys = allKeys.sort((a, b) => { /* ... kod susunan ... */
        const order = ['skor_kebarangkalian', 'skor_impak', 'skor_risiko_penilaian', 'skor_kebarangkalian_selepas', 'skor_impak_selepas', 'skor_risiko_keberkesanan'];
        const indexA = order.indexOf(a); const indexB = order.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB; if (indexA !== -1) return -1; if (indexB !== -1) return 1; return a.localeCompare(b);
    });

    const changedKeys = sortedKeys.filter(key => { /* ... kod penapisan ... */
        const beforeValue = validBefore[key]; const afterValue = validAfter[key]; const isRiskScoreKey = key === 'skor_risiko_penilaian' || key === 'skor_risiko_keberkesanan';
        if (isRiskScoreKey) { if (key === 'skor_risiko_penilaian' && (allKeys.includes('skor_kebarangkalian') || allKeys.includes('skor_impak'))) return true; if (key === 'skor_risiko_keberkesanan' && (allKeys.includes('skor_kebarangkalian_selepas') || allKeys.includes('skor_impak_selepas'))) return true; return false; }
        return JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
    });

    if (changedKeys.length === 0) {
        return <p style={{ color: '#64748b' }}>Tiada perubahan data direkodkan.</p>;
    }

    // Fungsi untuk format Separuh Tahun
    const formatSeparuh = (val) => val === 1 ? 'Pertama' : val === 2 ? 'Kedua' : '-';

    return (
        <table className="comparison-table">
            <thead>
                <tr>
                    <th className="comparison-th comparison-th-key">Perkara Dipinda</th>
                    <th className="comparison-th comparison-th-tahun">Tahun & Separuh</th>
                    <th className="comparison-th comparison-th-before">Sebelum</th>
                    <th className="comparison-th comparison-th-after">Selepas</th>
                </tr>
            </thead>
            <tbody>
                {changedKeys.map(key => {
                    const beforeValue = validBefore[key];
                    const afterValue = validAfter[key];

                    let displayTahun = '-';
                    let displaySeparuh = '-';
                    const isPenilaian = key.includes('kebarangkalian') || key.includes('impak') || key.includes('risiko_penilaian');
                    const isKeberkesanan = key.includes('selepas') || key.includes('risiko_keberkesanan');

                    if (isPenilaian && !isKeberkesanan) {
                        displayTahun = tahunDaftar || '-';
                        displaySeparuh = formatSeparuh(separuhTahunDaftar);
                    } else if (isKeberkesanan) {
                        displayTahun = tahunPemantauan || '-';
                        displaySeparuh = formatSeparuh(separuhTahunPemantauan);
                    }

                    const renderValue = (val) => { /* ... kod renderValue ... */
                         if (key === 'skor_risiko_penilaian' || key === 'skor_risiko_keberkesanan') { return renderRiskScore(val); }
                         return val === null || val === undefined ? '-' : Array.isArray(val) ? val.join(', ') : String(val);
                     };

                    const displayName = fieldNameMapping[key] || key;

                    return (
                        <tr key={key} className={'changed-row'}>
                            <td className="comparison-td comparison-td-key">{displayName}</td>
                            <td className="comparison-td comparison-td-tahun">
                                {displayTahun} {displaySeparuh !== '-' ? `(${displaySeparuh})` : ''}
                            </td>
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