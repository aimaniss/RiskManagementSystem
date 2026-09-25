import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle, ExternalLink, XCircle } from "lucide-react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { hasKebenaran } from "@/utils/auth";
import { stateLatar } from "@/hooks/useBukaRisiko";
import { formatDate, formatSeparuhTahun } from "@/utils/formatters";
import { keSenarai } from "./data";
import { Medan, SenaraiCip } from "./umum";
import KadPindaan from "./KadPindaan";

const MENUNGGU = "Menunggu Kelulusan";

function ButiranRisikoBaharu({ r }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <Medan label="Syarikat">{r.nama_syarikat || r.syarikat}</Medan>
      <Medan label="Sesi">
        {r.tahun} · {formatSeparuhTahun(r.separuh_tahun)}
      </Medan>
      <Medan label="Kategori">{r.kategori}</Medan>
      <Medan label="Bahagian / Unit">{r.bahagian}</Medan>
      <Medan label="Didaftarkan oleh">{r.didaftarkan_oleh}</Medan>
      <Medan label="Tarikh daftar">
        {r.created_at ? formatDate(r.created_at) : "-"}
      </Medan>
      <Medan label="Risiko" className="sm:col-span-2">
        <span className="whitespace-pre-wrap">{r.risiko}</span>
      </Medan>
      <Medan label="Punca" className="sm:col-span-2">
        <SenaraiCip items={keSenarai(r.punca)} />
      </Medan>
      <Medan label="Kesan" className="sm:col-span-2">
        <SenaraiCip items={keSenarai(r.kesan)} />
      </Medan>
    </dl>
  );
}

/**
 * Panel sisi untuk menyemak & meluluskan/menolak risiko baharu atau
 * permohonan pindaan. `item` = { jenis: "risiko" | "pindaan", data }.
 * Sebab penolakan wajib semasa menolak; lulus tidak memerlukan ulasan.
 */
export default function PanelKelulusan({ item, onTutup, onSelesai }) {
  const [sebab, setSebab] = useState("");
  const [ralat, setRalat] = useState("");
  const [memproses, setMemproses] = useState(false);
  const lokasi = useLocation();

  const buka = Boolean(item);
  const risikoBaharu = item?.jenis === "risiko";
  const d = item?.data || {};
  const risikoId = risikoBaharu ? d.risiko_id || d.id : d.risiko_id;
  const menunggu = risikoBaharu ? true : d.status_permohonan === MENUNGGU;
  const bolehProses =
    menunggu && hasKebenaran(risikoBaharu ? "risiko:lulus" : "pindaan:lulus");

  const tutup = () => {
    setSebab("");
    setRalat("");
    onTutup();
  };

  const proses = async (lulus) => {
    if (!lulus && !sebab.trim()) return setRalat("Sila isi sebab penolakan.");
    setRalat("");
    setMemproses(true);
    try {
      const tindakan = lulus ? "approve" : "reject";
      if (risikoBaharu) {
        await api.put(
          `/risiko/${risikoId}/${tindakan}`,
          lulus ? {} : { sebab: sebab.trim() },
        );
      } else {
        await api.put(
          `/pindaan/${d.pindaan_id}/${tindakan}`,
          lulus ? {} : { komen_pelulus: sebab.trim() },
        );
      }
      setSebab("");
      onSelesai(
        `${risikoBaharu ? "Risiko" : "Pindaan"} ${risikoBaharu ? d.no_rujukan : d.no_rujukan_pindaan || ""} ${
          lulus ? "diluluskan" : "ditolak"
        }.`,
      );
    } catch (err) {
      setRalat(
        err.response?.data?.error ||
          (lulus ? "Gagal meluluskan." : "Gagal menolak."),
      );
    } finally {
      setMemproses(false);
    }
  };

  const tajuk = risikoBaharu
    ? "Kelulusan Risiko Baru"
    : menunggu
      ? "Kelulusan Pindaan"
      : "Butiran Pindaan";

  return (
    <Sheet open={buka} onOpenChange={(b) => !b && tutup()}>
      <SheetContent className="sm:max-w-xl">
        {buka && (
          <>
            <SheetHeader>
              <SheetTitle>{tajuk}</SheetTitle>
              <SheetDescription>
                {risikoBaharu
                  ? `${d.no_rujukan} · menunggu kelulusan untuk dipantau`
                  : `Pindaan skor bagi risiko ${d.no_rujukan}`}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="grid content-start gap-5">
              <div className="grid gap-1 rounded-lg bg-muted/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {d.no_rujukan}
                  </span>
                  {risikoId && (
                    <Link
                      to={`/risiko/${risikoId}${risikoBaharu ? "" : "?tab=pindaan"}`}
                      state={stateLatar(lokasi)}
                      onClick={tutup}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Lihat butiran risiko <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
                <p className="text-sm text-foreground">{d.risiko}</p>
                {!risikoBaharu && (
                  <p className="text-xs text-muted-foreground">
                    {d.nama_syarikat}
                  </p>
                )}
              </div>

              {risikoBaharu ? (
                <ButiranRisikoBaharu r={d} />
              ) : (
                <KadPindaan p={d} bingkai={false} />
              )}

              {bolehProses && (
                <div className="grid gap-1.5">
                  <Label htmlFor="sebab-penolakan">Sebab Penolakan</Label>
                  <Textarea
                    id="sebab-penolakan"
                    rows={3}
                    value={sebab}
                    onChange={(e) => setSebab(e.target.value)}
                    placeholder="Wajib diisi jika menolak. Tidak diperlukan untuk meluluskan."
                  />
                </div>
              )}

              {ralat && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {ralat}
                </div>
              )}
            </SheetBody>

            <SheetFooter>
              <Button variant="outline" onClick={tutup} disabled={memproses}>
                Tutup
              </Button>
              {bolehProses && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => proses(false)}
                    disabled={memproses}
                  >
                    <XCircle size={15} /> Tolak
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => proses(true)}
                    disabled={memproses}
                  >
                    <CheckCircle size={15} /> Luluskan
                  </Button>
                </>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
