# gm-assistant-bot

GameMaster's Assistantは、TRPGやマーダーミステリーのセッションを効率化するDiscord botです。一般的なGMタスクを自動化することで、ゲームマスターがストーリーテリングとプレイヤーとの対話に集中できるように設計されています。

## アーキテクチャ

- **バックエンド**: デュアルデプロイメント対応のTypeScriptアプリケーションサーバー
  - ローカル開発: Bunランタイムでホットリロード
  - 本番環境: Cloudflare Workers
- **APIレイヤー**: E2Eの型安全性を提供するHonoフレームワークとHono RPC
- **フロントエンド**: TanStack RouterとDaisyUIを使用したReact SPA
  - ローカル開発: ViteでHMR対応
  - 本番環境: Cloudflare Workers Static Assets

## プロジェクト構造

```
.
├── backend/              # バックエンドアプリケーション
│   ├── src/
│   │   ├── handler/     # ルートハンドラ
│   │   └── index.ts     # Honoアプリ (RPCのためにAppTypeをエクスポート)
│   ├── package.json
│   └── wrangler.toml    # Cloudflare Workers設定
├── ui/                  # フロントエンドアプリケーション
│   └── web/             # TanStack Routerを使用したReact SPA
│       ├── src/
│       │   ├── routes/  # ファイルベースルーティング (TanStack Router)
│       │   ├── theme/   # テーマコンポーネント
│       │   ├── api.ts   # Hono RPCクライアント
│       │   └── main.tsx # エントリーポイント
│       ├── index.html
│       ├── vite.config.ts
│       ├── package.json
│       └── wrangler.toml
└── package.json         # ルートワークスペース設定
```

## 技術スタック

### バックエンド
- **ランタイム**: Bun (ローカル) / Cloudflare Workers (本番環境)
- **言語**: TypeScript
- **フレームワーク**: Hono
- **ミドルウェア**: CORS, Logger
- **データベース**: 未定
- **バリデーション**: @hono/zod-validator + Zod

### フロントエンド
- **フレームワーク**: React
- **UIライブラリ**: DaisyUI
- **スタイリング**: Tailwind CSS
- **ルーティング**: TanStack Router (ファイルベース)
- **APIクライアント**: Hono RPC (hono/client) - E2Eの型安全性
- **ビルドツール**: Vite
- **テスト**: Vitest + Testing Library

### 開発ツール
- **リンティング**: oxlint
- **フォーマット**: oxfmt
- **型チェック**: oxlint-tsgolint / TypeScript
- **デプロイ**: Wrangler (Cloudflare CLI)

## はじめに

### 前提条件

