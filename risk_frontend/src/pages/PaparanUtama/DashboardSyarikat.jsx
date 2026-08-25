import React from "react";
import {
  File,
  RefreshCw,
  Eye,
  Check,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import TahapRisikoChart from "./TahapRisikoChart";
import KategoriRisikoChart from "./KategoriRisikoChart";
import JenisKawalanChart from "./JenisKawalanChart";
import LogoLight from "../../assets/images/Light Background/UKMH_light.png";
import LogoDark from "../../assets/images/Dark Background/UKMH_dark.png";
import { useDarkMode } from "../../hooks/useDarkMode";

const RISK_COLORS = {
  "Sangat Tinggi": "#ef4444",
  "Tinggi": "#f97316",
  "Sederhana": "#eab308",
  "Rendah": "#22c55e",
};

function useChartColors() {
  const isDark = useDarkMode();
  return {
    grid: isDark ? "#3f3f46" : "#e2e8f0",
    tick: isDark ? "#a1a1aa" : "#64748b",
    bar: isDark ? "#60a5fa" : "#2563eb",
    barTutup: isDark ? "#52525b" : "#cbd5e1",
    cursorFill: isDark ? "rgba(96, 165, 250, 0.08)" : "rgba(37, 99, 235, 0.05)",
  };
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--color-foreground)",
};

const renderTahapBadge = (label) => {
  if (!label || label === "Belum Dinilai") {
    return <span className="text-sm italic text-muted-foreground">Belum Dinilai</span>;
  }
  return (
    <Badge
      className="border-transparent text-white"
      style={{ backgroundColor: RISK_COLORS[label] || "#94a3b8" }}
    >
      {label}
    </Badge>
  );
};

function TrendPendaftaranChart({ data, colors }) {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length < 1) {
    return (
      <EmptyState
        title="Tiada trend untuk dipaparkan"
        description="Belum ada rekod pendaftaran risiko."
        className="border-0"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={safeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: colors.tick }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: colors.tick }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: colors.cursorFill }}
          contentStyle={TOOLTIP_STYLE}
        />
        <Bar
          dataKey="value"
          name="Bilangan risiko"
          fill={colors.bar}
          radius={[6, 6, 0, 0]}
          barSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DashboardSyarikat({ data }) {
  const isDark = useDarkMode();
  const chartColors = useChartColors();
  const skorCards = [
    { label: "Jumlah Risiko Buka", value: data?.skor?.jumlahBuka || 0, icon: File },
    { label: "Sedang Dilaksanakan", value: data?.skor?.jumlahLaksana || 0, icon: RefreshCw },
    { label: "Jumlah Risiko Pemantauan", value: data?.skor?.jumlahPantau || 0, icon: Eye },
    { label: "Jumlah Risiko Selesai", value: data?.skor?.jumlahSelesai || 0, icon: Check },
    { label: "Jumlah Risiko Tutup", value: data?.skor?.jumlahTutup || 0, icon: CheckCircle2 },
  ];

  const risikoPerhatian = data?.risikoPerhatian || 0;
  const belumDinilaiAktif = data?.belumDinilaiAktif || 0;
  const adaPerhatian = risikoPerhatian > 0 || belumDinilaiAktif > 0;

  const topRisksData = data?.topRisks || [];

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-14 w-32 shrink-0 items-center justify-center rounded-lg border bg-muted px-2">
            <img
              src={data?.logoUrl || (isDark ? LogoDark : LogoLight)}
              alt={data?.namaSyarikat || "Syarikat"}
              className="max-h-full w-auto object-contain"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              {data?.namaSyarikat || "Paparan Syarikat"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Paparan risiko syarikat subsidiari
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {skorCards.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <Card key={index} className="rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-2xl font-bold leading-tight tabular-nums">
                    {item.value}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {item.label}
                  </div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <IconComponent size={16} className="text-primary" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {adaPerhatian && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm">
          <AlertTriangle size={16} className="shrink-0 text-primary" />
          <span className="text-foreground">
            <b>{risikoPerhatian}</b> risiko aktif berstatus Tinggi/Sangat Tinggi
            memerlukan perhatian
            {belumDinilaiAktif > 0 && (
              <>
                <span className="mx-2 text-primary">&bull;</span>
                {belumDinilaiAktif} risiko aktif belum dinilai
              </>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold">Tahap Risiko</CardTitle>
            <CardDescription>Agihan risiko mengikut tahap</CardDescription>
          </CardHeader>
          <CardContent>
            <TahapRisikoChart data={data?.tahapRisikoData} />
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold">Kategori Risiko</CardTitle>
            <CardDescription>Sebaran mengikut kategori risiko</CardDescription>
          </CardHeader>
          <CardContent>
            <KategoriRisikoChart data={data?.kategoriRisikoData} />
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold">Jenis Kawalan</CardTitle>
            <CardDescription>Rawatan risiko mengikut jenis kawalan</CardDescription>
          </CardHeader>
          <CardContent>
            <JenisKawalanChart data={data?.jenisKawalanData} />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">
            Trend Pendaftaran Risiko
          </CardTitle>
          <CardDescription>Bilangan risiko didaftarkan mengikut tahun</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendPendaftaranChart data={data?.trendData} colors={chartColors} />
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Risiko Teratas</CardTitle>
          <CardDescription>Enam risiko mengikut tahap kepentingan</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto pb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No Rujukan</TableHead>
                  <TableHead>Nama Risiko</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Bahagian/Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tahap Terkini</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRisksData.length > 0 ? (
                  topRisksData.map((risk, index) => (
                    <TableRow key={index}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {risk.noRujukan || "-"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate" title={risk.nama}>
                        {risk.nama || "-"}
                      </TableCell>
                      <TableCell>{risk.kategori || "-"}</TableCell>
                      <TableCell>{risk.bahagian || "-"}</TableCell>
                      <TableCell>
                        {risk.status_pemantauan === "Tutup" ? (
                          <Badge variant="success">{risk.status_pemantauan}</Badge>
                        ) : (
                          <Badge variant="secondary">
                            {risk.status_pemantauan || "-"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{renderTahapBadge(risk.skor_risiko_terkini)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="p-4">
                      <EmptyState title="Tiada risiko" className="border-0" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
