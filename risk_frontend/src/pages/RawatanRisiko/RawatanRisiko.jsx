import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardCheck, Stethoscope } from "lucide-react";
import api from "../../api/api";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import PageHeader from "@/components/ui/page-header";
import AlertBanner from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { hasKebenaran } from "@/utils/auth";
import { formatSeparuhTahun } from "@/utils/formatters";
import { LencanaTahap } from "@/components/risiko/umum";
import { KotakCarian, Paging, SelRisiko } from "@/components/risiko/senarai";
import AliranKerjaRisiko from "@/components/risiko/AliranKerjaRisiko";
import { SAIZ_HALAMAN, peringkatAliran, pilihanSesi } from "@/components/risiko/data";

// Peringkat yang sama dengan jalur aliran (rekod /rawatan/with-status)
const peringkat = (d) =>
  peringkatAliran({
    skor_kebarangkalian_awal: d.skor_kebarangkalian,
    skor_impak_awal: d.skor_impak,
    ada_rawatan: Boolean(d.rawatan_id),
    status_pemantauan_terkini: d.status_pemantauan,
  });

const TAB = {
  penilaian: {
    label: "Perlu Dinilai",
    huraian: "Risiko yang diluluskan tetapi belum mempunyai skor penilaian.",
    tapis: (d) => peringkat(d) === "penilaian",
    kosong: "Semua risiko yang diluluskan telah dinilai.",
    ikon: ClipboardCheck,
  },
  rawatan: {
    label: "Perlu Rawatan",
    huraian: "Risiko yang telah dinilai tetapi belum mempunyai pelan rawatan.",
    tapis: (d) => peringkat(d) === "rawatan",
    kosong: "Tiada risiko yang telah dinilai menunggu rawatan.",
    ikon: Stethoscope,
  },
};

/**
 * Senarai kerja penilaian & rawatan. Borang sebenar berada di tab halaman
 * butiran risiko; halaman ini hanya menyusun apa yang perlu dibuat.
 */
