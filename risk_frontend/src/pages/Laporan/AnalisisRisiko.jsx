import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label as LabelCarta,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Maximize2, Minimize2, RotateCcw, Table2 } from "lucide-react";
import api from "@/api/api";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BILANGAN,
  SIRI_TAHAP,
  SIRI_KEBERKESANAN,
  TREND_AKTIF,
  TREND_TINGGI,
  labelTempoh,
  sediakanData,
  tapisRisiko,
  profilIkutTempoh,
  profilIkutSyarikat,
  profilIkutKategori,
  baharuIkutSyarikat,
  keberkesananIkutTempoh,
  ringkasan,
  warnaSyarikat,
  taburanTahap,
  trendRisiko,
  jumlahIkutKategori,
} from "./analisis";

const TAPISAN_ASAL = { syarikat: "all", kategori: "all", dari: "", hingga: "" };
const BIRU = "#2563eb";

const SIRI_TREND = [
  { kunci: TREND_AKTIF, label: TREND_AKTIF, warna: BIRU },
  { kunci: TREND_TINGGI, label: TREND_TINGGI, warna: SIRI_TAHAP[3].warna },
];
const SIRI_BILANGAN = [{ kunci: BILANGAN, label: BILANGAN, warna: BIRU }];

const pendekkan = (teks, n = 22) => (teks && teks.length > n ? `${teks.slice(0, n - 1)}…` : teks);

