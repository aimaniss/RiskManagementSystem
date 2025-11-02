import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './LogPreviewModal.css';

// =================================================================
// Import logo anda
// =================================================================
import Ukhmlogo from '../../assets/images/Light Background/UKMH_light.png';


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
        // PERUBAHAN DI SINI: Bahagian 1 (Logo + Tajuk) diubah suai
        // =================================================================
        const leftMargin = 10;

        // 1. LOGO & SUBTITLE (Left Side)
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

        // 2. TAJUK (Center/Right Side)
        let titleY = (currentY + headerBlockEndsY) / 2;
        
        pdf.setFont(globalStyles.font, 'bold');
        pdf.setFontSize(12); 
        pdf.text("BORANG DAFTAR RISIKO", 105, titleY, { align: 'center' });

        // 3. KEMASKINI currentY
        // =================================================================
        // PERUBAHAN 1: Jarak dikurangkan lagi (dari 5 ke 3)
        // =================================================================
        currentY = headerBlockEndsY + 3; // 3mm gap (dirapatkan)
        // =================================================================
        // AKHIR PERUBAHAN HEADER
        // =================================================================


        // --- 2. JADUAL HEADER (Jadual Pertama) ---
        const headerTableBody = [
          [
            { content: 'NAMA SYARIKAT', styles: labelStyles }, 
            { content: risk.subsidiary, colSpan: 3 }, 
          ],
          [
            { content: 'TAHUN', styles: labelStyles }, 
            risk.tahun_daftar,
            { content: 'SEPARUH TAHUN DIDAFTARKAN', styles: labelStyles },
            { content: `${risk.tahun_daftar} - Separuh ${risk.separuh_tahun_daftar}` }
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
            0: { cellWidth: '25%' }, 
            1: { cellWidth: '30%' },
            2: { cellWidth: '25%' },
            3: { cellWidth: '20%' } 
          }
        });
        
        currentY = pdf.lastAutoTable.finalY + 8; // Jarak ditambah


        // --- 3. JADUAL SEKSYEN 1, 2, 3 (Jadual Berasingan) ---
        
        if (!range.isLogOnly) {
          // JADUAL SEKSYEN 1
          autoTable(pdf, {
              startY: currentY,
              head: [[{ content: '1. PENGENALPASTIAN RISIKO', colSpan: 3, styles: headerStyles }]],
              body: [
                  [{ content: 'RISIKO', styles: subHeaderStyles }, 
                   { content: 'PUNCA', styles: subHeaderStyles }, 
                   { content: 'KESAN', styles: subHeaderStyles }],
                  [risk.title, risk.punca, risk.kesan]
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
                    { content: risk.skor_risiko, styles: { halign: 'center' } },
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
          

          // --- Guna pdf.text() untuk Pindaan Penilaian ---
          currentY = pdf.lastAutoTable.finalY; // Mula rapat
          currentY += 3; // Jarak sikit dari jadual atas
          
          // =================================================================
          // PERUBAHAN 2: Teks "PINDAAN" diselarikan. 
          // Margin jadual (10mm) + cellPadding (1.5mm) + (anggaran 1mm)
          // =================================================================
          const pindaanLeftMargin = 12.5; // (asal 11.5)
          const labelText = 'PINDAAN PENILAIAN:';
          
          pdf.setFont(globalStyles.font, 'bold');
          pdf.setFontSize(globalStyles.fontSize);
          pdf.text(labelText, pindaanLeftMargin, currentY); // Guna pindaanLeftMargin

          pdf.setFont(globalStyles.font, 'normal');
          const labelWidth = pdf.getStringUnitWidth(labelText) * globalStyles.fontSize / pdf.internal.scaleFactor;
          const dataXPosition = pindaanLeftMargin + labelWidth + 2; // 2mm jarak
          
          const dataText = risk.pindaan_penilaian || '-';
          
          const maxWidth = pdf.internal.pageSize.width - dataXPosition - pindaanLeftMargin;
          const splitData = pdf.splitTextToSize(dataText, maxWidth);
          
          pdf.text(splitData, dataXPosition, currentY);
          
          const textHeight = splitData.length * (globalStyles.fontSize / pdf.internal.scaleFactor) * 1.15;
          currentY += textHeight;

          currentY += 5; // Jarak ke jadual Seterusnya (3mm + 5mm = 8mm, jarak asal)


          // JADUAL SEKSYEN 3
          const pelanTindakanBody = risk.pelan_tindakan.map((pelan, idx) => [
            `${idx + 1}. ${pelan.tindakan}`,
            pelan.jenis_kawalan,
            pelan.tempoh_jangkaan,
            pelan.kakitangan_bertanggungjawab
          ]);
          
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
              body: pelanTindakanBody.length > 0 ? pelanTindakanBody : [['-', '-', '-', '-']],
              theme: 'grid',
              styles: globalStyles,
              columnStyles: {
                  0: { cellWidth: '50%' }, 1: { cellWidth: '10%' }, 
                  2: { cellWidth: '15%' }, 3: { cellWidth: '25%' }
              }
          });
          currentY = pdf.lastAutoTable.finalY;
        
        } else {
           pdf.setFont(globalStyles.font, 'bold');
           pdf.setFontSize(12);
           pdf.text("LAPORAN LOG SAHAJA", 105, currentY, { align: 'center' });
           currentY += 10;
        }

        // --- 4. JADUAL SEKSYEN 4 (LOG) ---
        autoTable(pdf, {
          startY: currentY + 8, // Jarak ditambah
          head: [[{ content: '4. PEMANTAUAN', styles: headerStyles }]],
          theme: 'grid',
          styles: globalStyles,
        });
        currentY = pdf.lastAutoTable.finalY;

        const filteredLogs = filterLogsByRange(risk.logs, range);

        if (filteredLogs.length > 0) {
          filteredLogs.forEach((log, index) => {
            
            
            if (currentY + logBlockHeight > pageBreakLimit) { 
              pdf.addPage();
              currentY = 10; 
            }

            const k = log.keberkesanan_tindakan;
            
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
                log.pelan_tindakan, 
                log.kekerapan, 
                log.kakitangan_bertanggungjawab 
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
                    { content: k.skor_risiko, styles: { halign: 'center' } },
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
            
            
            // --- Pindaan Keberkesanan diletak di Bawah Jadual Skor ---
            currentY += 3; // Jarak sikit dari jadual atas
            
            // =================================================================
            // PERUBAHAN 2 (Bahagian 2): Teks "PINDAAN" diselarikan. 
            // =================================================================
            const pindaanLeftMargin = 12.5; // (asal 11.5)
            const logLabelText = 'PINDAAN KEBERKESANAN:';

            pdf.setFont(globalStyles.font, 'bold');
            pdf.setFontSize(globalStyles.fontSize);
            pdf.text(logLabelText, pindaanLeftMargin, currentY); // Guna pindaanLeftMargin

            pdf.setFont(globalStyles.font, 'normal');
            
            const logLabelWidth = pdf.getStringUnitWidth(logLabelText) * globalStyles.fontSize / pdf.internal.scaleFactor;
            const logDataXPosition = pindaanLeftMargin + logLabelWidth + 2; // 2mm jarak

            const logDataText = log.pindaan_keberkesanan || '-';
            const logMaxWidth = pdf.internal.pageSize.width - logDataXPosition - pindaanLeftMargin;
            const logSplitData = pdf.splitTextToSize(logDataText, logMaxWidth);

            pdf.text(logSplitData, logDataXPosition, currentY);

            const logTextHeight = logSplitData.length * (globalStyles.fontSize / pdf.internal.scaleFactor) * 1.15;
            currentY += logTextHeight;

            currentY += 5; // Jarak antara log
          });

        } else {
          autoTable(pdf, {
            startY: currentY,
            body: [['Tiada log pemantauan ditemui untuk julat yang dipilih.']],
            theme: 'grid',
            styles: globalStyles,
          });
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