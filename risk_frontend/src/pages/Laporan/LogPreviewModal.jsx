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

// Kod pendek daripada label penuh
const LABEL_TO_SHORT = {
  "Sangat Tinggi": "ST",
  "Tinggi": "T",
  "Sederhana": "S",
  "Rendah": "R",
};
const SHORT_TO_LABEL = { ST: "Sangat Tinggi", T: "Tinggi", S: "Sederhana", R: "Rendah" };

// Dokumen rasmi: rangka hitam-putih; satu-satunya warna ialah sel tahap risiko
// (warna sama seperti sistem) yang sentiasa berlabel supaya kekal jelas bila
// dicetak/difotostat hitam-putih.
// Fon surat rasmi kerajaan ialah Arial; Helvetica ialah fon piawai PDF yang
// setara metrik dengan Arial (Arial sendiri tidak boleh dibundel tanpa lesen).
const FON = 'helvetica';
// Satu skala saiz fon untuk seluruh dokumen
const SAIZ = { tajuk: 14, teks: 10, jadual: 9, tajukJadual: 9.5, kecil: 8 };
// Nama unit di bawah logo, dua baris selebar logo
const UNIT = ['Unit Pematuhan dan', 'Pengurusan Risiko'];
const HITAM = [0, 0, 0];
const KELABU_CAIR = [242, 242, 242];
const KLASIFIKASI = 'SULIT';

const teksTahapRisiko = (shortCode) =>
  SHORT_TO_LABEL[shortCode] ? `${SHORT_TO_LABEL[shortCode]} (${shortCode})` : shortCode || '-';
const hexKeRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const gayaTahapRisiko = (shortCode) => ({
  halign: 'center',
  valign: 'middle',
  fontStyle: 'bold',
  ...(SHORT_TO_LABEL[shortCode] && { fillColor: hexKeRgb(getRiskColor(shortCode)), textColor: HITAM }),
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
        let currentY = margin;
        // jspdf-autotable hanya menerima lebar lajur dalam mm (rentetan '20%'
        // diabaikan), jadi peratus ditukar kepada mm lebar kandungan.
        const lebar = (peratus) => ((pageWidth - margin * 2) * peratus) / 100;

        // --- Gaya Global (rasmi, hitam-putih) ---
        const globalStyles = {
          font: FON,
          fontSize: SAIZ.jadual,
          cellPadding: 1.8,
          valign: 'middle',
          lineColor: HITAM,
          lineWidth: 0.2,
          textColor: HITAM,
          fillColor: false,
        };
        // Tajuk seksyen: teks tebal huruf besar, latar kelabu cair
        const headerStyles = {
          fillColor: KELABU_CAIR,
          textColor: HITAM,
          fontStyle: 'bold',
          fontSize: SAIZ.tajukJadual,
        };
        const subHeaderStyles = {
          fillColor: KELABU_CAIR,
          fontStyle: 'bold',
          textColor: HITAM,
          halign: 'center',
          valign: 'middle',
          fontSize: SAIZ.kecil,
        };
        const labelStyles = {
          fillColor: KELABU_CAIR,
          fontStyle: 'bold',
          textColor: HITAM,
        };
        const subSectionStyles = {
          fillColor: KELABU_CAIR,
          fontStyle: 'bold',
          textColor: HITAM,
        };
        const logHeaderStyles = {
          fillColor: KELABU_CAIR,
          textColor: HITAM,
          fontStyle: 'bold',
        };
        const tarikhJana = new Date().toLocaleDateString('ms-MY', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });

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

          // --- Bahagian 1: Pengepala rasmi (logo, tajuk, garisan) ---
          const originalImgWidth = 1811;
          const originalImgHeight = 579;
          const logoWidth = 38;
          const logoHeight = logoWidth / (originalImgWidth / originalImgHeight);
          pdf.addImage(Ukhmlogo, 'PNG', margin, currentY, logoWidth, logoHeight);

          pdf.setTextColor(...HITAM);
          pdf.setFont(FON, 'bold');
          pdf.setFontSize(SAIZ.kecil);
          pdf.text(KLASIFIKASI, pageWidth - margin, currentY + 3, { align: 'right' });

          // Saiz fon dikira supaya baris terpanjang tepat selebar logo
          pdf.setFontSize(10);
          const lebarAsas = Math.max(...UNIT.map((baris) => pdf.getTextWidth(baris)));
          const saizUnit = (10 * logoWidth) / lebarAsas;
          pdf.setFontSize(saizUnit);
          const tinggiBaris = saizUnit * 0.3528 * 1.15; // pt -> mm, dengan jarak baris
          const tengahLogo = margin + logoWidth / 2;
          let unitY = currentY + logoHeight + tinggiBaris + 1;
          UNIT.forEach((baris) => {
            pdf.text(baris, tengahLogo, unitY, { align: 'center' });
            unitY += tinggiBaris;
          });

          const tajukY = unitY + 6;
          pdf.setFont(FON, 'bold');
          pdf.setFontSize(SAIZ.tajuk);
          pdf.text('LAPORAN PENGURUSAN RISIKO', pageWidth / 2, tajukY, { align: 'center' });

          const garisY = tajukY + 3.5;
          pdf.setDrawColor(...HITAM);
          pdf.setLineWidth(0.6);
          pdf.line(margin, garisY, pageWidth - margin, garisY);
          pdf.setLineWidth(0.2);
          pdf.line(margin, garisY + 0.9, pageWidth - margin, garisY + 0.9);

          pdf.setFont(FON, 'normal');
          pdf.setFontSize(SAIZ.jadual);
          pdf.text(`No. Rujukan: ${risk.no_rujukan || '-'}`, margin, garisY + 6);
          pdf.text(`Tarikh Dijana: ${tarikhJana}`, pageWidth - margin, garisY + 6, { align: 'right' });

          currentY = garisY + 10;

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
              { content: `Separuh Tahun ${formatSeparuhTahun(risk.separuh_tahun_daftar)}` }
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
              0: { cellWidth: lebar(18) }, 1: { cellWidth: lebar(37) },
              2: { cellWidth: lebar(18) }, 3: { cellWidth: lebar(27) }
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
                  0: { cellWidth: lebar(40) }, 1: { cellWidth: lebar(38) }, 2: { cellWidth: lebar(22) }
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
                    { content: 'PERLU RAWATAN', styles: subHeaderStyles }
                  ],
                  [
                    { content: risk.skor_kebarangkalian_n ?? '-', styles: { halign: 'center' } },
                    { content: risk.kebarangkalian_lian || '-' },
                    { content: risk.skor_impak_risiko ?? '-', styles: { halign: 'center' } },
                    { content: risk.impak || '-' },
                    {
                      content: teksTahapRisiko(risk.skor_risiko),
                      styles: gayaTahapRisiko(risk.skor_risiko)
                    },
                    { content: risk.status_risiko || '-', styles: { halign: 'center', valign: 'middle' } }
                  ],
                  ...(risk.pindaan_penilaian
                    ? [[
                        { content: 'PINDAAN PENILAIAN', colSpan: 2, styles: labelStyles },
                        { content: String(risk.pindaan_penilaian), colSpan: 4 },
                      ]]
                    : []),
              ],
              theme: 'grid',
              styles: globalStyles,
              margin: { left: margin, right: margin },
              columnStyles: {
                  0: { cellWidth: lebar(17) }, 1: { cellWidth: lebar(23) }, 2: { cellWidth: lebar(11) },
                  3: { cellWidth: lebar(19) }, 4: { cellWidth: lebar(16) }, 5: { cellWidth: lebar(14) }
              }
          });

          currentY = pdf.lastAutoTable.finalY + 6;

          // --- SEKSYEN 3: RAWATAN ---
          const pelanTindakanBody = Array.isArray(risk.pelan_tindakan) && risk.pelan_tindakan.length > 0
            ? risk.pelan_tindakan.map((pelan) => [
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
                  0: { cellWidth: lebar(45) }, 1: { cellWidth: lebar(13) },
                  2: { cellWidth: lebar(16) }, 3: { cellWidth: lebar(26) }
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

            // Satu jadual 7 lajur bagi setiap log supaya garisan sejajar dan
            // blok tidak terpecah di tengah baris.
            const tajukLog = (teks) => [
              { content: teks, colSpan: 7, styles: { ...subSectionStyles, halign: 'center' } },
            ];
            const barisLog = [
              [
                { content: 'KELULUSAN', styles: labelStyles },
                { content: log.kelulusan_log || '-', colSpan: 6 },
              ],
              tajukLog('PEMANTAUAN RISIKO'),
              [
                { content: 'PELAN TINDAKAN', colSpan: 3, styles: subHeaderStyles },
                { content: 'KEKERAPAN', colSpan: 2, styles: subHeaderStyles },
                { content: 'KAKITANGAN BERTANGGUNGJAWAB', colSpan: 2, styles: subHeaderStyles },
              ],
              [
                { content: formatList(log.pelan_tindakan), colSpan: 3 },
                { content: log.kekerapan || '-', colSpan: 2, styles: { halign: 'center' } },
                { content: formatList(log.kakitangan_bertanggungjawab), colSpan: 2 },
              ],
              tajukLog('KEBERKESANAN TINDAKAN'),
              [
                'SKOR KEBARANGKALIAN', 'KEBARANGKALIAN', 'SKOR IMPAK', 'IMPAK',
                'TAHAP RISIKO', 'KEBERKESANAN', 'STATUS PEMANTAUAN',
              ].map((teks) => ({ content: teks, styles: subHeaderStyles })),
              [
                { content: k.skor_kebarangkalian ?? '-', styles: { halign: 'center', valign: 'middle' } },
                { content: k.kebarangkalian || '-' },
                { content: k.skor_impak ?? '-', styles: { halign: 'center', valign: 'middle' } },
                { content: k.impak || '-' },
                { content: teksTahapRisiko(logRiskShort), styles: gayaTahapRisiko(logRiskShort) },
                { content: k.keberkesanan || '-', styles: { halign: 'center', valign: 'middle' } },
                { content: k.status_pemantauan || '-', styles: { halign: 'center', valign: 'middle' } },
              ],
              ...(log.pindaan_keberkesanan
                ? [[
                    { content: 'PINDAAN KEBERKESANAN', colSpan: 2, styles: labelStyles },
                    { content: String(log.pindaan_keberkesanan), colSpan: 5 },
                  ]]
                : []),
            ];

            autoTable(pdf, {
              startY: currentY,
              head: [[
                {
                  content: `4.${index + 1} ${String(log.label || '').toUpperCase()}`,
                  colSpan: 7,
                  styles: logHeaderStyles,
                },
              ]],
              body: barisLog,
              theme: 'grid',
              styles: globalStyles,
              rowPageBreak: 'avoid',
              margin: { left: margin, right: margin },
              columnStyles: {
                0: { cellWidth: lebar(18) }, 1: { cellWidth: lebar(17) }, 2: { cellWidth: lebar(8) },
                3: { cellWidth: lebar(12) }, 4: { cellWidth: lebar(15) }, 5: { cellWidth: lebar(15) },
                6: { cellWidth: lebar(15) }
              }
            });
            currentY = pdf.lastAutoTable.finalY;

            currentY += 5; // Jarak antara log
          });
        }

        // --- 5. KAKI MUKA SURAT (semua halaman) ---
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          const kakiY = pageHeight - 10;
          pdf.setDrawColor(...HITAM);
          pdf.setLineWidth(0.2);
          pdf.line(margin, kakiY - 4, pageWidth - margin, kakiY - 4);
          pdf.setTextColor(...HITAM);
          pdf.setFont(FON, 'bold');
          pdf.setFontSize(SAIZ.kecil);
          pdf.text(KLASIFIKASI, margin, kakiY);
          pdf.setFont(FON, 'normal');
          pdf.text(
            `${risk.no_rujukan || ''}  |  Dijana pada ${tarikhJana}`,
            pageWidth / 2,
            kakiY,
            { align: 'center' }
          );
          pdf.text(`Muka surat ${i} / ${totalPages}`, pageWidth - margin, kakiY, { align: 'right' });
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
              Buka di Tab Baharu
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
