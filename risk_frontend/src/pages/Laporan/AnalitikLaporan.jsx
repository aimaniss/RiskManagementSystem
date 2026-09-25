import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
  SIRI_TAHAP,
  SIRI_KEBERKESANAN,
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
} from "./analitik";

const TAPISAN_ASAL = { syarikat: "all", kategori: "all", dari: "", hingga: "" };

// Atribut SVG tidak menyelesaikan var() CSS, jadi warna rangka carta ditetapkan per mod.
const RANGKA = {
  terang: { permukaan: "#ffffff", garisan: "#e2e8f0", teks: "#475569", kursor: "#f1f5f9" },
  gelap: { permukaan: "#27272a", garisan: "#3f3f46", teks: "#a1a1aa", kursor: "#3f3f46" },
};

const pendekkan = (teks, n = 22) => (teks && teks.length > n ? `${teks.slice(0, n - 1)}…` : teks);

function Legenda({ siri, garis = false }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Petunjuk">
      {siri.map((s) => (
        <li key={s.kunci} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden
            className={garis ? "h-0.5 w-4 rounded-full" : "h-3 w-3 rounded-[3px]"}
            style={{ backgroundColor: s.warna }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function KandunganTooltip({ active, payload, label, siri }) {
  if (!active || !payload?.length) return null;
  const nilai = Object.fromEntries(payload.map((p) => [p.dataKey, p.value]));
  const jumlah = siri.reduce((s, x) => s + (Number(nilai[x.kunci]) || 0), 0);
  return (
    <div className="min-w-44 rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      <ul className="grid gap-1">
        {siri
          .filter((s) => nilai[s.kunci] !== undefined)
          .map((s) => (
            <li key={s.kunci} className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.warna }} />
              <span className="flex-1 text-muted-foreground">{s.label}</span>
              <strong className="tabular-nums text-foreground">{nilai[s.kunci]}</strong>
            </li>
          ))}
      </ul>
      <p className="mt-1.5 flex justify-between border-t pt-1.5 text-muted-foreground">
        Jumlah <strong className="tabular-nums text-foreground">{jumlah}</strong>
      </p>
    </div>
  );
}

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
            <TableHead className="text-right">Jumlah</TableHead>
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
              <TableCell className="text-right font-semibold tabular-nums">
                {siri.reduce((t, s) => t + (b[s.kunci] || 0), 0)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function KadCarta({ tajuk, keterangan, siri, data, lajurNama, garis, kelas = "", children }) {
  const [jadual, setJadual] = useState(false);
  const kosong = !data.length || data.every((b) => siri.every((s) => !b[s.kunci]));
  return (
    <Card className={`rounded-xl ${kelas}`}>
      <CardContent className="grid gap-3 p-4">
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
          <>
            <Legenda siri={siri} garis={garis} />
            {children}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Statistik({ label, nilai, nota, warna }) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {warna && <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: warna }} />}
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{nilai}</p>
        {nota && <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>}
      </CardContent>
    </Card>
  );
}

export default function AnalitikLaporan() {
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
      .catch((err) => !batal && setRalat(err.response?.data?.error || "Gagal memuatkan data analitik."));
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
    return {
      stat: ringkasan(risiko, kDari, kHingga),
      profil: profilIkutTempoh(risiko, julat),
      syarikat: profilIkutSyarikat(risiko, kHingga),
      kategori: profilIkutKategori(risiko, kHingga),
      baharu: baharuIkutSyarikat(risiko, julat, data.syarikat, warna),
      keberkesanan: keberkesananIkutTempoh(risiko, julat),
    };
    // julat diterbitkan daripada kDari/kHingga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tapis, kDari, kHingga, warna]);

  const ubah = (e) => setTapis((t) => ({ ...t, [e.target.name]: e.target.value }));
  const rangka = gelap ? RANGKA.gelap : RANGKA.terang;
  const permukaan = rangka.permukaan;
  const PAKSI = { fontSize: 11, fill: rangka.teks };
  const garisPaksi = { stroke: rangka.garisan };
  const tinggi = skrinPenuh ? 360 : 280;
  const sempit = typeof window !== "undefined" && window.innerWidth < 640;
  const lebarLabel = sempit ? 110 : 180;
  const tinggiMendatar = (n) => Math.max(tinggi, n * 34 + 40);

  if (ralat) {
    return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{ralat}</div>;
  }
  if (!data) return <LoadingSpinner text="Memuatkan analitik..." />;
  if (!data.tempoh.length) {
    return (
      <EmptyState icon={BarChart3} title="Tiada data analitik" description="Belum ada risiko didaftarkan untuk dianalisis." />
    );
  }

  const bar = (siri, radius = false) =>
    siri.map((s, i) => (
      <Bar
        key={s.kunci}
        dataKey={s.kunci}
        name={s.label}
        stackId="a"
        fill={s.warna}
        stroke={permukaan}
        strokeWidth={2}
        maxBarSize={48}
        radius={radius && i === siri.length - 1 ? [4, 4, 0, 0] : 0}
      />
    ));

  const grid = <CartesianGrid stroke={rangka.garisan} strokeDasharray="0" vertical={false} />;
  const tooltip = (siri) => (
    <Tooltip cursor={{ fill: rangka.kursor }} content={<KandunganTooltip siri={siri} />} />
  );

  return (
    <div
      ref={bekas}
      data-testid="analitik-laporan"
      className={
        skrinPenuh ? "fixed inset-0 z-[60] grid content-start gap-4 overflow-auto bg-background p-4 sm:p-6" : "grid gap-4"
      }
    >
      {skrinPenuh && (
        <div>
          <h2 className="text-lg font-semibold text-foreground">Analitik Laporan Risiko</h2>
          <p className="text-xs text-muted-foreground">
            {labelTempoh(kDari)} hingga {labelTempoh(kHingga)}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
        <div className="grid min-w-44 flex-1 gap-1 sm:flex-none">
          <Label htmlFor="analitik-syarikat" className="text-xs">Syarikat</Label>
          <Select id="analitik-syarikat" name="syarikat" value={tapis.syarikat} onChange={ubah}>
            <option value="all">Semua Syarikat</option>
            {data.syarikat.map((s) => (
              <option key={s.syarikat_id} value={s.syarikat_id}>
                {s.nama_syarikat}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid min-w-44 flex-1 gap-1 sm:flex-none">
          <Label htmlFor="analitik-kategori" className="text-xs">Kategori</Label>
          <Select id="analitik-kategori" name="kategori" value={tapis.kategori} onChange={ubah}>
            <option value="all">Semua Kategori</option>
            {data.kategori.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid min-w-36 flex-1 gap-1 sm:flex-none">
          <Label htmlFor="analitik-dari" className="text-xs">Dari</Label>
          <Select id="analitik-dari" name="dari" value={String(kDari)} onChange={ubah}>
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
          <Label htmlFor="analitik-hingga" className="text-xs">Hingga</Label>
          <Select id="analitik-hingga" name="hingga" value={String(kHingga)} onChange={ubah}>
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
          label="Kadar rawatan berkesan"
          warna={SIRI_KEBERKESANAN[0].warna}
          nilai={hasil.stat.kadarBerkesan === null ? "-" : `${hasil.stat.kadarBerkesan}%`}
          nota={`Daripada ${hasil.stat.dinilai} log pemantauan dinilai`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <KadCarta
          tajuk="Perbandingan Separuh Tahun: Tahap Risiko"
          keterangan="Bilangan risiko mengikut tahap pada akhir setiap separuh tahun (skor pemantauan terkini, atau penilaian awal)."
          siri={SIRI_TAHAP}
          data={hasil.profil}
          lajurNama="Separuh Tahun"
        >
          <ResponsiveContainer width="100%" height={tinggi}>
            <BarChart data={hasil.profil} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              {grid}
              <XAxis dataKey="nama" tick={PAKSI} tickLine={false} axisLine={garisPaksi} />
              <YAxis allowDecimals={false} tick={PAKSI} tickLine={false} axisLine={false} />
              {tooltip(SIRI_TAHAP)}
              {bar(SIRI_TAHAP, true)}
            </BarChart>
          </ResponsiveContainer>
        </KadCarta>

        <KadCarta
          tajuk="Perbandingan Syarikat: Tahap Risiko"
          keterangan={`Profil tahap risiko setiap syarikat pada ${labelTempoh(kHingga)}.`}
          siri={SIRI_TAHAP}
          data={hasil.syarikat}
          lajurNama="Syarikat"
        >
          <ResponsiveContainer width="100%" height={tinggiMendatar(hasil.syarikat.length)}>
            <BarChart data={hasil.syarikat} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={rangka.garisan} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={PAKSI} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="nama"
                width={lebarLabel}
                tick={PAKSI}
                tickLine={false}
                axisLine={garisPaksi}
                tickFormatter={(v) => pendekkan(v, sempit ? 16 : 28)}
              />
              {tooltip(SIRI_TAHAP)}
              {bar(SIRI_TAHAP)}
            </BarChart>
          </ResponsiveContainer>
        </KadCarta>

        <KadCarta
          tajuk="Risiko Baharu Didaftar Mengikut Syarikat"
          keterangan="Bilangan risiko baharu setiap separuh tahun; warna kekal mengikut syarikat."
          siri={hasil.baharu.siri}
          data={hasil.baharu.baris}
          lajurNama="Separuh Tahun"
          garis
        >
          <ResponsiveContainer width="100%" height={tinggi}>
            <LineChart data={hasil.baharu.baris} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              {grid}
              <XAxis dataKey="nama" tick={PAKSI} tickLine={false} axisLine={garisPaksi} />
              <YAxis allowDecimals={false} tick={PAKSI} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: rangka.teks, strokeWidth: 1 }}
                content={<KandunganTooltip siri={hasil.baharu.siri} />}
              />
              {hasil.baharu.siri.map((s) => (
                <Line
                  key={s.kunci}
                  type="linear"
                  dataKey={s.kunci}
                  name={s.label}
                  stroke={s.warna}
                  strokeWidth={2}
                  dot={{ r: 4, fill: s.warna, stroke: permukaan, strokeWidth: 2 }}
                  activeDot={{ r: 5, stroke: permukaan, strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </KadCarta>

        <KadCarta
          tajuk="Keberkesanan Rawatan Mengikut Separuh Tahun"
          keterangan="Log pemantauan: berkesan jika tahap risiko menurun atau kekal."
          siri={SIRI_KEBERKESANAN}
          data={hasil.keberkesanan}
          lajurNama="Separuh Tahun"
        >
          <ResponsiveContainer width="100%" height={tinggi}>
            <BarChart data={hasil.keberkesanan} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              {grid}
              <XAxis dataKey="nama" tick={PAKSI} tickLine={false} axisLine={garisPaksi} />
              <YAxis allowDecimals={false} tick={PAKSI} tickLine={false} axisLine={false} />
              {tooltip(SIRI_KEBERKESANAN)}
              {bar(SIRI_KEBERKESANAN, true)}
            </BarChart>
          </ResponsiveContainer>
        </KadCarta>

        <KadCarta
          tajuk="Kategori Risiko Mengikut Tahap"
          keterangan={`Taburan kategori pada ${labelTempoh(kHingga)}.`}
          siri={SIRI_TAHAP}
          data={hasil.kategori}
          lajurNama="Kategori"
          kelas="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height={tinggiMendatar(hasil.kategori.length)}>
            <BarChart data={hasil.kategori} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={rangka.garisan} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={PAKSI} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="nama"
                width={lebarLabel}
                tick={PAKSI}
                tickLine={false}
                axisLine={garisPaksi}
                tickFormatter={(v) => pendekkan(v, sempit ? 16 : 26)}
              />
              {tooltip(SIRI_TAHAP)}
              {bar(SIRI_TAHAP)}
            </BarChart>
          </ResponsiveContainer>
        </KadCarta>
      </div>
    </div>
  );
}
