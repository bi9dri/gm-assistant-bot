# gm-assistant-bot

GameMaster's Assistantは、TRPGやマーダーミステリーのセッションを効率化するDiscord連携ツールです。Discord Webhookを使用してブラウザから直接Discordにメッセージを送信でき、ゲームマスターがストーリーテリングとプレイヤーとの対話に集中できるようになることを目指しています。

## アーキテクチャ

- **フロントエンドのみのSPA**: React 19 + TanStack Router + DaisyUI
  - ローカル開発: ViteでHMR対応
  - 本番環境: Cloudflare Workers Static Assets
- **データ永続化**: Dexie.js (IndexedDB)
  - ブラウザ内でのデータ保存（バックエンドサーバー不要）
  - Discord Webhookプロフィール、セッション、テンプレートの管理
  - インポート・エクスポート機能（実装予定）
- **Discord連携**: Webhookを使用した直接メッセージ送信（バックエンドサーバー不要）

## プロジェクト構造

```
.
├── src/                       # アプリケーションソースコード
│   ├── routes/                # ファイルベースルーティング (TanStack Router)
│   │   ├── __root.tsx         # ルートレイアウト
│   │   ├── index.tsx          # ホームページ
│   │   └── discordWebhook.tsx # Discord Webhook設定ページ
│   ├── theme/                 # テーマコンポーネント
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeIcon.tsx
│   │   └── ThemeSwichMenu.tsx
│   ├── main.tsx               # エントリーポイント
│   └── styles.css             # Tailwind CSS + DaisyUI設定
├── public/                    # 静的アセット
├── index.html                 # HTMLエントリーポイント
├── vite.config.ts             # Vite設定
├── wrangler.toml              # Cloudflare Workers設定
├── package.json               # 依存関係とスクリプト
└── tsconfig.json              # TypeScript設定
```

## 技術スタック

- **フレームワーク**: React
- **UIライブラリ**: DaisyUI
- **スタイリング**: Tailwind CSS
- **ルーティング**: TanStack Router (ファイルベース)
- **データベース**: Dexie.js (IndexedDB wrapper)
- **バリデーション**: Zod
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

- [Bun](https://bun.sh/)

### インストール

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

- TanStack Routerによるファイルベースルーティング
- テーマ切り替えサポート (light、dark、cupcake、synthwaveなどDaisyUIの全テーマ)
- Tailwind CSS + DaisyUIによるレスポンシブデザイン
- Vite HMRによる高速な開発
- Bunテストランナーによる高速なテスト実行

### データ永続化

Dexie.js (IndexedDB) を使用したブラウザ内データストア:

```typescript
import Dexie, { type EntityTable } from "dexie";
import { z } from "zod";

// Zodスキーマ定義
export const DiscordProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  webhookUrl: z.string().url(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DiscordProfile = z.infer<typeof DiscordProfileSchema>;

// Dexieデータベース定義
const db = new Dexie("GameMasterAssistant") as Dexie & {
  discordProfiles: EntityTable<DiscordProfile, "id">;
  sessions: EntityTable<Session, "id">;
  templates: EntityTable<Template, "id">;
};

db.version(1).stores({
  discordProfiles: "id, name, createdAt",
  sessions: "id, name, createdAt",
  templates: "id, name, createdAt",
});
```

**特徴:**
- バックエンドサーバー不要でデータを永続化
- IndexedDBによる大容量データの保存が可能
- Zodによる型安全なバリデーション
- インポート・エクスポート機能（実装予定）

### Discord連携

Discord Webhookを使用してブラウザから直接メッセージを送信:

```typescript
// Discord Webhookにメッセージを送信
const sendToDiscord = async (message: string, webhookUrl: string) => {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
};
```

## テーマのカスタマイズ

DaisyUIの全テーマがサポートされています。テーマを切り替えるには、アプリケーション内のテーマメニューを使用してください。

設定したテーマの情報はLocalStorageに保存されます。

## ライセンス

MIT License
