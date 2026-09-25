import { promises as fs } from "node:fs";
import path from "node:path";

const IGNORE = new Set(["node_modules", ".git", "dist", "build", "coverage", "vendor"]);

export async function findProjectRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (let i = 0; i < 20; i++) {
    try {
      await fs.access(path.join(dir, "risk_backend"));
      await fs.access(path.join(dir, "risk_frontend"));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  throw new Error("Akar projek tidak dijumpai (perlu folder risk_backend + risk_frontend).");
}

async function listFiles(dir) {
  const out = [];
  async function walk(d, rel) {
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (IGNORE.has(e.name)) continue;
      if (e.name.startsWith(".env")) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(path.join(d, e.name), r);
      else out.push(r);
    }
  }
  await walk(path.resolve(dir), "");
  return out.sort();
}

async function readText(file, maxBytes = 600000) {
  try {
    const buf = await fs.readFile(file);
    if (buf.length > maxBytes) return `[fail terlalu besar untuk dibaca: ${buf.length} bait]`;
    return buf.toString("utf8");
  } catch {
    return "";
  }
}

export async function scanStruktur(root) {
  const be = path.join(root, "risk_backend");
  const fe = path.join(root, "risk_frontend");
  const [routes, controllers, migrations, utils, middleware, config, fePages, feComponents, feHooks, feConstants, feUtils, feApi] =
    await Promise.all([
      listFiles(path.join(be, "routes")),
      listFiles(path.join(be, "controllers")),
      listFiles(path.join(be, "migrations")),
      listFiles(path.join(be, "utils")),
      listFiles(path.join(be, "middleware")),
      listFiles(path.join(be, "config")),
      listFiles(path.join(fe, "src/pages")),
      listFiles(path.join(fe, "src/components")),
      listFiles(path.join(fe, "src/hooks")),
      listFiles(path.join(fe, "src/constants")),
      listFiles(path.join(fe, "src/utils")),
      listFiles(path.join(fe, "src/api")),
    ]);
  return {
    backend: { routes, controllers, migrations, utils, middleware, config },
    frontend: { pages: fePages, components: feComponents, hooks: feHooks, constants: feConstants, utils: feUtils, api: feApi },
  };
}

