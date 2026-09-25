import { createInterface } from "node:readline";
import {
  findProjectRoot,
  scanPenuh,
  scanStruktur,
  scanEndpoints,
  scanMigrasi,
  scanFrontend,
  scanKonfig,
  scanCari,
  bacaFlow,
} from "./scanner.mjs";

export const SERVER_NAME = "rms-boost";
export const SERVER_VERSION = "1.0.0";

let state = { root: null };

async function resolveRoot(args) {
  if (args && typeof args.root === "string" && args.root.trim()) {
    state.root = args.root.trim();
  }
  if (!state.root) {
    state.root = await findProjectRoot(process.cwd());
  }
  return state.root;
}

const OK = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const NOTA = (data) =>
  ({
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    nota: "Nilai JSON di atas boleh dicari terus untuk maklumat lanjut.",
  });

const TOOLS = [
  {
    name: "rms_scan",
    description:
      "Imbasan penuh codebase RMS (struktur fail, semua endpoint API, jadual DB, laluan frontend) dalam satu panggilan. Guna ini dahulu untuk faham seni bina keseluruhan.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    fn: async (args) => {
      const root = await resolveRoot(args);
      return OK(await scanPenuh(root));
    },
  },
  {
    name: "rms_struktur",
    description:
      "Senarai hierarki fail backend (routes, controllers, migrations, utils, middleware) dan frontend (pages, components, hooks, constants, utils, api).",
    inputSchema: {
      type: "object",
      properties: {
        lingkungan: {
          type: "string",
          enum: ["semua", "backend", "frontend"],
          description: "Skop struktur: semua (default), backend sahaja, atau frontend sahaja.",
        },
        root: { type: "string", description: "Ganti akar projek (jarang perlu)." },
      },
      additionalProperties: false,
    },
    fn: async (args) => {
      const root = await resolveRoot(args);
      const s = await scanStruktur(root);
      if (args.lingkungan === "backend") return OK({ backend: s.backend });
      if (args.lingkungan === "frontend") return OK({ frontend: s.frontend });
      return OK(s);
    },
  },
  {
    name: "rms_endpoints",
    description:
      "Semua endpoint REST API backend (kaedah, laluan penuh, middleware, fail sumber). Boleh tapis mengikut modul/fail.",
    inputSchema: {
      type: "object",
      properties: {
        modul: {
          type: "string",
          description: "Tapis mengikut nama modul/fail route, contoh 'risiko', 'pindaan', 'pemantauan'.",
        },
        root: { type: "string", description: "Ganti akar projek (jarang perlu)." },
      },
      additionalProperties: false,
    },
    fn: async (args) => {
      const root = await resolveRoot(args);
      let rows = await scanEndpoints(root);
      if (args.modul) {
        const q = String(args.modul).toLowerCase();
        rows = rows.filter(
          (r) => r.fail.toLowerCase().includes(q) || r.path.toLowerCase().includes(q)
        );
      }
      return OK(rows.length ? rows : { nota: "Tiada endpoint dijumpai untuk penapis itu." });
    },
  },
  {
    name: "rms_skema",
    description:
      "Jadual pangkalan data + lajur (dengan jenis, PK, FK/rujukan, unique, index) yang diekstrak dari migrasi Knex. Juga senarai fail SQL rujukan.",
    inputSchema: {
      type: "object",
      properties: {
        jadual: {
          type: "string",
          description: "Tapis jadual tertentu, contoh 'risiko', 'permohonan_pindaan'.",
        },
        root: { type: "string", description: "Ganti akar projek (jarang perlu)." },
      },
      additionalProperties: false,
    },
    fn: async (args) => {
      const root = await resolveRoot(args);
      const data = await scanMigrasi(root);
      if (args.jadual) {
        const q = String(args.jadual).toLowerCase();
        const hit = data.jadual.filter((j) => j.jadual.includes(q));
        return OK(hit.length ? { jadual: hit, sqlFiles: data.sqlFiles } : { nota: "Jadual tidak dijumpai." });
      }
      return OK(data);
    },
  },
  {
    name: "rms_frontend",
    description:
      "Laluan React Router (path + komponen), status ProtectedRoute, serta senarai pages, komponen (termasuk ui/ shadcn), hooks, constants dan utils.",
    inputSchema: {
      type: "object",
      properties: { root: { type: "string", description: "Ganti akar projek (jarang perlu)." } },
      additionalProperties: false,
    },
    fn: async (args) => {
      const root = await resolveRoot(args);
      return OK(await scanFrontend(root));
    },
  },
  {
    name: "rms_konfig",
    description:
      "Maklumat konfigurasi sistem: port, prefix /api yang didaftar di server.js, baris CORS, sambungan DB, middleware auth, versi pakej backend & frontend, serta config Vite dan Knexfile.",
    inputSchema: {
      type: "object",
      properties: { root: { type: "string", description: "Ganti akar projek (jarang perlu)." } },
      additionalProperties: false,
    },
    fn: async (args) => {
      const root = await resolveRoot(args);
      return OK(await scanKonfig(root));
    },
  },
  {
    name: "rms_cari",
    description:
      "Cari corak teks / regex dalam kod RMS (backend + frontend, node_modules dikecualikan). Pulangkan fail:baris:teks.",
    inputSchema: {
      type: "object",
      properties: {
        corak: {
          type: "string",
          description: "Corak regex untuk dicari, contoh 'pool.query', 'catatAktiviti', 'hantarNotifikasi'.",
        },
        fail: { type: "string", description: "Tapis fail (substring laluan), contoh 'routes/', 'risiko'." },
        root: { type: "string", description: "Ganti akar projek (jarang perlu)." },
      },
      additionalProperties: false,
      required: ["corak"],
    },
    fn: async (args) => {
      const root = await resolveRoot(args);
      if (!args.corak) throw new Error("Param 'corak' wajib diisi.");
      const hit = await scanCari(root, args.corak, args.fail || "");
      return OK(hit.length ? hit : { nota: "Tiada padanan." });
    },
  },
  {
    name: "rms_flow",
    description:
      "Baca dokumen pipeline flow architecture RMS (docs/pipeline) untuk satu modul atau senarai modul. Guna untuk faham aliran frontend->backend->DB bagi sesuatu modul.",
    inputSchema: {
      type: "object",
      properties: {
        modul: {
          type: "string",
          enum: ["semua", "general", "auth", "risiko", "rawatan", "pemantauan", "pindaan", "laporan", "dashboard", "pengguna"],
          description:
            "Modul flow: general (seni bina), auth (login+RBAC), risiko (senarai/daftar), rawatan, pemantauan, pindaan, laporan, dashboard (paparan utama), pengguna (urus pengguna + notifikasi + log aktiviti).",
        },
        root: { type: "string", description: "Ganti akar projek (jarang perlu)." },
      },
      additionalProperties: false,
    },
    fn: async (args) => {
      const root = await resolveRoot(args);
      return OK(await bacaFlow(root, args.modul || "semua"));
    },
  },
];

