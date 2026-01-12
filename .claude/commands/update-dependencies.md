update npm packages

# 指示
npm dependency packagesのアップデートをして

# 手順

## 1. アップデート対象の洗い出し
root directoryで `bun run ncu` を実行し、アップデート対象を洗い出す

```bash
fish -c "bun run ncu"
```

## 2. リリースノート・変更履歴の確認
各パッケージのrelease note, changelogなどを確認し、変更点を洗い出す

### 2-1. GitHubリリースページで詳細確認
WebFetchでGitHubのリリースページから詳細な変更内容を取得

```
WebFetch: https://github.com/org/repo/releases
```

### 2-2. GitHubリポジトリでリリースノートを確認
リリースページに情報がない場合は、リポジトリ内のリリースノートを取得
RELEASES, RELEASE NOTE, CHANGELOG などのファイル名などを検索する

### 2-3. GitHubリポジトリの変更履歴を確認
リポジトリにも情報がない場合は、GitHubリポジトリの変更履歴を確認する

### 2-4. 破壊的変更の確認
特に以下の点に注意：
- Breaking changes
- API changes
- Deprecated features
- Migration guide

## 3. コード変更不要なパッケージのアップデート

### 3-1. 対象パッケージの判断
以下に該当するパッケージをアップデート対象とする：
- バグ修正のみ
- 型定義の更新のみ
- 内部実装の改善のみ
- パフォーマンス改善のみ（API変更なし）

### 3-2. パッケージのアップデート
モノレポ構成のため、各workspace毎に実行

```bash
# Root
fish -c "bun install パッケージ名@バージョン"

# Backend
fish -c "bun install --filter "backend" パッケージ名@バージョン"

# Frontend
cd frontend
fish -c "bun install --filter "frontend" パッケージ名@バージョン"
```

### 3-3. 型チェック・テストの実行
root directoryで実行

```bash
fish -c "bun run type-check"
fish -c "bun run test"
```

問題があれば該当パッケージのアップデートを戻す

## 4. パッケージの区分

各パッケージを以下のように区分する：

### a. 問題なくアップデートできるパッケージ
- コード変更不要
- 型チェック・テスト通過

### b. 小規模なコードの変更が推奨されるパッケージ
- 非推奨APIの使用があるが動作する
- より良い実装方法が提供されている

### c. 小規模なコードの変更が必要なパッケージ
- 限定的な破壊的変更
- 1-2ファイルの修正で対応可能

### d. 大規模なコードの変更が推奨されるパッケージ
- 非推奨APIが多数使用されている
- 新しいベストプラクティスへの移行が推奨

### e. 大規模なコードの変更が必要なパッケージ
- 重大な破壊的変更
- 多数のファイルへの影響
- アーキテクチャ変更が必要

### 破壊的変更を含むパッケージの影響調査

使用箇所をGrepで検索し、影響範囲を特定：

```bash
# 特定のAPIメソッドの使用箇所を検索
Grep: "\.(extend|pick|omit)\("

# パッケージのimport箇所を検索
Grep: "import.*パッケージ名|from ['\"]パッケージ名['\"]"

# 高度な機能の使用確認
Grep: "\.(refine|superRefine|transform|preprocess)\("
```

影響範囲を確認して区分を決定

## 5. PR・Issueの作成

### 5-1. ブランチ作成とコミット

```bash
# ブランチ作成
fish -c "git checkout -b update-dependencies-safe-updates"

# アップデートしたファイルをステージング
fish -c "git add backend/package.json frontend/package.json bun.lock"

# コミット
git commit -m "chore: Update npm dependencies (safe updates)

Updated the following packages without code changes required:
- パッケージ名: 旧バージョン → 新バージョン
...

All packages include only bug fixes, type improvements, and minor enhancements.
Type checks and tests pass successfully.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# プッシュ
git push -u origin update-dependencies-safe-updates
```

### 5-2. PRの作成

```bash
gh pr create --title "chore: Update npm dependencies (safe updates)" --body "..."
```

**PRのdescriptionフォーマット：**
- アップデート内容（Backend/Frontend別に記載）
- 備考（保留したパッケージの理由など）
- 概要・テスト結果セクションは不要

例：
```markdown
## アップデート内容

### Backend
- パッケージ名: 旧バージョン → 新バージョン
  - 変更内容の概要

### Frontend
- パッケージ名: 旧バージョン → 新バージョン
  - 変更内容の概要

## 備考
- パッケージ名は破壊的変更があるため、別issueで対応予定

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### 5-3. 保留パッケージのIssue作成

破壊的変更を含むパッケージなど、区分b-eのパッケージについてissueを作成：

```bash
gh issue create --title "chore: パッケージ名をバージョンにアップデート" --body "..."
```

**Issueの内容：**
- 概要
- 破壊的変更・新機能
- 現状の影響分析
- 作業計画（チェックリスト形式）
- 参考資料
- 関連PR/Issue

# 注意事項

- モノレポ構成のため、backend/frontend各ディレクトリで個別にアップデート実行
- 型定義パッケージ（@types/*）は基本的に安全にアップデート可能
- UIライブラリ（daisyui等）は視覚的な確認も推奨
- 破壊的変更を含むパッケージは慎重に影響範囲を調査
- PRには概要・テスト結果を含めない（簡潔に）