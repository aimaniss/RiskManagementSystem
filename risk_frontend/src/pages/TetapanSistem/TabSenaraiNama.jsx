import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import ConfirmModal from "@/components/ui/confirm-modal";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { LencanaStatus, ButangTindakan, BarAtas, RalatBorang } from "./komponen";
import { ralatDari } from "./ralat";

/**
 * Senarai nama ringkas yang disimpan sebagai teks dalam `risiko` (bahagian,
 * kategori). Tukar nama dikaskadkan oleh backend, jadi pengguna dimaklumkan
 * bilangan risiko yang terjejas sebelum menyimpan.
 *
 * @param {object} api - { muat(), tambah(borang), kemaskini(item, borang), status(item, aktif) }
 * @param {object} medan - { id, nama, penerangan? } nama lajur dalam rekod
 */
export default function TabSenaraiNama({ label, keterangan, api, medan, beritahu }) {
  const [senarai, setSenarai] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carian, setCarian] = useState("");

  const [borangBuka, setBorangBuka] = useState(false);
  const [disunting, setDisunting] = useState(null);
  const [borang, setBorang] = useState({ nama: "", penerangan: "" });
  const [ralatBorang, setRalatBorang] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [tukarStatus, setTukarStatus] = useState(null);

  useEffect(() => {
    api
      .muat()
      .then(setSenarai)
      .catch((err) => beritahu("error", ralatDari(err, `Gagal memuatkan ${label}.`)))
      .finally(() => setLoading(false));
  }, [api, label, beritahu]);

  const ditapis = senarai.filter((i) =>
    i[medan.nama].toLowerCase().includes(carian.toLowerCase())
  );

  const buka = (item) => {
    setDisunting(item);
    setBorang({
      nama: item ? item[medan.nama] : "",
      penerangan: item && medan.penerangan ? item[medan.penerangan] || "" : "",
    });
    setRalatBorang("");
    setBorangBuka(true);
  };

  const gabung = (baru) =>
    setSenarai((l) =>
      l.some((i) => i[medan.id] === baru[medan.id])
        ? l.map((i) => (i[medan.id] === baru[medan.id] ? { ...i, ...baru } : i))
        : [...l, baru]
    );

  const tukarNama = disunting && borang.nama.trim() !== disunting[medan.nama];

  const simpan = async () => {
    if (!borang.nama.trim()) return setRalatBorang("Nama diperlukan.");
    setMenyimpan(true);
    setRalatBorang("");
    try {
      const baru = disunting
        ? await api.kemaskini(disunting, borang)
        : await api.tambah(borang);
      gabung(baru);
      setBorangBuka(false);
      beritahu(
        "success",
        disunting ? `${label} dikemaskini.` : `${label} ditambah.`,
        baru.risiko_dikemaskini ? `${baru.risiko_dikemaskini} risiko turut dikemas kini.` : undefined
      );
    } catch (err) {
      setRalatBorang(ralatDari(err, `Gagal menyimpan ${label}.`));
    } finally {
      setMenyimpan(false);
    }
  };

  const sahkanTukarStatus = async () => {
    const item = tukarStatus;
    setTukarStatus(null);
    try {
      gabung(await api.status(item, !item.is_aktif));
      beritahu("success", item.is_aktif ? `${label} dinyahaktifkan.` : `${label} diaktifkan.`);
    } catch (err) {
      beritahu("error", ralatDari(err, "Gagal mengemaskini status."));
    }
  };

  return (
    <>
      <BarAtas
        carian={carian}
        setCarian={setCarian}
        placeholder={`Cari ${label.toLowerCase()}`}
        labelTambah={`Tambah ${label}`}
        onTambah={() => buka(null)}
        keterangan={keterangan}
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{label}</TableHead>
              {medan.penerangan && <TableHead>Penerangan</TableHead>}
              <TableHead className="text-right">Digunakan (risiko)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-center">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ditapis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={medan.penerangan ? 5 : 4} className="h-32">
                  <EmptyState
                    icon={ListChecks}
                    title={loading ? "Memuatkan..." : `Tiada ${label.toLowerCase()} dijumpai`}
                  />
                </TableCell>
              </TableRow>
            ) : (
              ditapis.map((i) => (
                <TableRow key={i[medan.id]} className={i.is_aktif ? "" : "opacity-60"}>
                  <TableCell className="font-medium">{i[medan.nama]}</TableCell>
                  {medan.penerangan && (
                    <TableCell className="max-w-[420px] text-sm text-muted-foreground">
                      <span className="line-clamp-2">{i[medan.penerangan] || "-"}</span>
                    </TableCell>
                  )}
                  <TableCell className="text-right">{i.bilangan_risiko ?? 0}</TableCell>
                  <TableCell>
                    <LencanaStatus aktif={i.is_aktif} />
                  </TableCell>
                  <TableCell className="text-center">
                    <ButangTindakan
                      aktif={i.is_aktif}
                      onSunting={() => buka(i)}
                      onTukarStatus={() => setTukarStatus(i)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={borangBuka} onOpenChange={setBorangBuka}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{disunting ? `Sunting ${label}` : `Tambah ${label}`}</DialogTitle>
            {!disunting && (
              <DialogDescription>Pilihan baharu terus tersedia dalam borang risiko.</DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="nama_rujukan">Nama *</Label>
              <Input
                id="nama_rujukan"
                value={borang.nama}
                onChange={(e) => setBorang({ ...borang, nama: e.target.value })}
              />
            </div>
            {medan.penerangan && (
              <div className="grid gap-1.5">
                <Label htmlFor="penerangan_rujukan">Penerangan</Label>
                <Textarea
                  id="penerangan_rujukan"
                  rows={3}
                  value={borang.penerangan}
                  onChange={(e) => setBorang({ ...borang, penerangan: e.target.value })}
                />
              </div>
            )}
            {tukarNama && disunting.bilangan_risiko > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Tukar nama akan mengemas kini {disunting.bilangan_risiko} risiko daripada "
                {disunting[medan.nama]}" kepada "{borang.nama.trim()}".
              </div>
            )}
            <RalatBorang mesej={ralatBorang} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBorangBuka(false)} disabled={menyimpan}>
              Batal
            </Button>
            <Button onClick={simpan} disabled={menyimpan}>
              {menyimpan ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={Boolean(tukarStatus)}
        onOpenChange={(b) => !b && setTukarStatus(null)}
        title={tukarStatus?.is_aktif ? `Nyahaktif ${label}` : `Aktifkan ${label}`}
        description={
          tukarStatus?.is_aktif
            ? `Nyahaktif "${tukarStatus?.[medan.nama]}"? Pilihan ini tidak lagi dipaparkan dalam borang baharu. ${tukarStatus?.bilangan_risiko ?? 0} risiko sedia ada kekal tidak berubah.`
            : `Aktifkan semula "${tukarStatus?.[medan.nama]}"?`
        }
        confirmText={tukarStatus?.is_aktif ? "Nyahaktif" : "Aktifkan"}
        variant={tukarStatus?.is_aktif ? "destructive" : "default"}
        icon={tukarStatus?.is_aktif ? "warning" : "info"}
        onConfirm={sahkanTukarStatus}
      />
    </>
  );
}
