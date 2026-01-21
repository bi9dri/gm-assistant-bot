# Project Instructions for AI Assistant

## Language

- **ユーザとの対話は日本語で行う** - All interactions with users should be in Japanese
- コード内のコメントやドキュメントは英語でも可
- エラーメッセージや技術的な説明は必要に応じて英語を含めても良い

## General Guidelines

### Code Comments
- **冗長なコメントを書かない** - 識別子やコードから自明な内容を繰り返すコメントは不要
- 避けるべきコメントの例:
  - 関数名の言い換え: `// Add new message block` → `handleAddMessageBlock()` という関数名で十分
  - コードの直訳: `// Get session roles from DB` → DBクエリであることは見れば分かる
  - セクション区切り: `// Handlers for edit mode` → コードの構造から明らか
- 書くべきコメント:
  - **Why（なぜ）**: なぜその実装を選んだのか、背景や制約
  - **非自明なロジック**: 複雑なアルゴリズムや業務ルールの説明
  - **TODO/FIXME**: 後で対応が必要な箇所

### Runtime and Package Manager
- Default to using **Bun** instead of Node.js
- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv

### Dependency Management
- **Use fixed versions only** (no `^` or `~` prefixes)
- This is a security measure against supply chain attacks
- When updating dependencies, always specify exact versions

## Design Documentation

### 開発者向けドキュメント (`/docs/dev`)
- [ノードシステムアーキテクチャ](docs/dev/node-system-architecture.md) - **新しいノードを実装する際は必ず参照**。ノードの基本構造、実装パターン、チェックリストを含む

### Skills（Claude Code スキル）
- **node-creator**: 新しいノードタイプ（`XxxNode`）を実装する際は、**必ずこのスキルを利用すること**。スキルには実装チェックリスト、コンポーネントテンプレート、登録手順が含まれている。
  - トリガー例: 「新しいノードを作成」「XxxNode を実装」「ノードタイプを追加」

## Project Architecture

Bun workspaceを使用したモノレポ構成。

### Frontend (`/frontend`)
- **Framework**: React + TanStack Router (file-based routing)
- **UI**: DaisyUI + Tailwind CSS v4
- **Build**: Vite
- **Deployment**: Cloudflare Workers Static Assets
- **Data Persistence**: Dexie.js (IndexedDB) with Zod validation
- **State Management**: Zustand
- **Workflow Editor**: @xyflow/react

### Backend (`/backend`)
- **Framework**: Hono
- **Deployment**: Cloudflare Workers
- **Discord Integration**: @discordjs/rest + discord-api-types
- **Validation**: Zod + @hono/zod-validator

## Development Commands

ルートディレクトリから実行:

```bash
bun dev         # 開発サーバー起動 (frontend: 3000, backend: 8787)
bun build       # ビルド
bun deploy      # Cloudflare Workersにデプロイ
bun lint        # リンティング
bun format      # フォーマット
bun type-check  # 型チェック
bun test        # テスト
```

個別パッケージで実行:
```bash
bun run --filter frontend dev
bun run --filter backend dev
```

## Development Workflow

**重要**: コードを実装した後は、必ず以下のコマンドを順番に実行してエラーがないことを確認する：

1. `bun type-check` - 型エラーがないことを確認
2. `bun format` - コードをフォーマット
3. `bun lint` - lint エラーがないことを確認

すべてのコマンドが成功するまで、実装は完了とみなさない。

## Knowledge Management

実装完了時、以下の条件に該当する場合はドキュメントを更新する：

### CLAUDE.md の更新
- プロジェクト構造に大きな変更があった場合（新しいディレクトリ、アーキテクチャ変更など）
- 新しい開発規約やワークフローが追加された場合
- 使用技術スタックに変更があった場合

### docs/dev/ への知識保存
以下のような再利用可能な知識が得られた場合、`/docs/dev/` に新しいドキュメントを作成または既存ドキュメントを更新する：

- **実装パターン**: 繰り返し使用される実装パターンが確立された場合（例: `node-system-architecture.md`）
- **トラブルシューティング**: 解決に時間がかかった問題とその解決方法
- **設計判断**: 重要な設計判断とその理由（なぜその方法を選んだか）

ドキュメント作成の判断基準:
1. 将来同じような実装をする際に参照する価値があるか
2. 他の開発者（または将来の自分）が同じ問題に直面する可能性があるか
3. 情報がコード内のコメントだけでは不十分か

## Testing

Use `vitest` to run tests.

```ts
import { test, expect } from "vitest";

test("example test", () => {
  expect(1).toBe(1);
});
```
