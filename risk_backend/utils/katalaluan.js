// utils/katalaluan.js — Pengurusan kata laluan (bcrypt) dengan sokongan
// rehash-on-login untuk pengguna sedia ada yang masih plain-text.
import bcrypt from "bcrypt";
import { randomInt } from "node:crypto";

const BCRYPT_ROUNDS = 10;

/**
 * Hash kata laluan mentah.
 * @param {string} katalaluan
 * @returns {Promise<string>} hash bcrypt
 */
export const hashKatalaluan = async (katalaluan) => {
  return bcrypt.hash(String(katalaluan), BCRYPT_ROUNDS);
};

/**
 * Sahkan kata laluan terhadap nilai tersimpan (boleh jadi hash bcrypt
 * atau plain-text lama). Jika plain tempadan M dipadankan dan return
 * hash baru jika perlu-rehash set.
 * @param {string} katalaluan - input pengguna
 * @param {string} tersimpan - nilai dalam DB (hash / plaintext)
 * @returns {Promise<{sah: boolean, hashBaru: string|null}>}
 */
export const sahkanKatalaluan = async (katalaluan, tersimpan) => {
  const input = String(katalaluan);
  const stored = String(tersimpan ?? "");

  // Format bcrypt: $2b$10$... (panjang 60)
  if (stored.startsWith("$2") && stored.length === 60) {
    const sah = await bcrypt.compare(input, stored);
    return { sah, hashBaru: null };
  }

  // Fallback plain-text (migrasi): banding terus
  if (input === stored) {
    return { sah: true, hashBaru: await hashKatalaluan(input) };
  }
  return { sah: false, hashBaru: null };
};

/**
 * Semak sama ada nilai perlu di-rehash (bukan format bcrypt).
 */
export const perluRehash = (tersimpan) => {
  return !(String(tersimpan ?? "").startsWith("$2") && String(tersimpan).length === 60);
};

export const PANJANG_MINIMUM_KATALALUAN = 8;

/**
 * Semak polisi kata laluan baharu. Dikuatkuasakan setiap kali kata laluan
 * ditetapkan (oleh pengguna atau pentadbir); kata laluan sedia ada yang lebih
 * lemah masih boleh log masuk.
 * @param {string} katalaluan
 * @returns {string|null} mesej ralat (BM) atau null jika lulus
 */
export const semakPolisiKatalaluan = (katalaluan) => {
  const nilai = String(katalaluan ?? "");
  if (nilai.length < PANJANG_MINIMUM_KATALALUAN) {
    return `Kata laluan mesti sekurang-kurangnya ${PANJANG_MINIMUM_KATALALUAN} aksara.`;
  }
  if (nilai.length > 72) {
    // bcrypt mengabaikan bait selepas 72
    return "Kata laluan tidak boleh melebihi 72 aksara.";
  }
  if (/\s/.test(nilai)) {
    return "Kata laluan tidak boleh mengandungi ruang kosong.";
  }
  if (!/[A-Za-z]/.test(nilai) || !/[0-9]/.test(nilai)) {
    return "Kata laluan mesti mengandungi sekurang-kurangnya satu huruf dan satu nombor.";
  }
  return null;
};

// Tanpa aksara mengelirukan (0/O, 1/l/I) supaya mudah dibaca dan disampaikan
const HURUF = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
const NOMBOR = "23456789";

/**
 * Jana kata laluan sementara rawak (crypto) yang mematuhi polisi.
 * @param {number} [panjang=10]
 * @returns {string}
 */
export const janaKatalaluanSementara = (panjang = 10) => {
  const semua = HURUF + NOMBOR;
  const aksara = [HURUF[randomInt(HURUF.length)], NOMBOR[randomInt(NOMBOR.length)]];
  while (aksara.length < panjang) aksara.push(semua[randomInt(semua.length)]);
  for (let i = aksara.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [aksara[i], aksara[j]] = [aksara[j], aksara[i]];
  }
  return aksara.join("");
};
