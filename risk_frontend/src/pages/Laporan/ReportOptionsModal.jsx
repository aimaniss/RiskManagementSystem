import React, { useState, useEffect, useMemo } from 'react';
import EmptyState from "@/components/ui/empty-state";
import { AlertCircle, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// =================================================================
// KOMPONEN: ReportOptionsModal (Pilihan Log)
// =================================================================
export default function ReportOptionsModal({
  risk,
  onClose,
  logs, // Terima 'logs'
  onShowPreview
}) {
  const [reportType, setReportType] = useState('all');
  const [isSingleLogMode, setIsSingleLogMode] = useState(false);
  const [singleValue, setSingleValue] = useState('');
  const [isLogOnlyMode, setIsLogOnlyMode] = useState(false);

  const logOptions = useMemo(() => {
    if (!logs || logs.length === 0) {
      return [];
    }
    return logs.map(log => ({
      value: `${log.tahun}-${log.separuh_tahun}`,
      label: `${log.tahun} - Separuh ${log.separuh_tahun === 1 ? 'Pertama' : 'Kedua'}`
    }));
  }, [logs]);

  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');

  useEffect(() => {
    if (logOptions.length > 0) {
      setFromValue(logOptions[0].value);
      setToValue(logOptions[logOptions.length - 1].value);
      setSingleValue(logOptions[logOptions.length - 1].value);
    }
  }, [logOptions]);

  function handleGenerateClick() {
    const range = {
      reportType,
      isSingleLog: reportType === 'range' && isSingleLogMode,
      fromValue: isSingleLogMode ? singleValue : fromValue,
      toValue: isSingleLogMode ? singleValue : toValue,
      fromLabel: logOptions.find(o => o.value === (isSingleLogMode ? singleValue : fromValue))?.label,
      toLabel: logOptions.find(o => o.value === (isSingleLogMode ? singleValue : toValue))?.label,
      isLogOnly: reportType === 'range' && isLogOnlyMode
    };
    onShowPreview(risk, range);
  }

  const hasLogs = logs.length > 0;

  const radioCardClass = (active) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
      active ? "border-primary/40 bg-accent/60" : "border-border bg-white hover:bg-muted/50"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold">Jana Laporan</h3>
              <p className="text-xs text-muted-foreground">{risk.no_rujukan}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {/* Maklumat risiko */}
          <div className="rounded-xl border border-border bg-muted/50 p-3.5">
            <p className="text-xs text-muted-foreground">{risk.subsidiary}</p>
            <p className="mt-0.5 text-sm font-medium text-foreground line-clamp-2">{risk.title}</p>
          </div>

          <div className="space-y-2.5">
            {/* Pilihan: Keseluruhan */}
            <div>
              <input type="radio" id="report-all" name="reportType" value="all" className="peer sr-only"
                checked={reportType === 'all'}
                onChange={() => { setReportType('all'); setIsLogOnlyMode(false); }}
              />
              <label htmlFor="report-all" className={radioCardClass(reportType === 'all')}>
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  reportType === 'all' ? "border-primary" : "border-slate-300"
                }`}>
                  {reportType === 'all' && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">Keseluruhan Laporan</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Jana keseluruhan laporan dan pemantauan.
                  </span>
                </span>
              </label>
            </div>

            {/* Pilihan: Khusus */}
            <div>
              <input type="radio" id="report-range" name="reportType" value="range" className="sr-only"
                checked={reportType === 'range'}
                onChange={() => setReportType('range')}
                disabled={!hasLogs}
              />
              <label
                htmlFor="report-range"
                className={`${radioCardClass(reportType === 'range')} ${!hasLogs ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  reportType === 'range' ? "border-primary" : "border-slate-300"
                }`}>
                  {reportType === 'range' && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">Laporan Khusus</span>

                  {!hasLogs ? (
                    <EmptyState
                      icon={AlertCircle}
                      title="Tiada pemantauan ditemui"
                      description="Tiada pemantauan ditemui untuk risiko ini."
                      className="my-2 border-0 py-2"
                    />
                  ) : (
                    reportType === 'range' && (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
                            <input
                              type="checkbox"
                              checked={isSingleLogMode}
                              onChange={(e) => setIsSingleLogMode(e.target.checked)}
                              className="h-3.5 w-3.5 accent-[#2563eb]"
                            />
                            Pilih satu pemantauan sahaja
                          </label>
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
                            <input
                              type="checkbox"
                              checked={isLogOnlyMode}
                              onChange={(e) => setIsLogOnlyMode(e.target.checked)}
                              className="h-3.5 w-3.5 accent-[#2563eb]"
                            />
                            Jana Pemantauan Sahaja
                            <span className="text-muted-foreground">(Hanya paparkan pemantauan)</span>
                          </label>
                        </div>

                        {isSingleLogMode ? (
                          <div className="space-y-1.5 rounded-lg border border-border bg-white p-3">
                            <label className="text-xs font-medium text-muted-foreground">Pilih Log</label>
                            <select
                              value={singleValue}
                              onChange={e => setSingleValue(e.target.value)}
                              className="h-9 w-full rounded-lg border border-border bg-white px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            >
                              {logOptions.map(opt => (
                                <option key={`single-${opt.value}`} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-white p-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">Dari</label>
                              <select
                                value={fromValue}
                                onChange={e => setFromValue(e.target.value)}
                                className="h-9 w-full rounded-lg border border-border bg-white px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              >
                                {logOptions.map(opt => (
                                  <option key={`from-${opt.value}`} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">Hingga</label>
                              <select
                                value={toValue}
                                onChange={e => setToValue(e.target.value)}
                                className="h-9 w-full rounded-lg border border-border bg-white px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              >
                                {logOptions.map(opt => (
                                  <option key={`to-${opt.value}`} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-white px-5 py-3">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button
            onClick={handleGenerateClick}
            disabled={reportType === 'range' && !hasLogs}
          >
            Jana Laporan
          </Button>
        </div>
      </div>
    </div>
  );
}