- [Bun](https://bun.sh/) v1.3.4以降
- [Cloudflareアカウント](https://dash.cloudflare.com/sign-up) (デプロイ用)

### インストール

```bash
bun install
```

### 開発

#### フルスタック開発を開始

バックエンドとフロントエンドの両方をホットリロードで起動 (ルートディレクトリから):

```bash
bun run dev
```

- バックエンド: http://localhost:3000
- フロントエンド: http://localhost:3000 (Vite開発サーバー)

#### バックエンドのみ起動

backendディレクトリから:

```bash
cd backend
bun run dev
```

サーバーは http://localhost:3000 で利用可能になります

#### フロントエンドのみ起動

frontendディレクトリから:

```bash
cd ui/web
bun run dev
```

サーバーは http://localhost:3000 で利用可能になります

#### 利用可能なエンドポイント

- `GET /api/health` - 基本的なヘルスチェック (バックエンド)

### フロントエンドのビルド

本番環境用の静的サイトをビルド (frontendディレクトリから):

```bash
cd ui/web
bun run build
```

出力先: `ui/web/dist/`

### プレビューでのテスト

**バックエンド (Cloudflare Workersランタイム):**
```bash
cd backend
bun run preview
```

サーバーは http://localhost:8787 で利用可能になります

**フロントエンド (Viteプレビュー):**
```bash
cd ui/web
bun run preview
```

サーバーは http://localhost:4173 で利用可能になります

### リンティング

**プロジェクト全体 (ルートディレクトリから):**
```bash
# 全サービスのLinterを実行
bun run lint

# 全サービスのコードフォーマット
bun run format

# 全サービスの型チェック
bun run type-check
```

**個別サービス:**
```bash
# バックエンド
cd backend
bun run lint

# フロントエンド
cd ui/web
bun run lint
```

## デプロイ

### Cloudflare Workersへのデプロイ:

**バックエンド:**
```bash
cd backend
bun run deploy
```

**フロントエンド:**
```bash
cd ui/web
bun run deploy
```

**すべてデプロイ (ルートディレクトリから):**
```bash
bun run deploy
```

## 開発ワークフロー

### バックエンド
1. **ローカル開発**: `cd backend && bun run dev` でBunのホットリロードを使った高速な開発
2. **プレビュー**: `cd backend && bun run preview` で本番環境のランタイム (workerd) でテスト
3. **デプロイ**: `cd backend && bun run deploy` でCloudflare Workersにデプロイ

### フロントエンド
1. **ローカル開発**: `cd ui/web && bun run dev` でVite HMRを使った高速な開発
2. **ビルド**: `cd ui/web && bun run build` で静的ファイルを生成
3. **プレビュー**: `cd ui/web && bun run preview` で本番ビルドをローカルでテスト
4. **デプロイ**: `cd ui/web && bun run deploy` でビルドしてCloudflare Workersにデプロイ

### フルスタック
1. **開発**: `bun run dev` (ルートから) でバックエンドとフロントエンドの両方を起動
2. **デプロイ**: `bun run deploy` (ルートから) で両方のサービスをデプロイ、または各ディレクトリから個別にデプロイ

## 機能

### バックエンドAPI
- `/api/health` でのヘルスチェックエンドポイント
- クロスオリジンリクエストに対応したCORS
- Hono RPCによる型安全なAPI (E2Eの型安全性)
- @hono/zod-validatorによるリクエストバリデーション
- BunとCloudflare Workersの両方に対応した単一エントリーポイント

### フロントエンド
- DaisyUIコンポーネントを使用したモダンなReact 19
- Hono RPCクライアントによる型安全なAPI呼び出し (手動での型インポート不要)
- TanStack Routerによるファイルベースルーティング
- テーマ切り替えサポート (light、dark、cupcake、synthwaveなどDaisyUIの全テーマ)
- Tailwind CSS v4によるレスポンシブデザイン
- Vite HMRによる高速な開発

## 新しいAPIエンドポイントの追加

Hono RPCを使った完全な型安全性を持つAPIエンドポイントの追加方法:

1. `backend/src/handler/` にハンドラを作成:
```typescript
// backend/src/handler/greet.ts
import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import z from "zod";

export const validator = zValidator(
  "json",
  z.object({
    name: z.string(),
  })
);

export const handler = (c: Context) => {
  const { name } = c.req.valid("json");
  return c.json({
    message: `こんにちは、${name}さん!`,
  });
};
```

2. `backend/src/index.ts` にルートを追加:
```typescript
import * as greet from "./handler/greet";

const route = app
  .get("/health", healthcheck.validator, healthcheck.handler)
  .post("/greet", greet.validator, greet.handler); // 新しいルートを追加

export type AppType = typeof route; // 型に自動的に新しいルートが含まれる
```

3. フロントエンドで使用 - 手動でのクライアントコード作成不要
```typescript
// ui/web/src/routes/index.tsx
import api from "../api";

const response = await api.greet.$post({
  json: { name: "ヤマタロー" },
});
const data = await response.json(); // 自動で型付けされる
console.log(data.message);
```

これだけです! Hono RPCを通じて型がバックエンドからフロントエンドに自動的に伝播します。

## ライセンス

MIT License
