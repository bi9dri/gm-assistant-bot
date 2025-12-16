# gm-assistant-bot

GameMaster's Assistantは、TRPGやマーダーミステリーのセッションを効率化するDiscord連携ツールです。Discord Webhookを使用してブラウザから直接Discordにメッセージを送信でき、ゲームマスターがストーリーテリングとプレイヤーとの対話に集中できるように設計されています。

## アーキテクチャ

- **フロントエンドのみのSPA**: React 19 + TanStack Router + DaisyUI
  - ローカル開発: ViteでHMR対応
  - 本番環境: Cloudflare Workers Static Assets
- **Discord連携**: Webhookを使用した直接メッセージ送信（バックエンドサーバー不要）

## プロジェクト構造

```
.
├── src/                    # アプリケーションソースコード
│   ├── routes/             # ファイルベースルーティング (TanStack Router)
│   │   ├── __root.tsx      # ルートレイアウト
│   │   ├── index.tsx       # ホームページ
│   │   └── discord-bot.tsx # Discord設定ページ
│   ├── theme/              # テーマコンポーネント
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeIcon.tsx
│   │   └── ThemeSwichMenu.tsx
│   ├── main.tsx            # エントリーポイント
│   └── styles.css          # Tailwind CSS + DaisyUI設定
├── public/                 # 静的アセット
├── index.html              # HTMLエントリーポイント
├── vite.config.ts          # Vite設定
├── wrangler.toml           # Cloudflare Workers設定
├── package.json            # 依存関係とスクリプト
└── tsconfig.json           # TypeScript設定
```

## 技術スタック

- **フレームワーク**: React 19
- **UIライブラリ**: DaisyUI
- **スタイリング**: Tailwind CSS v4
- **ルーティング**: TanStack Router (ファイルベース)
- **ビルドツール**: Vite
- **テスト**: Vitest + Testing Library
- **ランタイム**: Bun
- **デプロイ**: Cloudflare Workers Static Assets

### 開発ツール

- **リンティング**: oxlint
- **フォーマット**: oxfmt
- **型チェック**: oxlint-tsgolint / TypeScript
- **デプロイ**: Wrangler (Cloudflare CLI)

## はじめに

### 前提条件

- [Bun](https://bun.sh/) v1.3.4以降
- [Cloudflareアカウント](https://dash.cloudflare.com/sign-up) (デプロイ用)
- Discord Webhook URL (Discord連携を使用する場合)

### インストール

```bash
bun install
```

### 環境変数の設定

Discord Webhookを使用する場合、ルートディレクトリに `.env` ファイルを作成します:

```env
VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
```

### 開発

開発サーバーを起動:

```bash
bun run dev
```

サーバーは http://localhost:3000 で利用可能になります

### ビルド

本番環境用の静的サイトをビルド:

```bash
bun run build
```

出力先: `dist/`

### プレビュー

本番ビルドをローカルでテスト:

```bash
bun run preview
```

サーバーは http://localhost:4173 で利用可能になります

### リンティング

```bash
# Linterを実行
bun run lint

# コードフォーマット
bun run format

# 型チェック
bun run type-check
```

### テスト

```bash
bun run test
```

## デプロイ

Cloudflare Workers Static Assetsへのデプロイ:

```bash
bun run deploy
```

## 開発ワークフロー

1. **ローカル開発**: `bun run dev` でVite HMRを使った高速な開発
2. **ビルド**: `bun run build` で静的ファイルを生成
3. **プレビュー**: `bun run preview` で本番ビルドをローカルでテスト
4. **デプロイ**: `bun run deploy` でビルドしてCloudflare Workersにデプロイ

## 機能

### フロントエンド

- DaisyUIコンポーネントを使用したモダンなReact 19
- TanStack Routerによるファイルベースルーティング
- テーマ切り替えサポート (light、dark、cupcake、synthwaveなどDaisyUIの全テーマ)
- Tailwind CSS v4によるレスポンシブデザイン
- Vite HMRによる高速な開発
- Bunテストランナーによる高速なテスト実行

### Discord連携

Discord Webhookを使用してブラウザから直接メッセージを送信:

```typescript
// Discord Webhookにメッセージを送信
const sendToDiscord = async (message: string) => {
  const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL;

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
};
```

## テーマのカスタマイズ

DaisyUIの全テーマがサポートされています。テーマを切り替えるには、アプリケーション内のテーマメニューを使用してください。

利用可能なテーマ:
- light
- dark
- cupcake
- bumblebee
- emerald
- corporate
- synthwave
- retro
- cyberpunk
- valentine
- halloween
- garden
- forest
- aqua
- lofi
- pastel
- fantasy
- wireframe
- black
- luxury
- dracula
- cmyk
- autumn
- business
- acid
- lemonade
- night
- coffee
- winter
- dim
- nord
- sunset

## ライセンス

MIT License
