import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  FileSearch,
  History,
  Pencil,
  ShieldCheck,
  Stethoscope,
  Activity,
} from "lucide-react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import AlertBanner from "@/components/ui/alert-banner";
import LoadingSpinner from "@/components/ui/loading-spinner";
import RiskMatrixVisual from "@/components/ui/risk-matrix-visual";
import Toast from "@/components/ui/toast";
import { hasKebenaran } from "@/utils/auth";
import { formatDate, formatSeparuhTahun } from "@/utils/formatters";
import { calculateRisk } from "@/constants/riskMatrix";
import { usePanduan } from "@/hooks/usePanduan";
import { cn } from "@/lib/utils";
import BorangPengenalpastian from "@/components/risiko/BorangPengenalpastian";
import BorangPenilaian from "@/components/risiko/BorangPenilaian";
import BorangRawatan from "@/components/risiko/BorangRawatan";
import StepperAliran from "@/components/risiko/StepperAliran";
import {
  adaPenilaian,
  adaRawatan,
  bolehPindaTerus,
  keSenarai,
  kiraPeringkat,
  tindakanSeterusnya,
} from "@/components/risiko/data";
import { LencanaTahap, Medan, SenaraiCip } from "@/components/risiko/umum";
import TabPemantauan from "./TabPemantauan";

const TAB = [
  { id: "ringkasan", label: "Ringkasan", icon: FileSearch },
  { id: "penilaian", label: "Penilaian", icon: ClipboardCheck },
  { id: "rawatan", label: "Rawatan", icon: Stethoscope },
  { id: "pemantauan", label: "Pemantauan", icon: Activity },
  { id: "sejarah", label: "Sejarah", icon: History },
];

const susunLog = (logs) =>
  [...logs].sort(
    (a, b) =>
      (b.tahun_pemantauan || 0) - (a.tahun_pemantauan || 0) ||
      (b.separuh_tahun_pemantauan || 0) - (a.separuh_tahun_pemantauan || 0) ||
      new Date(b.tarikh_kemaskini || 0) - new Date(a.tarikh_kemaskini || 0)
  );

function Kad({ tajuk, tindakan, children }) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{tajuk}</h2>
        <div className="flex items-center gap-2">{tindakan}</div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ButangSunting({ onClick, children = "Sunting" }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Pencil size={14} /> {children}
    </Button>
  );
}

