import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { X, FileText } from 'lucide-react';
import Toast from "@/components/ui/toast";
import LoadingSpinner from "@/components/ui/loading-spinner";
import AlertBanner from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";

import Ukhmlogo from '../../assets/images/Light Background/UKMH_light.png';
import { getRiskLevel, getRiskColor } from "../../constants/riskMatrix";

// Kod pendek daripada label penuh (untuk warna PDF)
const LABEL_TO_SHORT = {
  "Sangat Tinggi": "ST",
  "Tinggi": "T",
  "Sederhana": "S",
  "Rendah": "R",
};

// Gaya sel PDF untuk tahap risiko (guna palet sistem)
const getRiskPdfStyles = (shortCode) => ({
  halign: 'center',
  fillColor: getRiskColor(
    { ST: "Sangat Tinggi", T: "Tinggi", S: "Sederhana", R: "Rendah" }[shortCode] || ""
  ) || "#94a3b8",
  textColor: '#FFFFFF',
  fontStyle: 'bold',
});

// =================================================================
// KOMPONEN: LogPreviewModal (Pratonton Log)
// =================================================================
export default function LogPreviewModal({ risk, range, onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [toast, setToast] = useState(null);

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
  // --- useEffect menjana PDF dengan jsPDF ---
  // =================================================================
  useEffect(() => {
    async function generateNativePreview() {
      setIsLoading(true);
      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.width; // 210
        const pageHeight = pdf.internal.pageSize.height; // 297
        const margin = 14;
        const bottomMargin = 18;
        const contentWidth = pageWidth - margin * 2;
        let currentY = margin;

        // --- Gaya Global ---
        const globalStyles = {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 1.8,
          lineColor: [203, 213, 225], // slate-300 — garisan lembut
          lineWidth: 0.15,
          textColor: [30, 41, 59], // slate-800
        };
        const headerStyles = {
          fillColor: [30, 41, 59], // slate-800 — dark navy formal
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        };
        const subHeaderStyles = {
          fillColor: [241, 245, 249], // slate-100
          fontStyle: 'bold',
          textColor: [30, 41, 59], // slate-800
          halign: 'center',
        };
        const labelStyles = {
          fillColor: [248, 250, 252], // slate-50
          fontStyle: 'bold',
          textColor: [51, 65, 85], // slate-700
        };
        const subSectionStyles = {
          fillColor: [241, 245, 249], // slate-100
          fontStyle: 'bold',
          textColor: [30, 41, 59], // slate-800
        };
        const logHeaderStyles = {
          fillColor: [51, 65, 85], // slate-700 — dark formal
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        };

        // =================================================================
        // Helper: formatList
        // =================================================================
        const formatList = (items) => {
          if (!Array.isArray(items)) {
            return items || '-';
          }
          const validItems = items.filter(item => item && String(item).trim() !== '');
          if (validItems.length === 0) return '-';
          if (validItems.length === 1) return validItems[0];
          return validItems.map((item, index) => `${index + 1}. ${item}`).join('\n');
        };

        // Helper: pastikan ruang mencukupi sebelum blok setinggi estHeight mm
        const ensureSpace = (estHeight) => {
          if (currentY + estHeight > pageHeight - bottomMargin) {
            pdf.addPage();
            currentY = margin;
          }
        };

        const formatSeparuhTahun = (val) => {
          if (val === 1 || val === '1') return 'Pertama';
          if (val === 2 || val === '2') return 'Kedua';
          return val;
        };

        // =================================================================
        // Bahagian 1, 2, 3 (dilangkau jika mod 'Log Sahaja')
        // =================================================================
        if (!range.isLogOnly) {

          // --- Bahagian 1 (Logo + Tajuk) ---
          const originalImgWidth = 1811;
          const originalImgHeight = 579;
          const imgAspectRatio = originalImgWidth / originalImgHeight;

          const logoWidth = 35;
          const logoHeight = logoWidth / imgAspectRatio;

          pdf.addImage(Ukhmlogo, 'PNG', margin, currentY, logoWidth, logoHeight);

          const logoBlockEndY = currentY + logoHeight + 3;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(100, 116, 139);
          pdf.text("Pematuhan & Pengurusan Risiko", margin, logoBlockEndY);

          const subtextHeight = (7 / pdf.internal.scaleFactor) * 1.15;
          const headerBlockEndsY = logoBlockEndY + subtextHeight;

          const titleY = (currentY + headerBlockEndsY) / 2;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(13);
          pdf.setTextColor(15, 23, 42);
          pdf.text("LAPORAN RISIKO", pageWidth / 2, titleY, { align: 'center' });

          // Tarikh jana di kanan atas
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(100, 116, 139);
          const tarikhJana = new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
          pdf.text(`Dijana: ${tarikhJana}`, pageWidth - margin, titleY, { align: 'right' });

          currentY = headerBlockEndsY + 4;

          // --- 2. JADUAL MAKLUMAT RISIKO ---
          const headerTableBody = [
            [
              { content: 'NAMA SYARIKAT', styles: labelStyles },
              { content: risk.subsidiary || '-', colSpan: 3 },
            ],
            [
              { content: 'TAHUN', styles: labelStyles },
              risk.tahun_daftar ?? '-',
              { content: 'SEPARUH TAHUN', styles: labelStyles },
              { content: `Separuh ${formatSeparuhTahun(risk.separuh_tahun_daftar)}` }
            ],
            [
              { content: 'BAHAGIAN / UNIT', styles: labelStyles },
              risk.bahagian_unit || '-',
              { content: 'NO. RUJUKAN', styles: labelStyles },
              risk.no_rujukan || '-'
            ],
            [
              { content: 'KATEGORI RISIKO', styles: labelStyles },
              { content: risk.kategori_risiko || '-', colSpan: 3 }
            ]
          ];

          autoTable(pdf, {
            startY: currentY,
            body: headerTableBody,
            theme: 'grid',
            styles: globalStyles,
            margin: { left: margin, right: margin },
            columnStyles: {
              0: { cellWidth: '18%' }, 1: { cellWidth: '37%' },
              2: { cellWidth: '18%' }, 3: { cellWidth: '27%' }
            }
          });

          currentY = pdf.lastAutoTable.finalY + 6;

          // --- 3. SEKSYEN 1: PENGENALPASTIAN ---
          ensureSpace(40);
          autoTable(pdf, {
              startY: currentY,
              head: [[{ content: '1. PENGENALPASTIAN RISIKO', colSpan: 3, styles: headerStyles }]],
              body: [
                  [{ content: 'RISIKO', styles: subHeaderStyles },
                   { content: 'PUNCA', styles: subHeaderStyles },
                   { content: 'KESAN', styles: subHeaderStyles }],
                  [
                   risk.title || '-',
                   formatList(risk.punca),
                   formatList(risk.kesan)
                  ]
              ],
              theme: 'grid',
              styles: globalStyles,
              margin: { left: margin, right: margin },
              columnStyles: {
                  0: { cellWidth: '40%' }, 1: { cellWidth: '38%' }, 2: { cellWidth: '22%' }
              }
          });

          currentY = pdf.lastAutoTable.finalY + 6;

          // --- SEKSYEN 2: PENILAIAN ---
          ensureSpace(35);
          autoTable(pdf, {
              startY: currentY,
              head: [[{ content: '2. PENILAIAN RISIKO', colSpan: 6, styles: headerStyles }]],
              body: [
                  [
                    { content: 'SKOR KEBARANGKALIAN', styles: subHeaderStyles },
                    { content: 'KEBARANGKALIAN', styles: subHeaderStyles },
                    { content: 'SKOR IMPAK', styles: subHeaderStyles },
                    { content: 'IMPAK', styles: subHeaderStyles },
                    { content: 'TAHAP RISIKO', styles: subHeaderStyles },
                    { content: 'STATUS RISIKO', styles: subHeaderStyles }
                  ],
                  [
                    { content: risk.skor_kebarangkalian_n ?? '-', styles: { halign: 'center' } },
                    { content: risk.kebarangkalian_lian || '-' },
                    { content: risk.skor_impak_risiko ?? '-', styles: { halign: 'center' } },
                    { content: risk.impak || '-' },
                    {
                      content: risk.skor_risiko || '-',
                      styles: risk.skor_risiko ? getRiskPdfStyles(risk.skor_risiko) : {}
                    },
                    { content: risk.status_risiko || '-', styles: { halign: 'center' } }
                  ]
              ],
              theme: 'grid',
              styles: globalStyles,
              margin: { left: margin, right: margin },
              columnStyles: {
                  0: { cellWidth: '13%' }, 1: { cellWidth: '27%' }, 2: { cellWidth: '11%' },
                  3: { cellWidth: '21%' }, 4: { cellWidth: '14%' }, 5: { cellWidth: '14%' }
              }
          });

          // --- Pindaan Penilaian (jika ada) ---
          currentY = pdf.lastAutoTable.finalY;

          if (risk.pindaan_penilaian) {
            currentY += 3;
            const pindaanLeftMargin = margin + 2;
            const labelText = 'PINDAAN PENILAIAN:';

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(globalStyles.fontSize);
            pdf.text(labelText, pindaanLeftMargin, currentY);

            pdf.setFont('helvetica', 'normal');
            const labelWidth = pdf.getStringUnitWidth(labelText) * globalStyles.fontSize / pdf.internal.scaleFactor;
            const dataXPosition = pindaanLeftMargin + labelWidth + 2;

            const maxWidth = pageWidth - dataXPosition - margin;
            const splitData = pdf.splitTextToSize(String(risk.pindaan_penilaian), maxWidth);

            pdf.text(splitData, dataXPosition, currentY);

            const textHeight = splitData.length * (globalStyles.fontSize / pdf.internal.scaleFactor) * 1.15;
            currentY += textHeight;
          }

          currentY += 5;

          // --- SEKSYEN 3: RAWATAN ---
          const pelanTindakanBody = Array.isArray(risk.pelan_tindakan) && risk.pelan_tindakan.length > 0
            ? risk.pelan_tindakan.map((pelan, idx) => [
                formatList(pelan.tindakan),
                pelan.jenis_kawalan || '-',
                pelan.tempoh_jangkaan || '-',
                formatList(pelan.kakitangan_bertanggungjawab)
              ])
            : [['-', '-', '-', '-']];

          autoTable(pdf, {
              startY: currentY,
              head: [
                [{ content: '3. RAWATAN KE ATAS RISIKO', colSpan: 4, styles: headerStyles }],
                [
                  { content: 'PELAN TINDAKAN', styles: subHeaderStyles },
                  { content: 'JENIS KAWALAN', styles: subHeaderStyles },
                  { content: 'TEMPOH JANGKAAN SIAP TINDAKAN', styles: subHeaderStyles },
                  { content: 'KAKITANGAN BERTANGGUNGJAWAB', styles: subHeaderStyles }
                ]
              ],
              body: pelanTindakanBody,
              theme: 'grid',
              styles: globalStyles,
              margin: { left: margin, right: margin },
              columnStyles: {
                  0: { cellWidth: '45%' }, 1: { cellWidth: '13%' },
                  2: { cellWidth: '16%' }, 3: { cellWidth: '26%' }
              },
              didParseCell: (data) => {
                // Elak header seksyen terpotong sorang diri di bawah page
                if (data.section === 'head' && data.row.index === 0 && data.cell.raw?.content?.startsWith('3.')) {
                  data.cell.styles.minCellHeight = 6;
                }
              }
          });
          currentY = pdf.lastAutoTable.finalY + 6;

        } // <-- tutup blok !range.isLogOnly

        // --- 4. PEMANTAUAN (LOG) ---
        const filteredLogs = filterLogsByRange(risk.logs, range);

        if (filteredLogs.length > 0) {

          ensureSpace(20);
          autoTable(pdf, {
            startY: currentY,
            head: [[{ content: '4. PEMANTAUAN', colSpan: 1, styles: headerStyles }]],
            theme: 'grid',
            styles: globalStyles,
            margin: { left: margin, right: margin },
          });
          currentY = pdf.lastAutoTable.finalY;

          filteredLogs.forEach((log, index) => {

            // Anggaran ruang minimum untuk satu blok log
            ensureSpace(70);

            const k = log.keberkesanan_tindakan || {};

            // Kod pendek tahap: keutamaan pada skor_risiko log, fallback kira daripada K x I
            const logRiskShort =
              k.skor_risiko ||
              LABEL_TO_SHORT[getRiskLevel(k.skor_kebarangkalian, k.skor_impak)] ||
              '';

            // --- 4.x Tajuk Log ---
            autoTable(pdf, {
              startY: currentY,
              head: [[{ content: `4.${index + 1} ${String(log.label || '').toUpperCase()}`, colSpan: 1, styles: logHeaderStyles }]],
              theme: 'grid',
              styles: globalStyles,
              margin: { left: margin, right: margin },
            });
            currentY = pdf.lastAutoTable.finalY;

            // --- Kelulusan ---
            autoTable(pdf, {
              startY: currentY,
              body: [[{ content: 'KELULUSAN', styles: labelStyles }, { content: log.kelulusan_log || '-' }]],
              theme: 'grid',
              styles: globalStyles,
              margin: { left: margin, right: margin },
              columnStyles: { 0: { cellWidth: '20%' }, 1: { cellWidth: '80%' } }
            });
            currentY = pdf.lastAutoTable.finalY;

            // --- Sub-tajuk Pemantauan Risiko ---
            autoTable(pdf, {
              startY: currentY,
              body: [[{ content: 'PEMANTAUAN RISIKO', styles: { ...subSectionStyles, halign: 'center' } }]],
              theme: 'grid',
              styles: globalStyles,
              margin: { left: margin, right: margin },
            });
            currentY = pdf.lastAutoTable.finalY;

            // --- Data Pemantauan ---
            autoTable(pdf, {
              startY: currentY,
              head: [[
                { content: 'PELAN TINDAKAN', styles: subHeaderStyles },
                { content: 'KEKERAPAN', styles: subHeaderStyles },
                { content: 'KAKITANGAN BERTANGGUNGJAWAB', styles: subHeaderStyles }
              ]],
              body: [[
                formatList(log.pelan_tindakan),
                log.kekerapan || '-',
                formatList(log.kakitangan_bertanggungjawab)
              ]],
              theme: 'grid',
              styles: globalStyles,
              margin: { left: margin, right: margin },
              columnStyles: {
                0: { cellWidth: '50%' },
                1: { cellWidth: '12%' },
                2: { cellWidth: '38%' }
              }
            });
            currentY = pdf.lastAutoTable.finalY;

            // --- Keberkesanan Tindakan ---
            autoTable(pdf, {
              startY: currentY,
              body: [[{ content: 'KEBERKESANAN TINDAKAN', colSpan: 7, styles: { ...subSectionStyles, halign: 'center' } }]],
              theme: 'grid',
              styles: globalStyles,
              margin: { left: margin, right: margin },
            });
            currentY = pdf.lastAutoTable.finalY;

            autoTable(pdf, {
                startY: currentY,
                head: [[
                    { content: 'SKOR KEBARANGKALIAN', styles: subHeaderStyles },
                    { content: 'KEBARANGKALIAN', styles: subHeaderStyles },
                    { content: 'SKOR IMPAK', styles: subHeaderStyles },
                    { content: 'IMPAK', styles: subHeaderStyles },
                    { content: 'TAHAP RISIKO', styles: subHeaderStyles },
                    { content: 'KEBERKESANAN', styles: subHeaderStyles },
                    { content: 'STATUS PEMANTAUAN', styles: subHeaderStyles }
                ]],
                body: [[
                    { content: k.skor_kebarangkalian ?? '-', styles: { halign: 'center' } },
                    { content: k.kebarangkalian || '-' },
                    { content: k.skor_impak ?? '-', styles: { halign: 'center' } },
                    { content: k.impak || '-' },
                    {
                      content: logRiskShort || '-',
                      styles: logRiskShort ? getRiskPdfStyles(logRiskShort) : {}
                    },
                    { content: k.keberkesanan || '-', styles: { halign: 'center' } },
                    { content: k.status_pemantauan || '-', styles: { halign: 'center' } }
                ]],
                theme: 'grid',
                styles: globalStyles,
                margin: { left: margin, right: margin },
                columnStyles: {
                    0: { cellWidth: '10%' }, 1: { cellWidth: '19%' }, 2: { cellWidth: '9%' },
                    3: { cellWidth: '19%' }, 4: { cellWidth: '12%' }, 5: { cellWidth: '15%' },
                    6: { cellWidth: '16%' }
                }
            });
            currentY = pdf.lastAutoTable.finalY;

            // --- Pindaan Keberkesanan (jika ada) ---
            if (log.pindaan_keberkesanan) {
              currentY += 3;
              const pindaanLeftMargin = margin + 2;
              const logLabelText = 'PINDAAN KEBERKESANAN:';

              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(globalStyles.fontSize);
              pdf.text(logLabelText, pindaanLeftMargin, currentY);

              pdf.setFont('helvetica', 'normal');

              const logLabelWidth = pdf.getStringUnitWidth(logLabelText) * globalStyles.fontSize / pdf.internal.scaleFactor;
              const logDataXPosition = pindaanLeftMargin + logLabelWidth + 2;

              const logDataText = String(log.pindaan_keberkesanan || '');
              const logMaxWidth = pageWidth - logDataXPosition - margin;
              const logSplitData = pdf.splitTextToSize(logDataText, logMaxWidth);

              pdf.text(logSplitData, logDataXPosition, currentY);

              const logTextHeight = logSplitData.length * (globalStyles.fontSize / pdf.internal.scaleFactor) * 1.15;
              currentY += logTextHeight;
            }

            currentY += 6; // Jarak antara log
          });
        }

        // --- 5. FOOTER: nombor muka surat pada semua halaman ---
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(148, 163, 184); // slate-400
          pdf.text(
            `${risk.no_rujukan || ''} — Muka Surat ${i} / ${totalPages}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
          );
        }

        // --- 6. JANA PREVIEW URL ---
        const pdfBlobUrl = pdf.output('bloburl');
        setPdfPreviewUrl(pdfBlobUrl);

      } catch (err) {
        console.error("Gagal menjana PDF:", err);
        setToast({ variant: "error", title: "Ralat", message: "Gagal menjana pratonton PDF." });
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

  // Render komponen modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold">Pratonton Laporan</h3>
              <p className="text-xs text-muted-foreground">
                {risk?.no_rujukan} &middot; {risk?.subsidiary}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 bg-muted/60 p-4">
          {isLoading ? (
            <LoadingSpinner text="Menjana Laporan..." />
          ) : pdfPreviewUrl ? (
            <embed
              src={pdfPreviewUrl}
              type="application/pdf"
              width="100%"
              height="100%"
              className="h-full min-h-[500px] w-full rounded-lg border border-border bg-card"
            />
          ) : (
            <AlertBanner variant="error" title="Ralat" description="Gagal memuatkan laporan." />
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-card px-5 py-3">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          {pdfPreviewUrl && (
            <Button onClick={() => window.open(pdfPreviewUrl, '_blank')}>
              Buka Tab Baharu
            </Button>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed top-[64px] right-4 z-50 w-80">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
