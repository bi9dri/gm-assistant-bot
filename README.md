# gm-assistant-bot

GameMaster's Assistant は、TRPG やマーダーミステリーのセッションを効率化する Discord 連携ツール。
GM がストーリーテリングとプレイヤーとの対話に集中できることを目指す。

## 主な機能

- **ノードベースワークフローエディタ**: ビジュアルエディタ上で Discord 操作 (カテゴリ・チャンネル・ロールの作成/削除、権限管理、メッセージ送信) をノードとして組み合わせ、シナリオ進行を自動化する。
- **テンプレート**: 作成したワークフローを再利用可能なテンプレートとしてブラウザの IndexedDB に保存する。
- **Discord 連携バックエンド**: Cloudflare Workers 上の Hono API が Discord REST API へのプロキシとして動作する。

## アーキテクチャ

pnpm workspace monorepo (Node 24 + Vite+):

| パッケージ  | スタック                                                                              | デプロイ先         |
| ----------- | ------------------------------------------------------------------------------------- | ------------------ |
| `frontend/` | React + Vite + TanStack Start + Tailwind CSS / daisyUI + Zustand + Dexie + React Flow | Cloudflare Workers |
| `backend/`  | Hono + Zod + discord.js                                                               | Cloudflare Workers |

詳細は `docs/dev/` を参照:

- [node-system-architecture.md](docs/dev/node-system-architecture.md)
- [filesystem-architecture.md](docs/dev/filesystem-architecture.md)
- [testing-strategy.md](docs/dev/testing-strategy.md)

## 開発環境セットアップ

### 前提

- Node 24 LTS (`^22.18.0 || ^24.11.0 || >=26.0.0`)
- pnpm 12.6.0 (`packageManager` / `devEngines` で固定)

Vite+ (`vite-plus` 同梱の `vp` CLI) がビルド / テスト / 整形を担う。依存をインストール:

```bash
pnpm install
```

### 開発サーバ

frontend (Vite, :3000) を起動 (backend は別途 `pnpm --filter gm-assistant-bot-backend dev`):

```bash
pnpm dev
```

### 認証情報の取り扱い

このプロジェクトは秘匿情報をどこにも保存しない設計:

- ユーザーが自分で発行した Discord Bot Token はブラウザの IndexedDB にのみ保存され、リクエストごとに `X-Discord-Bot-Token` ヘッダで backend に渡される。
- backend は受け取った token を保持せず、Discord REST API へのプロキシとして動作する。
- リポジトリ / `.env` / Cloudflare Workers secrets に Bot Token 等を設定する必要は無い。

## コマンド

```bash
pnpm dev                  # 開発サーバ起動
pnpm build                # ビルド
pnpm test                 # テスト
pnpm typecheck            # 型チェック
pnpm lint                 # lint
pnpm format               # format
pnpm knip                 # 未使用 export / dep の検出
```

ワークスペース個別実行は `pnpm --filter <name> <script>`。

## テスト

- **Unit / 統合**: Vite+ 同梱の Vitest (`vp test` / `pnpm test`)。
- **Visual Regression Testing**: Playwright + Storybook + MSW。frontend で `pnpm --filter gm-assistant-bot-frontend test:vrt`。
- **Storybook 単体起動**: `pnpm --filter gm-assistant-bot-frontend storybook` (ポート 6006)。

戦略の詳細は [testing-strategy.md](docs/dev/testing-strategy.md)。

## デプロイ

- **frontend**: `main` への push で GitHub Actions (`.github/workflows/deploy-frontend.yml`) が走り、Cloudflare Workers (Static Assets + TanStack Start SSR) に自動デプロイされる。要リポジトリ Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`。custom domain は `frontend/wrangler.jsonc` を参照。
- **backend**: Cloudflare Workers に `gm-assistant-bot-api` としてデプロイ。Cloudflare アカウントと `wrangler login` が必要。

  ```bash
  pnpm --filter gm-assistant-bot-backend deploy
  ```

  custom domain は `backend/wrangler.toml` を参照。

## ライセンス

MIT License
