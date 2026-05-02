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
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // node 明示: 親プロセスが `bun run --bun ...` 経由のとき --bun が子プロセスに
    // 伝播し、vite が Bun runtime で起動して @tailwindcss/vite が daisyui plugin の
    // CSS を読み取れず Internal server error / 起動 hang になるため
    // (再現: bun@1.3.11 + tailwindcss@4.2.4 + daisyui@5.5.19)。
    command: "node node_modules/.bin/vite --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_USE_MSW: "true" },
  },
});
