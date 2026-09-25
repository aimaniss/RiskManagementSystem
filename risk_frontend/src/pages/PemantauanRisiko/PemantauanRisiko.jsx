import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
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
import { getRiskMatrix } from "@/constants/riskMatrix";
import { useBukaRisiko, useRisikoBerubah } from "@/hooks/useBukaRisiko";
import { formatSeparuhTahun } from "@/utils/formatters";
import { LencanaTahap } from "@/components/risiko/umum";
import { KotakCarian, Paging, SelRisiko, TabBerkiraan } from "@/components/risiko/senarai";
import AliranKerjaRisiko from "@/components/risiko/AliranKerjaRisiko";
import { SAIZ_HALAMAN, peringkatAliran, pilihanSesi } from "@/components/risiko/data";

// Warna lembut supaya status tidak mengatasi tahap risiko dalam jadual
const WARNA_STATUS = {
  Buka: "border bg-background text-foreground",
  "Sedang Dilaksanakan": "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  Pemantauan: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Selesai: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Tutup: "bg-muted text-muted-foreground",
  Tertunggak: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

// Tab senarai: peringkat aliran (langkah 3 & 4) serta pintasan tertunggak
const KUMPULAN = [
  {
    id: "aktif",
    label: "Dalam Pemantauan",
    huraian: "Risiko yang telah dinilai dan dirawat; rekod log setiap separuh tahun.",
    padan: (d) => peringkatAliran(d) === "pemantauan",
  },
  {
    id: "tertunggak",
    label: "Tertunggak",
    huraian: "Pemantauan yang melepasi tempoh dan perlu tindakan segera.",
    padan: (d) => d.status_pemantauan_terkini === "Tertunggak",
    penting: true,
  },
  {
    id: "selesai",
    label: "Selesai / Tutup",
    huraian: "Risiko yang tidak lagi dipantau.",
    padan: (d) => peringkatAliran(d) === "selesai",
  },
  {
    id: "semua",
    label: "Semua",
    huraian: "Semua risiko yang diluluskan, termasuk yang belum dinilai atau dirawat.",
    padan: () => true,
  },
];

const TAHAP = ["Rendah", "Sederhana", "Tinggi", "Sangat Tinggi"];
const pangkat = (k, i) => TAHAP.indexOf(getRiskMatrix(k, i).label);

/** Tahap awal (penilaian) vs terkini (log pemantauan) */
function kiraTahap(d) {
  const awal = [d.skor_kebarangkalian_awal, d.skor_impak_awal];
  const adaTerkini = d.skor_kebarangkalian_terkini && d.skor_impak_terkini;
  const terkini = adaTerkini ? [d.skor_kebarangkalian_terkini, d.skor_impak_terkini] : awal;
  const beza = adaTerkini ? pangkat(...terkini) - pangkat(...awal) : 0;
  return { awal, terkini, adaTerkini, beza, label: getRiskMatrix(...terkini).label };
}

function Trend({ beza, ada }) {
  if (!ada) return <span className="text-xs text-muted-foreground">Tiada skor terkini</span>;
  if (beza < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600">
        <ArrowDownRight size={13} /> Menurun
      </span>
    );
  if (beza > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-red-600">
        <ArrowUpRight size={13} /> Meningkat
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus size={13} /> Kekal
    </span>
  );
}

function Tahap({ t }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {t.adaTerkini && (
        <>
          <LencanaTahap k={t.awal[0]} i={t.awal[1]} className="opacity-70" />
          <ArrowRight size={12} className="text-muted-foreground" />
        </>
      )}
      <LencanaTahap k={t.terkini[0]} i={t.terkini[1]} />
    </div>
  );
}

