import { useState } from "react";
import api from "../../api/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import AlertBanner from "@/components/ui/alert-banner";
import SenaraiInput from "./SenaraiInput";
import { ButangBorang } from "./paparan";
import { KATEGORI_RISIKO, bersihkanSenarai, denganNilaiSemasa, mesejRalat } from "./pilihan";

// Pengenalpastian risiko — PUT /risiko/:risiko_id (payload penuh; skor dikekalkan)
export default function BorangPengenalpastian({ risiko, onSaved, onBatal }) {
  const [data, setData] = useState({
    kategori: risiko.kategori || "",
    bahagian: risiko.bahagian || "",
    risiko: risiko.risiko || "",
    punca: risiko.punca?.length ? risiko.punca : [""],
    kesan: risiko.kesan?.length ? risiko.kesan : [""],
  });
  const [menyimpan, setMenyimpan] = useState(false);
  const [ralat, setRalat] = useState("");

  const simpan = async (e) => {
    e.preventDefault();
    const punca = bersihkanSenarai(data.punca);
    const kesan = bersihkanSenarai(data.kesan);
    if (!data.kategori || !data.bahagian.trim() || !data.risiko.trim() || punca.length === 0 || kesan.length === 0) {
      setRalat("Sila lengkapkan Kategori, Bahagian, Risiko, dan sekurang-kurangnya satu Punca dan Kesan.");
      return;
    }
    setRalat("");
    setMenyimpan(true);
    try {
      await api.put(`/risiko/${risiko.id}`, {
        noRujukan: risiko.no_rujukan,
        tahun: risiko.tahun,
        separuhTahun: risiko.separuh_tahun,
        syarikatId: risiko.syarikat_id,
        kategori: data.kategori,
        bahagian: data.bahagian.trim(),
        risiko: data.risiko.trim(),
        skorKebarangkalian: risiko.skor_kebarangkalian,
        skorImpak: risiko.skor_impak,
        skorRisiko: risiko.skor_risiko,
        statusRisiko: risiko.status_risiko,
        punca,
        kesan,
      });
      onSaved("Pengenalpastian risiko berjaya dikemas kini.");
    } catch (err) {
      setRalat(mesejRalat(err, "Gagal mengemas kini pengenalpastian risiko."));
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <form onSubmit={simpan} className="space-y-5">
      {ralat && <AlertBanner variant="error" title={ralat} />}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="kategori">Kategori Risiko</Label>
          <Select id="kategori" value={data.kategori} onChange={(e) => setData({ ...data, kategori: e.target.value })}>
            <option value="">- Sila Pilih -</option>
            {denganNilaiSemasa(KATEGORI_RISIKO, risiko.kategori).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bahagian">Bahagian / Unit</Label>
          <Input id="bahagian" value={data.bahagian} onChange={(e) => setData({ ...data, bahagian: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="risiko">Risiko</Label>
        <Textarea id="risiko" value={data.risiko} onChange={(e) => setData({ ...data, risiko: e.target.value })} className="min-h-[80px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Punca</Label>
          <SenaraiInput nilai={data.punca} onChange={(punca) => setData({ ...data, punca })} placeholder="Punca" labelTambah="Tambah punca" />
        </div>
        <div className="space-y-1.5">
          <Label>Kesan</Label>
          <SenaraiInput nilai={data.kesan} onChange={(kesan) => setData({ ...data, kesan })} placeholder="Kesan" labelTambah="Tambah kesan" />
        </div>
      </div>
      <ButangBorang menyimpan={menyimpan} onBatal={onBatal} labelSimpan="Simpan Pengenalpastian" />
    </form>
  );
}
