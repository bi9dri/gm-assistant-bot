# GitHub Actions の lockfile (`actions.lock`)

外部 action の commit 固定は、`uses:` に SHA を直書きせず
[workflow dependency lockfile](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)
で行う。lockfile は GitHub 公式の `gh` 拡張
[gh-actions-lock](https://github.com/github/gh-actions-lock) が生成・検証する。

## 仕組み

- ワークフローはリリースタグを参照する (`actions/checkout@v7.0.1`)。
- `.github/workflows/actions.lock` がタグ → commit SHA を記録し、実行時はその commit が使われる。
- 推移的な依存 (action が内部で使う action) も lock される。
- workflow ごとに lockfile エントリを持つ。未 onboard の workflow は対象外。

## 運用

```bash
gh extension install github/gh-actions-lock   # 初回のみ
gh actions-lock                               # uses: を追加・変更したら実行
gh actions-lock --verify                      # CI と同じ検証 (書き込みなし)
```

- `uses:` を追加・変更したら lockfile も同じ PR に含める。`.github/workflows/**` を
  変更した PR では `lockfile.yml` が `--verify` を実行するので、忘れると CI が落ちる。
- action のバージョン更新は Renovate が行う。Renovate はタグを上げると同時に
  `actions.lock` も再生成するので、lockfile を手で直すことはない。
- lockfile は生成物なので手で編集しない。壊れたら `gh actions-lock` を流し直す。
- commit が変わった lockfile の差分は、依存のバージョン更新と同じくレビューする。

## なぜ SHA 直書きをやめたか

- タグのまま読めて、実行 commit は lockfile で固定できる (可読性と固定の両立)。
- `uses:` 行に SHA とバージョンコメントを手で足す必要がなく、更新が lockfile の
  差分として現れる。
- 推移的な依存まで含めて固定できる (pinact は直接参照だけだった)。

## 制約

- **再利用可能ワークフロー** (`jobs.<id>.uses: owner/repo/.github/workflows/x.yml@ref`)
  は lockfile の対象外 ([gh-actions-lock#179](https://github.com/github/gh-actions-lock/issues/179))。
  SHA + バージョンコメントで固定し、Renovate
  (`.github/renovate.json5` の `matchDepTypes: ["workflow"]`) に更新させる。
- ローカルの action (`uses: ./...`) は追跡されない。
- lockfile の形式・CLI フラグはまだ変更されうる (gh-actions-lock は 1.0 未満)。
