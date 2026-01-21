# gm-assistant-bot

GameMaster's Assistantは、TRPGやマーダーミステリーのセッションを効率化するDiscord連携ツールです。ゲームマスターがストーリーテリングとプレイヤーとの対話に集中できるようになることを目指しています。

## 主な機能

- **ノードベースワークフロー**: TRPG/マーダーミステリーセッション管理のためのビジュアルワークフローエディタ
- **テンプレート**: 再利用可能なワークフローテンプレート
- **Discord連携**: カテゴリ・チャンネル・ロールの作成・削除、チャンネル権限管理、メッセージ送信

## はじめに

### 前提条件

- [Bun](https://bun.sh/)

### インストール

```bash
bun install
```

### 開発

開発サーバーを起動（frontend: 3000, backend: 8787）:

```bash
bun dev
```

### コマンド一覧

```bash
bun lint        # リンティング
bun format      # フォーマット
bun type-check  # 型チェック
bun test        # テスト
bun build       # ビルド
bun deploy      # Cloudflare Workersにデプロイ
```

## ライセンス

MIT License
