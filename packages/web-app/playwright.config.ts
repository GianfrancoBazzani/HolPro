import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  outputDir:
    "../../.superpowers/sdd/2026-09-19-coach-dashboard/browser-results",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:4180",
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: "pnpm exec vite --config test/browser/fixture/vite.config.mjs",
    url: "http://127.0.0.1:4180",
    reuseExistingServer: !process.env.CI,
  },
});
