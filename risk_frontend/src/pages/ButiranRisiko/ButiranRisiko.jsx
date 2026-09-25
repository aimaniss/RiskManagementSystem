import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ClipboardList, Pencil, Plus, ShieldCheck, Activity, Trash2 } from "lucide-react";
import api from "../../api/api";
import { getAuthUser, hasKebenaran, canEditPenilaian } from "../../utils/auth";
import { formatSeparuhTahun } from "../../utils/formatters";
import { KEBERKESANAN_MAPPING, calculateRisk } from "../../constants/riskMatrix";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import StatusStepper from "@/components/ui/status-stepper";
import RiskMatrixVisual from "@/components/ui/risk-matrix-visual";
import LoadingSpinner from "@/components/ui/loading-spinner";
import AlertBanner from "@/components/ui/alert-banner";
import EmptyState from "@/components/ui/empty-state";
import ConfirmModal from "@/components/ui/confirm-modal";
import Toast from "@/components/ui/toast";
import { Medan, SenaraiChip, LencanaTahap, TajukBahagian } from "@/components/risiko/paparan";
import { kiraAliran, susunLogTerkini } from "@/components/risiko/aliranRisiko";
import BorangPengenalpastian from "@/components/risiko/BorangPengenalpastian";
import BorangPenilaian from "@/components/risiko/BorangPenilaian";
import BorangRawatan from "@/components/risiko/BorangRawatan";
import BorangLogPemantauan from "@/components/risiko/BorangLogPemantauan";

const TAB = [
  { kunci: "ringkasan", label: "Ringkasan" },
  { kunci: "penilaian", label: "Penilaian" },
  { kunci: "rawatan", label: "Rawatan" },
  { kunci: "pemantauan", label: "Pemantauan" },
];

// Admin & Executive: sunting pengenalpastian & padam log (selaras paparan lama)
const PERANAN_PENUH = ["ADMIN", "EXECUTIVE"];

const formatTarikh = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d) ? v : d.toLocaleDateString("ms-MY", { day: "2-digit", month: "short", year: "numeric" });
};

const tempohLog = (log) => `${log.tahun_pemantauan} · ${formatSeparuhTahun(log.separuh_tahun_pemantauan) || "-"}`;
const teksItem = (item) => (typeof item === "string" ? item : item?.butiran_aktiviti || item?.butiran_kakitangan || "");