const PREFIX_RE = /app\.use\s*\(\s*["'](\/api\/[^"']+)["']\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g;
const IMPORT_RE = /import\s+([A-Za-z_$][\w$]*)\s+from\s+["'][^"']*\/routes\/([A-Za-z0-9_]+)\.js["']/g;
const ROUTE_RE = /router\.(get|post|put|patch|delete)\s*\(/g;

function parseHandlerStart(rest) {
  const re = /=>|(?:async\s+)?function\s*\w*\s*\(|\(?\s*req\s*(?:,\s*(?:res|next))?\s*[,)]\s*=>/g;
  let best = Infinity;
  let m;
  while ((m = re.exec(rest))) {
    if (m.index > 0 && m.index < best) best = m.index;
  }
  return best;
}

export async function scanEndpoints(root) {
  const be = path.join(root, "risk_backend");
  const server = await readText(path.join(be, "server.js"));
  const prefixes = [];
  let m;
  while ((m = PREFIX_RE.exec(server))) prefixes.push({ prefix: m[1], varName: m[2] });

  const varToFile = {};
  while ((m = IMPORT_RE.exec(server))) varToFile[m[1]] = m[2];
  const fileToVar = {};
  for (const [v, f] of Object.entries(varToFile)) fileToVar[f] = v;

  const routeFiles = (await listFiles(path.join(be, "routes"))).filter((f) => f.endsWith(".js"));
  const rows = [];
  for (const f of routeFiles) {
    const txt = await readText(path.join(be, "routes", f), 1000000);
    ROUTE_RE.lastIndex = 0;
    while ((m = ROUTE_RE.exec(txt))) {
      const verb = m[1].toUpperCase();
      const afterPath = txt.slice(m.index + m[0].length);
      const p = afterPath.match(/^\s*["']([^"']+)["']/);
      if (!p) continue;
      const routePath = p[1];
      const rest = afterPath.slice(p.index + p[0].length);

      let mwPart = parseHandlerStart(rest);
      let mw;
      if (mwPart !== Infinity) {
        mw = rest.slice(0, mwPart);
      } else {
        mw = rest;
        const toks = mw.split(",").map((t) => t.trim()).filter(Boolean);
        if (toks.length && !toks[toks.length - 1].includes("(")) toks.pop();
        mw = toks.join(", ");
      }
      mw = mw
        .replace(/^\s*[,;)]*\s*/, "")
        .replace(/\s*(?:async\s+)?function\s*\(?\s*$/, "")
        .replace(/\s*async\s*\(?\s*$/, "")
        .replace(/[,;\s]+$/, "")
        .trim();

      const base = f.replace(/\.js$/, "");
      const varName = fileToVar[base];
      const pre = prefixes.find((x) => x.varName === varName) ?? prefixes.find((x) => x.varName === base);
      const prefix = pre ? pre.prefix : "";
      const full = prefix + (routePath === "" || routePath === "/" ? "/" : routePath.startsWith("/") ? routePath : "/" + routePath);
      rows.push({ kaedah: verb, path: full, middleware: mw || "-", fail: `routes/${f}` });
    }
  }
  rows.sort((a, b) => a.path.localeCompare(b.path) || a.kaedah.localeCompare(b.kaedah));
  return rows;
}

const CREATE_RE = /create(?: schema)?(?: table|Table)\s*(?:if\s+not\s+exists\s+)?["']?([\w.]+)["']?\s*\(/gi;

function parseRawCreate(block) {
  const lajur = [];
  const rujukan = [];
  const indeks = [];
  for (const ln of block.split("\n")) {
    const t = ln.trim();
    if (!t || /^(PRIMARY|CONSTRAINT|UNIQUE|FOREIGN|CHECK|KEY|CREATE)\s/i.test(t)) continue;
    const cm = t.match(/^([a-z_][a-z_0-9]*)\s+([\w()]+(?:\(\s*\d+\s*(?:,\s*\d+\s*)?\))?)\b/i);
    if (cm) {
      let s = `${cm[1].toLowerCase()} (${cm[2].toUpperCase()})`;
      if (/PRIMARY KEY/i.test(t)) s += " PK";
      if (/NOT NULL/i.test(t)) s += " NOT NULL";
      if (/UNIQUE/i.test(t)) s += " UNIQUE";
      if (/DEFAULT/i.test(t)) s += " DEFAULT";
      lajur.push(s);
    }
    const rj = t.match(/REFERENCES\s+["']?([\w.]+)["']?/i);
    if (rj) rujukan.push(rj[1].toLowerCase());
    const ix = t.match(/CREATE\s+(UNIQUE\s+)?INDEX\s+["']?([\w]+)["']?/i);
    if (ix) indeks.push(ix[2]);
  }
  return { lajur, rujukan: [...new Set(rujukan)], indeks: [...new Set(indeks)] };
}

export async function scanMigrasi(root) {
  const dir = path.join(root, "risk_backend", "migrations", "knex");
  const files = (await listFiles(dir)).filter((f) => f.endsWith(".js"));
  const sqlDir = path.join(root, "risk_backend", "migrations", "sql");
  const sqlFiles = (await listFiles(sqlDir)).filter((f) => f.endsWith(".sql"));
  const jadual = [];
  for (const f of files.sort()) {
    const txt = await readText(path.join(dir, f), 2000000);
    const creates = [...txt.matchAll(/createTable\s*\(\s*["']([\w]+)["']/g)];
    for (let k = 0; k < creates.length; k++) {
      const start = creates[k].index;
      const end = k + 1 < creates.length ? creates[k + 1].index : txt.length;
      const block = txt.slice(start, end);
      const lajur = [];
      const rujukan = [];
      const indeks = [];
      for (const ln of block.split("\n")) {
        const cm = ln.match(/table\.(\w+)\s*\(\s*["']([a-z_0-9]+)["']/);
        if (cm) {
          let s = `${cm[2]} (${cm[1]})`;
          if (/\.primary\(\)/.test(ln)) s += " PK";
          if (/\.notNullable\(\)/.test(ln)) s += " NOT NULL";
          if (/\.unique\(\)/.test(ln)) s += " UNIQUE";
          if (/\.defaultTo\(/.test(ln)) s += " DEFAULT";
          lajur.push(s);
        }
        const rj = ln.match(/\.references\(["']([a-z_0-9._]+)["']\)/);
        if (rj) rujukan.push(rj[1]);
        if (/table\.index\(/.test(ln)) {
          const im = ln.match(/["']([a-z_0-9_, ]+)["']/);
          if (im) indeks.push(im[1].trim());
        }
      }
      jadual.push({ jadual: creates[k][1], fail: f, lajur, rujukan: [...new Set(rujukan)], indeks: [...new Set(indeks)] });
    }
    CREATE_RE.lastIndex = 0;
    let raw;
    while ((raw = CREATE_RE.exec(txt))) {
      const start = raw.index;
      let depth = 1;
      let end = txt.length;
      const body = txt.slice(raw.index + raw[0].length);
      for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === "(") {
          depth++;
        } else if (ch === ")") {
          depth--;
          if (depth === 0) {
            end = raw.index + raw[0].length + i;
            break;
          }
        }
      }
      const block = txt.slice(start, end + 1);
      const parsed = parseRawCreate(block);
      const existing = jadual.find((j) => j.jadual === raw[1].split(".").pop());
      if (existing) {
        existing.fail += `, ${f}`;
      } else {
        jadual.push({ jadual: raw[1].split(".").pop(), fail: f, ...parsed });
      }
    }
  }
  jadual.sort((a, b) => a.jadual.localeCompare(b.jadual));
  return { jadual, sqlFiles };
}

export async function scanFrontend(root) {
  const fe = path.join(root, "risk_frontend");
  const app = await readText(path.join(fe, "src", "App.jsx"), 2000000);
  const routes = [];
  for (const rm of app.matchAll(/<Route\s+path=(?:"([^"]*)"|'([^']*)')\s+element=\{?\s*<([\w.$]+)\s*/g)) {
    routes.push({ path: rm[1] ?? rm[2], komponen: rm[3] });
  }
  const [pages, komponen, hooks, constants, utils] = await Promise.all([
    listFiles(path.join(fe, "src/pages")),
    listFiles(path.join(fe, "src/components")),
    listFiles(path.join(fe, "src/hooks")),
    listFiles(path.join(fe, "src/constants")),
    listFiles(path.join(fe, "src/utils")),
  ]);
  const laluan = routes.map((r) => ({
    path: r.path.startsWith("/") ? r.path : "/" + r.path,
    komponen: r.komponen,
  }));
  if (!laluan.some((r) => r.path === "/")) laluan.unshift({ path: "/", komponen: "PaparanUtama" });
  return {
    laluan,
    pembungkusan: /<ProtectedRoute[^>]*>/.test(app) ? "Ya (ProtectedRoute)" : "Tidak",
    pages,
    komponen,
    hooks,
    constants,
    utils,
  };
}

export async function scanKonfig(root) {
  const be = path.join(root, "risk_backend");
  const fe = path.join(root, "risk_frontend");
  const [server, knexfile, bePkg, fePkg, viteCfg, dbCfg, authMw] = await Promise.all([
    readText(path.join(be, "server.js"), 200000),
    readText(path.join(be, "knexfile.js"), 200000),
    readText(path.join(be, "package.json"), 200000),
    readText(path.join(fe, "package.json"), 200000),
    readText(path.join(fe, "vite.config.js"), 200000),
    readText(path.join(be, "config", "db.js"), 200000),
    readText(path.join(be, "middleware", "authMiddleware.js"), 200000),
  ]);
  const parse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  const prefixes = [];
  let m;
  while ((m = PREFIX_RE.exec(server))) prefixes.push(m[1]);
  const corsLines = server.split("\n").filter((l) => /CORS|allowedOrigins|ORIGIN/i.test(l));
  const portMatch = server.match(/PORT\s*\|\|?\s*(\d+)/);
  return {
    port: portMatch ? Number(portMatch[1]) : "?",
    prefix_api: prefixes,
    cors: corsLines,
    db: dbCfg.includes("pg.Pool") ? "pool pg (config/db.js)" : dbCfg.slice(0, 200),
    auth_middleware: authMw.includes("authorizeRoles") ? "verifyToken + authorizeRoles tersedia" : "??",
    backend_pkg: parse(bePkg),
    frontend_pkg: parse(fePkg),
    vite: viteCfg.slice(0, 1500),
    knexfile: knexfile.slice(0, 1200),
  };
}

async function codeFiles(root) {
  const be = path.join(root, "risk_backend");
  const fe = path.join(root, "risk_frontend");
  const res = [];
  const pushDir = async (d, prefix) => {
    for (const f of await listFiles(d)) res.push(prefix + f);
  };
  await pushDir(path.join(be, "routes"), "backend/routes/");
  await pushDir(path.join(be, "controllers"), "backend/controllers/");
  await pushDir(path.join(be, "utils"), "backend/utils/");
  await pushDir(path.join(be, "middleware"), "backend/middleware/");
  await pushDir(path.join(be, "config"), "backend/config/");
  await pushDir(path.join(be, "migrations"), "backend/migrations/");
  await pushDir(path.join(be, "seeds"), "backend/seeds/");
  await pushDir(path.join(fe, "src"), "src/");
  res.push("backend/server.js");
  res.push("backend/knexfile.js");
  return res;
}

export async function scanCari(root, corak, failCorak = "") {
  let re;
  try {
    re = new RegExp(corak, "i");
  } catch {
    return [{ ralat: "Regex tidak sah: " + corak }];
  }
  const dirs = await codeFiles(root);
  const pautan = [];
  for (const rel of dirs) {
    if (failCorak && !rel.toLowerCase().includes(failCorak.toLowerCase())) continue;
    const full = rel.startsWith("src/")
      ? path.join(root, "risk_frontend", rel)
      : path.join(root, "risk_backend", rel.slice("backend/".length));
    const txt = await readText(full, 1000000);
    const lines = txt.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        pautan.push({ fail: rel, baris: i + 1, teks: lines[i].trim().slice(0, 200) });
        if (pautan.length >= 300) return pautan;
      }
    }
  }
  return pautan;
}

const FLOW_FILES = {
  general: "00-general.md",
  auth: "01-auth-rbac.md",
  login: "01-auth-rbac.md",
  risiko: "02-risiko.md",
  senarai: "02-risiko.md",
  daftar: "02-risiko.md",
  rawatan: "03-rawatan.md",
  penilaian: "03-rawatan.md",
  pemantauan: "04-pemantauan.md",
  pindaan: "05-pindaan.md",
  laporan: "06-laporan.md",
  dashboard: "07-dashboard.md",
  paparan: "07-dashboard.md",
  pengguna: "08-pengguna-notifikasi-log.md",
  notifikasi: "08-pengguna-notifikasi-log.md",
  log: "08-pengguna-notifikasi-log.md",
};

export async function bacaFlow(root, modul = "") {
  const base = path.join(root, "docs", "pipeline");
  const key = modul.trim().toLowerCase();
  const target = FLOW_FILES[key] ?? (key === "" || key === "semua" ? null : null);
  let dir;
  try {
    dir = await listFiles(base);
  } catch {
    dir = [];
  }
  if (!target) {
    const files = dir.filter((f) => f.endsWith(".md"));
    return {
      modul_dicari: modul || "(semua)",
      senarai_dokumen: files,
      nota: "Gunakan param modul = general | risiko | rawatan | pemantauan | pindaan | laporan | dashboard | pengguna untuk baca flow spesifik.",
    };
  }
  const full = path.join(base, target);
  const txt = await readText(full, 2000000);
  return {
    modul: key,
    fail: `docs/pipeline/${target}`,
    kandungan: txt || "[fail tidak dijumpai]",
  };
}

export async function scanPenuh(root) {
  const [struktur, endpoints, migrasi, frontend] = await Promise.all([
    scanStruktur(root),
    scanEndpoints(root),
    scanMigrasi(root),
    scanFrontend(root),
  ]);
  return {
    akar_projek: root,
    ringkasan: {
      fail_backend: struktur.backend.routes.length + struktur.backend.controllers.length + struktur.backend.migrations.length,
      fail_frontend: struktur.frontend.pages.length + struktur.frontend.components.length,
      bilangan_endpoint: endpoints.length,
      bilangan_jadual: migrasi.jadual.length,
      bilangan_laluan_frontend: frontend.laluan.length,
    },
    struktur,
    endpoints,
    jadual: migrasi.jadual.map((j) => ({ jadual: j.jadual, fail: j.fail, lajur: j.lajur.length })),
    laluan_frontend: frontend.laluan,
  };
}