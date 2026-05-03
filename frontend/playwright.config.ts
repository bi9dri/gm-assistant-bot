import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/vrt",
  testMatch: "**/*.vrt.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
    },
  },
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}",
  use: {
    trace: "on-first-retry",
    timezoneId: "Asia/Tokyo",
    locale: "ja-JP",
    // viewport は project 側で指定 (mobile は devices["iPhone 13"] が決める)。
  },
  projects: [
    {
      name: "chromium-desktop",
      testIgnore: "**/storybook/**",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "chromium-mobile",
      testIgnore: "**/storybook/**",
      use: {
        ...devices["iPhone 13"],
        // iPhone 13 device は webkit デフォルト。CI は chromium のみキャッシュしているため
        // mobile emulation (viewport / isMobile / hasTouch / deviceScaleFactor) だけ流用して
        // browser engine は chromium に固定する。
        defaultBrowserType: "chromium",
        baseURL: "http://localhost:3000",
      },
    },
    {
      name: "chromium-storybook",
      testMatch: "**/storybook/**/*.vrt.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:6007",
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: [
    {
      // `--bun` 不使用: Bun runtime だと @tailwindcss/vite が daisyui plugin の
      // CSS を読み取れず Internal server error になるため (再現: bun@1.3.11 + tailwindcss@4.2.4 + daisyui@5.5.19)。
      command: "bun run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_USE_MSW: "true" },
    },
    {
      // Storybook を事前に build しておく必要あり (`bun run --bun build-storybook`)。
      // CI では vrt job 内の build-storybook step がこれを保証する。
      command: "bun run storybook:serve-static",
      url: "http://localhost:6007/index.json",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