export default function ButiranRisiko() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TAB.some((t) => t.kunci === searchParams.get("tab")) ? searchParams.get("tab") : "ringkasan";

  const [risiko, setRisiko] = useState(null);
  const [rawatan, setRawatan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [ralatMuat, setRalatMuat] = useState(null);
  const [sunting, setSunting] = useState(null); // "pengenalpastian" | "penilaian" | "rawatan" | { log } | "log-baru"
  const [logDipilihId, setLogDipilihId] = useState(null);
  const [padamLog, setPadamLog] = useState(null);
  const [toast, setToast] = useState(null);

  const peranan = getAuthUser()?.role || "";
  const boleh = {
    pengenalpastian: PERANAN_PENUH.includes(peranan),
    nilai: canEditPenilaian(),
    rawat: hasKebenaran("rawatan:urus"),
    pantau: hasKebenaran("pemantauan:urus"),
    padamLog: PERANAN_PENUH.includes(peranan),
    lulus: hasKebenaran("risiko:lulus"),
  };

  const muat = useCallback(async () => {
    try {
      const [r, rw, lg] = await Promise.all([
        api.get(`/risiko/${id}`),
        api.get(`/risiko/${id}/rawatan`).catch((e) => (e.response?.status === 404 ? { data: null } : Promise.reject(e))),
        api.get(`/pemantauan-risiko/${id}/sejarah`),
      ]);
      setRisiko(r.data);
      setRawatan(rw.data);
      setLogs(susunLogTerkini(lg.data || []));
      setRalatMuat(null);
    } catch (err) {
      const status = err.response?.status;
      setRalatMuat(
        status === 404
          ? "Risiko tidak ditemui atau telah dipadam."
          : status === 403
            ? "Anda tidak dibenarkan melihat risiko ini."
            : "Gagal memuatkan butiran risiko."
      );
    } finally {
      setMemuat(false);
    }
  }, [id]);

  useEffect(() => {
    muat();
  }, [muat]);

  const tukarTab = (kunci) => {
    setSunting(null);
    setSearchParams(kunci === "ringkasan" ? {} : { tab: kunci }, { replace: true });
  };

  const selepasSimpan = async (mesej) => {
    setSunting(null);
    setToast({ variant: "success", title: "Berjaya", message: mesej });
    await muat();
  };

  const aliran = useMemo(() => (risiko ? kiraAliran(risiko, rawatan, logs) : null), [risiko, rawatan, logs]);

  if (memuat) return <LoadingSpinner text="Memuatkan butiran risiko..." />;
  if (ralatMuat)
    return (
      <div className="space-y-4">
        <Link to="/SenaraiRisiko" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Senarai Risiko
        </Link>
        <AlertBanner variant="error" title={ralatMuat} />
      </div>
    );

  const logTerkini = logs[0];
  const logBerskor = logs.find((l) => l.skor_kebarangkalian_selepas && l.skor_impak_selepas);
  const logDipilih = logs.find((l) => l.log_id === logDipilihId) || logTerkini;

  // Tindakan seterusnya ikut peringkat aktif & kebenaran pengguna
  const tindakanSeterusnya = (() => {
    switch (aliran.semasa) {
      case "lulus":
        return boleh.lulus
          ? { label: "Semak di Senarai Tugasan", buat: () => navigate("/SenaraiTugasan") }
          : { label: "Menunggu kelulusan", buat: null };
      case "nilai":
        return boleh.nilai ? { label: "Nilai Risiko", buat: () => (tukarTab("penilaian"), setSunting("penilaian")) } : null;
      case "rawat":
        return boleh.rawat ? { label: "Tambah Rawatan", buat: () => (tukarTab("rawatan"), setSunting("rawatan")) } : null;
      default:
        return boleh.pantau ? { label: "Tambah Log Pemantauan", buat: () => (tukarTab("pemantauan"), setSunting("log-baru")) } : null;
    }
  })();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* ===== Pengepala ringkasan (tetap) ===== */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/SenaraiRisiko"))}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{risiko.no_rujukan}</h1>
              <LencanaTahap
                kebarangkalian={logBerskor?.skor_kebarangkalian_selepas || risiko.skor_kebarangkalian}
                impak={logBerskor?.skor_impak_selepas || risiko.skor_impak}
              />
              {risiko.status_kelulusan && risiko.status_kelulusan !== "Diluluskan" && (
                <Badge variant={risiko.status_kelulusan === "Ditolak" ? "destructive" : "warning"}>{risiko.status_kelulusan}</Badge>
              )}
            </div>
            <p className="mt-1 line-clamp-2 max-w-3xl text-sm text-foreground">{risiko.risiko}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {risiko.syarikat} · {risiko.tahun} · {formatSeparuhTahun(risiko.separuh_tahun)} · {risiko.kategori}
            </p>
          </div>
          {tindakanSeterusnya && (
            <Button onClick={tindakanSeterusnya.buat || undefined} disabled={!tindakanSeterusnya.buat} className="shrink-0">
              {tindakanSeterusnya.label}
              {tindakanSeterusnya.buat && <ArrowRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <StatusStepper steps={aliran.steps} className="bg-card" />
      </div>

      {/* ===== Tab ===== */}
      <div role="tablist" aria-label="Bahagian risiko" className="flex gap-1 overflow-x-auto border-b">
        {TAB.map((t) => (
          <button
            key={t.kunci}
            role="tab"
            type="button"
            aria-selected={tab === t.kunci}
            onClick={() => tukarTab(t.kunci)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 sm:px-4 text-sm font-medium transition-colors ${
              tab === t.kunci ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.kunci === "pemantauan" && logs.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({logs.length})</span>}
          </button>
        ))}
      </div>

      <Card className="rounded-xl p-5" role="tabpanel">
        {tab === "ringkasan" &&
          (sunting === "pengenalpastian" ? (
            <>
              <TajukBahagian tajuk="Sunting Pengenalpastian" />
              <BorangPengenalpastian risiko={risiko} onSaved={selepasSimpan} onBatal={() => setSunting(null)} />
            </>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Ringkas label="Tahap asal (penilaian)">
                  <LencanaTahap kebarangkalian={risiko.skor_kebarangkalian} impak={risiko.skor_impak} />
                </Ringkas>
                <Ringkas label="Tahap semasa (pemantauan)">
                  {logBerskor ? (
                    <LencanaTahap kebarangkalian={logBerskor.skor_kebarangkalian_selepas} impak={logBerskor.skor_impak_selepas} />
                  ) : (
                    "-"
                  )}
                </Ringkas>
                <Ringkas label="Rawatan">{rawatan?.jenis_kawalan || "Belum ada"}</Ringkas>
                <Ringkas label="Sesi terkini">{logTerkini ? `${tempohLog(logTerkini)} · ${logTerkini.status_pemantauan || "-"}` : "Belum ada"}</Ringkas>
              </div>
              <div>
                <TajukBahagian
                  tajuk="Pengenalpastian Risiko"
                  tindakan={
                    boleh.pengenalpastian && (
                      <Button variant="outline" size="sm" onClick={() => setSunting("pengenalpastian")}>
                        <Pencil className="h-3.5 w-3.5" /> Sunting
                      </Button>
                    )
                  }
                />
                <dl className="space-y-2.5">
                  <Medan label="Syarikat">{risiko.syarikat}</Medan>
                  <Medan label="Tahun / Separuh">{`${risiko.tahun} · ${formatSeparuhTahun(risiko.separuh_tahun) || "-"}`}</Medan>
                  <Medan label="Kategori">{risiko.kategori}</Medan>
                  <Medan label="Bahagian / Unit">{risiko.bahagian}</Medan>
                  <Medan label="Risiko">{risiko.risiko}</Medan>
                  <Medan label="Punca">
                    <SenaraiChip item={risiko.punca} />
                  </Medan>
                  <Medan label="Kesan">
                    <SenaraiChip item={risiko.kesan} />
                  </Medan>
                  <Medan label="Didaftarkan">
                    {[risiko.didaftarkan_oleh !== "—" && risiko.didaftarkan_oleh, formatTarikh(risiko.created_at)].filter(Boolean).join(" · ")}
                  </Medan>
                  {risiko.status_kelulusan === "Ditolak" && <Medan label="Sebab ditolak">{risiko.sebab_ditolak_risiko}</Medan>}
                </dl>
              </div>
            </div>
          ))}

        {tab === "penilaian" &&
          (sunting === "penilaian" ? (
            <>
              <TajukBahagian tajuk="Sunting Penilaian Risiko" keterangan="Pilih skor kebarangkalian dan impak — tahap dikira automatik." />
              <BorangPenilaian risiko={risiko} onSaved={selepasSimpan} onBatal={() => setSunting(null)} />
            </>
          ) : (
            <div>
              <TajukBahagian
                tajuk="Penilaian Risiko"
                keterangan="Tahap risiko asal sebelum rawatan."
                tindakan={
                  boleh.nilai && (
                    <Button variant="outline" size="sm" onClick={() => setSunting("penilaian")}>
                      <Pencil className="h-3.5 w-3.5" /> {risiko.skor_kebarangkalian ? "Sunting" : "Nilai Risiko"}
                    </Button>
                  )
                }
              />
              {risiko.skor_kebarangkalian && risiko.skor_impak ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
                  <dl className="space-y-2.5">
                    <Medan label="Skor Kebarangkalian">{risiko.skor_kebarangkalian}</Medan>
                    <Medan label="Skor Impak">{risiko.skor_impak}</Medan>
                    <Medan label="Tahap Risiko">
                      <LencanaTahap kebarangkalian={risiko.skor_kebarangkalian} impak={risiko.skor_impak} tunjukSkor={false} />
                    </Medan>
                    <Medan label="Perlu Rawatan">
                      {calculateRisk(risiko.skor_kebarangkalian, risiko.skor_impak).statusRisiko === "Ya"
                        ? "Ya — risiko memerlukan tindakan"
                        : "Tidak — risiko rendah"}
                    </Medan>
                    {risiko.pindaan_penilaian && <Medan label="Justifikasi pindaan">{risiko.pindaan_penilaian}</Medan>}
                  </dl>
                  <RiskMatrixVisual kebarangkalian={risiko.skor_kebarangkalian} impak={risiko.skor_impak} compact />
                </div>
              ) : (
                <EmptyState icon={ClipboardList} title="Belum dinilai" description="Risiko ini belum mempunyai skor penilaian." />
              )}
            </div>
          ))}

        {tab === "rawatan" &&
          (sunting === "rawatan" ? (
            <>
              <TajukBahagian tajuk={rawatan ? "Sunting Rawatan Risiko" : "Tambah Rawatan Risiko"} />
              <BorangRawatan risikoId={risiko.id} rawatan={rawatan} onSaved={selepasSimpan} onBatal={() => setSunting(null)} />
            </>
          ) : (
            <div>
              <TajukBahagian
                tajuk="Rawatan Risiko"
                tindakan={
                  boleh.rawat && (
                    <Button variant="outline" size="sm" onClick={() => setSunting("rawatan")}>
                      {rawatan ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {rawatan ? "Sunting" : "Tambah Rawatan"}
                    </Button>
                  )
                }
              />
              {rawatan ? (
                <dl className="space-y-2.5">
                  <Medan label="Jenis Kawalan">{rawatan.jenis_kawalan}</Medan>
                  <Medan label="Tempoh Jangkaan Siap">{rawatan.tempoh_jangkaan_siap}</Medan>
                  <Medan label="Pelan Tindakan">
                    <SenaraiChip item={rawatan.plan_tindakan} />
                  </Medan>
                  <Medan label="Kakitangan">
                    <SenaraiChip item={rawatan.kakitangan_bertanggungjawab} />
                  </Medan>
                </dl>
              ) : (
                <EmptyState icon={ShieldCheck} title="Tiada rawatan" description="Rawatan belum ditetapkan untuk risiko ini." />
              )}
            </div>
          ))}

        {tab === "pemantauan" && (
          <div>
            <TajukBahagian
              tajuk="Pemantauan Risiko"
              keterangan="Satu sesi bagi setiap separuh tahun. Pilih sesi untuk melihat butiran."
              tindakan={
                boleh.pantau &&
                sunting !== "log-baru" && (
                  <Button size="sm" onClick={() => setSunting("log-baru")}>
                    <Plus className="h-3.5 w-3.5" /> Tambah Log
                  </Button>
                )
              }
            />
            {sunting === "log-baru" ? (
              <BorangLogPemantauan risiko={risiko} kunciSkor={peranan === "STAFF"} onSaved={selepasSimpan} onBatal={() => setSunting(null)} />
            ) : logs.length === 0 ? (
              <EmptyState icon={Activity} title="Tiada rekod pemantauan" description="Belum ada sesi pemantauan direkodkan." />
            ) : (
              <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                <ol aria-label="Garis masa pemantauan" className="space-y-1.5">
                  {logs.map((log) => {
                    const dipilih = log.log_id === logDipilih?.log_id;
                    return (
                      <li key={log.log_id}>
                        <button
                          type="button"
                          onClick={() => {
                            setLogDipilihId(log.log_id);
                            setSunting(null);
                          }}
                          aria-current={dipilih ? "true" : undefined}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                            dipilih ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-medium">{tempohLog(log)}</span>
                            <span className="block text-xs text-muted-foreground">{log.status_pemantauan || "-"}</span>
                          </span>
                          {log.skor_kebarangkalian_selepas && log.skor_impak_selepas ? (
                            <LencanaTahap kebarangkalian={log.skor_kebarangkalian_selepas} impak={log.skor_impak_selepas} tunjukSkor={false} />
                          ) : (
                            <span className="text-xs text-muted-foreground">Belum dinilai</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>

                <div className="min-w-0 rounded-lg border p-4">
                  {sunting?.log ? (
                    <>
                      <TajukBahagian tajuk={`Sunting Sesi ${tempohLog(sunting.log)}`} />
                      <BorangLogPemantauan
                        risiko={risiko}
                        log={sunting.log}
                        kunciSkor={peranan === "STAFF"}
                        onSaved={selepasSimpan}
                        onBatal={() => setSunting(null)}
                      />
                    </>
                  ) : (
                    logDipilih && (
                      <>
                        <TajukBahagian
                          tajuk={`Sesi ${tempohLog(logDipilih)}`}
                          keterangan={`Kemas kini terakhir: ${formatTarikh(logDipilih.tarikh_kemaskini || logDipilih.tarikh_pemantauan)}`}
                          tindakan={
                            <>
                              {boleh.pantau && (
                                <Button variant="outline" size="sm" onClick={() => setSunting({ log: logDipilih })}>
                                  <Pencil className="h-3.5 w-3.5" /> Sunting
                                </Button>
                              )}
                              {boleh.padamLog && (
                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPadamLog(logDipilih)}>
                                  <Trash2 className="h-3.5 w-3.5" /> Padam
                                </Button>
                              )}
                            </>
                          }
                        />
                        <dl className="space-y-2.5">
                          <Medan label="Tahap semasa">
                            <LencanaTahap kebarangkalian={logDipilih.skor_kebarangkalian_selepas} impak={logDipilih.skor_impak_selepas} />
                          </Medan>
                          <Medan label="Keberkesanan">
                            {logDipilih.keberkesanan ? KEBERKESANAN_MAPPING[logDipilih.keberkesanan] || logDipilih.keberkesanan : "-"}
                          </Medan>
                          <Medan label="Status">{logDipilih.status_pemantauan}</Medan>
                          <Medan label="Kekerapan">{logDipilih.kekerapan_pemantauan}</Medan>
                          <Medan label="Pelan Tindakan">
                            <SenaraiChip item={(logDipilih.pelan_tindakan_log || []).map(teksItem)} />
                          </Medan>
                          <Medan label="Kakitangan">
                            <SenaraiChip item={(logDipilih.kakitangan_log || []).map(teksItem)} />
                          </Medan>
                          <Medan label="No. Bil Kelulusan">{logDipilih.no_bil_kelulusan}</Medan>
                          <Medan label="Catatan">{logDipilih.catatan}</Medan>
                          {logDipilih.justifikasi_pindaan_pemantauan && (
                            <Medan label="Justifikasi pindaan">{logDipilih.justifikasi_pindaan_pemantauan}</Medan>
                          )}
                        </dl>
                      </>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <ConfirmModal
        open={Boolean(padamLog)}
        onOpenChange={(buka) => !buka && setPadamLog(null)}
        title="Padam log pemantauan?"
        description={padamLog ? `Sesi ${tempohLog(padamLog)} akan dipadam.` : ""}
        confirmText="Padam"
        variant="destructive"
        onConfirm={async () => {
          const log = padamLog;
          setPadamLog(null);
          try {
            await api.delete(`/pemantauan-risiko/log/${log.log_id}`);
            setLogDipilihId(null);
            await selepasSimpan("Log pemantauan berjaya dipadam.");
          } catch (err) {
            setToast({ variant: "error", title: "Gagal", message: err.response?.data?.error || "Gagal memadam log." });
          }
        }}
        onCancel={() => setPadamLog(null)}
      />

      {toast && (
        <div className="fixed right-4 top-[64px] z-[60] max-w-sm">
          <Toast variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}

function Ringkas({ label, children }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}
