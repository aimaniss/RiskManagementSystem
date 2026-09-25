// 09-keselamatan.spec.mjs — Pengawal regresi keselamatan.
// - Tiada kata laluan plain-text dalam DB (migration 023).
// - Setiap pengguna ada token_dikemaskini_at supaya token boleh dicabut.
// - Respons 5xx tidak mendedahkan err.message kepada klien.

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
