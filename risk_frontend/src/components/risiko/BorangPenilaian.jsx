import { useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import RiskMatrixVisual from "@/components/ui/risk-matrix-visual";
import {
  calculateRisk,
  SKOR_KEBARANGKALIAN_DESC,
  SKOR_IMPAK_DESC,
} from "@/constants/riskMatrix";
import { adaPenilaian, bolehPindaTerus } from "./data";
import { LencanaTahap } from "./umum";

/**
 * Borang penilaian risiko (skor kebarangkalian × impak).
 * - Penilaian pertama: PUT /rawatan/penilaian/:id (turut menanda status
 *   pemantauan sesi semasa "Sedang Dilaksanakan", seperti aliran asal).
 * - Pinda penilaian sedia ada: POST /pindaan/:id dengan justifikasi supaya
 *   setiap pindaan direkodkan. Pemegang `pindaan:lulus` diluluskan terus oleh
 *   server; pengguna lain menunggu kelulusan.
 */
export default function BorangPenilaian({ risiko, onSelesai, onBatal }) {
  const pinda = adaPenilaian(risiko);
  const lulusTerus = bolehPindaTerus();
  const [k, setK] = useState(risiko.skor_kebarangkalian ? String(risiko.skor_kebarangkalian) : "");
  const [i, setI] = useState(risiko.skor_impak ? String(risiko.skor_impak) : "");
  const [justifikasi, setJustifikasi] = useState("");
  const [ralat, setRalat] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  const hasil = calculateRisk(k, i);

  const hantarPindaan = async () => {
    const sebelum = { skor_kebarangkalian: risiko.skor_kebarangkalian, skor_impak: risiko.skor_impak };
    const selepas = { skor_kebarangkalian: parseInt(k, 10), skor_impak: parseInt(i, 10) };
    await api.post(`/pindaan/${risiko.id}`, {
      justifikasi: { penilaian: justifikasi.trim() },
      perubahan: { data_sebelum: sebelum, data_selepas: selepas },
    });
    onSelesai(
      lulusTerus ? "Penilaian risiko dipinda." : "Permohonan pindaan dihantar untuk kelulusan."
    );
  };

  const simpan = async (e) => {
    e.preventDefault();
    if (!k || !i) return setRalat("Sila pilih kedua-dua skor kebarangkalian dan impak.");
    if (pinda) {
      const sama =
        Number(k) === Number(risiko.skor_kebarangkalian) && Number(i) === Number(risiko.skor_impak);
      if (sama) return setRalat("Tiada perubahan pada skor penilaian.");
      if (!justifikasi.trim()) return setRalat("Sila nyatakan justifikasi pindaan.");
    }
    setRalat("");
    setMenyimpan(true);
    try {
      if (pinda) {
        await hantarPindaan();
      } else {
        await api.put(`/rawatan/penilaian/${risiko.id}`, {
          skorKebarangkalian: parseInt(k, 10),
          skorImpak: parseInt(i, 10),
          skorRisiko: hasil.skorRisiko,
          statusRisiko: hasil.statusRisiko,
          tahapRisiko: hasil.tahapRisiko,
        });
        onSelesai("Penilaian risiko disimpan.");
      }
    } catch (err) {
      setRalat(err.response?.data?.error || "Gagal menyimpan penilaian risiko.");
    } finally {
      setMenyimpan(false);
    }
  };

  const labelHantar = !pinda
    ? "Simpan Penilaian"
    : lulusTerus
      ? "Simpan Pindaan"
      : "Hantar Permohonan";

  return (
    <form onSubmit={simpan} className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="grid content-start gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="skor_kebarangkalian">Skor Kebarangkalian *</Label>
            <Select id="skor_kebarangkalian" value={k} onChange={(e) => setK(e.target.value)}>
              <option value="">- Sila pilih -</option>
              {SKOR_KEBARANGKALIAN_DESC.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="skor_impak">Skor Impak *</Label>
            <Select id="skor_impak" value={i} onChange={(e) => setI(e.target.value)}>
              <option value="">- Sila pilih -</option>
              {SKOR_IMPAK_DESC.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Tahap risiko:</span>
            {pinda && (
              <>
                <LencanaTahap k={risiko.skor_kebarangkalian} i={risiko.skor_impak} />
                <span className="text-muted-foreground">→</span>
              </>
            )}
            <LencanaTahap k={k} i={i} />
            {hasil.statusRisiko && (
              <span className="text-muted-foreground">
                · Perlu rawatan: <strong className="text-foreground">{hasil.statusRisiko}</strong>
              </span>
            )}
          </div>
          {pinda && (
            <div className="grid gap-1.5">
              <Label htmlFor="justifikasi_pindaan">Justifikasi Pindaan *</Label>
              <Textarea
                id="justifikasi_pindaan"
                rows={3}
                value={justifikasi}
                onChange={(e) => setJustifikasi(e.target.value)}
                placeholder="Nyatakan sebab skor penilaian perlu dipinda"
              />
              <p className="text-xs text-muted-foreground">
                {lulusTerus
                  ? "Pindaan berkuat kuasa serta-merta dan direkodkan dalam senarai pindaan."
                  : "Permohonan akan dihantar kepada pelulus. Skor kekal sehingga diluluskan."}
              </p>
            </div>
          )}
        </div>
        <div className="justify-self-center">
          <RiskMatrixVisual kebarangkalian={k} impak={i} compact />
        </div>
      </div>

      {ralat && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {ralat}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onBatal} disabled={menyimpan}>
          Batal
        </Button>
        <Button type="submit" disabled={menyimpan}>
          {menyimpan ? "Menyimpan..." : labelHantar}
        </Button>
      </div>
    </form>
  );
}