/** Halaman butiran risiko: /risiko/:id?tab=penilaian&sunting=1 */
export default function ButiranRisiko() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lokasi = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = TAB.some((t) => t.id === params.get("tab")) ? params.get("tab") : "ringkasan";
  const sunting = params.get("sunting") === "1";

  const [risiko, setRisiko] = useState(null);
  const [logs, setLogs] = useState([]);
  const [sejarah, setSejarah] = useState(null);
  const [ralatMuat, setRalatMuat] = useState(null);
  // Mesej daripada halaman sebelum (cth. selepas daftar risiko)
  const [toast, setToast] = useState(() =>
    lokasi.state?.mesej ? { variant: "success", title: lokasi.state.mesej } : null
  );
  const { openPanduan, PanduanRenderer } = usePanduan();

  const pergi = (tabBaru, suntingBaru = false) => {
    const p = { tab: tabBaru };
    if (suntingBaru) p.sunting = "1";
    setParams(p, { replace: true });
  };

  const muat = useCallback(async () => {
    try {
      const [{ data: r }, { data: l }] = await Promise.all([
        api.get(`/risiko/${id}`),
        api.get(`/pemantauan-risiko/${id}/sejarah`),
      ]);
      setRisiko(r);
      setLogs(susunLog(Array.isArray(l) ? l : []));
      setRalatMuat(null);
    } catch (err) {
      setRalatMuat(
        err.response?.status === 403
          ? "Anda tidak dibenarkan melihat risiko ini."
          : err.response?.data?.error || "Gagal memuatkan risiko."
      );
    }
  }, [id]);

  useEffect(() => {
    muat();
  }, [muat]);

  useEffect(() => {
    if (tab !== "sejarah" || sejarah || !risiko || !hasKebenaran("log:baca")) return;
    api
      .get("/log_aktiviti", { params: { carian: risiko.no_rujukan, had: 50 } })
      .then(({ data }) => setSejarah(data.data || []))
      .catch(() => setSejarah([]));
  }, [tab, sejarah, risiko]);

  const selepasSimpan = (mesej, ralat) => {
    if (ralat) {
      setToast({ variant: "error", title: ralat });
      return;
    }
    setToast({ variant: "success", title: mesej });
    setSejarah(null);
    pergi(tab);
    muat();
  };

  if (ralatMuat) {
    return (
      <div className="grid gap-4">
        <Button variant="ghost" className="w-fit" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Kembali
        </Button>
        <EmptyState icon={FileSearch} title="Risiko tidak dapat dipaparkan" description={ralatMuat} />
      </div>
    );
  }
  if (!risiko) return <LoadingSpinner text="Memuatkan risiko..." />;

  const peringkat = kiraPeringkat(risiko, logs);
  const seterusnya = tindakanSeterusnya(risiko, peringkat);
  const diluluskan = !risiko.status_kelulusan || risiko.status_kelulusan === "Diluluskan";
  const dinilai = adaPenilaian(risiko);
  const dirawat = adaRawatan(risiko);
  const penuh = bolehPindaTerus();
  const pindaan = risiko.pindaan_terkini;
  const pindaanMenunggu = pindaan?.status_permohonan === "Menunggu Kelulusan";
  const bolehPinda = dinilai && diluluskan && hasKebenaran("pindaan:urus") && !pindaanMenunggu;
  const terkini = logs.find((l) => l.skor_kebarangkalian_selepas && l.skor_impak_selepas);
  const tahapSemasa = terkini
    ? [terkini.skor_kebarangkalian_selepas, terkini.skor_impak_selepas]
    : [risiko.skor_kebarangkalian, risiko.skor_impak];
  const penilaian = calculateRisk(risiko.skor_kebarangkalian, risiko.skor_impak);

  return (
    <div className="grid gap-4">
      {/* Pengepala ringkasan */}
      <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={13} /> Kembali
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{risiko.no_rujukan}</h1>
              <LencanaTahap k={tahapSemasa[0]} i={tahapSemasa[1]} />
              {risiko.status_kelulusan && risiko.status_kelulusan !== "Diluluskan" && (
                <Badge variant={risiko.status_kelulusan === "Ditolak" ? "destructive" : "warning"}>
                  {risiko.status_kelulusan}
                </Badge>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-foreground">{risiko.risiko}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[
                risiko.syarikat,
                risiko.kategori,
                risiko.bahagian,
                `${risiko.tahun} · ${formatSeparuhTahun(risiko.separuh_tahun)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={openPanduan}>
            <BookOpen size={15} /> Panduan
          </Button>
        </div>

        <StepperAliran peringkat={peringkat} />

        {seterusnya && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm">
            <span className="text-foreground">
              <ShieldCheck size={16} className="mr-1.5 inline align-[-3px] text-primary" />
              Tindakan seterusnya: <strong>{seterusnya.teks}</strong>
            </span>
            {seterusnya.boleh && seterusnya.tab && (
              <Button size="sm" onClick={() => pergi(seterusnya.tab, true)}>
                Mula
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tab */}
      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {TAB.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => pergi(t.id)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon size={15} /> {t.label}
            {t.id === "pemantauan" && logs.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[11px]">{logs.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "ringkasan" && (
        <Kad
          tajuk="Pengenalpastian Risiko"
          tindakan={penuh && !sunting && <ButangSunting onClick={() => pergi("ringkasan", true)} />}
        >
          {sunting && penuh ? (
            <BorangPengenalpastian risiko={risiko} onSelesai={selepasSimpan} onBatal={() => pergi("ringkasan")} />
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Medan label="No. Rujukan">{risiko.no_rujukan}</Medan>
              <Medan label="Syarikat">{risiko.syarikat}</Medan>
              <Medan label="Tahun / Separuh">
                {risiko.tahun} · {formatSeparuhTahun(risiko.separuh_tahun)}
              </Medan>
              <Medan label="Didaftarkan oleh">{risiko.didaftarkan_oleh}</Medan>
              <Medan label="Kategori">{risiko.kategori}</Medan>
              <Medan label="Bahagian / Unit">{risiko.bahagian}</Medan>
              <Medan label="Tarikh daftar">{risiko.created_at ? formatDate(risiko.created_at) : "-"}</Medan>
              <Medan label="Status kelulusan">
                {risiko.status_kelulusan || "Diluluskan"}
                {risiko.diluluskan_oleh && ` · ${risiko.diluluskan_oleh}`}
                {risiko.tarikh_kelulusan && ` · ${formatDate(risiko.tarikh_kelulusan)}`}
              </Medan>
              {risiko.status_kelulusan === "Ditolak" && (
                <Medan label="Sebab ditolak" className="sm:col-span-2 lg:col-span-4">
                  {risiko.sebab_ditolak_risiko}
                </Medan>
              )}
              <Medan label="Risiko" className="sm:col-span-2 lg:col-span-4">
                <span className="whitespace-pre-wrap">{risiko.risiko}</span>
              </Medan>
              <Medan label="Punca" className="sm:col-span-2">
                <SenaraiCip items={keSenarai(risiko.punca)} />
              </Medan>
              <Medan label="Kesan" className="sm:col-span-2">
                <SenaraiCip items={keSenarai(risiko.kesan)} />
              </Medan>
            </dl>
          )}
        </Kad>
      )}

      {tab === "penilaian" && (
        <Kad
          tajuk="Penilaian Risiko"
          tindakan={
            bolehPinda &&
            !sunting && (
              <ButangSunting onClick={() => pergi("penilaian", true)}>
                {penuh ? "Pinda" : "Mohon Pindaan"}
              </ButangSunting>
            )
          }
        >
          {pindaanMenunggu && (
            <AlertBanner
              variant="warning"
              className="mb-4"
              title={`Permohonan pindaan ${pindaan.no_rujukan_pindaan || ""} sedang menunggu kelulusan`}
              description="Skor di bawah kekal sehingga permohonan diluluskan."
            />
          )}
          {pindaan?.status_permohonan === "Ditolak" && !sunting && (
            <AlertBanner
              variant="error"
              className="mb-4"
              title={`Permohonan pindaan ${pindaan.no_rujukan_pindaan || ""} ditolak`}
              description={pindaan.sebab_ditolak ? `Sebab: ${pindaan.sebab_ditolak}` : undefined}
            />
          )}
          {sunting && diluluskan && (dinilai ? bolehPinda : hasKebenaran("risiko:nilai", "rawatan:urus")) ? (
            <BorangPenilaian risiko={risiko} onSelesai={selepasSimpan} onBatal={() => pergi("penilaian")} />
          ) : dinilai ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
              <dl className="grid content-start gap-4 sm:grid-cols-2">
                <Medan label="Skor Kebarangkalian">{risiko.skor_kebarangkalian}</Medan>
                <Medan label="Skor Impak">{risiko.skor_impak}</Medan>
                <Medan label="Tahap Risiko">
                  <LencanaTahap k={risiko.skor_kebarangkalian} i={risiko.skor_impak} />
                </Medan>
                <Medan label="Perlu Rawatan">{penilaian.statusRisiko || risiko.status_risiko}</Medan>
                <Medan label="Justifikasi Pindaan Penilaian" className="sm:col-span-2">
                  {risiko.pindaan_penilaian}
                </Medan>
              </dl>
              <div className="justify-self-center">
                <RiskMatrixVisual kebarangkalian={risiko.skor_kebarangkalian} impak={risiko.skor_impak} compact />
              </div>
            </div>
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title="Belum dinilai"
              description={
                diluluskan ? "Risiko ini belum mempunyai penilaian." : "Penilaian boleh dibuat selepas risiko diluluskan."
              }
              actionLabel={
                diluluskan && hasKebenaran("risiko:nilai", "rawatan:urus") ? "Buat Penilaian" : undefined
              }
              onAction={() => pergi("penilaian", true)}
            />
          )}
        </Kad>
      )}

      {tab === "rawatan" && (
        <Kad
          tajuk="Rawatan Risiko"
          tindakan={dirawat && penuh && !sunting && <ButangSunting onClick={() => pergi("rawatan", true)} />}
        >
          {sunting && dinilai && (dirawat ? penuh : hasKebenaran("rawatan:urus")) ? (
            <BorangRawatan risikoId={risiko.id} onSelesai={selepasSimpan} onBatal={() => pergi("rawatan")} />
          ) : dirawat ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              <Medan label="Jenis Kawalan">{risiko.jenis_kawalan}</Medan>
              <Medan label="Tempoh Jangkaan Siap">{risiko.tempoh_jangkaan_siap_tindakan}</Medan>
              <Medan label="Pelan Tindakan">
                <SenaraiCip items={keSenarai(risiko.pelan_tindakan)} />
              </Medan>
              <Medan label="Kakitangan Bertanggungjawab">
                <SenaraiCip items={keSenarai(risiko.kakitangan_bertanggungjawab)} />
              </Medan>
            </dl>
          ) : (
            <EmptyState
              icon={Stethoscope}
              title="Tiada rawatan"
              description={dinilai ? "Rawatan belum direkodkan untuk risiko ini." : "Lengkapkan penilaian risiko dahulu."}
              actionLabel={dinilai && hasKebenaran("rawatan:urus") ? "Tambah Rawatan" : undefined}
              onAction={() => pergi("rawatan", true)}
            />
          )}
        </Kad>
      )}

      {tab === "pemantauan" && (
        <Kad tajuk="Pemantauan Risiko">
          <TabPemantauan
            key={`${risiko.id}-${sunting}`}
            risiko={risiko}
            logs={logs}
            bolehTambah={diluluskan && dirawat && hasKebenaran("pemantauan:urus")}
            bukaTambah={sunting && diluluskan && dirawat && hasKebenaran("pemantauan:urus")}
            onBerubah={selepasSimpan}
          />
        </Kad>
      )}

      {tab === "sejarah" && (
        <Kad tajuk="Sejarah Aktiviti">
          {!hasKebenaran("log:baca") ? (
            <p className="text-sm text-muted-foreground">Anda tiada akses kepada log aktiviti.</p>
          ) : sejarah === null ? (
            <LoadingSpinner text="Memuatkan sejarah..." />
          ) : sejarah.length === 0 ? (
            <EmptyState icon={History} title="Tiada aktiviti direkodkan" />
          ) : (
            <ol className="grid gap-3">
              {sejarah.map((l) => (
                <li key={l.log_id} className="grid gap-0.5 border-l-2 border-border pl-3">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(l.tarikh_masa)} · {l.nama_pengguna} ({l.peranan_pengguna})
                  </span>
                  <span className="text-sm font-medium text-foreground">{l.aktiviti}</span>
                  <span className="text-sm text-muted-foreground">{l.ringkasan}</span>
                </li>
              ))}
            </ol>
          )}
        </Kad>
      )}

      {PanduanRenderer}
      {toast && (
        <div className="fixed right-4 top-[64px] z-50 w-[320px]">
          <Toast variant={toast.variant} title={toast.title} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
