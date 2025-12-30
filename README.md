# gm-assistant-bot

GameMaster's Assistantは、TRPGやマーダーミステリーのセッションを効率化するDiscord連携ツールです。ゲームマスターがストーリーテリングとプレイヤーとの対話に集中できるようになることを目指しています。

## アーキテクチャ

Bunワークスペースを使用したモノレポ構成です。

### Frontend (SPA)
- **フレームワーク**: React + TanStack Router
- **UIライブラリ**: DaisyUI + Tailwind CSS
- **開発環境**: Vite (HMR対応)
- **本番環境**: Cloudflare Workers Static Assets
- **データ永続化**: Dexie.js (IndexedDB) - ブラウザ内保存
- **状態管理**: Zustand
- **ワークフロー**: React Flow によるノードベースエディタ

### Backend (API)
- **フレームワーク**: Hono
- **本番環境**: Cloudflare Workers
- **Discord連携**: @discordjs/rest を使用したDiscord APIとの通信
- **バリデーション**: Zod + @hono/zod-validator

### 主な機能
- **ノードベースワークフロー**: TRPG/マーダーミステリーセッション管理のためのワークフローシステム
- **テンプレート**: 再利用可能なワークフローテンプレート
- **Discord Bot管理**: 複数のBotトークンを保存・管理
- **Discord連携**:
  - ギルド一覧取得
  - カテゴリ作成
  - チャンネル作成・削除
  - ロール作成・削除
  - チャンネル権限管理
  - メッセージ・ファイル送信
- **進行補助**:
  - メモ、ガイド
  - フラグ管理

## プロジェクト構造

```
.
├── backend/                   # バックエンドAPI (Hono)
│   ├── src/
│   │   ├── index.ts           # Honoアプリケーション
│   │   ├── discord.ts         # Discord API操作
│   │   └── schemas.ts         # Zodスキーマ
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml          # Cloudflare Workers設定
│
├── frontend/                  # フロントエンドSPA (React)
│   ├── src/
│   │   ├── routes/            # ファイルベースルーティング (TanStack Router)
│   │   │   ├── __root.tsx     # ルートレイアウト
│   │   │   ├── index.tsx      # ホームページ
│   │   │   ├── bot/           # Discord Bot管理
│   │   │   │   ├── index.tsx  # Bot一覧
│   │   │   │   └── new.tsx    # Bot登録
│   │   │   ├── session/       # セッション管理
│   │   │   │   ├── index.tsx  # セッション一覧
│   │   │   │   ├── new.tsx    # セッション作成
│   │   │   │   └── $id.tsx    # セッション詳細
│   │   │   └── template/      # テンプレート管理
│   │   │       ├── index.tsx  # テンプレート一覧
│   │   │       ├── new.tsx    # テンプレート作成
│   │   │       └── $id.tsx    # テンプレートエディタ
│   │   ├── components/        # Reactコンポーネント
│   │   │   ├── Node/          # ワークフローノードコンポーネント
│   │   │   ├── BotCard.tsx
│   │   │   ├── CreateBot.tsx
│   │   │   ├── CreateSession.tsx
│   │   │   ├── SessionCard.tsx
│   │   │   ├── TemplateCard.tsx
│   │   │   └── TemplateEditor.tsx
│   │   ├── db/                # Dexie.js データベース
│   │   │   ├── models/        # データモデル
│   │   │   ├── database.ts    # データベース定義
│   │   │   ├── schemas.ts     # Zodスキーマ
│   │   │   └── instance.ts    # DBインスタンス
│   │   ├── stores/            # Zustand状態管理
│   │   │   └── templateEditorStore.ts
│   │   ├── theme/             # テーマ管理
│   │   ├── toast/             # トースト通知
│   │   ├── api.ts             # バックエンドAPIクライアント
│   │   ├── discord.ts         # Discord型定義
│   │   ├── main.tsx           # エントリーポイント
│   │   └── styles.css         # Tailwind CSS + DaisyUI
│   ├── public/                # 静的アセット
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── wrangler.toml
│
├── docs/                      # ドキュメント
│   └── node-workflow-system.md
├── package.json               # ルートpackage.json (ワークスペース設定)
├── CLAUDE.md                  # AI assistant向け説明書
└── README.md
```

