import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FilePenLine,
  FilePlus2,
  History,
  LogIn,
  Pencil,
  Settings,
  Stethoscope,
  Trash2,
  UserCog,
  XCircle,
} from "lucide-react";

// Ikon & warna ikut kata kunci nama aktiviti (log_aktiviti.aktiviti). Turutan
// penting: padanan pertama digunakan. Dikongsi oleh Log Aktiviti & tab Sejarah.
// Kelas penuh ditulis literal supaya Tailwind dapat mengesannya semasa bina.
// Cerah: latar -100 + teks -700 + bingkai; gelap: latar lut sinar + teks -200.
const WARNA = {
  merah: "bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/20 dark:text-red-200 dark:ring-red-400/30",
  hijau: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/30",
  ungu: "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/30",
  langit: "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-400/30",
  teal: "bg-teal-100 text-teal-700 ring-teal-200 dark:bg-teal-500/20 dark:text-teal-200 dark:ring-teal-400/30",
  amber: "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/30",
  indigo: "bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/30",
  biru: "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:ring-blue-400/30",
  oren: "bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-400/30",
  kelabu: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-zinc-500/25 dark:text-zinc-200 dark:ring-zinc-400/30",
};
const w = (k) => `ring-1 ring-inset ${WARNA[k]}`;

const JENIS = [
  { kunci: /log masuk|log keluar/i, ikon: LogIn, warna: w("kelabu") },
  { kunci: /tolak|nyahaktif|dikunci/i, ikon: XCircle, warna: w("merah") },
  { kunci: /lulus|aktifkan/i, ikon: CheckCircle2, warna: w("hijau") },
  { kunci: /pindaan/i, ikon: FilePenLine, warna: w("ungu") },
  { kunci: /padam/i, ikon: Trash2, warna: w("merah") },
  { kunci: /penilaian|nilai/i, ikon: ClipboardCheck, warna: w("langit") },
  { kunci: /rawatan/i, ikon: Stethoscope, warna: w("teal") },
  { kunci: /eksport/i, ikon: Download, warna: w("kelabu") },
  { kunci: /pemantauan|log/i, ikon: Activity, warna: w("amber") },
  { kunci: /pengguna|profil|kata laluan/i, ikon: UserCog, warna: w("indigo") },
  { kunci: /cache|kebenaran|tetapan|syarikat|bahagian|rujukan/i, ikon: Settings, warna: w("kelabu") },
  { kunci: /tambah|daftar/i, ikon: FilePlus2, warna: w("biru") },
  { kunci: /kemaskini|kemas kini|sunting/i, ikon: Pencil, warna: w("oren") },
];
const LALAI = { ikon: History, warna: w("kelabu") };

/** { ikon, warna } bagi satu nama aktiviti */
export const jenisAktiviti = (aktiviti) =>
  JENIS.find((j) => j.kunci.test(aktiviti || "")) || LALAI;

/** Label hari: "Hari ini", "Semalam" atau tarikh penuh */
export const labelHari = (tarikh) => {
  const d = new Date(tarikh);
  const hari = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const beza = Math.round((hari(new Date()) - hari(d)) / 86400000);
  const penuh = d.toLocaleDateString("ms-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (beza === 0) return `Hari ini · ${penuh}`;
  if (beza === 1) return `Semalam · ${penuh}`;
  return penuh;
};

export const masaSahaja = (tarikh) =>
  new Date(tarikh).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });
