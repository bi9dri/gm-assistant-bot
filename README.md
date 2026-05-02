# gm-assistant-bot

GameMaster's Assistant は、TRPG やマーダーミステリーのセッションを効率化する Discord 連携ツール。
GM がストーリーテリングとプレイヤーとの対話に集中できることを目指す。

## 主な機能

- **ノードベースワークフローエディタ**: ビジュアルエディタ上で Discord 操作 (カテゴリ・チャンネル・ロールの作成/削除、権限管理、メッセージ送信) をノードとして組み合わせ、シナリオ進行を自動化する。
- **テンプレート**: 作成したワークフローを再利用可能なテンプレートとしてブラウザの IndexedDB に保存する。
- **Discord 連携バックエンド**: Cloudflare Workers 上の Hono API が Discord REST API へのプロキシとして動作する。

## アーキテクチャ

Bun workspace monorepo:

| パッケージ | スタック | デプロイ先 |
| --- | --- | --- |
| `frontend/` | React + Vite + TanStack Router + Tailwind CSS / daisyUI + Zustand + Dexie + React Flow | GitHub Pages |
| `backend/` | Hono + Zod + discord.js | Cloudflare Workers |

詳細は `docs/dev/` を参照:

- [node-system-architecture.md](docs/dev/node-system-architecture.md)
- [filesystem-architecture.md](docs/dev/filesystem-architecture.md)
- [testing-strategy.md](docs/dev/testing-strategy.md)

## 開発環境セットアップ

### 前提

- [devbox](https://www.jetify.com/devbox)

`devbox shell` に入れば `devbox.json` で pin された Bun / pinact / osv-scanner が揃う。Bun などをホストに直接インストールする必要はない。

```bash
devbox shell
bun install
```

### 開発サーバ

frontend (Vite, :3000) と backend (Wrangler dev, :8787) を同時に起動:

```bash
bun run --bun dev
```

### 認証情報の取り扱い

このプロジェクトは秘匿情報をどこにも保存しない設計:

- ユーザーが自分で発行した Discord Bot Token はブラウザの IndexedDB にのみ保存され、リクエストごとに `X-Discord-Bot-Token` ヘッダで backend に渡される。
- backend は受け取った token を保持せず、Discord REST API へのプロキシとして動作する。
- リポジトリ / `.env` / Cloudflare Workers secrets に Bot Token 等を設定する必要は無い。

## コマンド

ルートから `bun --filter '*'` で frontend / backend に同名スクリプトを並列実行する。

```bash
bun run --bun dev         # 開発サーバ起動
bun run --bun build       # ビルド
bun run --bun test        # テスト
bun run --bun typecheck   # 型チェック
bun run --bun lint        # lint
bun run --bun format      # format
bun run knip              # 未使用 export / dep の検出
bun run ncu               # 依存更新チェック (cooldown 7 日)
```

ワークスペース個別実行は `bun run --bun --filter <name> <script>`。

## テスト

- **Unit / 統合**: Bun の組み込みテストランナー (`bun run --bun test`)。
- **Visual Regression Testing**: Playwright + Storybook + MSW。frontend で `bun run --bun --filter gm-assistant-bot-frontend test:vrt`。
- **Storybook 単体起動**: `bun run --bun --filter gm-assistant-bot-frontend storybook` (ポート 6006)。

戦略の詳細は [testing-strategy.md](docs/dev/testing-strategy.md)。

## デプロイ

- **frontend**: `main` への push で GitHub Actions (`.github/workflows/deploy-frontend.yml`) が走り、GitHub Pages に自動デプロイされる。
- **backend**: Cloudflare Workers に `gm-assistant-bot-api` としてデプロイ。Cloudflare アカウントと `wrangler login` が必要。

  ```bash
  bun run --bun --filter gm-assistant-bot-backend deploy
  ```

  custom domain は `backend/wrangler.toml` を参照。

## ライセンス

MIT License