function JadualSiri({ data, siri, lajurNama }) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg border">
      <Table className="text-xs [&_td]:px-3 [&_td]:py-2 [&_th]:h-9 [&_th]:px-3 [&_th]:whitespace-nowrap">
        <TableHeader className="sticky top-0 bg-muted">
          <TableRow>
            <TableHead>{lajurNama}</TableHead>
            {siri.map((s) => (
              <TableHead key={s.kunci} className="text-right">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: s.warna }} />
                  {s.label}
                </span>
              </TableHead>
            ))}
            {siri.length > 1 && <TableHead className="text-right">Jumlah</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((b) => (
            <TableRow key={b.nama}>
              <TableCell className="font-medium">{b.nama}</TableCell>
              {siri.map((s) => (
                <TableCell key={s.kunci} className="text-right tabular-nums">
                  {b[s.kunci] || 0}
                </TableCell>
              ))}
              {siri.length > 1 && (
                <TableCell className="text-right font-semibold tabular-nums">
                  {siri.reduce((t, s) => t + (b[s.kunci] || 0), 0)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Kad carta dengan togol carta / jadual */
function KadCarta({ tajuk, keterangan, siri, data, lajurNama, kelas = "", children }) {
  const [jadual, setJadual] = useState(false);
  const kosong = !data.length || data.every((b) => siri.every((s) => !b[s.kunci]));
  return (
    <Card className={`rounded-xl ${kelas}`}>
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{tajuk}</h3>
            {keterangan && <p className="mt-0.5 text-xs text-muted-foreground">{keterangan}</p>}
          </div>
          <div className="flex shrink-0 rounded-md border p-0.5" role="group" aria-label={`Paparan ${tajuk}`}>
            <Button
              type="button"
              size="sm"
              variant={jadual ? "ghost" : "secondary"}
              className="h-7 px-2"
              aria-pressed={!jadual}
              title="Paparan carta"
              onClick={() => setJadual(false)}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={jadual ? "secondary" : "ghost"}
              className="h-7 px-2"
              aria-pressed={jadual}
              title="Paparan jadual"
              onClick={() => setJadual(true)}
            >
              <Table2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {kosong ? (
          <p className="py-10 text-center text-xs text-muted-foreground">Tiada data bagi tapisan ini.</p>
        ) : jadual ? (
          <JadualSiri data={data} siri={siri} lajurNama={lajurNama} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function Statistik({ label, nilai, nota, warna }) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {warna && <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: warna }} />}
          {label}
        </p>
        <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{nilai}</p>
        {nota && <p className="mt-1 text-xs text-muted-foreground">{nota}</p>}
      </CardContent>
    </Card>
  );
}

// Konfigurasi label untuk tooltip & petunjuk (kunci = dataKey)
const konfig = (siri) => Object.fromEntries(siri.map((s) => [s.kunci, { label: s.label, color: s.warna }]));

/** Teks di tengah carta donut / radial */
function TeksTengah({ nilai, keterangan }) {
  return (
    <LabelCarta
      content={({ viewBox }) => {
        if (!viewBox || !("cx" in viewBox)) return null;
        return (
          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
            <tspan x={viewBox.cx} y={viewBox.cy - 4} className="fill-foreground text-2xl font-semibold">
              {nilai}
            </tspan>
            <tspan x={viewBox.cx} y={viewBox.cy + 18} className="fill-muted-foreground text-xs">
              {keterangan}
            </tspan>
          </text>
        );
      }}
    />
  );
}

export default function AnalisisRisiko() {
  const gelap = useDarkMode();
  const bekas = useRef(null);
  const [mentah, setMentah] = useState(null);
  const [ralat, setRalat] = useState("");
  const [tapis, setTapis] = useState(TAPISAN_ASAL);
  const [skrinPenuh, setSkrinPenuh] = useState(false);

  useEffect(() => {
    let batal = false;
    api
      .get("/laporan/analitik")
      .then((res) => !batal && setMentah(res.data))
      .catch((err) => !batal && setRalat(err.response?.data?.error || "Gagal memuatkan data analisis."));
    return () => {
      batal = true;
    };
  }, []);

  useEffect(() => {
    const segerak = () => setSkrinPenuh(document.fullscreenElement === bekas.current);
    document.addEventListener("fullscreenchange", segerak);
    return () => document.removeEventListener("fullscreenchange", segerak);
  }, []);

  useEffect(() => {
    if (!skrinPenuh) return;
    const tekan = (e) => e.key === "Escape" && !document.fullscreenElement && setSkrinPenuh(false);
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, [skrinPenuh]);

  const togolSkrinPenuh = async () => {
    if (skrinPenuh) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setSkrinPenuh(false);
      return;
    }
    setSkrinPenuh(true);
    // Fullscreen API mungkin disekat (iframe/pelayar lama); tindanan CSS kekal sebagai sandaran.
    await bekas.current?.requestFullscreen?.().catch(() => {});
  };

  const data = useMemo(() => (mentah ? sediakanData(mentah) : null), [mentah]);
  const warna = useMemo(() => warnaSyarikat(data?.syarikat || [], gelap), [data, gelap]);

  const tempohAkhir = data?.tempoh.at(-1);
  const kDari = tapis.dari === "" ? Math.max(data?.tempoh[0] ?? 0, (tempohAkhir ?? 0) - 5) : Number(tapis.dari);
  const kHingga = tapis.hingga === "" ? tempohAkhir : Number(tapis.hingga);
  const julat = (data?.tempoh || []).filter((k) => k >= kDari && k <= kHingga);

  const hasil = useMemo(() => {
    if (!data || kHingga === undefined) return null;
    const risiko = tapisRisiko(data, tapis);
    const profil = profilIkutTempoh(risiko, julat);
    const kategori = profilIkutKategori(risiko, kHingga);
    return {
      stat: ringkasan(risiko, kDari, kHingga),
      profil,
      akhir: profil.at(-1),
      trend: trendRisiko(profil),
      syarikat: profilIkutSyarikat(risiko, kHingga),
      kategori,
      jumlahKategori: jumlahIkutKategori(kategori),
      baharu: baharuIkutSyarikat(risiko, julat, data.syarikat, warna),
      keberkesanan: keberkesananIkutTempoh(risiko, julat),
    };
    // julat diterbitkan daripada kDari/kHingga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tapis, kDari, kHingga, warna]);

  const ubah = (e) => setTapis((t) => ({ ...t, [e.target.name]: e.target.value }));
  const tinggi = skrinPenuh ? 360 : 280;
  const sempit = typeof window !== "undefined" && window.innerWidth < 640;
  const lebarLabel = sempit ? 110 : 170;
  const tinggiMendatar = (n) => Math.max(tinggi, n * 36 + 60);

  if (ralat) {
    return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{ralat}</div>;
  }
  if (!data) return <LoadingSpinner text="Memuatkan analisis..." />;
  if (!data.tempoh.length) {
    return (
      <EmptyState icon={BarChart3} title="Tiada data analisis" description="Belum ada risiko didaftarkan untuk dianalisis." />
    );
  }

  // Bar bertindan: bucu bulat hanya pada segmen atas / hujung
  const barTindan = (siri, mendatar = false) =>
    siri.map((s, i) => (
      <Bar
        key={s.kunci}
        dataKey={s.kunci}
        name={s.label}
        stackId="a"
        fill={s.warna}
        maxBarSize={mendatar ? 26 : 44}
        radius={i === siri.length - 1 ? (mendatar ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0}
      />
    ));

  const paksiX = <XAxis dataKey="nama" tickLine={false} axisLine={false} tickMargin={10} />;
  const paksiY = <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />;
  const grid = <CartesianGrid vertical={false} strokeDasharray="3 3" />;
  const petunjuk = <ChartLegend itemSorter={null} content={<ChartLegendContent />} />;
  const tooltipTindan = <ChartTooltip cursor={false} content={<ChartTooltipContent jumlah />} />;

  const jumlahAkhir = (hasil.akhir && SIRI_TAHAP.reduce((s, x) => s + (hasil.akhir[x.kunci] || 0), 0)) || 0;
  const kadar = hasil.stat.kadarBerkesan;

  const paksiKategori = (n) => (
    <YAxis
      type="category"
      dataKey="nama"
      width={lebarLabel}
      tickLine={false}
      axisLine={false}
      tickFormatter={(v) => pendekkan(v, sempit ? 16 : n)}
    />
  );

  return (
    <div
      ref={bekas}
      data-testid="analisis-risiko"
      className={
        skrinPenuh ? "fixed inset-0 z-[60] grid content-start gap-4 overflow-auto bg-background p-4 sm:p-6" : "grid gap-4"
      }
    >
      {skrinPenuh && (
        <div>
          <h2 className="text-lg font-semibold text-foreground">Analisis Risiko</h2>
          <p className="text-xs text-muted-foreground">
            {labelTempoh(kDari)} hingga {labelTempoh(kHingga)}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="grid min-w-44 flex-1 gap-1 sm:flex-none">
          <Label htmlFor="analisis-syarikat" className="text-xs">Syarikat</Label>
          <Select id="analisis-syarikat" name="syarikat" value={tapis.syarikat} onChange={ubah}>
            <option value="all">Semua Syarikat</option>
            {data.syarikat.map((s) => (
              <option key={s.syarikat_id} value={s.syarikat_id}>
                {s.nama_syarikat}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid min-w-44 flex-1 gap-1 sm:flex-none">
          <Label htmlFor="analisis-kategori" className="text-xs">Kategori</Label>
          <Select id="analisis-kategori" name="kategori" value={tapis.kategori} onChange={ubah}>
            <option value="all">Semua Kategori</option>
            {data.kategori.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid min-w-36 flex-1 gap-1 sm:flex-none">
          <Label htmlFor="analisis-dari" className="text-xs">Dari</Label>
          <Select id="analisis-dari" name="dari" value={String(kDari)} onChange={ubah}>
            {data.tempoh
              .filter((k) => k <= kHingga)
              .map((k) => (
                <option key={k} value={k}>
                  {labelTempoh(k)}
                </option>
              ))}
          </Select>
        </div>
        <div className="grid min-w-36 flex-1 gap-1 sm:flex-none">
          <Label htmlFor="analisis-hingga" className="text-xs">Hingga</Label>
          <Select id="analisis-hingga" name="hingga" value={String(kHingga)} onChange={ubah}>
            {data.tempoh
              .filter((k) => k >= kDari)
              .map((k) => (
                <option key={k} value={k}>
                  {labelTempoh(k)}
                </option>
              ))}
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setTapis(TAPISAN_ASAL)}>
            <RotateCcw className="h-4 w-4" /> Set Semula
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={togolSkrinPenuh}>
            {skrinPenuh ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {skrinPenuh ? "Keluar Skrin Penuh" : "Skrin Penuh"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Statistik label="Risiko aktif" nilai={hasil.stat.jumlah} nota={`Pada ${labelTempoh(kHingga)}`} />
        <Statistik
          label="Tinggi & Sangat Tinggi"
          warna={SIRI_TAHAP[3].warna}
          nilai={hasil.stat.tinggi}
          nota={
            hasil.stat.perubahanTinggi === 0
              ? "Tiada perubahan berbanding separuh tahun sebelum"
              : `${hasil.stat.perubahanTinggi > 0 ? "Naik" : "Turun"} ${Math.abs(hasil.stat.perubahanTinggi)} berbanding separuh tahun sebelum`
          }
        />
        <Statistik label="Risiko baharu didaftar" nilai={hasil.stat.baharu} nota="Dalam tempoh dipilih" />
        <Statistik
          label="Log pemantauan dinilai"
          warna={SIRI_KEBERKESANAN[0].warna}
          nilai={hasil.stat.dinilai}
          nota="Dengan keputusan keberkesanan dalam tempoh dipilih"
        />
      </div>

      {/* Donut taburan + bar bertindan setiap separuh tahun */}
      <div className="grid gap-4 xl:grid-cols-3">
        <KadCarta
          tajuk="Taburan Tahap Risiko"
          keterangan={`Pecahan risiko aktif mengikut tahap pada ${labelTempoh(kHingga)}.`}
          siri={SIRI_TAHAP}
          data={hasil.akhir ? [hasil.akhir] : []}
          lajurNama="Separuh Tahun"
        >
          <ChartContainer config={konfig(SIRI_TAHAP)} style={{ height: tinggi }}>
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={taburanTahap(hasil.akhir)}
                dataKey="nilai"
                nameKey="nama"
                innerRadius="58%"
                outerRadius="85%"
                paddingAngle={2}
                cornerRadius={4}
                strokeWidth={0}
              >
                <TeksTengah nilai={jumlahAkhir} keterangan="risiko aktif" />
              </Pie>
              <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        </KadCarta>

        <KadCarta
          tajuk="Perbandingan Separuh Tahun: Tahap Risiko"
          keterangan="Bilangan risiko mengikut tahap pada akhir setiap separuh tahun (skor pemantauan terkini, atau penilaian awal)."
          siri={SIRI_TAHAP}
          data={hasil.profil}
          lajurNama="Separuh Tahun"
          kelas="xl:col-span-2"
        >
          <ChartContainer config={konfig(SIRI_TAHAP)} style={{ height: tinggi }}>
            <BarChart data={hasil.profil} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {grid}
              {paksiX}
              {paksiY}
              {tooltipTindan}
              {petunjuk}
              {barTindan(SIRI_TAHAP)}
            </BarChart>
          </ChartContainer>
        </KadCarta>
      </div>

      {/* Kawasan trend + radial kadar berkesan */}
      <div className="grid gap-4 xl:grid-cols-3">
        <KadCarta
          tajuk="Trend Risiko Aktif"
          keterangan="Jumlah risiko aktif berbanding risiko Tinggi & Sangat Tinggi setiap separuh tahun."
          siri={SIRI_TREND}
          data={hasil.trend}
          lajurNama="Separuh Tahun"
          kelas="xl:col-span-2"
        >
          <ChartContainer config={konfig(SIRI_TREND)} style={{ height: tinggi }}>
            <AreaChart data={hasil.trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                {SIRI_TREND.map((s, i) => (
                  <linearGradient key={s.kunci} id={`isi-trend-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.warna} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={s.warna} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              {grid}
              {paksiX}
              {paksiY}
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              {petunjuk}
              {SIRI_TREND.map((s, i) => (
                <Area
                  key={s.kunci}
                  type="monotone"
                  dataKey={s.kunci}
                  name={s.label}
                  stroke={s.warna}
                  strokeWidth={2}
                  fill={`url(#isi-trend-${i})`}
                  dot={{ r: 3, fill: s.warna, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        </KadCarta>

        <KadCarta
          tajuk="Kadar Rawatan Berkesan"
          keterangan="Peratus log pemantauan yang berkesan (tahap menurun atau kekal) dalam tempoh dipilih."
          siri={SIRI_KEBERKESANAN}
          data={hasil.keberkesanan}
          lajurNama="Separuh Tahun"
        >
          {/* Label tengah ditindih sebagai HTML: label paksi radial tidak dipapar dalam Recharts 3 */}
          <div className="relative">
            <ChartContainer config={konfig(SIRI_KEBERKESANAN)} style={{ height: tinggi }}>
              <RadialBarChart
                data={[{ nama: "Berkesan", nilai: kadar ?? 0, fill: SIRI_KEBERKESANAN[0].warna }]}
                startAngle={90}
                endAngle={-270}
                innerRadius="68%"
                outerRadius="92%"
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="nilai" background cornerRadius={10} />
              </RadialBarChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tabular-nums text-foreground">
                {kadar === null ? "-" : `${kadar}%`}
              </span>
              <span className="text-xs text-muted-foreground">{hasil.stat.dinilai} log dinilai</span>
            </div>
          </div>
        </KadCarta>
      </div>

      {/* Syarikat & risiko baharu */}
      <div className="grid gap-4 xl:grid-cols-2">
        <KadCarta
          tajuk="Perbandingan Syarikat: Tahap Risiko"
          keterangan={`Profil tahap risiko setiap syarikat pada ${labelTempoh(kHingga)}.`}
          siri={SIRI_TAHAP}
          data={hasil.syarikat}
          lajurNama="Syarikat"
        >
          <ChartContainer config={konfig(SIRI_TAHAP)} style={{ height: tinggiMendatar(hasil.syarikat.length) }}>
            <BarChart data={hasil.syarikat} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              {paksiKategori(26)}
              {tooltipTindan}
              {petunjuk}
              {barTindan(SIRI_TAHAP, true)}
            </BarChart>
          </ChartContainer>
        </KadCarta>

        <KadCarta
          tajuk="Risiko Baharu Didaftar Mengikut Syarikat"
          keterangan="Bilangan risiko baharu setiap separuh tahun; warna kekal mengikut syarikat."
          siri={hasil.baharu.siri}
          data={hasil.baharu.baris}
          lajurNama="Separuh Tahun"
        >
          <ChartContainer config={konfig(hasil.baharu.siri)} style={{ height: tinggi }}>
            <LineChart data={hasil.baharu.baris} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              {grid}
              {paksiX}
              {paksiY}
              <ChartTooltip content={<ChartTooltipContent indicator="line" jumlah />} />
              {petunjuk}
              {hasil.baharu.siri.map((s) => (
                <Line
                  key={s.kunci}
                  type="monotone"
                  dataKey={s.kunci}
                  name={s.label}
                  stroke={s.warna}
                  strokeWidth={2}
                  dot={{ r: 3, fill: s.warna, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </KadCarta>
      </div>

      {/* Radar kategori & keberkesanan */}
      <div className="grid gap-4 xl:grid-cols-2">
        <KadCarta
          tajuk="Profil Kategori Risiko"
          keterangan={`Bilangan risiko aktif setiap kategori pada ${labelTempoh(kHingga)}.`}
          siri={SIRI_BILANGAN}
          data={hasil.jumlahKategori}
          lajurNama="Kategori"
        >
          <ChartContainer config={konfig(SIRI_BILANGAN)} style={{ height: tinggi }}>
            {hasil.jumlahKategori.length >= 3 ? (
              <RadarChart data={hasil.jumlahKategori} outerRadius="72%">
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <PolarGrid />
                <PolarAngleAxis dataKey="nama" tickFormatter={(v) => pendekkan(v, 16)} />
                <Radar
                  dataKey={BILANGAN}
                  name={BILANGAN}
                  stroke={BIRU}
                  fill={BIRU}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  dot={{ r: 3, fill: BIRU, fillOpacity: 1 }}
                />
              </RadarChart>
            ) : (
              // Radar memerlukan >= 3 paksi; bar digunakan bila kategori sedikit
              <BarChart data={hasil.jumlahKategori} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                {grid}
                {paksiX}
                {paksiY}
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey={BILANGAN} name={BILANGAN} fill={BIRU} radius={[4, 4, 0, 0]} maxBarSize={56} />
              </BarChart>
            )}
          </ChartContainer>
        </KadCarta>

        <KadCarta
          tajuk="Keberkesanan Rawatan Mengikut Separuh Tahun"
          keterangan="Log pemantauan: berkesan jika tahap risiko menurun atau kekal."
          siri={SIRI_KEBERKESANAN}
          data={hasil.keberkesanan}
          lajurNama="Separuh Tahun"
        >
          <ChartContainer config={konfig(SIRI_KEBERKESANAN)} style={{ height: tinggi }}>
            <BarChart data={hasil.keberkesanan} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {grid}
              {paksiX}
              {paksiY}
              <ChartTooltip cursor={false} content={<ChartTooltipContent jumlah />} />
              {petunjuk}
              {SIRI_KEBERKESANAN.map((s) => (
                <Bar key={s.kunci} dataKey={s.kunci} name={s.label} fill={s.warna} radius={[4, 4, 0, 0]} maxBarSize={32} />
              ))}
            </BarChart>
          </ChartContainer>
        </KadCarta>
      </div>

      <KadCarta
        tajuk="Kategori Risiko Mengikut Tahap"
        keterangan={`Taburan tahap dalam setiap kategori pada ${labelTempoh(kHingga)}.`}
        siri={SIRI_TAHAP}
        data={hasil.kategori}
        lajurNama="Kategori"
      >
        <ChartContainer config={konfig(SIRI_TAHAP)} style={{ height: tinggiMendatar(hasil.kategori.length) }}>
          <BarChart data={hasil.kategori} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            {paksiKategori(24)}
            {tooltipTindan}
            {petunjuk}
            {barTindan(SIRI_TAHAP, true)}
          </BarChart>
        </ChartContainer>
      </KadCarta>
    </div>
  );
}