## 技術スタック

### Frontend
- **フレームワーク**: React
- **UIライブラリ**: DaisyUI + Tailwind CSS
- **ルーティング**: TanStack Router (ファイルベース)
- **データベース**: Dexie.js (IndexedDB)
- **状態管理**: Zustand
- **ワークフローエディタ**: React Flow
- **バリデーション**: Zod

### Backend
- **フレームワーク**: Hono
- **Discord API**: @discordjs/rest + discord-api-types
- **バリデーション**: Zod + @hono/zod-validator

### 開発ツール
- **ランタイム**: Bun
- **ビルドツール**: Vite
- **テスト**: Vitest + Testing Library
- **リンティング**: oxlint
- **フォーマット**: oxfmt
- **型チェック**: TypeScript + oxlint-tsgolint

### デプロイ
- **Frontend**: Cloudflare Workers (Static Assets)
- **Backend**: Cloudflare Workers
- **デプロイツール**: Wrangler

## はじめに

### 前提条件

- [Bun](https://bun.sh/)

### インストール

依存関係をインストール:

```bash
bun install
```

### 開発

開発サーバーを起動（frontend: 3000, backend: 8787）:

```bash
bun dev
```

または個別に起動:

```bash
bun run --filter frontend dev

bun run --filter backend dev
```

### ビルド

本番用にビルド:

```bash
bun build
```

### プレビュー

本番ビルドをローカルでプレビュー:

```bash
bun run --filter frontend preview

bun run --filter backend preview
```

### リンティングとフォーマット

```bash
bun lint

bun format

bun type-check
```

### テスト

```bash
bun test
```

## デプロイ

Cloudflare Workersにデプロイ:

```bash
bun deploy
```

または個別に:

```bash
bun run --filter frontend deploy

bun run --filter backend deploy
```

## 開発ワークフロー

1. **ローカル開発**: `bun dev` でfrontend/backendを同時起動
2. **ビルド**: `bun build` でビルド
3. **プレビュー**: `bun run --filter <package> preview` でローカルテスト
4. **デプロイ**: `bun deploy` でCloudflare Workersにデプロイ

### コードの品質管理
- **リンティング**: `bun lint`
- **フォーマット**: `bun format`
- **型チェック**: `bun type-check`
- **テスト**: `bun test`

## 機能

### ワークフロー管理
- ノードベースのワークフローエディタ（React Flow使用）
- TRPG/マーダーミステリーセッション向けの専用設計
- テンプレートによる再利用可能なワークフロー
- セッション実行時の進捗トラッキング

### Discord連携 (Backend API経由)
- 複数のDiscord Botトークンを安全に保存（ブラウザIndexedDB）
- ギルド一覧の取得と管理
- カテゴリ作成（@everyoneロックされた権限）
- テキスト/ボイスチャンネル作成
- ロールベースのチャンネル権限設定
  - Writerロール: 読み書き可能、スレッド管理など
  - Readerロール: 閲覧のみ、ボイス接続は可能
- ロール作成・削除
- チャンネル削除・権限変更

### Backend API
- `/api/health` - ヘルスチェック
- `/api/profile` - Botプロフィール取得
- `/api/guilds` - ギルド一覧取得
- `/api/roles` - ロール作成・削除
- `/api/categories` - カテゴリ作成
- `/api/channels` - チャンネル作成・削除・権限変更

### UI/UX
- TanStack Routerによるファイルベースルーティング
- テーマ切り替えサポート（DaisyUIの全テーマ対応、LocalStorageに保存）
- Tailwind CSS + DaisyUIによるレスポンシブデザイン
- Vite HMRによる高速な開発体験
- トースト通知機能

### データ管理
- Dexie.js（IndexedDB）によるクライアントサイドデータ永続化
- Zustandによる状態管理
- 型安全なZodバリデーション（frontend/backend両方）
- インポート・エクスポート機能（実装予定）

## テーマのカスタマイズ

DaisyUIの全テーマがサポートされています。テーマを切り替えるには、アプリケーション内のテーマメニューを使用してください。

設定したテーマの情報はLocalStorageに保存されます。

## ライセンス

MIT License
