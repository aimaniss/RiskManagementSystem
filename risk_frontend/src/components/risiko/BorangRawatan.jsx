import { useEffect, useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { bersihkanSenarai, keSenarai, JENIS_KAWALAN } from "./data";
import { EditorSenarai } from "./umum";

/**
 * Borang rawatan risiko. Memuat rawatan sedia ada (GET /rawatan/:risiko_id);
 * tiada rekod -> POST /rawatan (status pemantauan dikemas kini oleh backend),
 * ada rekod -> PUT /rawatan/:rawatan_id.
 */
export default function BorangRawatan({ risikoId, onSelesai, onBatal }) {
  const [memuat, setMemuat] = useState(true);
  const [rawatanId, setRawatanId] = useState(null);
  const [jenisKawalan, setJenisKawalan] = useState("");
  const [tempoh, setTempoh] = useState("");
  const [pelan, setPelan] = useState([""]);
  const [kakitangan, setKakitangan] = useState([""]);
  const [ralat, setRalat] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    let aktif = true;
    api
      .get(`/rawatan/${risikoId}`)
      .then(({ data }) => {
        if (!aktif || !data?.rawatan_id) return;
        setRawatanId(data.rawatan_id);
        setJenisKawalan(data.jenis_kawalan || "");
        setTempoh(data.tempoh_jangkaan_siap || "");
        const p = keSenarai(data.plan_tindakan);
        const k = keSenarai(data.kakitangan_bertanggungjawab);
        setPelan(p.length ? p : [""]);
        setKakitangan(k.length ? k : [""]);
      })
      .catch((err) => {
        // 404 = belum ada rawatan (borang tambah)
        if (aktif && err.response?.status !== 404) {
          setRalat(err.response?.data?.error || "Gagal memuatkan rawatan.");
        }
      })
      .finally(() => aktif && setMemuat(false));
    return () => {
      aktif = false;
    };
  }, [risikoId]);

  const simpan = async (e) => {
    e.preventDefault();
    const pelanBersih = bersihkanSenarai(pelan);
    const kakitanganBersih = bersihkanSenarai(kakitangan);
    if (!jenisKawalan || !tempoh.trim() || !pelanBersih.length || !kakitanganBersih.length) {
      return setRalat(
        "Sila pilih jenis kawalan, isi tempoh jangkaan siap, dan sekurang-kurangnya satu pelan tindakan & kakitangan bertanggungjawab."
      );
    }
    setRalat("");
    setMenyimpan(true);
    const payload = {
      risiko_id: risikoId,
      jenis_kawalan: jenisKawalan,
      tempoh_jangkaan_siap: tempoh.trim(),
      plan_tindakan: pelanBersih,
      kakitangan_bertanggungjawab: kakitanganBersih,
    };
    try {
      if (rawatanId) await api.put(`/rawatan/${rawatanId}`, payload);
      else await api.post("/rawatan", payload);
      onSelesai(rawatanId ? "Rawatan risiko dikemaskini." : "Rawatan risiko ditambah.");
    } catch (err) {
      setRalat(err.response?.data?.error || "Gagal menyimpan rawatan risiko.");
    } finally {
      setMenyimpan(false);
    }
  };

  if (memuat) return <LoadingSpinner text="Memuatkan rawatan..." />;

  return (
    <form onSubmit={simpan} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="jenis_kawalan">Jenis Kawalan *</Label>
        <Select id="jenis_kawalan" value={jenisKawalan} onChange={(e) => setJenisKawalan(e.target.value)}>
          <option value="">- Sila pilih -</option>
          {JENIS_KAWALAN.map((j) => (
            <option key={j.nilai} value={j.nilai}>
              {j.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tempoh_siap">Tempoh Jangkaan Siap Tindakan *</Label>
        <Input
          id="tempoh_siap"
          value={tempoh}
          placeholder="cth. 6 bulan / Disember 2026"
          onChange={(e) => setTempoh(e.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <EditorSenarai
          id="pelan_tindakan"
          label="Pelan Tindakan *"
          nilai={pelan}
          onChange={setPelan}
          placeholder="Tindakan rawatan"
        />
        <EditorSenarai
          id="kakitangan"
          label="Kakitangan Bertanggungjawab *"
          nilai={kakitangan}
          onChange={setKakitangan}
          placeholder="Nama / jawatan"
        />
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
          {menyimpan ? "Menyimpan..." : rawatanId ? "Simpan Perubahan" : "Tambah Rawatan"}
        </Button>
      </div>
    </form>
  );
}
