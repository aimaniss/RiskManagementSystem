import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './LogPreviewModal.css';

// =================================================================
// Import logo anda
// =================================================================
import Ukhmlogo from '../../assets/images/Light Background/UKMH_light.png';

// =================================================================
// ⭐️ LOGIK RISK MATRIX & WARNA
// =================================================================
const riskMatrix = {
  1: {1:{label:"R"}, 2:{label:"R"}, 3:{label:"S"}, 4:{label:"S"}, 5:{label:"T"}},
  2: {1:{label:"R"}, 2:{label:"R"}, 3:{label:"S"}, 4:{label:"S"}, 5:{label:"T"}},
  3: {1:{label:"R"}, 2:{label:"S"}, 3:{label:"S"}, 4:{label:"T"}, 5:{label:"T"}},
  4: {1:{label:"S"}, 2:{label:"S"}, 3:{label:"T"}, 4:{label:"T"}, 5:{label:"ST"}},
  5: {1:{label:"S"}, 2:{label:"T"}, 3:{label:"T"}, 4:{label:"ST"}, 5:{label:"ST"}},
};

const getRiskLevel = (k, i) => {
  const kk = parseInt(k);
  const ii = parseInt(i);
  if (kk >= 1 && kk <= 5 && ii >= 1 && ii <= 5) {
    return riskMatrix[kk][ii].label;
  }
  return null; 
};

// Fungsi helper baru untuk gaya warna
const getRiskStyles = (level) => {
  const styles = { halign: 'center' };
  switch (level) {
    case 'ST':
      styles.fillColor = '#FF0000'; // Merah
      styles.textColor = '#FFFFFF'; // Teks Putih
      break;
    case 'T':
      styles.fillColor = '#FFA500'; // Oren
      styles.textColor = '#000000'; // Teks Hitam
      break;
    case 'S':
      styles.fillColor = '#FFFF00'; // Kuning
      styles.textColor = '#000000'; // Teks Hitam
      break;
    case 'R':
      styles.fillColor = '#92D050'; // Hijau
      styles.textColor = '#000000'; // Teks Hitam
      break;
    default:
      // Tiada warna jika tiada tahap (cth: 'Ya', null)
      break;
  }
  return styles;
};
// =================================================================