const byName = new Map(TOOLS.map((t) => [t.name, t]));

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function replyError(id, code, message) {
  process.stdout.write(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n"
  );
}

const SUPPORTED_VERSIONS = new Set(["2024-11-05", "2025-03-26", "2025-06-18"]);

function handle(msg) {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") return;
  const { method, params = {}, id } = msg;

  switch (method) {
    case "initialize":
      respond(id, {
        protocolVersion: SUPPORTED_VERSIONS.has(params.protocolVersion)
          ? params.protocolVersion
          : "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
      return;
    case "ping":
      respond(id, {});
      return;
    case "tools/list":
      respond(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      });
      return;
    case "tools/call": {
      const tool = byName.get(params.name);
      if (!tool) {
        if (id !== undefined) replyError(id, -32601, `Tool tidak diketahui: ${params.name}`);
        return;
      }
      Promise.resolve()
        .then(() => tool.fn(params.arguments || {}))
        .then((result) => respond(id, result))
        .catch((err) => {
          if (id !== undefined) {
            respond(id, {
              content: [{ type: "text", text: "Ralat: " + (err && err.message ? err.message : err) }],
              isError: true,
            });
          }
        });
      return;
    }
    case "resources/list":
      respond(id, { resources: [] });
      return;
    case "resources/templates/list":
      respond(id, { resourceTemplates: [] });
      return;
    case "prompts/list":
      respond(id, { prompts: [] });
      return;
    case "notifications/initialized":
    case "notifications/cancelled":
    case "initialized":
      return;
    default:
      if (id !== undefined) {
        // notifikasi tanpa id: abaikan
        if (method.startsWith("notifications/")) return;
        replyError(id, -32601, `Method tidak disokong: ${method}`);
      }
  }
}

process.stderr.write(`rms-boost v${SERVER_VERSION} sedia (MCP stdio).\n`);

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    handle(JSON.parse(line));
  } catch (err) {
    process.stderr.write("rms-boost: mesej tidak sah - " + err.message + "\n");
  }
});