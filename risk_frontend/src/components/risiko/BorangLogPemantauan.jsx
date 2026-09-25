import { useEffect, useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getRiskMatrix,
  TAHAP_RISIKO_ORDER,
  KEBERKESANAN_MAPPING,
  SKOR_KEBARANGKALIAN_DESC,
  SKOR_IMPAK_DESC,
} from "@/constants/riskMatrix";
import { bersihkanSenarai, keSenarai, STATUS_PEMANTAUAN } from "./data";
import { EditorSenarai, LencanaTahap } from "./umum";

const nilaiAwal = (log) => ({
  tahun_pemantauan: log?.tahun_pemantauan ?? new Date().getFullYear(),
  separuh_tahun_pemantauan: log?.separuh_tahun_pemantauan ?? (new Date().getMonth() < 6 ? 1 : 2),
  skor_kebarangkalian_selepas: log?.skor_kebarangkalian_selepas ?? "",
  skor_impak_selepas: log?.skor_impak_selepas ?? "",
  status_pemantauan: log?.status_pemantauan ?? "",
  kekerapan_pemantauan: log?.kekerapan_pemantauan ?? "",
  no_bil_kelulusan: log?.no_bil_kelulusan ?? "",
  catatan: log?.catatan ?? "",
  justifikasi_pindaan_pemantauan: log?.justifikasi_pindaan_pemantauan ?? "",
});

/**
 * Borang log pemantauan (tambah: POST /pemantauan-risiko/log, sunting: PUT
 * /pemantauan-risiko/log/:id).
 *
 * - Keberkesanan dikira automatik: "Ya" jika tahap risiko selepas tidak lebih
 *   tinggi daripada tahap rujukan sesi sebelumnya (atau penilaian awal).
 * - `terhad` (tiada `risiko:nilai`, cth. Staff): hanya status & catatan boleh
 *   diubah — medan lain dihantar semula dengan nilai asal.
 */
