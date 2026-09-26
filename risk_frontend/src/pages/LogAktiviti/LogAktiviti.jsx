import { Fragment, useState, useEffect, useCallback } from "react";
import api from "../../api/api";
import { Search, Download, ChevronLeft, ChevronRight, ClipboardList, X } from "lucide-react";
import { formatDate } from "../../utils/formatters";
import PageHeader from "@/components/ui/page-header";
import Toast from "@/components/ui/toast";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetBody,
  SheetSection,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BarisMedan, SenaraiMedan } from "@/components/risiko/umum";
import { jenisAktiviti, labelHari, masaSahaja } from "@/constants/jenisAktiviti";
import { cn } from "@/lib/utils";

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

// Julat masa; "julat" memaparkan input tarikh tersuai
const JULAT = [
  { id: "semua", label: "Semua masa" },
  { id: "0", label: "Hari ini", hari: 0 },
  { id: "6", label: "7 hari", hari: 6 },
  { id: "29", label: "30 hari", hari: 29 },
  { id: "julat", label: "Julat tersuai" },
];

const buangKosong = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== ""));

// Ringkasan log biasanya bermula dengan nama pengguna ("Ali telah ..."),
// yang sudah dipaparkan dalam lajur Pengguna
const keterangan = (log) => {
  let teks = String(log.ringkasan || "").trim();
  const nama = log.nama_pengguna || "";
  if (nama && teks.toLowerCase().startsWith(nama.toLowerCase())) {
    teks = teks.slice(nama.length).replace(/^\s*(telah\s+)?/i, "");
    teks = teks.charAt(0).toUpperCase() + teks.slice(1);
  }
  return teks || "-";
};

// Kelompok rekod mengikut hari (data sudah tersusun terkini dahulu)
const kelompokHari = (data) => {
  const kumpulan = [];
  for (const log of data) {
    const label = labelHari(log.tarikh_masa);
    const akhir = kumpulan[kumpulan.length - 1];
    if (akhir?.label === label) akhir.item.push(log);
    else kumpulan.push({ label, item: [log] });
  }
  return kumpulan;
};

function LencanaAktiviti({ aktiviti }) {
  const { ikon: Ikon, warna } = jenisAktiviti(aktiviti);
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium", warna)}>
      <Ikon size={13} /> {aktiviti}
    </span>
  );
}

