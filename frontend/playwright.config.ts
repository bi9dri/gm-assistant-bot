import { createArgosReporterOptions } from "@argos-ci/playwright/reporter";
import { defineConfig, devices } from "@playwright/test";

import type { VrtWorkerOptions } from "./test/vrt/fixtures";

const THEMES = ["light", "dark"] as const satisfies readonly VrtWorkerOptions["theme"][];

export default defineConfig<{}, VrtWorkerOptions>({
  testDir: "./test/vrt",
  testMatch: "**/*.vrt.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Argos reporter がスクリーンショットと trace を Argos へアップロードする。
  // 比較は Argos 側で行うため、baseline PNG のコミットは不要。
  reporter: [
    process.env.CI ? ["github"] : ["list"],
    [
      "@argos-ci/playwright/reporter",
      // fork からの PR では Secrets が渡らず token が空になるため、token がある時だけ upload する。
      createArgosReporterOptions({ uploadToArgos: !!process.env.CI && !!process.env.ARGOS_TOKEN }),
    ],
  ],
  timeout: 30_000,
  use: {
    trace: "on-first-retry",
    // 失敗時のスクリーンショットを Argos に上げてデバッグに使う。
    screenshot: "only-on-failure",
    timezoneId: "Asia/Tokyo",
    locale: "ja-JP",
    // index.html の CSP が Argos の inline script を弾く。テスト時のみバイパスする
    // (Argos docs: "Configure Playwright to bypass CSP")。
    bypassCSP: true,
    // サブピクセル描画とフォントヒンティングを切り、ローカルと CI の glyph を揃える。
    launchOptions: {
      args: ["--disable-lcd-text", "--font-render-hinting=none"],
    },
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
      // プロジェクト同梱の vite-plus を使う。グローバル `vp` は CI で別ビルドの
      // Vite を起動しうるため、`pnpm exec` でローカル解決に固定する。
      command: "pnpm exec vp dev --port 3000",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // VITE_USE_MSW は MSW 有効化に加えて「VRT 用 dev server」の目印でもある
      // (vite.config.ts が devtools の event bus を切る判定に使う)。
      env: { VITE_USE_MSW: "true" },
    },
    {
      // Storybook を事前に build しておく必要あり (`pnpm -F gm-assistant-bot-frontend build-storybook`)。
      // CI では vrt job 内の build-storybook step がこれを保証する。
      command: "pnpm run storybook:serve-static",
      url: "http://localhost:6007/index.json",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
