# gm-assistant-bot

GameMaster's Assistantは、TRPGやマーダーミステリーのセッションを効率化するDiscord連携ツールです。ゲームマスターがストーリーテリングとプレイヤーとの対話に集中できるようになることを目指しています。

## アーキテクチャ

フロントエンドとバックエンドが分離したモノレポ構成です。

### フロントエンド
- **フレームワーク**: React + TanStack Router
- **UIライブラリ**: DaisyUI + Tailwind CSS
- **開発環境**: Vite (HMR対応)
- **本番環境**: Cloudflare Workers Static Assets
- **データ永続化**: Dexie.js (IndexedDB) - ブラウザ内保存
- **バックエンド連携**: Hono RPC

### バックエンド
- **フレームワーク**: Hono
- **デプロイ先**: Cloudflare Workers
- **Discord連携**: discord.js
- **バリデーション**: Zod (@hono/zod-validator)
- **API機能**:
  - ギルド一覧取得
  - カテゴリ作成
  - チャンネル作成
  - ロール作成
  - ヘルスチェック

## プロジェクト構造

```
.
├── frontend/                  # フロントエンドアプリケーション
│   ├── src/                   # アプリケーションソースコード
│   │   ├── routes/            # ファイルベースルーティング (TanStack Router)
│   │   │   ├── __root.tsx     # ルートレイアウト
│   │   │   ├── index.tsx      # ホームページ
│   │   │   ├── session.tsx    # セッション管理
│   │   │   └── template.tsx   # テンプレート管理
│   │   ├── components/        # Reactコンポーネント
│   │   │   └── CreateSession.tsx  # セッション作成フォーム
│   │   ├── models/            # Dexie.js モデルとスキーマ
│   │   │   ├── gameSession.ts # ゲームセッションモデル
│   │   │   └── template.ts    # テンプレートモデル
│   │   ├── theme/             # テーマ管理
│   │   │   ├── ThemeProvider.tsx  # テーマプロバイダー
│   │   │   ├── ThemeSwichMenu.tsx # テーマ切り替えメニュー
│   │   │   └── ThemeIcon.tsx      # テーマアイコン
│   │   ├── toast/             # トースト通知
│   │   │   └── ToastProvider.tsx  # トーストプロバイダー
│   │   ├── db.ts              # Dexie.js データベース設定
│   │   ├── api.ts             # Backend API クライアント
│   │   ├── main.tsx           # エントリーポイント
│   │   └── styles.css         # Tailwind CSS v4 + DaisyUI
│   ├── public/                # 静的アセット
│   ├── index.html             # HTML エントリーポイント
│   ├── vite.config.ts         # Vite設定
│   ├── wrangler.toml          # Cloudflare Workers設定
│   └── package.json           # フロントエンド依存関係
├── backend/                   # バックエンドAPI
│   ├── src/
│   │   ├── index.ts           # Hono アプリケーション
│   │   ├── discord.ts         # Discord.js クライアント
│   │   ├── env.ts             # 環境変数型定義
│   │   └── handler/           # APIハンドラー
│   │       ├── healthcheck.ts     # ヘルスチェック
│   │       ├── listGuilds.ts      # ギルド一覧取得
│   │       ├── createCategory.ts  # カテゴリ作成
│   │       ├── createChannel.ts   # チャンネル作成
│   │       └── createRole.ts      # ロール作成
│   ├── wrangler.toml          # Cloudflare Workers設定
│   ├── .dev.vars              # 開発環境変数 (gitignored)
│   └── package.json           # バックエンド依存関係
└── package.json               # Workspaceルート
```

## 技術スタック

### フロントエンド
- **フレームワーク**: React
- **UIライブラリ**: DaisyUI + Tailwind CSS
- **ルーティング**: TanStack Router (ファイルベース)
- **データベース**: Dexie.js (IndexedDB)
- **バリデーション**: Zod
- **ビルドツール**: Vite
- **テスト**: Bun test
- **バックエンド連携**: Hono RPC

### バックエンド
- **フレームワーク**: Hono
- **Discord連携**: discord.js
- **バリデーション**: Zod (@hono/zod-validator)
- **型定義**: @cloudflare/workers-types

