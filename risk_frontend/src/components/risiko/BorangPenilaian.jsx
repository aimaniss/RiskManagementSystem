import { useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import RiskMatrixVisual from "@/components/ui/risk-matrix-visual";
import {
  calculateRisk,
  SKOR_KEBARANGKALIAN_DESC,
  SKOR_IMPAK_DESC,
} from "@/constants/riskMatrix";
import { LencanaTahap } from "./umum";

/**
 * Borang penilaian pertama risiko (skor kebarangkalian × impak):
 * PUT /rawatan/penilaian/:id, yang turut menanda status pemantauan sesi
 * semasa "Sedang Dilaksanakan". Pindaan skor selepas itu melalui BorangPindaan.
 */
export default function BorangPenilaian({ risiko, onSelesai, onBatal }) {
  const [k, setK] = useState("");
  const [i, setI] = useState("");
  const [ralat, setRalat] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  const hasil = calculateRisk(k, i);

  const simpan = async (e) => {
    e.preventDefault();
    if (!k || !i) return setRalat("Sila pilih kedua-dua skor kebarangkalian dan impak.");
    setRalat("");
    setMenyimpan(true);
    try {
      await api.put(`/rawatan/penilaian/${risiko.id}`, {
        skorKebarangkalian: parseInt(k, 10),
        skorImpak: parseInt(i, 10),
        skorRisiko: hasil.skorRisiko,
        statusRisiko: hasil.statusRisiko,
        tahapRisiko: hasil.tahapRisiko,
      });
      onSelesai("Penilaian risiko disimpan.");
    } catch (err) {
      setRalat(err.response?.data?.error || "Gagal menyimpan penilaian risiko.");
    } finally {
      setMenyimpan(false);
    }
  };

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
            <LencanaTahap k={k} i={i} />
            {hasil.statusRisiko && (
              <span className="text-muted-foreground">
                · Perlu rawatan: <strong className="text-foreground">{hasil.statusRisiko}</strong>
              </span>
            )}
          </div>
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
          {menyimpan ? "Menyimpan..." : "Simpan Penilaian"}
        </Button>
      </div>
    </form>
  );
}
