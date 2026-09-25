import { useState, useEffect, useCallback } from "react";
import api from "../api/api";

/**
 * Senarai rujukan yang diurus dalam Tetapan Sistem (cth. "kategori_risiko").
 * Hanya nilai aktif dipulangkan oleh API.
 */
export function useSenaraiRujukan(jenis) {
  const [senarai, setSenarai] = useState([]);
  const [loading, setLoading] = useState(true);

  const muat = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/rujukan", { params: { jenis } });
      setSenarai(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(`Gagal memuatkan senarai rujukan ${jenis}:`, err);
      setSenarai([]);
    } finally {
      setLoading(false);
    }
  }, [jenis]);

  useEffect(() => {
    muat();
  }, [muat]);

  return { senarai, loading, refetch: muat };
}

/**
 * Nilai pilihan untuk dropdown. Nilai semasa rekod dikekalkan walaupun telah
 * dinyahaktifkan supaya menyunting rekod lama tidak mengosongkannya.
 */
export const pilihanDenganNilaiSemasa = (senarai, nilaiSemasa) => {
  const nilai = senarai.map((s) => s.nilai);
  return nilaiSemasa && !nilai.includes(nilaiSemasa) ? [...nilai, nilaiSemasa] : nilai;
};
