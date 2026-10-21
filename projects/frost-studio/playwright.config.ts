import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 60000,
  workers: 1,
  use: {
    channel: "chrome",
    baseURL: process.env.FROST_URL ?? "http://127.0.0.1:5178",
    viewport: { width: 1600, height: 1000 },
    headless: true,
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "output/playwright/results.json" }],
  ],
  webServer: process.env.FROST_EXTERNAL_SERVER
    ? undefined
    : {
        command: "node node_modules/vite/bin/vite.js --host 127.0.0.1",
        url: "http://127.0.0.1:5178",
        reuseExistingServer: true,
        timeout: 30000,
      },
});