function PenilaianDanRawatan() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ralat, setRalat] = useState(null);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "rawatan" ? "rawatan" : "penilaian";
  const setTab = (id) => setParams({ tab: id }, { replace: true });
  const [carian, setCarian] = useState("");
  const [syarikat, setSyarikat] = useState("");
  const [sesi, setSesi] = useState("");
  const [kategori, setKategori] = useState("");
  const [halaman, setHalaman] = useState(1);

  const bolehNilai = hasKebenaran("risiko:nilai", "rawatan:urus");
  const bolehRawat = hasKebenaran("rawatan:urus");

  useEffect(() => {
    api
      .get("/rawatan/with-status")
      .then(({ data: d }) => setData(Array.isArray(d) ? d : []))
      .catch((err) => setRalat(err.response?.data?.error || "Gagal memuatkan senarai risiko."))
      .finally(() => setLoading(false));
  }, []);

  const kiraan = useMemo(
    () => ({
      penilaian: data.filter(TAB.penilaian.tapis).length,
      rawatan: data.filter(TAB.rawatan.tapis).length,
    }),
    [data]
  );

  const senaraiSyarikat = useMemo(
    () => [...new Set(data.map((d) => d.nama_syarikat).filter(Boolean))].sort(),
    [data]
  );
  const senaraiKategori = useMemo(
    () => [...new Set(data.map((d) => d.kategori).filter(Boolean))].sort(),
    [data]
  );
  const senaraiSesi = useMemo(() => pilihanSesi(data, (d) => [d.tahun, d.separuh_tahun]), [data]);

  const ditapis = useMemo(() => {
    const q = carian.trim().toLowerCase();
    return data.filter(
      (d) =>
        TAB[tab].tapis(d) &&
        (!q || `${d.no_rujukan} ${d.risiko}`.toLowerCase().includes(q)) &&
        (!syarikat || d.nama_syarikat === syarikat) &&
        (!kategori || d.kategori === kategori) &&
        (!sesi || `${d.tahun}-${d.separuh_tahun || ""}` === sesi)
    );
  }, [data, tab, carian, syarikat, kategori, sesi]);

  useEffect(() => setHalaman(1), [tab, carian, syarikat, kategori, sesi]);
  const paparan = ditapis.slice((halaman - 1) * SAIZ_HALAMAN, halaman * SAIZ_HALAMAN);
  const adaPenapis = carian || syarikat || kategori || sesi;

  const boleh = tab === "penilaian" ? bolehNilai : bolehRawat;
  const labelTindakan = boleh ? (tab === "penilaian" ? "Nilai" : "Rawat") : "Lihat";
  const buka = (d) =>
    navigate(`/risiko/${d.risiko_id}?tab=${tab}${boleh ? "&sunting=1" : ""}`);

  const Kosong = () => (
    <EmptyState
      icon={TAB[tab].ikon}
      title={adaPenapis ? "Tiada risiko sepadan dengan penapis" : TAB[tab].kosong}
    />
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Penilaian & Rawatan"
        description="Langkah 1 dan 2 aliran kerja: nilai risiko yang diluluskan, kemudian rancang rawatannya."
      />

      <AliranKerjaRisiko
        aktif={tab}
        onPilih={(id) => {
          if (!TAB[id]) return false;
          setTab(id);
          return true;
        }}
      />

      <div>
        <h2 className="text-base font-semibold text-foreground">
          {TAB[tab].label}{" "}
          <span className="font-normal text-muted-foreground">· {kiraan[tab]} risiko</span>
        </h2>
        <p className="text-sm text-muted-foreground">{TAB[tab].huraian}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <KotakCarian nilai={carian} onUbah={setCarian} placeholder="Cari no. rujukan atau risiko" />
        <Select
          className="h-9 w-full sm:w-48"
          value={syarikat}
          onChange={(e) => setSyarikat(e.target.value)}
          aria-label="Syarikat"
        >
          <option value="">Semua syarikat</option>
          {senaraiSyarikat.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          className="h-9 w-full sm:w-40"
          value={sesi}
          onChange={(e) => setSesi(e.target.value)}
          aria-label="Sesi"
        >
          <option value="">Semua sesi</option>
          {senaraiSesi.map((s) => (
            <option key={s.nilai} value={s.nilai}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select
          className="h-9 w-full sm:w-48"
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          aria-label="Kategori"
        >
          <option value="">Semua kategori</option>
          {senaraiKategori.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
        {adaPenapis && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCarian("");
              setSyarikat("");
              setSesi("");
              setKategori("");
            }}
          >
            Set semula
          </Button>
        )}
      </div>

      {ralat ? (
        <AlertBanner variant="error" title="Ralat" description={ralat} />
      ) : loading ? (
        <LoadingSpinner text="Memuatkan..." />
      ) : (
        <>
          {/* Desktop: jadual padat */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risiko</TableHead>
                  <TableHead>Syarikat</TableHead>
                  <TableHead>Sesi</TableHead>
                  {tab === "rawatan" && <TableHead>Tahap</TableHead>}
                  <TableHead className="w-[110px] text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paparan.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32">
                      <Kosong />
                    </TableCell>
                  </TableRow>
                ) : (
                  paparan.map((d) => (
                    <TableRow key={d.risiko_id}>
                      <TableCell className="max-w-[420px]">
                        <SelRisiko id={d.risiko_id} noRujukan={d.no_rujukan} risiko={d.risiko} tab={tab} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{d.nama_syarikat || "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {[d.kategori, d.bahagian].filter(Boolean).join(" · ")}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {d.tahun} · {formatSeparuhTahun(d.separuh_tahun)}
                      </TableCell>
                      {tab === "rawatan" && (
                        <TableCell>
                          <LencanaTahap k={d.skor_kebarangkalian} i={d.skor_impak} />
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button size="sm" variant={boleh ? "default" : "outline"} onClick={() => buka(d)}>
                          {labelTindakan}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Telefon: kad */}
          <ul className="grid gap-3 md:hidden">
            {paparan.length === 0 ? (
              <li className="rounded-xl border bg-card p-4">
                <Kosong />
              </li>
            ) : (
              paparan.map((d) => (
                <li key={d.risiko_id} className="grid gap-2 rounded-xl border bg-card p-4 shadow-sm">
                  <SelRisiko id={d.risiko_id} noRujukan={d.no_rujukan} risiko={d.risiko} tab={tab} />
                  <p className="text-xs text-muted-foreground">
                    {[d.nama_syarikat, d.kategori, `${d.tahun} · ${formatSeparuhTahun(d.separuh_tahun)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    {tab === "rawatan" ? (
                      <LencanaTahap k={d.skor_kebarangkalian} i={d.skor_impak} />
                    ) : (
                      <span />
                    )}
                    <Button size="sm" variant={boleh ? "default" : "outline"} onClick={() => buka(d)}>
                      {labelTindakan}
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>

          <Paging halaman={halaman} jumlah={ditapis.length} onTukar={setHalaman} />
        </>
      )}
    </div>
  );
}

export default PenilaianDanRawatan;
