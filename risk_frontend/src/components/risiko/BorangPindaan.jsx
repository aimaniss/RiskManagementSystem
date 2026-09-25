import { useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SKOR_KEBARANGKALIAN_DESC, SKOR_IMPAK_DESC, getRiskMatrix } from "@/constants/riskMatrix";
import { formatSeparuhTahun } from "@/utils/formatters";
import { bolehPindaTerus } from "./data";
import { LencanaTahap } from "./umum";
import { Perubahan } from "./KadPindaan";

const SINGKATAN = { Rendah: "R", Sederhana: "S", Tinggi: "T", "Sangat Tinggi": "ST" };
const tahap = (k, i) => SINGKATAN[getRiskMatrix(k, i).label] || "-";
const str = (v) => (v ? String(v) : "");

function PilihSkor({ id, label, nilai, onUbah, pilihan }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={nilai} onChange={(e) => onUbah(e.target.value)}>
        <option value="">- Sila pilih -</option>
        {pilihan.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function Bahagian({ tajuk, keterangan, semasa, children }) {
  return (
    <fieldset className="grid gap-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold text-foreground">{tajuk}</legend>
      <p className="-mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {keterangan} Tahap semasa: {semasa}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/**
 * Borang pindaan skor: penilaian risiko dan/atau keberkesanan (log pemantauan
 * terkini yang sudah mempunyai skor). POST /pindaan/:id dengan justifikasi;
 * pemegang pindaan:lulus diluluskan terus oleh server, lain-lain menunggu.
 */
export default function BorangPindaan({ risiko, logTerkini, onSelesai, onBatal }) {
  const lulusTerus = bolehPindaTerus();
  const adaKeberkesanan = Boolean(
    logTerkini?.skor_kebarangkalian_selepas && logTerkini?.skor_impak_selepas
  );
  const asal = {
    skor_kebarangkalian: risiko.skor_kebarangkalian,
    skor_impak: risiko.skor_impak,
    skor_kebarangkalian_selepas: logTerkini?.skor_kebarangkalian_selepas,
    skor_impak_selepas: logTerkini?.skor_impak_selepas,
  };
  const [skor, setSkor] = useState({
    skor_kebarangkalian: str(asal.skor_kebarangkalian),
    skor_impak: str(asal.skor_impak),
    skor_kebarangkalian_selepas: str(asal.skor_kebarangkalian_selepas),
    skor_impak_selepas: str(asal.skor_impak_selepas),
  });
  const [justifikasi, setJustifikasi] = useState("");
  const [ralat, setRalat] = useState("");
  const [menghantar, setMenghantar] = useState(false);
  const ubah = (medan) => (v) => setSkor((s) => ({ ...s, [medan]: v }));

  // Hanya medan yang berubah dihantar; tahap risiko turut dipaparkan dalam ringkasan
  const sebelum = {};
  const selepas = {};
  for (const m of Object.keys(skor)) {
    if (skor[m] && Number(skor[m]) !== Number(asal[m])) {
      sebelum[m] = asal[m] ?? null;
      selepas[m] = Number(skor[m]);
    }
  }
  const ubahPenilaian = "skor_kebarangkalian" in selepas || "skor_impak" in selepas;
  const ubahKeberkesanan = "skor_kebarangkalian_selepas" in selepas || "skor_impak_selepas" in selepas;
  const ringkasan = { sebelum: { ...sebelum }, selepas: { ...selepas } };
  if (ubahPenilaian) {
    ringkasan.sebelum.skor_risiko_penilaian = tahap(asal.skor_kebarangkalian, asal.skor_impak);
    ringkasan.selepas.skor_risiko_penilaian = tahap(skor.skor_kebarangkalian, skor.skor_impak);
  }
  if (ubahKeberkesanan) {
    ringkasan.sebelum.skor_risiko_keberkesanan = tahap(
      asal.skor_kebarangkalian_selepas,
      asal.skor_impak_selepas
    );
    ringkasan.selepas.skor_risiko_keberkesanan = tahap(
      skor.skor_kebarangkalian_selepas,
      skor.skor_impak_selepas
    );
  }

  const hantar = async (e) => {
    e.preventDefault();
    if (!ubahPenilaian && !ubahKeberkesanan) return setRalat("Tiada perubahan pada skor.");
    if (!justifikasi.trim()) return setRalat("Sila nyatakan justifikasi pindaan.");
    setRalat("");
    setMenghantar(true);
    try {
      const teks = justifikasi.trim();
      await api.post(`/pindaan/${risiko.id}`, {
        justifikasi: {
          ...(ubahPenilaian && { penilaian: teks }),
          ...(ubahKeberkesanan && { keberkesanan: teks }),
        },
        perubahan: { data_sebelum: sebelum, data_selepas: selepas },
      });
      onSelesai(
        lulusTerus ? "Pindaan disimpan dan berkuat kuasa." : "Permohonan pindaan dihantar untuk kelulusan."
      );
    } catch (err) {
      setRalat(err.response?.data?.error || "Gagal menghantar pindaan.");
    } finally {
      setMenghantar(false);
    }
  };

  return (
    <form onSubmit={hantar} className="grid gap-4">
      <Bahagian
        tajuk="Skor Penilaian Risiko"
        keterangan="Skor penilaian asal risiko."
        semasa={<LencanaTahap k={asal.skor_kebarangkalian} i={asal.skor_impak} />}
      >
        <PilihSkor
          id="pinda_kebarangkalian"
          label="Skor Kebarangkalian"
          nilai={skor.skor_kebarangkalian}
          onUbah={ubah("skor_kebarangkalian")}
          pilihan={SKOR_KEBARANGKALIAN_DESC}
        />
        <PilihSkor
          id="pinda_impak"
          label="Skor Impak"
          nilai={skor.skor_impak}
          onUbah={ubah("skor_impak")}
          pilihan={SKOR_IMPAK_DESC}
        />
      </Bahagian>

      {adaKeberkesanan && (
        <Bahagian
          tajuk="Skor Keberkesanan"
          keterangan={`Log pemantauan terkini (${logTerkini.tahun_pemantauan} · ${formatSeparuhTahun(
            logTerkini.separuh_tahun_pemantauan
          )}).`}
          semasa={
            <LencanaTahap k={asal.skor_kebarangkalian_selepas} i={asal.skor_impak_selepas} />
          }
        >
          <PilihSkor
            id="pinda_kebarangkalian_selepas"
            label="Kebarangkalian Keberkesanan"
            nilai={skor.skor_kebarangkalian_selepas}
            onUbah={ubah("skor_kebarangkalian_selepas")}
            pilihan={SKOR_KEBARANGKALIAN_DESC}
          />
          <PilihSkor
            id="pinda_impak_selepas"
            label="Impak Keberkesanan"
            nilai={skor.skor_impak_selepas}
            onUbah={ubah("skor_impak_selepas")}
            pilihan={SKOR_IMPAK_DESC}
          />
        </Bahagian>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="justifikasi_pindaan">Justifikasi Pindaan *</Label>
        <Textarea
          id="justifikasi_pindaan"
          rows={3}
          value={justifikasi}
          onChange={(e) => setJustifikasi(e.target.value)}
          placeholder="Nyatakan sebab skor perlu dipinda"
        />
      </div>

      {(ubahPenilaian || ubahKeberkesanan) && (
        <div className="grid gap-1.5">
          <p className="text-sm font-medium text-foreground">Ringkasan perubahan</p>
          <Perubahan sebelum={ringkasan.sebelum} selepas={ringkasan.selepas} />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {lulusTerus
          ? "Anda pemegang kebenaran pelulus: pindaan berkuat kuasa serta-merta dan direkodkan."
          : "Permohonan akan dihantar kepada pelulus. Skor kekal sehingga diluluskan."}
      </p>

      {ralat && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {ralat}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onBatal} disabled={menghantar}>
          Batal
        </Button>
        <Button type="submit" disabled={menghantar}>
          {menghantar ? "Menghantar..." : lulusTerus ? "Simpan Pindaan" : "Hantar Permohonan"}
        </Button>
      </div>
    </form>
  );
}
