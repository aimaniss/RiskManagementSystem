// Maklumat sistem untuk kaki halaman. Versi disuntik daripada package.json
// semasa build (vite.config.js) supaya hanya dikemas kini di satu tempat.
export const NAMA_SISTEM = "Risk Management System";
export const PEMILIK = "UKM Holdings Berhad";
export const VERSI = import.meta.env.VITE_VERSI_APLIKASI || "0.0.0";
export const TAHUN = new Date().getFullYear();
