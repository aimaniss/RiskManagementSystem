import { useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBahagians } from "@/hooks/useBahagians";
import { useSenaraiRujukan, pilihanDenganNilaiSemasa } from "@/hooks/useSenaraiRujukan";
import { bersihkanSenarai, keSenarai, payloadKemaskiniRisiko } from "./data";
import { EditorSenarai } from "./umum";

/**
 * Sunting pengenalpastian risiko (kategori, bahagian, pernyataan, punca,
 * kesan). No. rujukan, tahun & syarikat sengaja tidak boleh diubah di sini.
 */
export default function BorangPengenalpastian({ risiko, onSelesai, onBatal }) {
  const { senarai: senaraiKategori } = useSenaraiRujukan("kategori_risiko");
  const { bahagianList } = useBahagians();
  const [kategori, setKategori] = useState(risiko.kategori || "");
  const [bahagian, setBahagian] = useState(risiko.bahagian || "");
  const [teks, setTeks] = useState(risiko.risiko || "");
  const [punca, setPunca] = useState(() => {
    const s = keSenarai(risiko.punca);
    return s.length ? s : [""];
  });
  const [kesan, setKesan] = useState(() => {
    const s = keSenarai(risiko.kesan);
    return s.length ? s : [""];
  });
  const [ralat, setRalat] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  const pilihanBahagian = pilihanDenganNilaiSemasa(
    bahagianList.map((b) => ({ nilai: b.nama_bahagian })),
    risiko.bahagian
  );

  const simpan = async (e) => {
    e.preventDefault();
    const puncaBersih = bersihkanSenarai(punca);
    const kesanBersih = bersihkanSenarai(kesan);
    if (!kategori || !bahagian || !teks.trim() || !puncaBersih.length || !kesanBersih.length) {
      return setRalat("Kategori, bahagian, pernyataan risiko, punca dan kesan diperlukan.");
    }
    setRalat("");
    setMenyimpan(true);
    try {
      await api.put(
        `/risiko/${risiko.id}`,
        payloadKemaskiniRisiko(risiko, {
          kategori,
          bahagian,
          risiko: teks.trim(),
          punca: puncaBersih,
          kesan: kesanBersih,
        })
      );
      onSelesai("Maklumat pengenalpastian dikemaskini.");
    } catch (err) {
      setRalat(err.response?.data?.error || "Gagal mengemaskini maklumat risiko.");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <form onSubmit={simpan} className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="kategori">Kategori Risiko *</Label>
          <Select id="kategori" value={kategori} onChange={(e) => setKategori(e.target.value)}>
            <option value="">- Sila pilih -</option>
            {pilihanDenganNilaiSemasa(senaraiKategori, risiko.kategori).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bahagian">Bahagian / Unit *</Label>
          <Select id="bahagian" value={bahagian} onChange={(e) => setBahagian(e.target.value)}>
            <option value="">- Sila pilih -</option>
            {pilihanBahagian.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pernyataan_risiko">Risiko *</Label>
        <Textarea id="pernyataan_risiko" rows={3} value={teks} onChange={(e) => setTeks(e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <EditorSenarai id="punca" label="Punca Risiko *" nilai={punca} onChange={setPunca} />
        <EditorSenarai id="kesan" label="Kesan Risiko *" nilai={kesan} onChange={setKesan} />
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
          {menyimpan ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
