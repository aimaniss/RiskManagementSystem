import { useState } from "react";
import api from "../../api/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import AlertBanner from "@/components/ui/alert-banner";
import SenaraiInput from "./SenaraiInput";
import { ButangBorang } from "./paparan";
import { JENIS_KAWALAN, bersihkanSenarai, mesejRalat } from "./pilihan";

// Nilai jenis kawalan lama yang tiada dalam senarai dikekalkan sebagai pilihan
const pilihanKawalan = (semasa) =>
  semasa && !JENIS_KAWALAN.some((j) => j.nilai === semasa)
    ? [...JENIS_KAWALAN, { nilai: semasa, label: semasa }]
    : JENIS_KAWALAN;

// Rawatan risiko — POST /rawatan (baharu) atau PUT /rawatan/:rawatan_id (kemas kini)
export default function BorangRawatan({ risikoId, rawatan, onSaved, onBatal }) {
  const [data, setData] = useState({
    jenis_kawalan: rawatan?.jenis_kawalan || "",
    tempoh: rawatan?.tempoh_jangkaan_siap || "",
    pelan: rawatan?.plan_tindakan?.length ? rawatan.plan_tindakan : [""],
    kakitangan: rawatan?.kakitangan_bertanggungjawab?.length ? rawatan.kakitangan_bertanggungjawab : [""],
  });
  const [menyimpan, setMenyimpan] = useState(false);
  const [ralat, setRalat] = useState("");

  const simpan = async (e) => {
    e.preventDefault();
    const pelan = bersihkanSenarai(data.pelan);
    const kakitangan = bersihkanSenarai(data.kakitangan);
    if (!data.jenis_kawalan || !data.tempoh.trim() || pelan.length === 0 || kakitangan.length === 0) {
      setRalat("Sila pilih Jenis Kawalan, isi Tempoh Jangkaan Siap, dan sekurang-kurangnya satu Pelan Tindakan dan Kakitangan.");
      return;
    }
    setRalat("");
    setMenyimpan(true);
    const payload = {
      risiko_id: risikoId,
      jenis_kawalan: data.jenis_kawalan,
      tempoh_jangkaan_siap: data.tempoh.trim(),
      plan_tindakan: pelan,
      kakitangan_bertanggungjawab: kakitangan,
    };
    try {
      if (rawatan?.rawatan_id) {
        await api.put(`/rawatan/${rawatan.rawatan_id}`, payload);
      } else {
        await api.post("/rawatan", payload);
      }
      onSaved(rawatan?.rawatan_id ? "Rawatan risiko berjaya dikemas kini." : "Rawatan risiko berjaya ditambah.");
    } catch (err) {
      setRalat(mesejRalat(err, "Gagal menyimpan rawatan risiko."));
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <form onSubmit={simpan} className="space-y-5">
      {ralat && <AlertBanner variant="error" title={ralat} />}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="jenis-kawalan">Jenis Kawalan</Label>
          <Select id="jenis-kawalan" value={data.jenis_kawalan} onChange={(e) => setData({ ...data, jenis_kawalan: e.target.value })}>
            <option value="">- Pilih Strategi Kawalan -</option>
            {pilihanKawalan(rawatan?.jenis_kawalan).map((j) => (
              <option key={j.nilai} value={j.nilai}>
                {j.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tempoh-siap">Tempoh Jangkaan Siap</Label>
          <Input id="tempoh-siap" value={data.tempoh} onChange={(e) => setData({ ...data, tempoh: e.target.value })} placeholder="Cth: 6 bulan" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Pelan Tindakan</Label>
          <SenaraiInput nilai={data.pelan} onChange={(pelan) => setData({ ...data, pelan })} placeholder="Langkah tindakan" labelTambah="Tambah langkah" />
        </div>
        <div className="space-y-1.5">
          <Label>Kakitangan Bertanggungjawab</Label>
          <SenaraiInput
            nilai={data.kakitangan}
            onChange={(kakitangan) => setData({ ...data, kakitangan })}
            placeholder="Nama / jawatan"
            labelTambah="Tambah kakitangan"
          />
        </div>
      </div>
      <ButangBorang menyimpan={menyimpan} onBatal={onBatal} labelSimpan="Simpan Rawatan" />
    </form>
  );
}
