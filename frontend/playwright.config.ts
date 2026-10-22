import { defineConfig, devices } from "@playwright/test";

import type { VrtWorkerOptions } from "./test/vrt/fixtures";

const THEMES = ["light", "dark"] as const satisfies readonly VrtWorkerOptions["theme"][];

export default defineConfig<{}, VrtWorkerOptions>({
  testDir: "./test/vrt",
  testMatch: "**/*.vrt.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 失敗 1 件につき撮り直しは 1 回だけ。2 回だと baseline 総入れ替え時に
  // 148 テスト × リトライで timeout まで張り付く。
  retries: process.env.CI ? 1 : 0,
  // ubuntu-latest (public repo) は 4 vCPU。直列では 1 コアしか使わないので 4 で回す。
  // route 側は Vite dev server を共有するが、context ごとに IndexedDB もテーマも
  // 隔離されているため screenshot は干渉しない。
  workers: process.env.CI ? 4 : undefined,
  // 全滅系の失敗 (dev server ダウン等) で 148 テストを走り切る前に打ち切る。
  maxFailures: process.env.CI ? 10 : 0,
  // baseline はリポジトリにコミットし、Playwright が自前で比較する。
  // 生成・更新の責任は CI (Linux) が持つ。
  reporter: [
    process.env.CI ? ["github"] : ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  // 1 枚あたりの実測は約 1 秒。30 秒待つのは dev server のハングだけなので、
  // 失敗時の待ちを短くしてリトライ込みの最悪ケースを縮める。
  timeout: 20_000,
  expect: {
    toHaveScreenshot: {
      // アンチエイリアス等のレンダリング微差は許容しつつ、小さな退行は検出する。
      // 画像サイズに依存しない絶対値で判定する。
      maxDiffPixels: 100,
    },
  },
  // OS ごとに描画が異なるため `{platform}` で baseline を分ける。コミットするのは
  // CI (Linux) が生成するものだけで、他は frontend/.gitignore で除外する。
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}",
  use: {
    trace: "on-first-retry",
    // 失敗時のスクリーンショットを artifact に含めてデバッグに使う。
    screenshot: "only-on-failure",
    timezoneId: "Asia/Tokyo",
    locale: "ja-JP",
    // サブピクセル描画とフォントヒンティングを切り、同じ baseline を共有する範囲で
    // glyph 差を減らす。
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
