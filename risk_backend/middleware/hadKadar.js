// middleware/hadKadar.js — Had kadar permintaan ikut IP.
// Melengkapi kunci akaun (5 gagal / 15 minit per akaun) dengan had per IP
// supaya satu klien tidak boleh meneka kata laluan merentasi banyak akaun.
// Nilai boleh dilaras melalui .env (cth. dinaikkan dalam CI).
import { rateLimit } from "express-rate-limit";

const nombor = (nilai, lalai) => {
  const n = parseInt(nilai, 10);
  return Number.isInteger(n) && n > 0 ? n : lalai;
};

const TETINGKAP_MS = 15 * 60 * 1000;

const respons = (mesej) => (_req, res) => res.status(429).json({ error: mesej });

// Hanya percubaan log masuk GAGAL dikira
export const hadLogMasuk = rateLimit({
  windowMs: TETINGKAP_MS,
  limit: nombor(process.env.HAD_LOG_MASUK_IP, 30),
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: respons(
    "Terlalu banyak percubaan log masuk dari rangkaian anda. Sila cuba lagi dalam 15 minit."
  ),
});

export const hadApi = rateLimit({
  windowMs: TETINGKAP_MS,
  limit: nombor(process.env.HAD_API_IP, 3000),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: respons("Terlalu banyak permintaan. Sila cuba sebentar lagi."),
});
