import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/vrt",
  testMatch: "**/*.spec.ts",
  // project/platform suffix を落とし baseline path を CI/local で portable にする (font 等の決定性は別途 #150)
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      // 暫定値: anti-aliasing 余裕で選択。本格的なチューニング (font ready / viewport 固定) は #150
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
    // CI ではクリーンな fresh boot、ローカルでは再利用して反復速度を確保
    reuseExistingServer: !process.env.CI,
    // VITE_MSW_STRICT=true は MSW worker 起動後の unhandled request を error にして VRT が live network を絶対に叩かないよう保証する
    env: { VITE_MSW_ENABLED: "true", VITE_MSW_STRICT: "true" },
    timeout: 60_000,
  },
});
