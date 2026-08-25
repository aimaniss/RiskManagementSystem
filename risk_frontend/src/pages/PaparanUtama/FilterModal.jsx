import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";

export default function FilterModal({
  filterValues,
  setFilterValues,
  setShowModal,
  syarikatOptions,
  currentUser, // Terima prop currentUser
}) {
  const initialId = filterValues.syarikatId ?? "Semua";
  const [tempId, setTempId] = useState(initialId);

  // Tentukan peranan pengguna
  const adminRoles = [1, 2]; // 1: ADMIN, 2: EXECUTIVE
  const isAdmin = adminRoles.includes(currentUser?.peranan_id);

  // Bina senarai pilihan (options) secara dinamik
  const baseOptions = Array.isArray(syarikatOptions) ? syarikatOptions : [];

  // Hanya tambah "Semua Syarikat" jika pengguna ialah Admin atau Executive
  const options = isAdmin
    ? [
        { syarikat_id: "Semua", nama_syarikat: "Semua Syarikat" },
        ...baseOptions,
      ]
    : baseOptions; // Pengguna biasa hanya nampak senarai syarikat

  const handleApply = () => {
    // Logik ini sepatutnya masih berfungsi dengan betul
    const selected = options.find((o) => String(o.syarikat_id) === String(tempId));

    // Jika 'selected' tidak ditemui, gunakan 'fallback' pilihan pertama
    const safeSelected = selected || options[0];

    const nama = safeSelected ? safeSelected.nama_syarikat : "";
    const id = safeSelected ? String(safeSelected.syarikat_id) : "";

    setFilterValues({
      syarikat: nama,
      syarikatId: id,
      syarikatName: nama,
    });
    setShowModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-foreground">
          Pilih Paparan Dashboard
        </h2>

        <div className="mt-4 space-y-1.5">
          <label
            htmlFor="filter-syarikat"
            className="text-xs font-medium text-foreground"
          >
            Paparkan data untuk:
          </label>
          <Select
            id="filter-syarikat"
            value={tempId}
            onChange={(e) => setTempId(e.target.value)}
          >
            {options.map((opt) => (
              <SelectItem key={opt.syarikat_id} value={opt.syarikat_id}>
                {opt.nama_syarikat}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setShowModal(false)}>
            Batal
          </Button>
          <Button onClick={handleApply}>Terapkan</Button>
        </div>
      </div>
    </div>
  );
}
