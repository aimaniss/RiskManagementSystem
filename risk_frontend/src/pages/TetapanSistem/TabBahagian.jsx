import api from "@/api/api";
import TabSenaraiNama from "./TabSenaraiNama";

// Ditakrif di luar komponen supaya rujukan stabil (elak muat semula berulang)
const API_BAHAGIAN = {
  muat: () => api.get("/bahagian", { params: { semua: true } }).then((r) => r.data),
  tambah: (b) => api.post("/bahagian", { nama_bahagian: b.nama }).then((r) => r.data),
  kemaskini: (item, b) =>
    api.put(`/bahagian/${item.bahagian_id}`, { nama_bahagian: b.nama }).then((r) => r.data),
  status: (item, aktif) =>
    api.patch(`/bahagian/${item.bahagian_id}/status`, { is_aktif: aktif }).then((r) => r.data),
};

const MEDAN = { id: "bahagian_id", nama: "nama_bahagian" };

export default function TabBahagian({ beritahu }) {
  return (
    <TabSenaraiNama
      label="Bahagian"
      keterangan="Bahagian / unit yang dipilih semasa mendaftar risiko. Tukar nama akan mengemas kini semua risiko yang menggunakan bahagian tersebut."
      api={API_BAHAGIAN}
      medan={MEDAN}
      beritahu={beritahu}
    />
  );
}
