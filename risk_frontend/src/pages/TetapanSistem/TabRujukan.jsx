import { useMemo } from "react";
import api from "@/api/api";
import TabSenaraiNama from "./TabSenaraiNama";

const MEDAN = { id: "rujukan_id", nama: "nilai", penerangan: "penerangan" };

export default function TabRujukan({ jenis, label, keterangan, beritahu }) {
  const apiRujukan = useMemo(
    () => ({
      muat: () => api.get("/rujukan", { params: { jenis, semua: true } }).then((r) => r.data),
      tambah: (b) =>
        api
          .post("/rujukan", { jenis, nilai: b.nama, penerangan: b.penerangan })
          .then((r) => r.data),
      kemaskini: (item, b) =>
        api
          .put(`/rujukan/${item.rujukan_id}`, { nilai: b.nama, penerangan: b.penerangan })
          .then((r) => r.data),
      status: (item, aktif) =>
        api.patch(`/rujukan/${item.rujukan_id}/status`, { is_aktif: aktif }).then((r) => r.data),
    }),
    [jenis]
  );

  return (
    <TabSenaraiNama
      label={label}
      keterangan={keterangan}
      api={apiRujukan}
      medan={MEDAN}
      beritahu={beritahu}
    />
  );
}
