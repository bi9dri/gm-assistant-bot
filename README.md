# gm-assistant-bot

GameMaster's Assistantは、TRPGやマーダーミステリーのセッションを効率化するDiscord連携ツールです。ゲームマスターがストーリーテリングとプレイヤーとの対話に集中できるようになることを目指しています。

## アーキテクチャ

完全にブラウザで動作するシングルページアプリケーション (SPA) です。

### アプリケーション
- **フレームワーク**: React + TanStack Router
- **UIライブラリ**: DaisyUI + Tailwind CSS v4
- **開発環境**: Vite (HMR対応)
- **本番環境**: Cloudflare Workers Static Assets
- **データ永続化**: Dexie.js (IndexedDB) - ブラウザ内保存
- **Discord連携**: クライアントサイドからDiscord API v10に直接アクセス
- **ワークフロー**: @xyflow/react によるノードベースエディタ

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

## プロジェクト構造

```
.
├── src/                       # アプリケーションソースコード
│   ├── routes/                # ファイルベースルーティング (TanStack Router)
│   │   ├── __root.tsx         # ルートレイアウト
│   │   ├── index.tsx          # ホームページ
│   │   ├── session.tsx        # セッション管理
│   │   ├── bot/               # Discord Bot管理
│   │   │   ├── index.tsx      # Bot一覧
│   │   │   └── new.tsx        # Bot登録
│   │   └── template/          # テンプレート管理
│   │       ├── index.tsx      # テンプレート一覧
│   │       ├── new.tsx        # テンプレート作成
│   │       └── $id.tsx        # テンプレートエディタ
│   ├── components/            # Reactコンポーネント
│   │   ├── CreateSession.tsx  # セッション作成フォーム
│   │   ├── TemplateCard.tsx   # テンプレートカード
│   │   ├── TemplateEditor.tsx # ワークフローエディタ
│   │   └── BotCard.tsx        # Botカード
│   ├── models/                # Dexie.js モデルとスキーマ
│   │   ├── DiscordBot.ts      # Discord Botモデル
│   │   ├── GameSession.ts     # ゲームセッションモデル
│   │   ├── SessionNode.ts     # セッションワークフローノード
│   │   ├── Guild.ts           # Discordギルドモデル
│   │   ├── Category.ts        # Discordカテゴリモデル
│   │   ├── Channel.ts         # Discordチャンネルモデル
│   │   ├── Role.ts            # Discordロールモデル
│   │   ├── Template.ts        # テンプレートモデル
│   │   └── TemplateNode.ts    # テンプレートワークフローノード
│   ├── theme/                 # テーマ管理
│   │   ├── ThemeProvider.tsx  # テーマプロバイダー
│   │   ├── ThemeSwichMenu.tsx # テーマ切り替えメニュー
│   │   └── ThemeIcon.tsx      # テーマアイコン
│   ├── toast/                 # トースト通知
│   │   └── ToastProvider.tsx  # トーストプロバイダー
│   ├── db.ts                  # Dexie.js データベース設定
│   ├── discord.ts             # Discord API クライアント
│   ├── main.tsx               # エントリーポイント
│   └── styles.css             # Tailwind CSS v4 + DaisyUI
├── public/                    # 静的アセット
├── docs/                      # ドキュメント
│   └── node-workflow-system.md # ワークフローシステム設計書
├── index.html                 # HTML エントリーポイント
├── vite.config.ts             # Vite設定
├── wrangler.toml              # Cloudflare Workers設定
├── tsconfig.json              # TypeScript設定
├── package.json               # 依存関係とスクリプト
├── CLAUDE.md                  # AI assistant向け説明書
└── README.md                  # プロジェクトドキュメント
```

## 技術スタック

### コアライブラリ
- **フレームワーク**: React
- **UIライブラリ**: DaisyUI + Tailwind CSS
- **ルーティング**: TanStack Router (ファイルベース)
- **データベース**: Dexie.js (IndexedDB)
- **ワークフローエディタ**: @xyflow/react
- **バリデーション**: Zod
- **Discord API**: discord-api-types

### 開発ツール
- **ランタイム**: Bun
- **ビルドツール**: Vite
- **テスト**: Vitest
- **リンティング**: oxlint
- **フォーマット**: oxfmt
- **型チェック**: TypeScript + oxlint-tsgolint

### デプロイ
- **ホスティング**: Cloudflare Workers (Static Assets)
- **デプロイツール**: Wrangler

## はじめに

### 前提条件

- [Bun](https://bun.sh/) 最新版

### インストール

依存関係をインストール:

```bash
bun install
```

### 開発

開発サーバーを起動:

```bash
bun run dev
```

サーバーは http://localhost:3000 で利用可能になります

### ビルド

本番用にビルド:

```bash
bun run build
```

出力先: `dist/`

### プレビュー

本番ビルドをローカルでプレビュー:

```bash
bun run preview
```

サーバーは http://localhost:4173 で利用可能になります

### リンティングとフォーマット

```bash
# Lint
bun run lint

# Format
bun run format

# 型チェック
bun run type-check
```

### テスト

```bash
bun run test
```

## デプロイ

Cloudflare Workersにデプロイ:

```bash
bun run deploy
```

## 開発ワークフロー

1. **ローカル開発**: `bun run dev` でVite HMRを使った高速な開発
2. **ビルド**: `bun run build` で静的ファイルを生成
3. **プレビュー**: `bun run preview` で本番ビルドをローカルでテスト
4. **デプロイ**: `bun run deploy` でCloudflare Workersにデプロイ

### コードの品質管理
- **リンティング**: `bun run lint`
- **フォーマット**: `bun run format`
- **型チェック**: `bun run type-check`
- **テスト**: `bun run test`

## 機能

### ワークフロー管理
- ノードベースのワークフローエディタ（@xyflow/react使用）
- TRPG/マーダーミステリーセッション向けの専用設計
- テンプレートによる再利用可能なワークフロー
- セッション実行時の進捗トラッキング

### Discord連携
- 複数のDiscord Botトークンを安全に保存
- ギルド一覧の取得と管理
- カテゴリ作成（@everyoneの権限をロック）
- テキスト/ボイスチャンネル作成
- ロールベースのチャンネル権限設定
  - Writerロール: 読み書き可能、スレッド管理など
  - Readerロール: 閲覧のみ、ボイス接続は可能
- ロール作成・削除
- チャンネル削除

### UI/UX
- TanStack Routerによるファイルベースルーティング
- テーマ切り替えサポート（DaisyUIの全テーマ対応、LocalStorageに保存）
- Tailwind CSS v4 + DaisyUIによるレスポンシブデザイン
- Vite HMRによる高速な開発体験
- トースト通知機能

### データ管理
- Dexie.js（IndexedDB）によるクライアントサイドデータ永続化
- バックエンドサーバー不要
- 型安全なZodバリデーション
- インポート・エクスポート機能（実装予定）

## テーマのカスタマイズ

DaisyUIの全テーマがサポートされています。テーマを切り替えるには、アプリケーション内のテーマメニューを使用してください。

設定したテーマの情報はLocalStorageに保存されます。

## ライセンス

MIT License
