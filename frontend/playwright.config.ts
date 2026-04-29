import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/vrt",
  testMatch: "**/*.spec.ts",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    },
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run --bun dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    env: { VITE_MSW_ENABLED: "true", VITE_MSW_STRICT: "true" },
    timeout: 60_000,
  },
});
