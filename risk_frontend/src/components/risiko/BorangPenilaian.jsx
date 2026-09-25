import { useState } from "react";
import api from "../../api/api";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import AlertBanner from "@/components/ui/alert-banner";
import RiskMatrixVisual from "@/components/ui/risk-matrix-visual";
import { KebarangkalianData, ImpakData, calculateRisk } from "../../constants/riskMatrix";
import { ButangBorang, LencanaTahap } from "./paparan";
import { mesejRalat } from "./pilihan";

// Penilaian risiko (skor kebarangkalian × impak) — PUT /rawatan/penilaian/:risiko_id
export default function BorangPenilaian({ risiko, onSaved, onBatal }) {
  const [skor, setSkor] = useState({
    k: risiko.skor_kebarangkalian ? String(risiko.skor_kebarangkalian) : "",
    i: risiko.skor_impak ? String(risiko.skor_impak) : "",
  });
  const [menyimpan, setMenyimpan] = useState(false);
  const [ralat, setRalat] = useState("");

  const hasil = calculateRisk(skor.k, skor.i);

  const simpan = async (e) => {
    e.preventDefault();
    if (!skor.k || !skor.i) {
      setRalat("Sila pilih kedua-dua Skor Kebarangkalian dan Skor Impak.");
      return;
    }
    setRalat("");
    setMenyimpan(true);
    try {
      await api.put(`/rawatan/penilaian/${risiko.id}`, {
        skorKebarangkalian: parseInt(skor.k, 10),
        skorImpak: parseInt(skor.i, 10),
        skorRisiko: hasil.skorRisiko,
        statusRisiko: hasil.statusRisiko,
      });
      onSaved("Penilaian risiko berjaya disimpan.");
    } catch (err) {
      setRalat(mesejRalat(err, "Gagal menyimpan penilaian risiko."));
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <form onSubmit={simpan} className="space-y-5">
      {ralat && <AlertBanner variant="error" title={ralat} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="skor-kebarangkalian">Skor Kebarangkalian</Label>
            <Select id="skor-kebarangkalian" value={skor.k} onChange={(e) => setSkor({ ...skor, k: e.target.value })}>
              <option value="">- Sila Pilih -</option>
              {Object.entries(KebarangkalianData)
                .sort(([a], [b]) => a - b)
                .map(([nilai, label]) => (
                  <option key={nilai} value={nilai}>
                    {nilai} - {label}
                  </option>
                ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skor-impak">Skor Impak</Label>
            <Select id="skor-impak" value={skor.i} onChange={(e) => setSkor({ ...skor, i: e.target.value })}>
              <option value="">- Sila Pilih -</option>
              {Object.entries(ImpakData)
                .sort(([a], [b]) => a - b)
                .map(([nilai, label]) => (
                  <option key={nilai} value={nilai}>
                    {nilai} - {label}
                  </option>
                ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Tahap risiko:</span>
            <LencanaTahap kebarangkalian={skor.k} impak={skor.i} />
            {hasil.statusRisiko && (
              <span className="text-xs text-muted-foreground">
                {hasil.statusRisiko === "Ya" ? "Memerlukan tindakan rawatan" : "Risiko rendah — tiada rawatan mandatori"}
              </span>
            )}
          </div>
        </div>
        <RiskMatrixVisual kebarangkalian={skor.k} impak={skor.i} compact />
      </div>
      <ButangBorang menyimpan={menyimpan} onBatal={onBatal} labelSimpan="Simpan Penilaian" />
    </form>
  );
}
