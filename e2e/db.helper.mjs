// e2e/db.helper.mjs — Akses DB & helper transaksi untuk assertion dalam spec.
// Kegunaan: spec rollback (03) dan soft-delete (04) memerlukan pengesahan terus
// ke pangkalan data, bukan hanya melalui API.
//
// KREDENSIAL: baca dari risk_backend/.env (gitignored) — JANGAN hardcode di sini.

import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.join(__dirname, "..", "risk_backend");
const ENV_PATH = path.join(BACKEND_DIR, ".env");

// Baca variabel yang berkaitan dari risk_backend/.env (jika wujud), tanpa mengekspos.
function bacaEnv(fail) {
  const ada = new Map();
  if (fs.existsSync(ENV_PATH)) {
    for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) ada.set(m[1], m[2].replace(/^["']|["']$/g, ""));
    }
  }
  return ada.get(fail) || process.env[fail];
}

// Resolve 'pg' dari risk_backend/node_modules supaya tidak perlukan install di root
const require = createRequire(path.join(BACKEND_DIR, "index.js"));
const { Pool } = require("pg");

const DB_USER = bacaEnv("DB_USER") || "postgres";
const DB_HOST = bacaEnv("DB_HOST") || "localhost";
const DB_NAME = bacaEnv("DB_NAME") || "UKMH_RMS";
const DB_PASS = bacaEnv("DB_PASS") || bacaEnv("DB_PASSWORD");
const DB_PORT = bacaEnv("DB_PORT") || "5432";

if (!DB_PASS) {
  throw new Error(
    "Kredensial DB tidak dijumpai. Pastikan risk_backend/.env wujud (DB_PASS) " +
      "atau tetapkan env DB_PASS/DB_PASSWORD sebelum menjalankan spec E2E."
  );
}

const konfigurasiDB = {
  user: DB_USER,
  host: DB_HOST,
  database: DB_NAME,
  password: DB_PASS,
  port: Number(DB_PORT),
};

let pool = new Pool(konfigurasiDB);
let poolDitutup = false;

export const DB = {
  query(...args) {
    if (poolDitutup) {
      pool = new Pool(konfigurasiDB);
      poolDitutup = false;
    }
    return pool.query(...args);
  },
  end() {
    if (poolDitutup) return Promise.resolve();
    poolDitutup = true;
    return pool.end();
  },
};

// Muatkan helper 'dalamTransaksi' terus dari risk_backend (ESM)
export async function muatDalamTransaksi() {
  for (const key of ["DB_USER", "DB_HOST", "DB_NAME", "DB_PASS", "DB_PORT", "JWT_SECRET"]) {
    const value = bacaEnv(key);
    if (value !== undefined) process.env[key] = value;
  }

  const mod = await import(
    pathToFileURL(path.join(BACKEND_DIR, "utils", "transaksi.js"))
  );
  return mod.dalamTransaksi;
}

export function tutupDB() {
  return DB.end();
}