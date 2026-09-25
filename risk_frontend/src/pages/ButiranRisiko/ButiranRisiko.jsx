import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  ClipboardCheck,
  FilePenLine,
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
import { maklumkanRisikoBerubah } from "@/hooks/useBukaRisiko";
import { cn } from "@/lib/utils";
import BorangPengenalpastian from "@/components/risiko/BorangPengenalpastian";
import BorangPenilaian from "@/components/risiko/BorangPenilaian";
import BorangPindaan from "@/components/risiko/BorangPindaan";
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
import { BarisMedan, LencanaTahap, Medan, SenaraiBernombor, SenaraiCip } from "@/components/risiko/umum";
import TabPemantauan from "./TabPemantauan";
import TabPindaan from "./TabPindaan";
import TabSejarah from "./TabSejarah";

const TAB = [
  { id: "ringkasan", label: "Ringkasan", icon: FileSearch },
  { id: "penilaian", label: "Penilaian", icon: ClipboardCheck },
  { id: "rawatan", label: "Rawatan", icon: Stethoscope },
  { id: "pemantauan", label: "Pemantauan", icon: Activity },
  { id: "pindaan", label: "Pindaan", icon: FilePenLine },
  { id: "sejarah", label: "Sejarah", icon: History },
];

// Data lama menyimpan "—" / "-" bagi nilai kosong
const tiadaSempang = (v) => (v && v !== "—" && v !== "-" ? v : null);

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

/** Butiran risiko (dipapar dalam modal): /risiko/:id?tab=penilaian&sunting=1 */
export default function ButiranRisiko({ onTutup }) {
  const { id } = useParams();
  const lokasi = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = TAB.some((t) => t.id === params.get("tab")) ? params.get("tab") : "ringkasan";
  const sunting = params.get("sunting") === "1";

  const [risiko, setRisiko] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pindaanSemua, setPindaanSemua] = useState(null);
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
    // state (halaman latar modal) dikekalkan semasa bertukar tab
    setParams(p, { replace: true, state: lokasi.state });
  };

  const muat = useCallback(async () => {
    try {
      const [{ data: r }, { data: l }, { data: p }] = await Promise.all([
        api.get(`/risiko/${id}`),
        api.get(`/pemantauan-risiko/${id}/sejarah`),
        api.get(`/pindaan/risiko/${id}`),
      ]);
      setRisiko(r);
      setLogs(susunLog(Array.isArray(l) ? l : []));
      setPindaanSemua(Array.isArray(p) ? p : []);
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
    maklumkanRisikoBerubah();
  };

  if (ralatMuat) {
    return (
      <div className="grid gap-4">
        <EmptyState
          icon={FileSearch}
          title="Risiko tidak dapat dipaparkan"
          description={ralatMuat}
          actionLabel="Tutup"
          onAction={onTutup}
        />
      </div>
    );
  }
  if (!risiko) return <LoadingSpinner text="Memuatkan risiko..." />;

  const peringkat = kiraPeringkat(risiko, logs);
  const seterusnya = tindakanSeterusnya(risiko, peringkat);
  const diluluskan = !risiko.status_kelulusan || risiko.status_kelulusan === "Diluluskan";
  const ditolak = risiko.status_kelulusan === "Ditolak";
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
          {/* mr-8: ruang untuk butang tutup modal di bucu kanan */}
          <Button variant="outline" size="sm" className="mr-8" onClick={() => openPanduan()}>
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
            {t.id === "pindaan" && pindaanSemua?.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[11px]">{pindaanSemua.length}</span>
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
            <div className="grid gap-6">
              <div className="grid gap-x-10 md:grid-cols-2">
                <dl>
                  <BarisMedan label="No. Rujukan">{risiko.no_rujukan}</BarisMedan>
                  <BarisMedan label="Syarikat">{risiko.syarikat}</BarisMedan>
                  <BarisMedan label="Kategori">{risiko.kategori}</BarisMedan>
                  <BarisMedan label="Bahagian / Unit">{risiko.bahagian}</BarisMedan>
                  <BarisMedan label="Sesi">
                    {risiko.tahun} · {formatSeparuhTahun(risiko.separuh_tahun)}
                  </BarisMedan>
                </dl>
                <dl>
                  <BarisMedan label="Didaftarkan oleh">{tiadaSempang(risiko.didaftarkan_oleh)}</BarisMedan>
                  <BarisMedan label="Tarikh daftar">
                    {risiko.created_at && formatDate(risiko.created_at)}
                  </BarisMedan>
                  <BarisMedan label="Status kelulusan">{risiko.status_kelulusan || "Diluluskan"}</BarisMedan>
                  {/* Menunggu kelulusan: belum diproses, jadi tiada pelulus/tarikh */}
                  {risiko.status_kelulusan !== "Menunggu Kelulusan" && (
                    <>
                      <BarisMedan label={ditolak ? "Ditolak oleh" : "Diluluskan oleh"}>
                        {tiadaSempang(risiko.diluluskan_oleh)}
                      </BarisMedan>
                      <BarisMedan label={ditolak ? "Ditolak pada" : "Diluluskan pada"}>
                        {risiko.tarikh_kelulusan && formatDate(risiko.tarikh_kelulusan)}
                      </BarisMedan>
                    </>
                  )}
                </dl>
              </div>

              {risiko.status_kelulusan === "Ditolak" && (
                <AlertBanner
                  variant="error"
                  title="Risiko ditolak"
                  description={risiko.sebab_ditolak_risiko ? `Sebab: ${risiko.sebab_ditolak_risiko}` : undefined}
                />
              )}

              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Huraian risiko
                </h3>
                <p className="whitespace-pre-wrap rounded-lg bg-muted/40 px-4 py-3 text-sm text-foreground">
                  {risiko.risiko}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <SenaraiBernombor tajuk="Punca" items={keSenarai(risiko.punca)} />
                <SenaraiBernombor tajuk="Kesan" items={keSenarai(risiko.kesan)} />
              </div>
            </div>
          )}
        </Kad>
      )}

      {tab === "penilaian" && (
        <Kad
          tajuk="Penilaian Risiko"
          tindakan={
            bolehPinda &&
            !sunting && (
              <ButangSunting onClick={() => pergi("pindaan", true)}>
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
          {sunting && diluluskan && !dinilai && hasKebenaran("risiko:nilai", "rawatan:urus") ? (
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

      {tab === "pindaan" && (
        <Kad
          tajuk={sunting && bolehPinda ? (penuh ? "Pinda Skor Risiko" : "Mohon Pindaan") : "Sejarah Pindaan"}
          tindakan={
            bolehPinda &&
            !sunting && (
              <ButangSunting onClick={() => pergi("pindaan", true)}>
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
              description="Permohonan baharu boleh dibuat selepas permohonan ini diproses."
            />
          )}
          {sunting && bolehPinda ? (
            <BorangPindaan
              risiko={risiko}
              logTerkini={logs[0]}
              onSelesai={selepasSimpan}
              onBatal={() => pergi("pindaan")}
            />
          ) : (
            <TabPindaan senarai={pindaanSemua} />
          )}
        </Kad>
      )}

      {tab === "sejarah" && (
        <Kad tajuk="Sejarah Aktiviti">
          {!hasKebenaran("log:baca") ? (
            <p className="text-sm text-muted-foreground">Anda tiada akses kepada log aktiviti.</p>
          ) : (
            <TabSejarah senarai={sejarah} noRujukan={risiko.no_rujukan} />
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