// =================================================================
// KOMPONEN: LogPreviewModal (Pratonton Log)
// =================================================================
export default function LogPreviewModal({ risk, range, onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  
  // --- FUNGSI 'HELPER' ---
  function filterLogsByRange(allLogs, range) {
    if (!allLogs) return [];
    if (range.reportType === 'all') {
      return allLogs; 
    }
    if (range.isSingleLog) {
      return allLogs.filter(log => {
        const logValue = `${log.tahun}-${log.separuh_tahun}`;
        return logValue === range.fromValue;
      });
    }
    const [fromYear, fromHalf] = range.fromValue.split('-').map(Number);
    const [toYear, toHalf] = range.toValue.split('-').map(Number);
    return allLogs.filter(log => {
      const logYear = log.tahun;
      const logHalf = log.separuh_tahun;
      if (logYear < fromYear || logYear > toYear) return false;
      if (logYear === fromYear && logHalf < fromHalf) return false;
      if (logYear === toYear && logHalf > toHalf) return false;
      return true;
    });
  }

  // =================================================================
  // --- useEffect kini menggunakan jsPDF secara terus ---
  // =================================================================
  useEffect(() => {
    async function generateNativePreview() {
      setIsLoading(true);
      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        let currentY = 10; 
        
        // --- DIKEMASKINI: Kawalan Page Break ---
        const pageHeight = pdf.internal.pageSize.height || 297;
        const bottomMargin = 20;
        const pageBreakLimit = pageHeight - bottomMargin;
        // Anggaran ketinggian untuk satu blok log penuh
        const logBlockHeight = 85; // (mm)

        // --- Gaya Global untuk Fon ---
        const globalStyles = {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 1.5,
          lineColor: '#000',
          lineWidth: 0.1,
          textColor: '#000000', 
        };
        
        const headerStyles = {
          fillColor: '#808080', 
          textColor: '#fff',
          fontStyle: 'bold',
          // halign: 'center' <-- DIBUANG, default 'left'
        };
        
        const subHeaderStyles = {
          fillColor: '#d9d9d9', 
          fontStyle: 'bold',
          textColor: '#000000', 
          halign: 'center' // Sub-tajuk kekal di tengah
        };
        const labelStyles = {
          fillColor: '#f0f0f0', 
          fontStyle: 'bold',
          textColor: '#000000',
        };
        const subSectionStyles = {
          fillColor: '#f0f0f0', 
          fontStyle: 'bold',
          textColor: '#000000',
        };
        const logHeaderStyles = {
          fillColor: '#bfbfbf', 
          fontStyle: 'bold',
          textColor: '#000000',
        };

        // =================================================================
        // ⭐️ Fungsi 'formatList'
        // =================================================================
        const formatList = (items) => {
          if (!Array.isArray(items)) {
            return items || '-'; // Kembalikan teks asal jika bukan array
          }
          
          // Tapis item yang kosong
          const validItems = items.filter(item => item && String(item).trim() !== '');
          
          if (validItems.length === 0) {
            return '-';
          }
          
          // Jika hanya 1 item, jangan tunjuk nombor
          if (validItems.length === 1) {
            return validItems[0];
          }
          
          // Jika lebih 1 item, guna senarai bernombor
          // 'join' dengan '\n' (newline) untuk jarak
          return validItems.map((item, index) => `${index + 1}. ${item}`).join('\n');
        };
        // =================================================================

        
        // =================================================================
        // ⭐️ Bahagian 1, 2, 3 hanya akan dipaparkan
        // jika BUKAN mod 'Log Sahaja'
        // =================================================================
        if (!range.isLogOnly) {
        
          // --- Bahagian 1 (Logo + Tajuk) ---
          const leftMargin = 10;

          const originalImgWidth = 1811;
          const originalImgHeight = 579;
          const imgAspectRatio = originalImgWidth / originalImgHeight; 
      
          const logoWidth = 35; // Lebar logo dalam mm
          const logoHeight = logoWidth / imgAspectRatio; 
      
          pdf.addImage(Ukhmlogo, 'PNG', leftMargin, currentY, logoWidth, logoHeight); 
      
          let logoBlockEndY = currentY + logoHeight + 3; // 3mm di bawah logo
          
          pdf.setFont(globalStyles.font, 'bold');
          pdf.setFontSize(7); // Saiz fon subteks
          pdf.text("Pematuhan & Pengurusan Risiko", leftMargin, logoBlockEndY);
          
          const subtextHeight = (7 / pdf.internal.scaleFactor) * 1.15; // Guna saiz fon 7
          let headerBlockEndsY = logoBlockEndY + subtextHeight; 

          let titleY = (currentY + headerBlockEndsY) / 2;
          
          pdf.setFont(globalStyles.font, 'bold');
          pdf.setFontSize(12); 
          pdf.text("BORANG DAFTAR RISIKO", 105, titleY, { align: 'center' });

          currentY = headerBlockEndsY + 2; // 2mm gap (lebih rapat)
          
          // Fungsi helper kecil untuk tukar 1 -> Pertama, 2 -> Kedua
          const formatSeparuhTahun = (val) => {
            if (val === 1 || val === '1') return 'Pertama';
            if (val === 2 || val === '2') return 'Kedua';
            return val; // Kembalikan nilai asal jika bukan 1 atau 2
          };

          // --- 2. JADUAL HEADER (Jadual Pertama) ---
          const headerTableBody = [
            [
              { content: 'NAMA SYARIKAT', styles: labelStyles }, 
              { content: risk.subsidiary, colSpan: 3 }, 
            ],
            [
              { content: 'TAHUN', styles: labelStyles }, 
              risk.tahun_daftar,
              { content: 'SEPARUH TAHUN', styles: labelStyles },
              { content: `Separuh ${formatSeparuhTahun(risk.separuh_tahun_daftar)}` }
            ],
            [
              { content: 'BAHAGIAN / UNIT', styles: labelStyles },
              risk.bahagian_unit, 
              { content: 'NO. RUJUKAN', styles: labelStyles },
              risk.no_rujukan
            ],
            [
              { content: 'KATEGORI RISIKO', styles: labelStyles },
              { content: risk.kategori_risiko, colSpan: 3 } 
            ]
          ];
          
          autoTable(pdf, {
            startY: currentY, // Akan mula selepas tajuk
            body: headerTableBody,
            theme: 'grid', 
            styles: globalStyles,
            columnStyles: {
              0: { cellWidth: '15%' }, 1: { cellWidth: '40%' }, 
              2: { cellWidth: '15%' }, 3: { cellWidth: '30%' } 
            }
          });
          
          currentY = pdf.lastAutoTable.finalY + 8; // Jarak ditambah

          // --- 3. JADUAL SEKSYEN 1, 2, 3 (Jadual Berasingan) ---
          
          // JADUAL SEKSYEN 1
          autoTable(pdf, {
              startY: currentY,
              head: [[{ content: '1. PENGENALPASTIAN RISIKO', colSpan: 3, styles: headerStyles }]],
              body: [
                  [{ content: 'RISIKO', styles: subHeaderStyles }, 
                   { content: 'PUNCA', styles: subHeaderStyles }, 
                   { content: 'KESAN', styles: subHeaderStyles }],
                  [
                   risk.title, 
                   formatList(risk.punca), 
                   formatList(risk.kesan)
                  ]
              ],
              theme: 'grid',
              styles: globalStyles, 
              columnStyles: {
                  0: { cellWidth: '40%' }, 1: { cellWidth: '40%' }, 2: { cellWidth: '20%' }
              }
          });
          
          currentY = pdf.lastAutoTable.finalY + 8; // Jarak ditambah

          // JADUAL SEKSYEN 2
          autoTable(pdf, {
              startY: currentY,
              head: [[{ content: '2. PENILAIAN RISIKO ', colSpan: 6, styles: headerStyles }]],
              body: [
                  [ 
                    { content: 'SKOR KEBARANGKALIAN ', styles: subHeaderStyles }, 
                    { content: 'KEBARANGKALIAN', styles: subHeaderStyles }, 
                    { content: 'SKOR IMPAK', styles: subHeaderStyles },
                    { content: 'IMPAK', styles: subHeaderStyles },
                    { content: 'SKOR RISIKO', styles: subHeaderStyles },
                    { content: 'STATUS RISIKO', styles: subHeaderStyles }
                  ],
                  [ 
                    { content: risk.skor_kebarangkalian_n, styles: { halign: 'center' } },
                    { content: risk.kebarangkalian_lian }, 
                    { content: risk.skor_impak_risiko, styles: { halign: 'center' } },
                    { content: risk.impak }, 
                    { 
                      content: risk.skor_risiko, 
                      styles: getRiskStyles(risk.skor_risiko) 
                    },
                    { content: risk.status_risiko, styles: { halign: 'center' } }
                  ]
              ],
              theme: 'grid',
              styles: globalStyles,
              columnStyles: {
                  0: { cellWidth: '15%' }, 1: { cellWidth: '30%' }, 2: { cellWidth: '15%' },
                  3: { cellWidth: '15%' }, 4: { cellWidth: '15%' }, 5: { cellWidth: '10%' }
              }
          });
          
          // --- Guna pdf.text() untuk Pindaan Penilaian (JIKA ADA DATA SAHAJA) ---
          currentY = pdf.lastAutoTable.finalY; // Mula rapat
          
          if (risk.pindaan_penilaian) { 
            currentY += 3; // Jarak sikit dari jadual atas
            
            const pindaanLeftMargin = 11.6; 
            const labelText = 'PINDAAN PENILAIAN:';
            
            pdf.setFont(globalStyles.font, 'bold');
            pdf.setFontSize(globalStyles.fontSize);
            pdf.text(labelText, pindaanLeftMargin, currentY); 

            pdf.setFont(globalStyles.font, 'normal');
            const labelWidth = pdf.getStringUnitWidth(labelText) * globalStyles.fontSize / pdf.internal.scaleFactor;
            const dataXPosition = pindaanLeftMargin + labelWidth + 2; // 2mm jarak
            
            const dataText = risk.pindaan_penilaian; // Tiada '|| -'
            
            const maxWidth = pdf.internal.pageSize.width - dataXPosition - pindaanLeftMargin;
            const splitData = pdf.splitTextToSize(dataText, maxWidth);
            
            pdf.text(splitData, dataXPosition, currentY);
            
            const textHeight = splitData.length * (globalStyles.fontSize / pdf.internal.scaleFactor) * 1.15;
            currentY += textHeight;
          }

          currentY += 5; // Jarak ke jadual Seterusnya

          // JADUAL SEKSYEN 3
          const pelanTindakanBody = risk.pelan_tindakan.length > 0
            ? risk.pelan_tindakan.map((pelan, idx) => [
                formatList(pelan.tindakan), 
                pelan.jenis_kawalan,
                pelan.tempoh_jangkaan,
                formatList(pelan.kakitangan_bertanggungjawab)
              ])
            : [['-', '-', '-', '-']]; 
          
          autoTable(pdf, {
              startY: currentY, // Guna currentY yang baru
              head: [
                [{ content: '3. RAWATAN KE ATAS RISIKO', colSpan: 4, styles: headerStyles }],
                [
                  { content: 'PELAN TINDAKAN', styles: subHeaderStyles },
                  { content: 'JENIS KAWALAN', styles: subHeaderStyles },
                  { content: 'TEMPOH JANGKAAN SIAP TINDAKAN', styles: subHeaderStyles },
                  { content: 'KAKITANGAN BERTANGGUNGJAWAB', styles: subHeaderStyles }
                ]
              ],
              body: pelanTindakanBody, // Guna body yang diproses
              theme: 'grid',
              styles: globalStyles,
              columnStyles: {
                  0: { cellWidth: '50%' }, 1: { cellWidth: '10%' }, 
                  2: { cellWidth: '15%' }, 3: { cellWidth: '25%' }
              }
          });
          currentY = pdf.lastAutoTable.finalY;
          currentY += 8; // Tambah jarak sebelum Seksyen 4
        
        } // <-- Tutup blok if (!range.isLogOnly)

        
        // --- 4. JADUAL SEKSYEN 4 (LOG) ---
        
        // =================================================================
        // ⭐️ DIKEMASKINI: Log ditapis dahulu
        // =================================================================
        const filteredLogs = filterLogsByRange(risk.logs, range);

        // =================================================================
        // ⭐️ DIKEMASKINI: Keseluruhan Seksyen 4 hanya dipaparkan jika
        // filteredLogs.length > 0
        // =================================================================
        if (filteredLogs.length > 0) {
        
          // Lukis tajuk "4. PEMANTAUAN"
          autoTable(pdf, {
            startY: currentY, 
            head: [[{ content: '4. PEMANTAUAN', styles: headerStyles }]],
            theme: 'grid',
            styles: globalStyles,
          });
          currentY = pdf.lastAutoTable.finalY;

          // Mula gelung untuk setiap log
          filteredLogs.forEach((log, index) => {
            
            if (currentY + logBlockHeight > pageBreakLimit) { 
              pdf.addPage();
              currentY = 10; 
            }

            const k = log.keberkesanan_tindakan;
            
            // Kira tahap risiko & warna untuk log
            const logRiskLevel = getRiskLevel(k.skor_kebarangkalian, k.skor_impak);
            const logRiskStyles = getRiskStyles(logRiskLevel);


            // Bahagian 1: Tajuk Log (4.1, 4.2, ...)
            autoTable(pdf, {
              startY: currentY,
              head: [[{ content: `4.${index + 1} ${log.label.toUpperCase()}`, colSpan: 1, styles: logHeaderStyles }]],
              theme: 'grid',
              styles: globalStyles,
            });
            currentY = pdf.lastAutoTable.finalY; // Rapat


            // Bahagian 2: Kelulusan (Jadual berasingan)
            autoTable(pdf, {
              startY: currentY, // Mula rapat selepas tajuk
              body: [[{ content: 'KELULUSAN', styles: labelStyles }, { content: log.kelulusan_log }]],
              theme: 'grid',
              styles: globalStyles,
              columnStyles: { 0: { cellWidth: '20%' }, 1: { cellWidth: '80%' } }
            });
            currentY = pdf.lastAutoTable.finalY;
            
            // Bahagian 3: 
            autoTable(pdf, {
              startY: currentY,
              body: [[{ content: 'PEMANTAUAN RISIKO', styles: {...subSectionStyles, halign: 'center'} }]],
              theme: 'grid',
              styles: globalStyles,
            });
            currentY = pdf.lastAutoTable.finalY;

            // Bahagian 4: Data Pemantauan (Jadual berasingan)
            autoTable(pdf, {
              startY: currentY,
              head: [[ 
                { content: 'PELAN TINDAKAN', styles: subHeaderStyles },
                { content: 'KEKERAPAN', styles: subHeaderStyles },
                { content: 'KAKITANGAN BERTANGGUNGJAWAB', styles: subHeaderStyles }
              ]],
              
              body: [[ 
                formatList(log.pelan_tindakan), 
                log.kekerapan, 
                formatList(log.kakitangan_bertanggungjawab) 
              ]],
              
              theme: 'grid',
              styles: globalStyles,
              columnStyles: {
                0: { cellWidth: '50%' },
                1: { cellWidth: '10%' },
                2: { cellWidth: '40%' } 
              }
            });
            currentY = pdf.lastAutoTable.finalY;
            
            // Bahagian 5: Jadual 'Nested' Keberkesanan
            autoTable(pdf, {
              startY: currentY,
              body: [[{ content: 'KEBERKESANAN TINDAKAN', colSpan: 7, styles: {...subSectionStyles, halign: 'center'} }]],
              theme: 'grid',
              styles: globalStyles,
            });
            currentY = pdf.lastAutoTable.finalY;

            autoTable(pdf, {
                startY: currentY,
                head: [[
                    { content: 'SKOR KEBARANGKALIAN', styles: subHeaderStyles },
                    { content: 'KEBARANGKALIAN', styles: subHeaderStyles },
                    { content: 'SKOR IMPAK', styles: subHeaderStyles },
                    { content: 'IMPAK', styles: subHeaderStyles },
                    { content: 'SKOR RISIKO', styles: subHeaderStyles },
                    { content: 'KEBERKESANAN', styles: subHeaderStyles },
                    { content: 'STATUS PEMANTAUAN', styles: subHeaderStyles }
                ]],
                body: [[
                    { content: k.skor_kebarangkalian, styles: { halign: 'center' } },
                    k.kebarangkalian,
                    { content: k.skor_impak, styles: { halign: 'center' } },
                    k.impak,
                    { 
                      content: logRiskLevel, 
                      styles: logRiskStyles
                    },
                    { content: k.keberkesanan, styles: { halign: 'center' } },
                    k.status_pemantauan
                ]],
                theme: 'grid',
                styles: globalStyles,
                columnStyles: {
                    0: { cellWidth: '10%' }, 1: { cellWidth: '20%' }, 2: { cellWidth: '10%' },
                    3: { cellWidth: '20%' }, 4: { cellWidth: '10%' }, 5: { cellWidth: '15%' },
                    6: { cellWidth: '15%' }
                }
            });
            currentY = pdf.lastAutoTable.finalY;
            
            
            // --- Pindaan Keberkesanan diletak di Bawah Jadual Skor (JIKA ADA DATA SAHAJA) ---
            
            if (log.pindaan_keberkesanan) {
              currentY += 3; // Jarak sikit dari jadual atas
              
              const pindaanLeftMargin = 11.6; 
              const logLabelText = 'PINDAAN KEBERKESANAN:';

              pdf.setFont(globalStyles.font, 'bold');
              pdf.setFontSize(globalStyles.fontSize);
              pdf.text(logLabelText, pindaanLeftMargin, currentY); 

              pdf.setFont(globalStyles.font, 'normal');
              
              const logLabelWidth = pdf.getStringUnitWidth(logLabelText) * globalStyles.fontSize / pdf.internal.scaleFactor;
              const logDataXPosition = pindaanLeftMargin + logLabelWidth + 2; // 2mm jarak

              const logDataText = log.pindaan_keberkesanan; // Tiada '|| -'
              const logMaxWidth = pdf.internal.pageSize.width - logDataXPosition - pindaanLeftMargin;
              const logSplitData = pdf.splitTextToSize(logDataText, logMaxWidth);

              pdf.text(logSplitData, logDataXPosition, currentY);

              const logTextHeight = logSplitData.length * (globalStyles.fontSize / pdf.internal.scaleFactor) * 1.15;
              currentY += logTextHeight;
            }

            currentY += 5; // Jarak antara log
          });

        // =================================================================
        // ⭐️ BLOK 'ELSE' TELAH DIPADAMKAN
        // =================================================================
        
        } 
        
        // --- 5. JANA PREVIEW URL ---
        const pdfBlobUrl = pdf.output('bloburl');
        setPdfPreviewUrl(pdfBlobUrl);

      } catch (err) {
        console.error("Gagal menjana PDF:", err);
        alert("Gagal menjana pratonton PDF.");
      } finally {
        setIsLoading(false);
      }
    }
    
    generateNativePreview();
    
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [risk, range]); 

  // 'Render' komponen modal
  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-container" onClick={e => e.stopPropagation()}>
        <div className="preview-modal-header">
          <h3>Pratonton Laporan</h3>
          <button className="preview-modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="preview-modal-body">
          {isLoading ? (
            <p>Menjana pratonton...</p>
          ) : pdfPreviewUrl ? (
            <embed 
              src={pdfPreviewUrl} 
              type="application/pdf" 
              width="100%" 
              height="100%" 
            />
          ) : (
            <p>Gagal memuatkan pratonton.</p>
          )}
        </div>
        
       
      </div>
    </div>
  );
}