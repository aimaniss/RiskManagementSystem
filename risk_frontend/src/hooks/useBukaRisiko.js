import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Butiran risiko dipaparkan sebagai modal di atas halaman semasa. URL kekal
// /risiko/:id (boleh dipautkan & dimuat semula); `state.latar` menyimpan
// halaman di belakang modal. Tanpa latar (pautan terus), Senarai Risiko
// menjadi latar.

/** state untuk <Link> / navigate supaya halaman semasa kekal di belakang modal */
export const stateLatar = (lokasi, tambahan = {}) => ({
  latar: lokasi.state?.latar || lokasi,
  ...tambahan,
});

/** Fungsi membuka /risiko/:id sebagai modal di atas halaman semasa */
export function useBukaRisiko() {
  const navigate = useNavigate();
  const lokasi = useLocation();
  return (id, carian = "", tambahan = {}) =>
    navigate(`/risiko/${id}${carian}`, { state: stateLatar(lokasi, tambahan) });
}

const RISIKO_BERUBAH = "rms:risiko-berubah";

/** Dipanggil selepas simpan dalam modal supaya senarai di belakang dimuat semula */
export const maklumkanRisikoBerubah = () => window.dispatchEvent(new Event(RISIKO_BERUBAH));

/** Senarai di belakang modal memuat semula data apabila risiko berubah */
export function useRisikoBerubah(muatSemula) {
  const rujukan = useRef(muatSemula);
  useEffect(() => {
    rujukan.current = muatSemula;
  });
  useEffect(() => {
    const dengar = () => rujukan.current?.();
    window.addEventListener(RISIKO_BERUBAH, dengar);
    return () => window.removeEventListener(RISIKO_BERUBAH, dengar);
  }, []);
}
