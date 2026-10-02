import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { URL, fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { type Plugin, defineConfig, lazyPlugins } from "vite-plus";

// MSW Service Worker は VRT 専用 artifact なので本番 dist に混入させない。
// public/ には置かず、dev サーバーの middleware からだけ /mockServiceWorker.js を配信する。
//
// 配信元は msw パッケージ同梱の worker script。`msw init` で生成したコピーをコミットすると
// msw を bump するたびにバージョンがズレ、worker が毎リクエスト互換性警告を出す。
function mswServiceWorkerDevOnly(): Plugin {
  // import.meta.resolve は使えない: storybook は vite の module runner 経由で
  // この config を読み込み、そこでは未実装のため build が落ちる。
  const swPath = createRequire(import.meta.url).resolve("msw/mockServiceWorker.js");
  return {
    name: "msw-service-worker-dev-only",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/mockServiceWorker.js", (_req, res) => {
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Service-Worker-Allowed", "/");
        res.end(readFileSync(swPath));
      });
    },
  };
}

export default defineConfig({
  plugins: lazyPlugins(() => [
    // VRT (`VITE_USE_MSW`) では devtools プラグインを完全に外す。VRT では不要な上、
    // ServerEventBus.start() は listen エラーで resolve も reject もせず configureServer が
    // 返らない、というハング要因を CI でも踏まないようにする。
    process.env.VITE_USE_MSW === "true" ? undefined : devtools(),
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    viteReact(),
    mswServiceWorkerDevOnly(),
  ]),
  // `db/database.ts` の `await import("fake-indexeddb")` を Vite が起動後に発見すると
  // 「optimized dependencies changed. reloading」で VRT 中にページが reload され、
  // Playwright がハングする。起動時の optimize に含めて reload を防ぐ。
  optimizeDeps: {
    include: ["fake-indexeddb"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "#test": fileURLToPath(new URL("./test", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    setupFiles: ["./test/unit.setup.ts"],
    // Vitest の module runner はトップレベル `resolve.alias` を効かせる前に
    // deps を外部解決しようとするため、`test.alias` にも同じマッピングが要る。
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "#test": fileURLToPath(new URL("./test", import.meta.url)),
    },
    coverage: {
      enabled: true,
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",

        // React コンポーネント — E2E フェーズで対応
        "src/components/Node/nodes/**",
        "src/components/Node/base/base-node.tsx",
        "src/components/Node/base/node-wrapper.tsx",
        "src/components/Node/base/editable-title.tsx",
        "src/components/Node/utils/DynamicValueInput.tsx",
        "src/components/Node/utils/FlagValueSelector.tsx",
        "src/components/Node/utils/PortaledSelect.tsx",
        "src/components/Node/utils/ResourceSelector.tsx",
        "src/toast/**",

        // ロジック無し DB モデル
        "src/db/models/Category.ts",
        "src/db/models/Channel.ts",
        "src/db/models/DiscordBot.ts",
        "src/db/models/Guild.ts",
        "src/db/models/Role.ts",

        // DB設定ファイル — upgrade callback は Dexie 内部 API に依存しテスト困難
        "src/db/database.ts",

        // React コンテキスト/フック
        "src/components/Node/contexts/**",
        "src/components/Node/utils/useTemplateResources.ts",

        // API クライアント — バックエンドテストで間接的にカバー
        "src/api.ts",

        // ファイルシステム — 外部 API (OPFS, zip.js) 依存が大部分
        "src/fileSystem.ts",

        // saveFileToOPFS が FileSystem (OPFS) に依存するため除外
        "src/components/Node/utils/messageSchema.ts",

        // step-list editor / シナリオドキュメント UI の React コンポーネント
        // (registry の DetailPanel・InlineBody 含む) — VRT でカバー
        "src/flow/components/**",
        "src/flow/registry/*.tsx",
        "src/scenario/components/**",

        // テストセットアップ
        "test/**",
      ],
      thresholds: { lines: 0.9, functions: 0.8, statements: 0.9 },
    },
  },
});