### 共通ツール
- **ランタイム**: Bun
- **デプロイ**: Cloudflare Workers (Static Assets + API)
- **リンティング**: oxlint
- **フォーマット**: oxfmt
- **型チェック**: TypeScript + oxlint-tsgolint

## はじめに

### 前提条件

- [Bun](https://bun.sh/)

### インストール

ワークスペース全体の依存関係をインストール:

```bash
bun install
```

### 開発

**フロントエンド開発サーバー:**
```bash
bun run dev:frontend
# または
cd frontend && bun run dev
```
サーバーは http://localhost:3000 で利用可能になります

**バックエンドAPI開発サーバー:**
```bash
bun run dev:backend
# または
cd backend && bun run preview
```
APIは http://localhost:8787 で利用可能になります

**Discord Bot Token設定（バックエンド用）:**
```bash
cd backend
# .dev.varsファイルを作成
echo "DISCORD_BOT_TOKEN=your_bot_token_here" > .dev.vars
cp .dev.vars .env
```

### ビルド

**フロントエンド:**
```bash
bun run build:frontend
```
出力先: `frontend/dist/`

**バックエンド:**
```bash
bun run build:backend
```
型チェックとフォーマットを実行します

### プレビュー

**フロントエンド:**
```bash
cd frontend && bun run preview
```
サーバーは http://localhost:4173 で利用可能になります

### リンティング

```bash
# すべてLint
bun run lint

# すべてフォーマット
bun run format

# 型チェック (frontend)
cd frontend && bun run type-check

# 型チェック (backend)
cd backend && bun run type-check
```

### テスト

```bash
bun run test
```

## デプロイ

### バックエンドAPI (初回のみ)

Discord Bot Tokenを設定:

```bash
cd backend
wrangler secret put DISCORD_BOT_TOKEN
# プロンプトでBot Tokenを入力
```

### デプロイコマンド

**フロントエンド:**
```bash
bun run deploy:frontend
```

**バックエンドAPI:**
```bash
bun run deploy:backend
```

## 開発ワークフロー

### フロントエンド
1. **ローカル開発**: `bun run dev:frontend` でVite HMRを使った高速な開発
2. **ビルド**: `bun run build:frontend` で静的ファイルを生成
3. **プレビュー**: `cd frontend && bun run preview` で本番ビルドをローカルでテスト
4. **デプロイ**: `bun run deploy:frontend` でCloudflare Workersにデプロイ

### バックエンド
1. **ローカル開発**: `bun run dev:backend` でAPIサーバーを起動
2. **ビルド**: `bun run build:backend` で型チェックとフォーマット
3. **デプロイ**: `bun run deploy:backend` でCloudflare Workersにデプロイ

### まとめて実行
- **リンティング**: `bun run lint` （全ワークスペース）
- **フォーマット**: `bun run format` （全ワークスペース）
- **型チェック**: `bun run type-check` （全ワークスペース）

## 機能

### フロントエンド機能
- TanStack Routerによるファイルベースルーティング
- テーマ切り替えサポート（DaisyUIの全テーマ対応、LocalStorageに保存）
- Tailwind CSS + DaisyUIによるレスポンシブデザイン
- Vite HMRによる高速な開発体験
- Dexie.js（IndexedDB）でのデータ永続化
  - ゲームセッション管理
  - テンプレート管理（ロール・チャンネル構成の保存）
- トースト通知機能

### バックエンドAPI機能
- Discord Bot API連携（discord.js使用）
- ギルド一覧取得
- カテゴリ作成
- チャンネル作成
- ロール作成
- ヘルスチェックエンドポイント

**特徴:**
- バックエンドサーバー不要でデータを永続化
- IndexedDBによる大容量データの保存が可能
- Zodによる型安全なバリデーション
- インポート・エクスポート機能（実装予定）

## テーマのカスタマイズ

DaisyUIの全テーマがサポートされています。テーマを切り替えるには、アプリケーション内のテーマメニューを使用してください。

設定したテーマの情報はLocalStorageに保存されます。

## ライセンス

MIT License
