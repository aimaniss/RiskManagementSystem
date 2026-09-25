import { useState, useEffect, useCallback } from "react";
import api from "../../api/api";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ShieldCheck,
  X,
} from "lucide-react";
import { formatDate } from "../../utils/formatters";
import PageHeader from "@/components/ui/page-header";
import Toast from "@/components/ui/toast";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const SAIZ_HALAMAN = [25, 50, 100];

const TAPISAN_KOSONG = {
  carian: "",
  tarikhMula: "",
  tarikhAkhir: "",
  aktiviti: "",
  peranan_id: "",
  syarikat_id: "",
};

// Tarikh tempatan YYYY-MM-DD (bukan UTC) untuk input type="date"
const tarikhTempatan = (tarikh) => {
  const t = new Date(tarikh);
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
  return t.toISOString().slice(0, 10);
};

const JULAT_PANTAS = [
  { label: "Hari ini", hari: 0 },
  { label: "7 hari", hari: 6 },
  { label: "30 hari", hari: 29 },
];

// Warna lencana ikut sifat tindakan (bukan senarai tetap, kerana jenis
// aktiviti datang terus dari log)
const varianAktiviti = (aktiviti = "") => {
  const a = aktiviti.toLowerCase();
  if (/padam|tolak|nyahaktif|dikunci|gagal/.test(a)) return "destructive";
  if (/lulus|tambah|daftar|aktifkan/.test(a)) return "success";
  if (/kemaskini|tukar|reset|pinda|tetapan/.test(a)) return "warning";
  if (/log masuk|log keluar/.test(a)) return "secondary";
  return "outline";
};

const buangKosong = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== ""));

