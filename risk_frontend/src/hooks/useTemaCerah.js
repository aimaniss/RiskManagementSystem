import { useEffect } from "react";

/**
 * Halaman sebelum log masuk (Log Masuk, Tukar Kata Laluan) sentiasa tema cerah.
 * Pilihan mod gelap pengguna (localStorage.theme) dipulihkan apabila keluar
 * daripada halaman ini; navbar turut menetapkannya semula selepas log masuk.
 */
export function useTemaCerah() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    return () => {
      if (localStorage.getItem("theme") === "dark") root.classList.add("dark");
    };
  }, []);
}
