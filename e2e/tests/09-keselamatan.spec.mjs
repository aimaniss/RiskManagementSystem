// 09-keselamatan.spec.mjs — Pengawal regresi keselamatan.
// - Tiada kata laluan plain-text dalam DB (migration 023).
// - Setiap pengguna ada token_dikemaskini_at supaya token boleh dicabut.
// - Respons 5xx tidak mendedahkan err.message kepada klien.
// - Header helmet, had kadar log masuk per IP, tiada console.log nyahpepijat.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { DB } from "../db.helper.mjs";

const CONTROLLERS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../risk_backend/controllers"
);

test("Semua kata laluan pengguna ialah hash bcrypt", async () => {
  const { rows } = await DB.query(
    `SELECT staff_id FROM pengguna
      WHERE katalaluan IS NOT NULL AND (katalaluan NOT LIKE '$2%' OR length(katalaluan) <> 60)`
  );
  expect(rows.map((r) => r.staff_id)).toEqual([]);
});

test("Setiap pengguna mempunyai token_dikemaskini_at (token boleh dicabut)", async () => {
  const { rows } = await DB.query(
    "SELECT staff_id FROM pengguna WHERE token_dikemaskini_at IS NULL"
  );
  expect(rows.map((r) => r.staff_id)).toEqual([]);
});

test("Respons 5xx dalam controllers tidak memulangkan err.message", async () => {
  const bocor = [];
  for (const fail of fs.readdirSync(CONTROLLERS)) {
    const kod = fs.readFileSync(path.join(CONTROLLERS, fail), "utf8");
    for (const m of kod.matchAll(/\.status\(5\d\d\)\s*\.json\(\{[^}]*\}/g)) {
      if (/\berr(or)?\.(message|stack|detail)\b/.test(m[0])) bocor.push(`${fail}: ${m[0]}`);
    }
  }
  expect(bocor).toEqual([]);
});

test("Header keselamatan HTTP (helmet) dipasang & Express tidak didedahkan", async ({
  request,
}) => {
  const res = await request.get("http://localhost:5001/health");
  const h = res.headers();
  expect(h["x-powered-by"]).toBeUndefined();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("SAMEORIGIN");
  expect(h["content-security-policy"]).toBeTruthy();
});

test("Had kadar log masuk per IP dikonfigurasi (header RateLimit)", async ({ request }) => {
  const res = await request.post("http://localhost:5001/api/auth/login", {
    data: { staff_id: "E2E_TIADA_HAD", katalaluan: "x" },
  });
  expect(res.status()).toBe(401);
  expect(res.headers()["ratelimit-policy"] || res.headers()["ratelimit"]).toBeTruthy();
});

test("Tiada console.log nyahpepijat dalam controllers", async () => {
  const ada = fs
    .readdirSync(CONTROLLERS)
    .filter((f) => /console\.log\(/.test(fs.readFileSync(path.join(CONTROLLERS, f), "utf8")));
  expect(ada).toEqual([]);
});