function LogAktiviti() {
  const [tapisan, setTapisan] = useState(TAPISAN_KOSONG);
  const [carianTertunda, setCarianTertunda] = useState("");
  const [halaman, setHalaman] = useState(1);
  const [had, setHad] = useState(SAIZ_HALAMAN[0]);

  const [hasil, setHasil] = useState({ data: [], jumlah: 0, jumlah_halaman: 1 });
  const [loading, setLoading] = useState(true);
  const [mengeksport, setMengeksport] = useState(false);
  const [toast, setToast] = useState(null);
  const [dipilih, setDipilih] = useState(null);

  const [jenisAktiviti, setJenisAktiviti] = useState([]);
  const [senaraiPeranan, setSenaraiPeranan] = useState([]);
  const [senaraiSyarikat, setSenaraiSyarikat] = useState([]);

  // Pilihan tapisan. /roles hanya untuk pentadbir; pengguna lain tidak
  // memerlukan tapisan peranan, jadi ralat diabaikan.
  useEffect(() => {
    api
      .get("/log_aktiviti/jenis")
      .then((r) => setJenisAktiviti(r.data))
      .catch(() => {});
    api
      .get("/roles")
      .then((r) => setSenaraiPeranan(r.data))
      .catch(() => {});
    api
      .get("/syarikat", { params: { semua: true } })
      .then((r) => setSenaraiSyarikat(r.data))
      .catch(() => {});
  }, []);

  // Carian ditangguhkan supaya tidak memanggil API setiap ketukan kekunci
  useEffect(() => {
    const t = setTimeout(() => {
      setTapisan((f) => (f.carian === carianTertunda ? f : { ...f, carian: carianTertunda }));
      setHalaman(1);
    }, 400);
    return () => clearTimeout(t);
  }, [carianTertunda]);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/log_aktiviti", {
        params: { ...buangKosong(tapisan), halaman, had },
      });
      setHasil(res.data);
    } catch (err) {
      setToast({
        variant: "error",
        title: err.response?.data?.error || "Gagal memuatkan log aktiviti.",
      });
    } finally {
      setLoading(false);
    }
  }, [tapisan, halaman, had]);

  useEffect(() => {
    muat();
  }, [muat]);

  const ubahTapisan = (medan, nilai) => {
    setTapisan((f) => ({ ...f, [medan]: nilai }));
    setHalaman(1);
  };

  const julatPantas = (hari) => {
    const hariIni = new Date();
    const mula = new Date();
    mula.setDate(hariIni.getDate() - hari);
    setTapisan((f) => ({ ...f, tarikhMula: tarikhTempatan(mula), tarikhAkhir: tarikhTempatan(hariIni) }));
    setHalaman(1);
  };

  const setSemula = () => {
    setTapisan(TAPISAN_KOSONG);
    setCarianTertunda("");
    setHalaman(1);
  };

  const adaTapisan = Object.values(tapisan).some((v) => v !== "");

  const eksport = async () => {
    setMengeksport(true);
    try {
      const res = await api.get("/log_aktiviti/eksport", {
        params: buangKosong(tapisan),
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const pautan = document.createElement("a");
      pautan.href = url;
      pautan.download = `log-aktiviti-${tarikhTempatan(new Date())}.csv`;
      pautan.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Respons ralat blob perlu dibaca sebagai teks untuk mendapatkan mesej
      let mesej = "Gagal mengeksport log aktiviti.";
      try {
        mesej = JSON.parse(await err.response.data.text()).error || mesej;
      } catch {
        // kekalkan mesej lalai
      }
      setToast({ variant: "error", title: mesej });
    } finally {
      setMengeksport(false);
    }
  };

  const mula = hasil.jumlah === 0 ? 0 : (halaman - 1) * had + 1;
  const akhir = Math.min(halaman * had, hasil.jumlah);

  return (
    <div>
      <PageHeader
        title="Log Aktiviti"
        description="Jejak audit semua tindakan pengguna dalam sistem"
        actions={
          <Button variant="outline" onClick={eksport} disabled={mengeksport || hasil.jumlah === 0}>
            <Download size={16} /> {mengeksport ? "Mengeksport..." : "Eksport CSV"}
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        Log aktiviti ialah jejak audit dan tidak boleh diubah atau dipadam. Eksport CSV mengikut
        tapisan semasa (maksimum 10,000 rekod).
      </div>

      {/* Tapisan */}
      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-1.5 md:col-span-2">
          <Label htmlFor="carian">Carian</Label>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="carian"
              placeholder="Nama, ID Staf, ringkasan atau perincian"
              value={carianTertunda}
              onChange={(e) => setCarianTertunda(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="tarikhMula">Dari</Label>
          <Input
            id="tarikhMula"
            type="date"
            value={tapisan.tarikhMula}
            max={tapisan.tarikhAkhir || undefined}
            onChange={(e) => ubahTapisan("tarikhMula", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tarikhAkhir">Hingga</Label>
          <Input
            id="tarikhAkhir"
            type="date"
            value={tapisan.tarikhAkhir}
            min={tapisan.tarikhMula || undefined}
            onChange={(e) => ubahTapisan("tarikhAkhir", e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="aktiviti">Jenis Aktiviti</Label>
          <Select
            id="aktiviti"
            value={tapisan.aktiviti}
            onChange={(e) => ubahTapisan("aktiviti", e.target.value)}
          >
            <option value="">Semua Aktiviti</option>
            {jenisAktiviti.map((j) => (
              <option key={j.aktiviti} value={j.aktiviti}>
                {j.aktiviti} ({j.bilangan})
              </option>
            ))}
          </Select>
        </div>

        {senaraiPeranan.length > 0 && (
          <div className="grid gap-1.5">
            <Label htmlFor="peranan">Peranan</Label>
            <Select
              id="peranan"
              value={tapisan.peranan_id}
              onChange={(e) => ubahTapisan("peranan_id", e.target.value)}
            >
              <option value="">Semua Peranan</option>
              {senaraiPeranan.map((r) => (
                <option key={r.peranan_id} value={r.peranan_id}>
                  {r.nama_peranan}
                </option>
              ))}
            </Select>
          </div>
        )}

        {senaraiSyarikat.length > 1 && (
          <div className="grid gap-1.5">
            <Label htmlFor="syarikat">Syarikat</Label>
            <Select
              id="syarikat"
              value={tapisan.syarikat_id}
              onChange={(e) => ubahTapisan("syarikat_id", e.target.value)}
            >
              <option value="">Semua Syarikat</option>
              {senaraiSyarikat.map((s) => (
                <option key={s.syarikat_id} value={s.syarikat_id}>
                  {s.nama_syarikat}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-2">
          {JULAT_PANTAS.map((j) => (
            <Button key={j.label} variant="outline" size="sm" onClick={() => julatPantas(j.hari)}>
              {j.label}
            </Button>
          ))}
          {adaTapisan && (
            <Button variant="ghost" size="sm" onClick={setSemula}>
              <X size={14} /> Set semula
            </Button>
          )}
        </div>
      </div>

      {/* Jadual */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[170px]">Tarikh & Masa</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Aktiviti</TableHead>
              <TableHead>Ringkasan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasil.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32">
                  <EmptyState
                    icon={ClipboardList}
                    title={loading ? "Memuatkan log..." : "Tiada log dijumpai"}
                    description={loading ? "" : "Tiada rekod sepadan dengan tapisan anda."}
                  />
                </TableCell>
              </TableRow>
            ) : (
              hasil.data.map((log) => (
                <TableRow
                  key={log.log_id}
                  className={`cursor-pointer ${loading ? "opacity-50" : ""}`}
                  onClick={() => setDipilih(log)}
                >
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(log.tarikh_masa)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{log.nama_pengguna}</div>
                    <div className="text-xs text-muted-foreground">
                      {log.staff_id} · {log.peranan_pengguna}
                      {log.syarikat ? ` · ${log.syarikat}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={varianAktiviti(log.aktiviti)} className="whitespace-nowrap">
                      {log.aktiviti}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[420px] text-sm">
                    <span className="line-clamp-2">{log.ringkasan}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Paging */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <div className="text-muted-foreground">
            {hasil.jumlah > 0
              ? `Memaparkan ${mula}–${akhir} daripada ${hasil.jumlah.toLocaleString("ms-MY")} rekod`
              : "0 rekod"}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={had}
              onChange={(e) => {
                setHad(Number(e.target.value));
                setHalaman(1);
              }}
              className="h-8 w-[110px]"
              aria-label="Rekod setiap halaman"
            >
              {SAIZ_HALAMAN.map((n) => (
                <option key={n} value={n}>
                  {n} / halaman
                </option>
              ))}
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setHalaman((h) => h - 1)}
              disabled={halaman <= 1 || loading}
              title="Halaman sebelum"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="whitespace-nowrap text-muted-foreground">
              {halaman} / {hasil.jumlah_halaman}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setHalaman((h) => h + 1)}
              disabled={halaman >= hasil.jumlah_halaman || loading}
              title="Halaman seterusnya"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Perincian */}
      <Sheet open={Boolean(dipilih)} onOpenChange={(buka) => !buka && setDipilih(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {dipilih && (
            <>
              <SheetHeader>
                <SheetTitle>{dipilih.aktiviti}</SheetTitle>
                <SheetDescription>{formatDate(dipilih.tarikh_masa)}</SheetDescription>
              </SheetHeader>
              <dl className="mt-6 grid gap-4 text-sm">
                {[
                  ["Pengguna", `${dipilih.nama_pengguna} (${dipilih.staff_id})`],
                  ["Peranan", dipilih.peranan_pengguna],
                  ["Syarikat", dipilih.syarikat || "-"],
                  ["Ringkasan", dipilih.ringkasan],
                ].map(([label, nilai]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium text-foreground">{nilai}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-xs text-muted-foreground">Perincian</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-foreground">
                    {dipilih.perincian || "-"}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>

      {toast && (
        <div className="fixed right-4 top-[64px] z-50 w-[320px]">
          <Toast variant={toast.variant} title={toast.title} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}

export default LogAktiviti;