function Status({ d }) {
  return (
    <div className="grid justify-items-start gap-0.5">
      <span
        className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${
          WARNA_STATUS[d.status_pemantauan_terkini] || WARNA_STATUS.Buka
        }`}
      >
        {d.status_pemantauan_terkini || "Buka"}
      </span>
      {!d.ada_rawatan && <span className="text-[11px] text-muted-foreground">Belum dirawat</span>}
    </div>
  );
}

const sesiPantau = (d) =>
  d.tahun_pemantauan
    ? `${d.tahun_pemantauan} · ${formatSeparuhTahun(d.separuh_tahun_pemantauan)}`
    : "-";

/**
 * Senarai kerja pemantauan: status & tahap terkini setiap risiko yang
 * diluluskan. Log pemantauan diurus dalam tab Pemantauan halaman butiran.
 */
function PemantauanRisiko() {
  const bukaRisiko = useBukaRisiko();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ralat, setRalat] = useState(null);
  const [params, setParams] = useSearchParams();
  const kumpulan = KUMPULAN.some((k) => k.id === params.get("kumpulan"))
    ? params.get("kumpulan")
    : "aktif";
  const setKumpulan = (id) => setParams({ kumpulan: id }, { replace: true });
  const [carian, setCarian] = useState("");
  const [syarikat, setSyarikat] = useState("");
  const [sesi, setSesi] = useState("");
  const [kategori, setKategori] = useState("");
  const [tahap, setTahap] = useState("");
  const [halaman, setHalaman] = useState(1);

  const muat = () =>
    api
      .get("/pemantauan-risiko")
      .then(({ data: d }) =>
        setData((Array.isArray(d) ? d : []).map((r) => ({ ...r, tahap: kiraTahap(r) })))
      )
      .catch((err) => setRalat(err.response?.data?.error || "Gagal memuatkan data pemantauan."))
      .finally(() => setLoading(false));

  useEffect(() => {
    muat();
  }, []);
  useRisikoBerubah(muat);

  const senaraiSyarikat = useMemo(
    () => [...new Set(data.map((d) => d.nama_syarikat).filter(Boolean))].sort(),
    [data]
  );
  const senaraiKategori = useMemo(
    () => [...new Set(data.map((d) => d.kategori_risiko).filter(Boolean))].sort(),
    [data]
  );
  const senaraiSesi = useMemo(() => pilihanSesi(data, (d) => [d.tahun, d.separuh_tahun]), [data]);

  // Penapis selain kumpulan status; kiraan tab ikut penapis ini
  const asas = useMemo(() => {
    const q = carian.trim().toLowerCase();
    return data.filter(
      (d) =>
        (!q || `${d.no_rujukan} ${d.risiko} ${d.nama_syarikat}`.toLowerCase().includes(q)) &&
        (!syarikat || d.nama_syarikat === syarikat) &&
        (!kategori || d.kategori_risiko === kategori) &&
        (!sesi || `${d.tahun}-${d.separuh_tahun || ""}` === sesi) &&
        (!tahap || d.tahap.label === tahap)
    );
  }, [data, carian, syarikat, kategori, sesi, tahap]);

  const tabs = KUMPULAN.map((k) => ({
    ...k,
    kiraan: asas.filter(k.padan).length,
  }));
  const semasa = KUMPULAN.find((k) => k.id === kumpulan);
  const ditapis = asas.filter(semasa.padan);

  useEffect(() => setHalaman(1), [kumpulan, carian, syarikat, kategori, sesi, tahap]);
  const paparan = ditapis.slice((halaman - 1) * SAIZ_HALAMAN, halaman * SAIZ_HALAMAN);
  const adaPenapis = carian || syarikat || kategori || sesi || tahap;
  const buka = (d) => bukaRisiko(d.id, "?tab=pemantauan");

  const Kosong = () => (
    <EmptyState
      icon={Activity}
      title={adaPenapis ? "Tiada risiko sepadan dengan penapis" : "Tiada risiko dalam kumpulan ini"}
    />
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pemantauan Risiko"
        description="Langkah 3 dan 4 aliran kerja: pantau risiko yang telah dirawat sehingga selesai."
      />

      <AliranKerjaRisiko
        aktif={{ aktif: "pemantauan", selesai: "selesai" }[kumpulan]}
        data={loading ? null : data}
        onPilih={(id) => {
          if (id === "pemantauan") setKumpulan("aktif");
          else if (id === "selesai") setKumpulan("selesai");
          else return false;
          return true;
        }}
      />

      <TabBerkiraan tabs={tabs} tab={kumpulan} onTukar={setKumpulan} />
      <p className="-mt-2 text-sm text-muted-foreground">{semasa.huraian}</p>

      <div className="flex flex-wrap items-center gap-2">
        <KotakCarian
          nilai={carian}
          onUbah={setCarian}
          placeholder="Cari no. rujukan, risiko atau syarikat"
        />
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
          aria-label="Sesi daftar"
        >
          <option value="">Semua sesi</option>
          {senaraiSesi.map((s) => (
            <option key={s.nilai} value={s.nilai}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select
          className="h-9 w-full sm:w-40"
          value={tahap}
          onChange={(e) => setTahap(e.target.value)}
          aria-label="Tahap terkini"
        >
          <option value="">Semua tahap</option>
          {[...TAHAP].reverse().map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value="Tiada Data">Belum dinilai</option>
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
              setTahap("");
            }}
          >
            Set semula
          </Button>
        )}
      </div>

      {ralat ? (
        <AlertBanner variant="error" title="Ralat" description={ralat} />
      ) : loading ? (
        <LoadingSpinner text="Memuatkan data pemantauan..." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risiko</TableHead>
                  <TableHead>Syarikat</TableHead>
                  <TableHead>Pemantauan terkini</TableHead>
                  <TableHead>Tahap (awal → terkini)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[90px] text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paparan.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32">
                      <Kosong />
                    </TableCell>
                  </TableRow>
                ) : (
                  paparan.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="max-w-[360px]">
                        <SelRisiko id={d.id} noRujukan={d.no_rujukan} risiko={d.risiko} tab="pemantauan" />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{d.nama_syarikat || "-"}</div>
                        <div className="text-xs text-muted-foreground">{d.kategori_risiko || ""}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{sesiPantau(d)}</TableCell>
                      <TableCell>
                        <div className="grid gap-1">
                          <Tahap t={d.tahap} />
                          <Trend beza={d.tahap.beza} ada={d.tahap.adaTerkini} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Status d={d} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => buka(d)}>
                          Buka
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <ul className="grid gap-3 md:hidden">
            {paparan.length === 0 ? (
              <li className="rounded-xl border bg-card p-4">
                <Kosong />
              </li>
            ) : (
              paparan.map((d) => (
                <li key={d.id} className="grid gap-2 rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <SelRisiko id={d.id} noRujukan={d.no_rujukan} risiko={d.risiko} tab="pemantauan" />
                    <Status d={d} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[d.nama_syarikat, `Dipantau: ${sesiPantau(d)}`].filter(Boolean).join(" · ")}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="grid gap-1">
                      <Tahap t={d.tahap} />
                      <Trend beza={d.tahap.beza} ada={d.tahap.adaTerkini} />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => buka(d)}>
                      Buka
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

export default PemantauanRisiko;