function LogAktiviti() {
  const [tapisan, setTapisan] = useState(TAPISAN_KOSONG);
  const [carianTertunda, setCarianTertunda] = useState("");
  const [julat, setJulat] = useState("semua");
  const [sorokSesi, setSorokSesi] = useState(true);
  const [halaman, setHalaman] = useState(1);
  const [had, setHad] = useState(SAIZ_HALAMAN[0]);

  const [hasil, setHasil] = useState({ data: [], jumlah: 0, jumlah_halaman: 1 });
  const [loading, setLoading] = useState(true);
  const [mengeksport, setMengeksport] = useState(false);
  const [toast, setToast] = useState(null);
  const [dipilih, setDipilih] = useState(null);

  const [senaraiJenis, setSenaraiJenis] = useState([]);
  const [senaraiPeranan, setSenaraiPeranan] = useState([]);
  const [senaraiSyarikat, setSenaraiSyarikat] = useState([]);

  // Pilihan tapisan. /roles hanya untuk pentadbir; pengguna lain tidak
  // memerlukan tapisan peranan, jadi ralat diabaikan.
  useEffect(() => {
    api
      .get("/log_aktiviti/jenis")
      .then((r) => setSenaraiJenis(r.data))
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

  // Tapisan dihantar ke API; log masuk/keluar disorok melainkan jenis itu dipilih
  const paramTapisan = useCallback(
    () => ({
      ...buangKosong(tapisan),
      ...(sorokSesi && !tapisan.aktiviti ? { sorokSesi: "true" } : {}),
    }),
    [tapisan, sorokSesi]
  );

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/log_aktiviti", { params: { ...paramTapisan(), halaman, had } });
      setHasil(res.data);
    } catch (err) {
      setToast({
        variant: "error",
        title: err.response?.data?.error || "Gagal memuatkan log aktiviti.",
      });
    } finally {
      setLoading(false);
    }
  }, [paramTapisan, halaman, had]);

  useEffect(() => {
    muat();
  }, [muat]);

  const ubahTapisan = (medan, nilai) => {
    setTapisan((f) => ({ ...f, [medan]: nilai }));
    setHalaman(1);
  };

  const pilihJulat = (id) => {
    setJulat(id);
    setHalaman(1);
    const pilihan = JULAT.find((j) => j.id === id);
    if (pilihan?.hari !== undefined) {
      const mula = new Date();
      mula.setDate(mula.getDate() - pilihan.hari);
      setTapisan((f) => ({ ...f, tarikhMula: tarikhTempatan(mula), tarikhAkhir: tarikhTempatan(new Date()) }));
    } else if (id === "semua") {
      setTapisan((f) => ({ ...f, tarikhMula: "", tarikhAkhir: "" }));
    }
  };

  const setSemula = () => {
    setTapisan(TAPISAN_KOSONG);
    setCarianTertunda("");
    setJulat("semua");
    setSorokSesi(true);
    setHalaman(1);
  };

  const adaTapisan = Object.values(tapisan).some((v) => v !== "") || !sorokSesi;

  const eksport = async () => {
    setMengeksport(true);
    try {
      const res = await api.get("/log_aktiviti/eksport", {
        params: paramTapisan(),
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
  const kumpulan = kelompokHari(hasil.data);

  return (
    <div>
      <PageHeader
        title="Log Aktiviti"
        description="Jejak audit semua tindakan pengguna. Rekod tidak boleh diubah atau dipadam."
        actions={
          <Button
            variant="outline"
            onClick={eksport}
            disabled={mengeksport || hasil.jumlah === 0}
            title="Eksport rekod mengikut tapisan semasa (maksimum 10,000 rekod)"
          >
            <Download size={16} /> {mengeksport ? "Mengeksport..." : "Eksport CSV"}
          </Button>
        }
      />

      {/* Tapisan: satu bar alat */}
      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="carian"
              type="search"
              aria-label="Carian"
              placeholder="Cari nama, ID staf atau keterangan"
              value={carianTertunda}
              onChange={(e) => setCarianTertunda(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Select
            id="aktiviti"
            aria-label="Jenis Aktiviti"
            className="h-9 w-full sm:w-52"
            value={tapisan.aktiviti}
            onChange={(e) => ubahTapisan("aktiviti", e.target.value)}
          >
            <option value="">Semua aktiviti</option>
            {senaraiJenis.map((j) => (
              <option key={j.aktiviti} value={j.aktiviti}>
                {j.aktiviti} ({j.bilangan})
              </option>
            ))}
          </Select>
          {senaraiPeranan.length > 0 && (
            <Select
              id="peranan"
              aria-label="Peranan"
              className="h-9 w-full sm:w-40"
              value={tapisan.peranan_id}
              onChange={(e) => ubahTapisan("peranan_id", e.target.value)}
            >
              <option value="">Semua peranan</option>
              {senaraiPeranan.map((r) => (
                <option key={r.peranan_id} value={r.peranan_id}>
                  {r.nama_peranan}
                </option>
              ))}
            </Select>
          )}
          {senaraiSyarikat.length > 1 && (
            <Select
              id="syarikat"
              aria-label="Syarikat"
              className="h-9 w-full sm:w-52"
              value={tapisan.syarikat_id}
              onChange={(e) => ubahTapisan("syarikat_id", e.target.value)}
            >
              <option value="">Semua syarikat</option>
              {senaraiSyarikat.map((s) => (
                <option key={s.syarikat_id} value={s.syarikat_id}>
                  {s.nama_syarikat}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-lg border bg-muted/40 p-0.5" role="group" aria-label="Julat masa">
            {JULAT.map((j) => (
              <button
                key={j.id}
                type="button"
                aria-pressed={julat === j.id}
                onClick={() => pilihJulat(j.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  julat === j.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {j.label}
              </button>
            ))}
          </div>
          {julat === "julat" && (
            <div className="flex items-center gap-1.5">
              <Input
                id="tarikhMula"
                type="date"
                aria-label="Dari"
                className="h-8 w-[150px] text-xs"
                value={tapisan.tarikhMula}
                max={tapisan.tarikhAkhir || undefined}
                onChange={(e) => ubahTapisan("tarikhMula", e.target.value)}
              />
              <span className="text-xs text-muted-foreground">hingga</span>
              <Input
                id="tarikhAkhir"
                type="date"
                aria-label="Hingga"
                className="h-8 w-[150px] text-xs"
                value={tapisan.tarikhAkhir}
                min={tapisan.tarikhMula || undefined}
                onChange={(e) => ubahTapisan("tarikhAkhir", e.target.value)}
              />
            </div>
          )}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-primary"
              checked={sorokSesi}
              disabled={Boolean(tapisan.aktiviti)}
              onChange={(e) => {
                setSorokSesi(e.target.checked);
                setHalaman(1);
              }}
            />
            Sembunyikan log masuk/keluar
          </label>
          {adaTapisan && (
            <Button variant="ghost" size="sm" className="h-8" onClick={setSemula}>
              <X size={14} /> Set semula
            </Button>
          )}
        </div>
      </div>

      {/* Senarai dikelompok ikut hari */}
      <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", loading && "opacity-60")}>
        {hasil.data.length === 0 ? (
          <div className="py-10">
            <EmptyState
              icon={ClipboardList}
              title={loading ? "Memuatkan log..." : "Tiada log dijumpai"}
              description={loading ? "" : "Tiada rekod sepadan dengan tapisan anda."}
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="hidden border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground md:table-header-group">
              <tr>
                <th className="w-28 px-4 py-2.5 font-medium">Masa</th>
                <th className="w-56 px-4 py-2.5 font-medium">Aktiviti</th>
                <th className="w-64 px-4 py-2.5 font-medium">Pengguna</th>
                <th className="px-4 py-2.5 font-medium">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {kumpulan.map((k) => (
                <Fragment key={k.label}>
                  <tr className="border-b bg-muted/30">
                    <th
                      colSpan={4}
                      scope="colgroup"
                      className="px-4 py-2 text-left text-xs font-semibold text-foreground"
                    >
                      {k.label}
                      <span className="ml-2 font-normal text-muted-foreground">{k.item.length} rekod</span>
                    </th>
                  </tr>
                  {k.item.map((log) => (
                    <tr
                      key={log.log_id}
                      onClick={() => setDipilih(log)}
                      className="grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40 md:table-row md:p-0"
                    >
                      <td className="whitespace-nowrap text-xs tabular-nums text-muted-foreground md:px-4 md:py-3 md:text-sm">
                        {masaSahaja(log.tarikh_masa)}
                      </td>
                      <td className="md:px-4 md:py-3">
                        <LencanaAktiviti aktiviti={log.aktiviti} />
                      </td>
                      <td className="col-span-2 md:px-4 md:py-3">
                        <div className="font-medium text-foreground">{log.nama_pengguna}</div>
                        <div className="text-xs text-muted-foreground">
                          {[log.staff_id, log.peranan_pengguna, log.syarikat].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td className="col-span-2 text-muted-foreground md:px-4 md:py-3">
                        <span className="line-clamp-2">{keterangan(log)}</span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {/* Paging */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <div className="text-muted-foreground">
            {hasil.jumlah > 0
              ? `${mula}–${akhir} daripada ${hasil.jumlah.toLocaleString("ms-MY")} rekod`
              : "0 rekod"}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={had}
              onChange={(e) => {
                setHad(Number(e.target.value));
                setHalaman(1);
              }}
              className="h-8 w-[140px]"
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
              aria-label="Halaman sebelum"
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
              aria-label="Halaman seterusnya"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Perincian */}
      <Sheet open={Boolean(dipilih)} onOpenChange={(buka) => !buka && setDipilih(null)}>
        <SheetContent>
          {dipilih && (
            <>
              <SheetHeader>
                <div className="mb-1">
                  <LencanaAktiviti aktiviti={dipilih.aktiviti} />
                </div>
                <SheetTitle>{keterangan(dipilih)}</SheetTitle>
                <SheetDescription>{formatDate(dipilih.tarikh_masa)}</SheetDescription>
              </SheetHeader>
              <SheetBody className="grid content-start gap-6">
                <SheetSection tajuk="Pengguna">
                  <SenaraiMedan>
                    <BarisMedan label="Nama">{dipilih.nama_pengguna}</BarisMedan>
                    <BarisMedan label="ID Staf">{dipilih.staff_id}</BarisMedan>
                    <BarisMedan label="Peranan">{dipilih.peranan_pengguna}</BarisMedan>
                    <BarisMedan label="Syarikat">{dipilih.syarikat}</BarisMedan>
                  </SenaraiMedan>
                </SheetSection>
                <SheetSection tajuk="Perincian">
                  <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground">
                    {dipilih.perincian || dipilih.ringkasan || "-"}
                  </p>
                </SheetSection>
              </SheetBody>
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
