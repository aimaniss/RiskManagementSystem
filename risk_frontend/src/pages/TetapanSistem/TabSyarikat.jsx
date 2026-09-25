import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import api from "@/api/api";
import ConfirmModal from "@/components/ui/confirm-modal";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const BORANG_KOSONG = { nama_syarikat: "", singkatan: "", kod_warna: "#1a6bbf" };

export default function TabSyarikat({ beritahu }) {
  const [senarai, setSenarai] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carian, setCarian] = useState("");

  const [borangBuka, setBorangBuka] = useState(false);
  const [disunting, setDisunting] = useState(null);
  const [borang, setBorang] = useState(BORANG_KOSONG);
  const [ralatBorang, setRalatBorang] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [tukarStatus, setTukarStatus] = useState(null);

  useEffect(() => {
    api
      .get("/syarikat", { params: { semua: true } })
      .then((r) => setSenarai(r.data))
      .catch((err) => beritahu("error", ralatDari(err, "Gagal memuatkan senarai syarikat.")))
      .finally(() => setLoading(false));
  }, [beritahu]);

  const q = carian.toLowerCase();
  const ditapis = senarai.filter(
    (s) =>
      s.nama_syarikat.toLowerCase().includes(q) || (s.singkatan || "").toLowerCase().includes(q)
  );

  const buka = (s) => {
    setDisunting(s);
    setBorang(
      s
        ? {
            nama_syarikat: s.nama_syarikat,
            singkatan: s.singkatan || "",
            kod_warna: s.kod_warna || "#1a6bbf",
          }
        : BORANG_KOSONG
    );
    setRalatBorang("");
    setBorangBuka(true);
  };

  const gabung = (baru) =>
    setSenarai((l) =>
      l.some((s) => s.syarikat_id === baru.syarikat_id)
        ? l.map((s) => (s.syarikat_id === baru.syarikat_id ? { ...s, ...baru } : s))
        : [...l, baru]
    );

  const simpan = async () => {
    if (!borang.nama_syarikat.trim()) return setRalatBorang("Nama syarikat diperlukan.");
    setMenyimpan(true);
    setRalatBorang("");
    try {
      const res = disunting
        ? await api.put(`/syarikat/${disunting.syarikat_id}`, borang)
        : await api.post("/syarikat", borang);
      gabung(res.data);
      setBorangBuka(false);
      beritahu("success", disunting ? "Syarikat dikemaskini." : "Syarikat ditambah.");
    } catch (err) {
      setRalatBorang(ralatDari(err, "Gagal menyimpan syarikat."));
    } finally {
      setMenyimpan(false);
    }
  };

  const sahkanTukarStatus = async () => {
    const s = tukarStatus;
    setTukarStatus(null);
    try {
      const res = await api.patch(`/syarikat/${s.syarikat_id}/status`, { is_aktif: !s.is_aktif });
      gabung(res.data);
      beritahu(
        "success",
        res.data.is_aktif ? "Syarikat diaktifkan." : "Syarikat dinyahaktifkan."
      );
    } catch (err) {
      beritahu("error", ralatDari(err, "Gagal mengemaskini status syarikat."));
    }
  };

  return (
    <>
      <BarAtas
        carian={carian}
        setCarian={setCarian}
        placeholder="Cari nama atau singkatan"
        labelTambah="Tambah Syarikat"
        onTambah={() => buka(null)}
        keterangan="Syarikat tidak aktif tidak dipaparkan dalam borang baharu. Syarikat hanya boleh dinyahaktifkan selepas semua penggunanya dipindahkan atau dinyahaktifkan."
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Syarikat</TableHead>
              <TableHead>Singkatan</TableHead>
              <TableHead className="text-right">Pengguna</TableHead>
              <TableHead className="text-right">Risiko</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-center">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ditapis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32">
                  <EmptyState
                    icon={Building2}
                    title={loading ? "Memuatkan..." : "Tiada syarikat dijumpai"}
                  />
                </TableCell>
              </TableRow>
            ) : (
              ditapis.map((s) => (
                <TableRow key={s.syarikat_id} className={s.is_aktif ? "" : "opacity-60"}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border"
                        style={{ backgroundColor: s.kod_warna || "transparent" }}
                      />
                      <span className="font-medium">{s.nama_syarikat}</span>
                    </div>
                  </TableCell>
                  <TableCell>{s.singkatan || "-"}</TableCell>
                  <TableCell className="text-right">{s.bilangan_pengguna ?? 0}</TableCell>
                  <TableCell className="text-right">{s.bilangan_risiko ?? 0}</TableCell>
                  <TableCell>
                    <LencanaStatus aktif={s.is_aktif} />
                  </TableCell>
                  <TableCell className="text-center">
                    <ButangTindakan
                      aktif={s.is_aktif}
                      onSunting={() => buka(s)}
                      onTukarStatus={() => setTukarStatus(s)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={borangBuka} onOpenChange={setBorangBuka}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{disunting ? "Sunting Syarikat" : "Tambah Syarikat"}</DialogTitle>
            <DialogDescription>
              Risiko dan pengguna dirujuk melalui ID syarikat, jadi tukar nama tidak menjejaskan
              rekod sedia ada.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="nama_syarikat">Nama Syarikat *</Label>
              <Input
                id="nama_syarikat"
                value={borang.nama_syarikat}
                onChange={(e) => setBorang({ ...borang, nama_syarikat: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="singkatan">Singkatan</Label>
                <Input
                  id="singkatan"
                  maxLength={20}
                  placeholder="cth. UKMH"
                  value={borang.singkatan}
                  onChange={(e) => setBorang({ ...borang, singkatan: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="kod_warna">Warna</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="kod_warna"
                    type="color"
                    value={borang.kod_warna}
                    onChange={(e) => setBorang({ ...borang, kod_warna: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border bg-transparent"
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    {borang.kod_warna}
                  </span>
                </div>
              </div>
            </div>
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
        title={tukarStatus?.is_aktif ? "Nyahaktif syarikat" : "Aktifkan syarikat"}
        description={
          tukarStatus?.is_aktif
            ? `Nyahaktif ${tukarStatus?.nama_syarikat}? Syarikat ini tidak lagi dipaparkan dalam borang baharu. Risiko sedia ada kekal.`
            : `Aktifkan semula ${tukarStatus?.nama_syarikat}?`
        }
        confirmText={tukarStatus?.is_aktif ? "Nyahaktif" : "Aktifkan"}
        variant={tukarStatus?.is_aktif ? "destructive" : "default"}
        icon={tukarStatus?.is_aktif ? "warning" : "info"}
        onConfirm={sahkanTukarStatus}
      />
    </>
  );
}
