# TanStack Start 構成 (WS2 #307 / WS3 #306)

TanStack Router の SPA 構成から TanStack Start (SSR) へ移行した。本番ホスティングは
Workers Static Assets に統合済み (WS3)。`/api` は従来どおり別 Worker (Hono) のまま。

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

## ホスティング / デプロイ (WS3)

本番フロントは Workers Static Assets + Start SSR Worker。旧 GitHub Pages 配信は廃止。

- `frontend/wrangler.jsonc` が本番設定。`routes` でカスタムドメイン
  (`gm-assistant-bot.bidri.dev`) を付ける。ビルド (`vp build`) すると
  `@cloudflare/vite-plugin` が `dist/server/wrangler.json`
  (Worker `dist/server/index.js` + assets `dist/client`) を生成し、
  `wrangler deploy` はそこへリダイレクトされる
- デプロイは `.github/workflows/deploy-frontend.yml` (`main` push)。
  要 Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- `/api` の同一オリジン中継はアプリ内 server route (`src/routes/api/$.ts`)。
  preview ビルド (`VITE_API_BASE_URL=""`) が使い、本番ビルドは直接 API origin を叩く。
  詳細は [pr-preview-environment.md](pr-preview-environment.md)
- CSP は二箇所で同じ policy を持つ: 静的アセット用 `public/_headers` と
  SSR HTML 用 `__root.tsx` の meta (`httpEquiv`)

## 依存

- 追加: `@tanstack/react-start`, `@cloudflare/vite-plugin`
- 削除: `@tanstack/router-plugin` (Start plugin が route 生成を内包)
- 維持: `@tanstack/react-router` / devtools (`@tanstack/react-devtools`, `@tanstack/react-router-devtools`, `@tanstack/devtools-vite`)
