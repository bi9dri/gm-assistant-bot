---
name: create-pr
description: Create a pull request following this repository's conventions. Use when the user asks to create a PR, push changes, or open a pull request. Covers branch naming, commit granularity, commit message format (English), and PR title/description format (Japanese).
---

# Create PR

## Workflow

1. Check current state: `git status` + `git diff --stat` + `git log --oneline -5`
2. Create a feature branch: `git checkout -b <branch-name>`
3. Stage and commit in logical units (see below)
4. Push: `git push -u origin <branch-name>`
5. Open PR: `gh pr create ...`

## Branch Naming

```
feat/<feature-name>
fix/<issue>
chore/<task>
refactor/<target>
```

## Commit Granularity

Split into the smallest independent units that still build and make sense alone. Examples:

- Extracting shared code (refactor) → separate from the feature that uses it
- Adding a new file/module → can be one commit
- Registering the new module in multiple config files → bundle into the same commit as the file

**Do NOT** split by file when changes are tightly coupled (e.g., adding a component and registering it in the router is one commit).

## Commit Message Format

English, imperative mood. Always append Co-Authored-By.

```
git commit -m "$(cat <<'EOF'
<type>: <concise summary>

<optional body: why, not what — only if non-obvious>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Types: `feat` `fix` `refactor` `chore` `docs` `test`

## PR Format

Title and description in **Japanese**.

- **Title**: 50文字以内。変更の目的・振る舞いを端的に（実装詳細ではない）
- **Description**: 実装の詳細ではなく、**振る舞い・背景・意思決定の理由**を記述

```bash
gh pr create \
  --title "<日本語タイトル>" \
  --body "$(cat <<'EOF'
## 概要

<何ができるようになるか・何が解決するか 1〜3行>

## 背景・意思決定

<なぜこのアプローチを選んだか。代替案や制約があれば記述>

## 変更内容

<振る舞いレベルの箇条書き。ファイル名の列挙ではなく機能・役割の変化>

## 確認手順

<手動で確認すべき操作ステップ>
EOF
)"
```

### 各セクションの書き方

| セクション | 書くこと | 書かないこと |
|---|---|---|
| 概要 | ユーザー視点の効果 | 変更ファイル一覧 |
| 背景・意思決定 | 既存設計の制約、代替案の却下理由 | 実装手順 |
| 変更内容 | 機能・役割の変化 | 行数・クラス名の羅列 |
| 確認手順 | UIや動作の確認ステップ | コマンド実行結果 |
