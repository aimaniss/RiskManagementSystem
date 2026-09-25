// playwright.config.mjs — Konfigurasi E2E (Fasa 6).
// Prasyarat: backend (5001) & frontend (5175) — config ini akan mulakan sendiri
// jika belum hidup (reuseExistingServer), jaga direktori yang betul supaya .env
// backend & vite config frontend dimuat.

export default {
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5175",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node server.js",
      cwd: "../risk_backend",
      url: "http://localhost:5001/",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      cwd: "../risk_frontend",
      url: "http://localhost:5175",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [{ name: "chromium" }],
};