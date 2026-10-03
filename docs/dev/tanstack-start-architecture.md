# TanStack Start 構成 (WS2 #307)

TanStack Router の SPA 構成から TanStack Start (SSR) へ移行した。本番ホスティングは WS3 で Workers Static Assets に統合するが、その土台がこの構成。`/api` は従来どおり別 Worker (Hono) のまま。

## ディレクトリ / entry

```
frontend/
├── wrangler.jsonc        # @cloudflare/vite-plugin が読む Worker 設定 (SSR entry を指定)
├── vite.config.ts        # cloudflare + tanstackStart + tailwind + react
└── src/
    ├── router.tsx        # getRouter() — router を生成して export (Start が必須とする)
    ├── client.tsx        # クライアント entry。MSW を hydrate 前に start する
    ├── routeTree.gen.ts  # Start が生成 (committed)
    └── routes/__root.tsx # head (meta/CSP/gtag) + shellComponent (<html>)
```

- `index.html` と `src/main.tsx` は廃止。HTML シェルは `__root.tsx` の `shellComponent`、`<head>` の内容は `head()` が持つ。CSP は `meta` の `httpEquiv`、gtag は `scripts` で宣言する。
- `router.tsx` は Start が必須 entry (`src/router.tsx`)。`getRouter()` を export する形が Start の期待する契約。
- `client.tsx` は任意 entry。Vite の demo にあるように `hydrateRoot(document, <StartClient />)` する。既存の MSW bootstrapping をここへ移した。

## `@cloudflare/vite-plugin`

`cloudflare({ viteEnvironment: { name: "ssr" } })` を `tanstackStart()` より前に置く。**`wrangler.jsonc` が無いと dev で全ルートが 404 になる** (plugin が Worker 環境を決められない)。`main` は `@tanstack/react-start/server-entry`。

dev server は workerd 上で SSR を実行する。`server.proxy` の `/api` 中継は plugin 経由でもそのまま効く。

## Storybook / Vitest からは plugin を外す

`vite.config.ts` の config は Storybook の builder と Vitest も丸ごと読み込む。Start/Cloudflare plugin を有効にしたままだと両方壊れる:

- Storybook build: `multiple entries detected: assets/index-*.js`
- Vitest: `AssertionError: depsOptimizer is required in dev mode`

`process.env.STORYBOOK === "true"` / `process.env.VITEST === "true"` のときだけ両 plugin を外す。unit test / component story は Start を必要としない。

## SSR セーフティ

- `ThemeProvider` は module 直下で `window`/`localStorage` を触っていたため、`typeof window === "undefined"` をガードした遅延初期化に変更。SSR は `"light"`、クライアントは保存値を読む。
- `db/database.ts` は `NODE_ENV === "test"` のときだけ `fake-indexeddb` を動的 import する。SSR では読み込まれない。Vite の optimizer がこの動的 import を起動後に発見して reload する問題は、client / ssr 両 env の `optimizeDeps.include` に `fake-indexeddb` を入れて防ぐ。

## 依存

- 追加: `@tanstack/react-start`, `@cloudflare/vite-plugin`
- 削除: `@tanstack/router-plugin` (Start plugin が route 生成を内包)
- 維持: `@tanstack/react-router` / devtools (`@tanstack/react-devtools`, `@tanstack/react-router-devtools`, `@tanstack/devtools-vite`)
