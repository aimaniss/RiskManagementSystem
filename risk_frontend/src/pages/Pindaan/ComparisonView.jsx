import React from 'react';

// --- Komponen Perbandingan Data ---
function ComparisonView({ before, after }) {
    const validBefore = typeof before === 'object' && before !== null ? before : {}; 
    const validAfter = typeof after === 'object' && after !== null ? after : {}; 
    const allKeys = [...new Set([...Object.keys(validBefore), ...Object.keys(validAfter)])];
    
    if (allKeys.length === 0) {
        return <p style={{ color: '#64748b' }}>Tiada perubahan data direkodkan.</p>;
    }

    return ( 
        <table className="comparison-table">
            <thead>
                <tr>
                    <th className="comparison-th">Medan</th>
                    <th className="comparison-th">Sebelum</th>
                    <th className="comparison-th">Selepas</th>
                </tr>
            </thead>
            <tbody>
                {allKeys.map(key => { 
                    const beforeValue = validBefore[key]; 
                    const afterValue = validAfter[key]; 
                    const isDifferent = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
                    const renderVal = (val) => val === null || val === undefined ? '-' : Array.isArray(val) ? val.join(', ') : String(val); 
                    
                    return (
                        <tr key={key} className={isDifferent ? 'changed-row' : ''}>
                            <td className="comparison-td comparison-td-key">{key}</td>
                            <td className="comparison-td comparison-td-before">{renderVal(beforeValue)}</td>
                            <td className="comparison-td comparison-td-after">{renderVal(afterValue)}</td>
                        </tr>
                    ); 
                })}
            </tbody>
        </table> 
    );
}

export default ComparisonView;