export default function BorangLogPemantauan({ risikoId, log, terhad, onSelesai, onBatal }) {
  const sunting = Boolean(log?.log_id);
  const [borang, setBorang] = useState(() => nilaiAwal(log));
  const [pelan, setPelan] = useState(() => {
    const s = keSenarai(log?.pelan_tindakan_log);
    return s.length ? s : [""];
  });
  const [kakitangan, setKakitangan] = useState(() => {
    const s = keSenarai(log?.kakitangan_log);
    return s.length ? s : [""];
  });
  const [tahapRujukan, setTahapRujukan] = useState(null);
  const [semakanSesi, setSemakanSesi] = useState(null); // { ok, mesej }
  const [ralat, setRalat] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  const ubah = (medan) => (e) => setBorang((b) => ({ ...b, [medan]: e.target.value }));
  const { tahun_pemantauan: tahun, separuh_tahun_pemantauan: separuh } = borang;

  // Tahap rujukan untuk keberkesanan (sesi sebelum, atau penilaian awal)
  useEffect(() => {
    let aktif = true;
    const muat = async () => {
      try {
        const { data } = await api.get(`/pemantauan-risiko/${risikoId}/tahap-rujukan`, {
          params: { tahun, separuh, exclude_log_id: log?.log_id },
        });
        if (data?.tahap_risiko_rujukan && data.tahap_risiko_rujukan !== "Tiada Data") {
          if (aktif) setTahapRujukan(data.tahap_risiko_rujukan);
          return;
        }
        const { data: info } = await api.get(`/pemantauan-risiko/${risikoId}/info`);
        const k = info?.kebarangkalian_selepas || info?.kebarangkalian_asal;
        const i = info?.impak_selepas || info?.impak_asal;
        if (aktif) setTahapRujukan(k && i ? getRiskMatrix(k, i).label : null);
      } catch {
        if (aktif) setTahapRujukan(null);
      }
    };
    if (tahun) muat();
    return () => {
      aktif = false;
    };
  }, [risikoId, tahun, separuh, log?.log_id]);

  // Log baharu: satu log untuk setiap sesi (tahun + separuh tahun)
  useEffect(() => {
    if (sunting || !tahun || !separuh) return;
    let aktif = true;
    api
      .get("/pemantauan-risiko/check-duplicate", {
        params: { risiko_id: risikoId, tahun, separuh },
      })
      .then(({ data }) => {
        if (aktif) setSemakanSesi({ ok: !data.duplicate && !data.invalid, mesej: data.message });
      })
      .catch(() => aktif && setSemakanSesi(null));
    return () => {
      aktif = false;
    };
  }, [sunting, risikoId, tahun, separuh]);

  const k = borang.skor_kebarangkalian_selepas;
  const i = borang.skor_impak_selepas;
  const tahapSelepas = k && i ? getRiskMatrix(k, i).label : null;
  const keberkesanan =
    tahapSelepas && tahapRujukan
      ? (TAHAP_RISIKO_ORDER[tahapSelepas] || 0) <= (TAHAP_RISIKO_ORDER[tahapRujukan] || 0)
        ? "Ya"
        : "Tidak"
      : null;

  const simpan = async (e) => {
    e.preventDefault();
    if (!tahun || !separuh || !borang.status_pemantauan) {
      return setRalat("Tahun, separuh tahun dan status pemantauan diperlukan.");
    }
    if ((k && !i) || (!k && i)) {
      return setRalat("Isi kedua-dua skor kebarangkalian dan impak, atau biarkan kedua-duanya kosong.");
    }
    if (!sunting && semakanSesi && !semakanSesi.ok) {
      return setRalat(semakanSesi.mesej || "Log untuk sesi ini sudah wujud.");
    }
    setRalat("");
    setMenyimpan(true);
    const payload = {
      ...borang,
      risiko_id: risikoId,
      tahun_pemantauan: parseInt(tahun, 10),
      separuh_tahun_pemantauan: parseInt(separuh, 10),
      skor_kebarangkalian_selepas: k === "" ? null : parseInt(k, 10),
      skor_impak_selepas: i === "" ? null : parseInt(i, 10),
      keberkesanan,
      // POST membaca *_list; PUT menerima *_list atau *_log — hantar *_list
      pelan_tindakan_list: bersihkanSenarai(pelan),
      kakitangan_list: bersihkanSenarai(kakitangan),
    };
    try {
      if (sunting) await api.put(`/pemantauan-risiko/log/${log.log_id}`, payload);
      else await api.post("/pemantauan-risiko/log", payload);
      onSelesai(sunting ? "Log pemantauan dikemaskini." : "Log pemantauan ditambah.");
    } catch (err) {
      setRalat(err.response?.data?.error || "Gagal menyimpan log pemantauan.");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <form onSubmit={simpan} className="flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="tahun_pemantauan">Tahun *</Label>
          <Input
            id="tahun_pemantauan"
            type="number"
            min="2000"
            max="2100"
            value={tahun}
            onChange={ubah("tahun_pemantauan")}
            disabled={sunting}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="separuh_tahun">Separuh Tahun *</Label>
          <Select id="separuh_tahun" value={separuh} onChange={ubah("separuh_tahun_pemantauan")} disabled={sunting}>
            <option value={1}>Pertama (Jan–Jun)</option>
            <option value={2}>Kedua (Jul–Dis)</option>
          </Select>
        </div>
        <div className="col-span-2 grid gap-1.5 md:col-span-1">
          <Label htmlFor="status_pemantauan">Status Pemantauan *</Label>
          <Select id="status_pemantauan" value={borang.status_pemantauan} onChange={ubah("status_pemantauan")}>
            <option value="">- Sila pilih -</option>
            {STATUS_PEMANTAUAN.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
      </div>
      {!sunting && semakanSesi && (
        <p className={`text-xs ${semakanSesi.ok ? "text-green-700" : "text-red-700"}`}>{semakanSesi.mesej}</p>
      )}

      <fieldset className="grid gap-3 rounded-lg border p-3" disabled={terhad}>
        <legend className="px-1 text-sm font-medium">Penilaian semula risiko</legend>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="skor_k_selepas">Skor Kebarangkalian</Label>
            <Select id="skor_k_selepas" value={k} onChange={ubah("skor_kebarangkalian_selepas")}>
              <option value="">- Tiada -</option>
              {SKOR_KEBARANGKALIAN_DESC.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="skor_i_selepas">Skor Impak</Label>
            <Select id="skor_i_selepas" value={i} onChange={ubah("skor_impak_selepas")}>
              <option value="">- Tiada -</option>
              {SKOR_IMPAK_DESC.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Tahap selepas:</span>
          <LencanaTahap k={k} i={i} />
          <span className="text-muted-foreground">· Rujukan: {tahapRujukan || "-"}</span>
          <span className="text-muted-foreground">
            · Keberkesanan:{" "}
            <strong className="text-foreground">
              {keberkesanan ? `${keberkesanan} (${KEBERKESANAN_MAPPING[keberkesanan]})` : "-"}
            </strong>
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="kekerapan">Kekerapan Pemantauan</Label>
            <Input
              id="kekerapan"
              value={borang.kekerapan_pemantauan}
              placeholder="cth. 3 Bulan / Tahunan"
              onChange={ubah("kekerapan_pemantauan")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="no_bil_kelulusan">No. Bil Kelulusan</Label>
            <Input id="no_bil_kelulusan" value={borang.no_bil_kelulusan} onChange={ubah("no_bil_kelulusan")} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <EditorSenarai id="pelan_log" label="Pelan Tindakan" nilai={pelan} onChange={setPelan} disabled={terhad} />
          <EditorSenarai
            id="kakitangan_log"
            label="Kakitangan Bertanggungjawab"
            nilai={kakitangan}
            onChange={setKakitangan}
            disabled={terhad}
          />
        </div>
      </fieldset>
      {terhad && (
        <p className="text-xs text-muted-foreground">
          Peranan anda hanya boleh mengemas kini status dan catatan pemantauan.
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="catatan">Catatan</Label>
        <Textarea id="catatan" rows={3} value={borang.catatan} onChange={ubah("catatan")} />
      </div>
      {sunting && (
        <div className="grid gap-1.5">
          <Label htmlFor="justifikasi_pindaan">Justifikasi Pindaan</Label>
          <Textarea
            id="justifikasi_pindaan"
            rows={2}
            value={borang.justifikasi_pindaan_pemantauan}
            onChange={ubah("justifikasi_pindaan_pemantauan")}
          />
        </div>
      )}

      {ralat && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {ralat}
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 mt-auto flex justify-end gap-2 border-t bg-background px-5 py-3 sm:-mx-6 sm:px-6">
        <Button type="button" variant="outline" onClick={onBatal} disabled={menyimpan}>
          Batal
        </Button>
        <Button type="submit" disabled={menyimpan}>
          {menyimpan ? "Menyimpan..." : sunting ? "Simpan Perubahan" : "Tambah Log"}
        </Button>
      </div>
    </form>
  );
}
