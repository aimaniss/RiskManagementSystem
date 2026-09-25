import { useState } from "react";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import ConfirmModal from "@/components/ui/confirm-modal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { hasKebenaran } from "@/utils/auth";
import { formatSeparuhTahun } from "@/utils/formatters";
import { KEBERKESANAN_MAPPING } from "@/constants/riskMatrix";
import BorangLogPemantauan from "@/components/risiko/BorangLogPemantauan";
import { bolehPindaTerus, keSenarai } from "@/components/risiko/data";
import { LencanaTahap, Medan, SenaraiCip } from "@/components/risiko/umum";

const WARNA_STATUS = {
  Buka: "secondary",
  "Sedang Dilaksanakan": "warning",
  Pemantauan: "outline",
  Selesai: "success",
  Tutup: "success",
};

const labelSesi = (log) =>
  `${log.tahun_pemantauan || "-"}${
    log.separuh_tahun_pemantauan ? ` · ${formatSeparuhTahun(log.separuh_tahun_pemantauan)}` : ""
  }`;

/**
 * Garis masa log pemantauan. Butiran, sunting & tambah dibuka dalam panel
 * sisi (satu lapisan sahaja — tiada modal di atas modal).
 *
 * Kebenaran (sama seperti skrin Pemantauan asal, ikut kebenaran):
 * - Tambah: `pemantauan:urus` selepas rawatan wujud.
 * - Sunting: Admin/Executive (pindaan:lulus) semua log; pemegang
 *   `pemantauan:urus` lain hanya log terkini.
 * - Padam: Admin/Executive sahaja.
 */
export default function TabPemantauan({ risiko, logs, bolehTambah, bukaTambah, onBerubah }) {
  const [panel, setPanel] = useState(bukaTambah ? { mod: "tambah" } : null); // { mod, log }
  const [padam, setPadam] = useState(null);

  const penuh = bolehPindaTerus();
  const urus = hasKebenaran("pemantauan:urus");
  const terhad = !hasKebenaran("risiko:nilai");
  const terkini = logs[0];

  const bolehSunting = (log) => penuh || (urus && log.log_id === terkini?.log_id);

  const selesai = (mesej) => {
    setPanel(null);
    onBerubah(mesej);
  };

  const sahkanPadam = async () => {
    const log = padam;
    setPadam(null);
    try {
      await api.delete(`/pemantauan-risiko/log/${log.log_id}`);
      setPanel(null);
      onBerubah("Log pemantauan dipadam.");
    } catch (err) {
      onBerubah(null, err.response?.data?.error || "Gagal memadam log pemantauan.");
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Sesi terkini", terkini ? labelSesi(terkini) : "-"],
          ["Status terkini", terkini?.status_pemantauan || "-"],
          ["Kekerapan", terkini?.kekerapan_pemantauan || "-"],
          ["Jumlah log", logs.length],
        ].map(([label, nilai]) => (
          <div key={label} className="rounded-lg border bg-muted/30 px-3 py-2">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="truncate text-sm font-semibold text-foreground">{nilai}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Garis masa pemantauan</h3>
        {bolehTambah && (
          <Button size="sm" onClick={() => setPanel({ mod: "tambah" })}>
            <Plus size={15} /> Tambah Log
          </Button>
        )}
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Tiada log pemantauan"
          description="Log pemantauan akan dipaparkan di sini selepas direkodkan."
        />
      ) : (
        <ol className="relative grid gap-2 border-l-2 border-border pl-5">
          {logs.map((log) => (
            <li key={log.log_id} className="relative">
              <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <button
                type="button"
                onClick={() => setPanel({ mod: "papar", log })}
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{labelSesi(log)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {keSenarai(log.pelan_tindakan_log).join("; ") || log.catatan || "Tiada pelan tindakan"}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <LencanaTahap
                    k={log.skor_kebarangkalian_selepas}
                    i={log.skor_impak_selepas}
                    tunjukSkor
                  />
                  {log.status_pemantauan && (
                    <Badge variant={WARNA_STATUS[log.status_pemantauan] || "outline"}>
                      {log.status_pemantauan}
                    </Badge>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <Sheet open={Boolean(panel)} onOpenChange={(buka) => !buka && setPanel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {panel?.mod === "papar" && (
            <>
              <SheetHeader>
                <SheetTitle>Log pemantauan {labelSesi(panel.log)}</SheetTitle>
                <SheetDescription>{risiko.no_rujukan}</SheetDescription>
              </SheetHeader>
              <dl className="mt-5 grid grid-cols-2 gap-4">
                <Medan label="Tahap selepas">
                  <LencanaTahap
                    k={panel.log.skor_kebarangkalian_selepas}
                    i={panel.log.skor_impak_selepas}
                    tunjukSkor
                  />
                </Medan>
                <Medan label="Status">{panel.log.status_pemantauan}</Medan>
                <Medan label="Keberkesanan">
                  {panel.log.keberkesanan
                    ? `${panel.log.keberkesanan} (${KEBERKESANAN_MAPPING[panel.log.keberkesanan] || ""})`
                    : "-"}
                </Medan>
                <Medan label="Kekerapan">{panel.log.kekerapan_pemantauan}</Medan>
                <Medan label="No. Bil Kelulusan">{panel.log.no_bil_kelulusan}</Medan>
                <Medan label="Justifikasi Pindaan">{panel.log.justifikasi_pindaan_pemantauan}</Medan>
                <Medan label="Pelan Tindakan" className="col-span-2">
                  <SenaraiCip items={keSenarai(panel.log.pelan_tindakan_log)} />
                </Medan>
                <Medan label="Kakitangan Bertanggungjawab" className="col-span-2">
                  <SenaraiCip items={keSenarai(panel.log.kakitangan_log)} />
                </Medan>
                <Medan label="Catatan" className="col-span-2">
                  <span className="whitespace-pre-wrap">{panel.log.catatan}</span>
                </Medan>
              </dl>
              <div className="mt-6 flex justify-end gap-2">
                {penuh && (
                  <Button variant="outline" className="text-destructive" onClick={() => setPadam(panel.log)}>
                    <Trash2 size={15} /> Padam
                  </Button>
                )}
                {bolehSunting(panel.log) && (
                  <Button onClick={() => setPanel({ mod: "sunting", log: panel.log })}>
                    <Pencil size={15} /> Sunting
                  </Button>
                )}
              </div>
            </>
          )}

          {(panel?.mod === "sunting" || panel?.mod === "tambah") && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>
                  {panel.mod === "tambah" ? "Tambah log pemantauan" : `Sunting log ${labelSesi(panel.log)}`}
                </SheetTitle>
                <SheetDescription>{risiko.no_rujukan}</SheetDescription>
              </SheetHeader>
              <BorangLogPemantauan
                risikoId={risiko.id}
                log={panel.mod === "sunting" ? panel.log : null}
                terhad={terhad}
                onSelesai={selesai}
                onBatal={() => setPanel(panel.mod === "sunting" ? { mod: "papar", log: panel.log } : null)}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmModal
        open={Boolean(padam)}
        onOpenChange={(b) => !b && setPadam(null)}
        title="Padam log pemantauan"
        description={padam ? `Padam log sesi ${labelSesi(padam)}? Tindakan ini tidak boleh diundur.` : ""}
        confirmText="Padam"
        variant="destructive"
        icon="destructive"
        onConfirm={sahkanPadam}
      />
    </div>
  );
}
