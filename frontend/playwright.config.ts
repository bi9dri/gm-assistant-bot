import { defineConfig, devices } from "@playwright/test";

import type { VrtWorkerOptions } from "./test/vrt/fixtures";

const THEMES = ["light", "dark"] as const satisfies readonly VrtWorkerOptions["theme"][];

export default defineConfig<{}, VrtWorkerOptions>({
  testDir: "./test/vrt",
  testMatch: "**/*.vrt.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  maxFailures: process.env.CI ? 10 : 0,
  reporter: [
    process.env.CI ? ["github"] : ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  timeout: 20_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
    },
  },
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    timezoneId: "Asia/Tokyo",
    locale: "ja-JP",
    launchOptions: {
      args: ["--disable-lcd-text", "--font-render-hinting=none"],
    },
  },
  projects: THEMES.flatMap((theme) => [
    {
      name: `chromium-desktop-${theme}`,
      testIgnore: "**/storybook/**",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
        viewport: { width: 1280, height: 720 },
        colorScheme: theme,
        theme,
      },
    },
    {
      name: `chromium-mobile-${theme}`,
      testIgnore: "**/storybook/**",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        baseURL: "http://localhost:3000",
        colorScheme: theme,
        theme,
      },
    },
    {
      name: `chromium-storybook-${theme}`,
      testMatch: "**/storybook/**/*.vrt.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:6007",
        viewport: { width: 1280, height: 720 },
        colorScheme: theme,
        theme,
      },
    },
  ]),
  webServer: [
    {
      command: "pnpm exec vp dev --port 3000",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_USE_MSW: "true" },
    },
    {
      command: "pnpm run storybook:serve-static",
      url: "http://localhost:6007/index.json",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
