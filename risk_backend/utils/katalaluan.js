// utils/katalaluan.js — Pengurusan kata laluan (bcrypt) dengan sokongan
// rehash-on-login untuk pengguna sedia ada yang masih plain-text.
import bcrypt from "bcrypt";

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
