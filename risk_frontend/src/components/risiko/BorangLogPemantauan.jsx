import { useEffect, useState } from "react";
import api from "../../api/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import AlertBanner from "@/components/ui/alert-banner";
import {
  SKOR_KEBARANGKALIAN_DESC,
  SKOR_IMPAK_DESC,
  TAHAP_RISIKO_ORDER,
  KEBERKESANAN_MAPPING,
  getRiskMatrix,
} from "../../constants/riskMatrix";
import SenaraiInput from "./SenaraiInput";
import { ButangBorang, LencanaTahap } from "./paparan";
import { STATUS_PEMANTAUAN, bersihkanSenarai, denganNilaiSemasa, mesejRalat } from "./pilihan";

const teksItem = (item, kunci) => (typeof item === "string" ? item : item?.[kunci] || "");

// Log pemantauan — POST /pemantauan-risiko/log atau PUT /pemantauan-risiko/log/:log_id.
// `kunciSkor`: Staff tidak boleh mengubah skor/tempoh log sedia ada.
export default function BorangLogPemantauan({ risiko, log, kunciSkor = false, onSaved, onBatal }) {
  const modEdit = Boolean(log?.log_id);
  const [data, setData] = useState(() => ({
    tahun: log?.tahun_pemantauan || new Date().getFullYear(),
    separuh: log?.separuh_tahun_pemantauan || 1,
    k: log?.skor_kebarangkalian_selepas ? String(log.skor_kebarangkalian_selepas) : "",
    i: log?.skor_impak_selepas ? String(log.skor_impak_selepas) : "",
    status: log?.status_pemantauan || "",
    kekerapan: log?.kekerapan_pemantauan || "",
    kelulusan: log?.no_bil_kelulusan || "",
    catatan: log?.catatan || "",
    pelan: log?.pelan_tindakan_log?.length ? log.pelan_tindakan_log.map((p) => teksItem(p, "butiran_aktiviti")) : [""],
    kakitangan: log?.kakitangan_log?.length ? log.kakitangan_log.map((p) => teksItem(p, "butiran_kakitangan")) : [""],
  }));
  const [tahapRujukan, setTahapRujukan] = useState(null);
  const [semakan, setSemakan] = useState(null); // { jenis: "ok"|"amaran"|"ralat", mesej }
  const [menyimpan, setMenyimpan] = useState(false);
  const [ralat, setRalat] = useState("");

  const kunciTempoh = modEdit;
  const set = (medan) => (e) => setData((d) => ({ ...d, [medan]: e.target.value }));

  // Tahap rujukan = tahap sesi sebelumnya (atau penilaian asal) untuk kira keberkesanan
  useEffect(() => {
    let aktif = true;
    api
      .get(`/pemantauan-risiko/${risiko.id}/tahap-rujukan`, {
        params: { tahun: data.tahun, separuh: data.separuh, exclude_log_id: log?.log_id },
      })
      .then((res) => {
        if (!aktif) return;
        const rujukan = res.data?.tahap_risiko_rujukan;
        setTahapRujukan(
          rujukan && rujukan !== "Tiada"
            ? rujukan
            : getRiskMatrix(risiko.skor_kebarangkalian || 1, risiko.skor_impak || 1).label
        );
      })
      .catch(() => aktif && setTahapRujukan(null));
    return () => {
      aktif = false;
    };
  }, [risiko.id, risiko.skor_kebarangkalian, risiko.skor_impak, data.tahun, data.separuh, log?.log_id]);

  // Log baharu: semak tempoh tidak bertindih / tidak lebih awal dari risiko
  useEffect(() => {
    if (modEdit || !data.tahun || !data.separuh) return;
    let aktif = true;
    api
      .get("/pemantauan-risiko/check-duplicate", {
        params: { risiko_id: risiko.id, tahun: data.tahun, separuh: data.separuh },
      })
      .then(({ data: r }) => {
        if (!aktif) return;
        setSemakan({ jenis: r.invalid ? "ralat" : r.duplicate ? "amaran" : "ok", mesej: r.message });
      })
      .catch(() => aktif && setSemakan({ jenis: "amaran", mesej: "Gagal menyemak tempoh. Cuba lagi." }));
    return () => {
      aktif = false;
    };
  }, [modEdit, risiko.id, data.tahun, data.separuh]);

  const tahapSelepas = data.k && data.i ? getRiskMatrix(data.k, data.i).label : null;
  const keberkesanan =
    tahapSelepas && tahapRujukan
      ? (TAHAP_RISIKO_ORDER[tahapSelepas] || 0) <= (TAHAP_RISIKO_ORDER[tahapRujukan] || 0)
        ? "Ya"
        : "Tidak"
      : null;

  const simpan = async (e) => {
    e.preventDefault();
    if (!data.tahun || !data.separuh || !data.status) {
      setRalat("Sila lengkapkan Tahun, Separuh Tahun dan Status Pemantauan.");
      return;
    }
    if (Boolean(data.k) !== Boolean(data.i)) {
      setRalat("Isi kedua-dua Skor Kebarangkalian dan Skor Impak, atau biarkan kedua-duanya kosong.");
      return;
    }
    if (!modEdit && semakan?.jenis === "ralat") {
      setRalat(semakan.mesej);
      return;
    }
    setRalat("");
    setMenyimpan(true);
    const pelan = bersihkanSenarai(data.pelan);
    const kakitangan = bersihkanSenarai(data.kakitangan);
    const payload = {
      risiko_id: risiko.id,
      tahun_pemantauan: parseInt(data.tahun, 10),
      separuh_tahun_pemantauan: parseInt(data.separuh, 10),
      skor_kebarangkalian_selepas: data.k ? parseInt(data.k, 10) : null,
      skor_impak_selepas: data.i ? parseInt(data.i, 10) : null,
      keberkesanan,
      status_pemantauan: data.status,
      kekerapan_pemantauan: data.kekerapan.trim() || null,
      no_bil_kelulusan: data.kelulusan.trim() || null,
      catatan: data.catatan.trim() || null,
      justifikasi_pindaan_pemantauan: log?.justifikasi_pindaan_pemantauan || null,
      pelan_tindakan_list: pelan,
      kakitangan_list: kakitangan,
      pelan_tindakan_log: pelan,
      kakitangan_log: kakitangan,
    };
    try {
      if (modEdit) await api.put(`/pemantauan-risiko/log/${log.log_id}`, payload);
      else await api.post("/pemantauan-risiko/log", payload);
      onSaved(modEdit ? "Log pemantauan berjaya dikemas kini." : "Log pemantauan berjaya ditambah.");
    } catch (err) {
      setRalat(mesejRalat(err, "Gagal menyimpan log pemantauan."));
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <form onSubmit={simpan} className="space-y-5">
      {ralat && <AlertBanner variant="error" title={ralat} />}

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempoh</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="log-tahun">Tahun</Label>
            <Input id="log-tahun" type="number" value={data.tahun} onChange={set("tahun")} disabled={kunciTempoh} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-separuh">Separuh Tahun</Label>
            <Select id="log-separuh" value={data.separuh} onChange={set("separuh")} disabled={kunciTempoh}>
              <option value={1}>Pertama</option>
              <option value={2}>Kedua</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-kekerapan">Kekerapan</Label>
            <Input id="log-kekerapan" value={data.kekerapan} onChange={set("kekerapan")} placeholder="Cth: 3 bulan" />
          </div>
        </div>
        {!modEdit && semakan && (
          <AlertBanner
            variant={semakan.jenis === "ok" ? "success" : semakan.jenis === "ralat" ? "error" : "warning"}
            title={semakan.mesej}
          />
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penilaian semasa</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="log-k">Skor Kebarangkalian</Label>
            <Select id="log-k" value={data.k} onChange={set("k")} disabled={kunciSkor && modEdit}>
              <option value="">- Sila Pilih -</option>
              {SKOR_KEBARANGKALIAN_DESC.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-i">Skor Impak</Label>
            <Select id="log-i" value={data.i} onChange={set("i")} disabled={kunciSkor && modEdit}>
              <option value="">- Sila Pilih -</option>
              {SKOR_IMPAK_DESC.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Tahap semasa:</span>
            <LencanaTahap kebarangkalian={data.k} impak={data.i} />
          </span>
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Keberkesanan (automatik):</span>
            <span className="font-medium">{keberkesanan ? KEBERKESANAN_MAPPING[keberkesanan] : "-"}</span>
          </span>
          {tahapRujukan && <span className="text-xs text-muted-foreground">Berbanding tahap rujukan: {tahapRujukan}</span>}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tindakan</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Pelan Tindakan Pemantauan</Label>
            <SenaraiInput nilai={data.pelan} onChange={(pelan) => setData((d) => ({ ...d, pelan }))} placeholder="Aktiviti" labelTambah="Tambah aktiviti" />
          </div>
          <div className="space-y-1.5">
            <Label>Kakitangan Bertanggungjawab</Label>
            <SenaraiInput
              nilai={data.kakitangan}
              onChange={(kakitangan) => setData((d) => ({ ...d, kakitangan }))}
              placeholder="Nama / jawatan"
              labelTambah="Tambah kakitangan"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="log-status">Status Pemantauan</Label>
            <Select id="log-status" value={data.status} onChange={set("status")}>
              <option value="">- Sila Pilih -</option>
              {denganNilaiSemasa(STATUS_PEMANTAUAN, log?.status_pemantauan).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-kelulusan">No. Bil Kelulusan</Label>
            <Input id="log-kelulusan" value={data.kelulusan} onChange={set("kelulusan")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="log-catatan">Catatan</Label>
          <Textarea id="log-catatan" value={data.catatan} onChange={set("catatan")} className="min-h-[70px]" />
        </div>
      </fieldset>

      <ButangBorang menyimpan={menyimpan} onBatal={onBatal} labelSimpan={modEdit ? "Simpan Perubahan" : "Tambah Log"} />
    </form>
  );
}
