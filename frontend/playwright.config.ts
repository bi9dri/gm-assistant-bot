import { defineConfig, devices } from "@playwright/test";

import type { VrtWorkerOptions } from "./test/vrt/fixtures";

const THEMES = ["light", "dark"] as const satisfies readonly VrtWorkerOptions["theme"][];

// VRT は Node ランタイムで動かす。`bun run --bun` は `node` を Bun 自身に差し替える
// shim ディレクトリを PATH 先頭に注入し、子孫プロセスすべてがそれを継承するため、
// 下の webServer が起動する vite まで Bun で動いてしまう。その vite は listen する前に
// 確率的にハングし、Playwright が 120 秒待ってタイムアウトする。vite 側のログが
// 出ないまま落ちるので、ここで検出して理由付きで即座に失敗させる。
if (typeof Bun !== "undefined") {
  throw new Error(
    "VRT must run on Node, not Bun: use `bun run --filter gm-assistant-bot-frontend test:vrt` (no `--bun`).",
  );
}

export default defineConfig<{}, VrtWorkerOptions>({
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
  // {projectName} に theme suffix が含まれるので light/dark の baseline は自動的に分離される
  // (例: `home-chromium-desktop-light-linux.png` / `home-chromium-desktop-dark-linux.png`)。
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}",
  use: {
    trace: "on-first-retry",
    timezoneId: "Asia/Tokyo",
    locale: "ja-JP",
    // viewport は project 側で指定 (mobile は devices["iPhone 13"] が決める)。
  },
  // Project は viewport (desktop / mobile / storybook) × theme (light / dark) のマトリクス。
  // theme 制御は二重: `colorScheme` で `prefers-color-scheme` (Tailwind `dark:` バリアント用)、
  // `theme` worker option で `localStorage.theme` (DaisyUI `data-theme` 属性用)。
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
        // iPhone 13 device は webkit デフォルト。CI は chromium のみキャッシュしているため
        // mobile emulation (viewport / isMobile / hasTouch / deviceScaleFactor) だけ流用して
        // browser engine は chromium に固定する。
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
      // `--bun` 不使用: Bun runtime だと @tailwindcss/vite が daisyui plugin の
      // CSS を読み取れず Internal server error になるため (再現: bun@1.3.11 + tailwindcss@4.2.4 + daisyui@5.5.19)。
      command: "bun run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // VITE_USE_MSW は MSW 有効化に加えて「VRT 用 dev server」の目印でもある
      // (vite.config.ts が devtools の event bus を切る判定に使う)。
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
