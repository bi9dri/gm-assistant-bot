# Visual Regression Testing (VRT)

Operational guide for the VRT setup introduced in [#141](https://github.com/bi9dri/gm-assistant-bot/issues/141) / [#142](https://github.com/bi9dri/gm-assistant-bot/issues/142), the CI integration from [#144](https://github.com/bi9dri/gm-assistant-bot/issues/144), the Storybook component VRT from [#147](https://github.com/bi9dri/gm-assistant-bot/issues/147), the Desktop / Mobile viewport matrix from [#171](https://github.com/bi9dri/gm-assistant-bot/issues/171), the light / dark theme matrix from [#148](https://github.com/bi9dri/gm-assistant-bot/issues/148), and the return to Playwright's built-in screenshot comparison (the Argos dependency was removed).

For purpose, scope, and design principles see [testing-strategy.md § VRT](./testing-strategy.md#vrt). This document only covers **how to run it and how to review diffs**.

Baselines are committed to the repository and compared by Playwright itself (`expect(page).toHaveScreenshot()`). There is no external service. The Linux baselines are the source of truth: CI regenerates them on `main` and commits the result automatically.

## Project matrix

VRT runs six Playwright projects in parallel (all chromium-only) — three viewports × two themes:

| Project name               | Scope                                       | Base URL                | Viewport                                    | Theme   |
| -------------------------- | ------------------------------------------- | ----------------------- | ------------------------------------------- | ------- |
| `chromium-desktop-light`   | Routes (`test/vrt/*.vrt.ts`)                | `http://localhost:3000` | 1280x720                                    | `light` |
| `chromium-desktop-dark`    | Routes (`test/vrt/*.vrt.ts`)                | `http://localhost:3000` | 1280x720                                    | `dark`  |
| `chromium-mobile-light`    | Routes (`test/vrt/*.vrt.ts`)                | `http://localhost:3000` | 390x844 (iPhone 13, `isMobile`, `hasTouch`) | `light` |
| `chromium-mobile-dark`     | Routes (`test/vrt/*.vrt.ts`)                | `http://localhost:3000` | 390x844 (iPhone 13, `isMobile`, `hasTouch`) | `dark`  |
| `chromium-storybook-light` | Storybook stories (`test/vrt/storybook/**`) | `http://localhost:6007` | 1280x720                                    | `light` |
| `chromium-storybook-dark`  | Storybook stories (`test/vrt/storybook/**`) | `http://localhost:6007` | 1280x720                                    | `dark`  |

`chromium-mobile-*` spreads `devices["iPhone 13"]` for the viewport / `isMobile` / `hasTouch` / `deviceScaleFactor` traits, but overrides `defaultBrowserType: "chromium"` because CI only caches the chromium binary.

Snapshot names are namespaced by Playwright project name via `snapshotPathTemplate` (`{arg}-{projectName}-{platform}{ext}`), so the same `toHaveScreenshot("home.png")` produces a separate baseline for every project — no suffix needs to be encoded in the name.

The mobile projects exist to catch Tailwind / DaisyUI responsive regressions (`sm:` / `md:` / `lg:`) that desktop alone cannot detect — most visibly the `lg:drawer-open` sidebar nav in `src/routes/__root.tsx`, which collapses on mobile.

React Flow の Node Editor / Node Element は deprecated のため、route VRT（`template-editor.vrt.ts`・`template-detail.vrt.ts`・`session-detail.vrt.ts`）と Storybook の Node コンポーネント VRT（`test/stories/Node/**`・`test/stories/editable-title.stories.tsx`）は存在しない。

The `chromium-storybook-*` projects stay desktop-only because current stories do not use responsive utilities; a mobile pass would only inflate the screenshot count without catching anything. Revisit when stories start consuming `sm:`/`md:` classes.

The Storybook VRT auto-discovers stories from `storybook-static/index.json`, so adding a new `*.stories.tsx` under `frontend/test/stories/` automatically adds one screenshot per story per theme — no test file edits needed.

## Theme matrix

DaisyUI の light / dark テーマ両方で screenshot を撮ることで、片テーマだけが壊れる UI 変更を検知できる。

### How theme is applied

Theme は worker option `theme: "light" | "dark"` で渡され、project ごとに二重に効かせている:

1. **`use.colorScheme: "light" | "dark"`** — Playwright が context 起動時に CSS Media Query `(prefers-color-scheme: ...)` を強制設定する。Tailwind の `dark:` バリアント (例: `src/components/Node/base/base-node.tsx` の `dark:bg-secondary`) はこちらで切り替わる。
2. **`theme` worker option → `localStorage.theme`** — Routes 用 `test/vrt/fixtures.ts` の `context` fixture が `addInitScript` で `localStorage.setItem("theme", t)` を仕込む。SSR は常に `"light"` で描画するが、`__root.tsx` の inline script (`THEME_INIT_SCRIPT`) が hydrate 前に全 `div[data-theme]` を保存値へ補正するので、初回 paint から正テーマで出る (補正が無いと hydration mismatch で永久に light のままになる)。`ThemeProvider` (`src/theme/ThemeProvider.tsx`) は client render 時に同じ値を読んで `<div data-theme={theme}>` を出力するので、DaisyUI トークン (`bg-base-100` 等) がテーマに追従する。

両方を仕込まないと「`data-theme="dark"` だが `dark:` バリアントが効かない」不整合が発生するので、両者は必ず同期させる。

### Storybook side

Storybook テスト (`test/vrt/storybook/components.vrt.ts`) は `localStorage` を使わず、`@storybook/addon-themes` の `withThemeByDataAttribute` decorator が解釈する URL globals 仕様に乗る:

```ts
await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`);
```

`.storybook/preview.ts` で `withThemeByDataAttribute({ themes: { light, dark }, attributeName: "data-theme" })` を decorator 登録済み。`use.colorScheme` は引き続き Playwright が context 経由で適用する。

## Baselines

`frontend/playwright.config.ts` の設定:

```ts
snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}",
expect: {
  toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
},
```

- Path example: `frontend/test/vrt/home.vrt.ts-snapshots/home-chromium-desktop-light-linux.png`
- **コミットするのは `-linux.png` だけ**。`-win32.png` / `-darwin.png` はローカルの作業用で、`frontend/.gitignore` が除外する
- 現在の規模は約 140 枚 / 合計 4MB 前後 (1 枚あたり 30KB 前後)。リポジトリに置いて問題ないサイズ
- `toHaveScreenshot` は撮影前に CSS アニメーションを停止し、キャレットを隠し、連続 2 フレームが一致するまで撮り直す。動的な要素 (相対時刻・ランダム ID) は `mask: [locator]` で明示的に隠す

## Local execution

```bash
# All six projects (desktop / mobile / storybook × light / dark)
pnpm --filter gm-assistant-bot-frontend build-storybook
pnpm --filter gm-assistant-bot-frontend test:vrt

# Single viewport / theme combination
pnpm --filter gm-assistant-bot-frontend test:vrt -- --project=chromium-desktop-light
pnpm --filter gm-assistant-bot-frontend test:vrt -- --project=chromium-mobile-dark

# Single theme across all viewports
pnpm --filter gm-assistant-bot-frontend test:vrt -- \
  --project=chromium-desktop-dark --project=chromium-mobile-dark --project=chromium-storybook-dark
```

Playwright auto-starts the Vite dev server with `VITE_USE_MSW=true` and the Storybook static server (see `frontend/playwright.config.ts`). Chromium only.

The first local run also needs the chromium binary:

```bash
pnpm --dir frontend exec playwright install chromium
```

### 非 Linux での初回実行

baseline は CI (Linux) が生成したものだけがコミットされている。Windows / macOS で初めて実行すると、その platform 用の baseline が無いため全テストが "A snapshot doesn't exist ... writing actual" で失敗する。**これは正常**で、このとき各 platform 用の baseline が生成される。もう一度実行すれば比較が通る。

ローカル baseline を意図的に作り直す:

```bash
pnpm --filter gm-assistant-bot-frontend test:vrt:update
```

生成される `-win32.png` / `-darwin.png` は gitignore 対象なので、**コミットしない**。ローカル描画は OS のフォントに依存するため、比較結果はあくまで参考値で、正となるのは CI の Linux 比較。

## Reviewing diffs

On pull requests the `vrt` job compares against the committed baselines and fails when a screenshot differs:

- 失敗すると `vrt-diff` artifact がアップロードされる。`frontend/playwright-report/` に expected / actual / diff をスライダーで見比べられる HTML レポートが入っている:
  ```bash
  # artifact をダウンロード・展開したディレクトリで
  pnpm --filter gm-assistant-bot-frontend exec playwright show-report path/to/playwright-report
  ```
- `frontend/test-results/` には失敗時の trace / screenshot が入っている。非視覚的な失敗 (dev server timeout, route 404) は trace を見る:
  `pnpm exec playwright show-trace path/to/trace.zip`

### Accepting an intentional diff

差分が意図したものなら、PR に **`vrt:accepted`** ラベルを付ける:

1. `labeled` イベントで `vrt` job が再実行される
2. `vrt:accepted` を検出すると比較をスキップしてジョブを成功させ、ラベルを消費して外す
3. マージすると `main` で baseline が再生成され、`vrt-baselines` job が自動コミットする

ラベルは自動で外れるので、承認後に積んだコミットは改めて検証される。ラベルはリポジトリに作成しておく必要がある (GitHub → Labels → `vrt:accepted`)。

fork からの PR は `GITHUB_TOKEN` が read-only になりラベルを外せないため、承認フローは同一リポジトリのブランチにだけ適用される。fork PR の意図した差分は、メンテナが Linux 環境で baseline をコミットするか、マージ後に `main` の自動更新に任せる。

Linux 環境があるなら、手元で `test:vrt:update` を実行して baseline PNG を PR に含めてもよい (その場合は PR の Files changed に画像差分が出る)。

## `VITE_USE_MSW` が切り替えるもの

VRT 用 dev server は `VITE_USE_MSW=true` で起動する (`playwright.config.ts` の `webServer.env`)。このフラグは MSW の有効化だけでなく「VRT 実行中」の目印も兼ねており、3 箇所で参照している:

| 参照元                  | 効果                                  |
| ----------------------- | ------------------------------------- |
| `src/client.tsx`        | MSW worker を start する              |
| `vite.config.ts`        | devtools plugin の event bus を止める |
| `src/routes/__root.tsx` | `<TanStackDevtools>` をマウントしない |

`/mockServiceWorker.js` はリポジトリに置かず、インストール済み msw パッケージ同梱の script を `vite.config.ts` の middleware が配信する。**`msw init` は実行しない** — 生成物をコミットすると msw の bump でバージョンがズレる。

## Storybook の画面に効く vite.config.ts

`@storybook/react-vite` の builder は `frontend/vite.config.ts` を自動で読み込み、その plugin を `storybook build` にも適用する。`.storybook/main.ts` の `viteFinal` はマージ先の調整をするだけで、この自動読み込みは止まらない。

そのため `vite.config.ts` への plugin 追加・変更は `chromium-storybook-*` の screenshot を動かしうる。routes 側の VRT だけを想定して変更しないこと。

TanStack Start / `@cloudflare/vite-plugin` は SSR・Workers 前提の plugin で、Storybook や Vitest のビルドとは両立しない (`multiple entries detected` / `depsOptimizer is required`)。`vite.config.ts` は `process.env.STORYBOOK` / `process.env.VITEST` を見て、そのときだけ両 plugin を外している (`STORYBOOK=true` は Storybook CLI が自前で立てる。`VITEST=true` は Vitest が立てる)。

## CI behavior

`.github/workflows/ci.yml` defines a `vrt` job that runs in parallel with the `check` job:

- Triggered on `push` to `main` and on `pull_request` to `main` (`opened` / `synchronize` / `reopened` / `labeled`)
- Runs natively on `ubuntu-latest` (no container)
- Chromium binary is restored from `actions/cache` (`~/.cache/ms-playwright`, key derived from `pnpm-lock.yaml`); on miss `pnpm exec playwright install --with-deps chromium` populates it. On hit `pnpm exec playwright install-deps chromium` only installs system libs
- Vite dev server is launched by `playwright.config.ts`'s `webServer`
- **PR**: `test:vrt` (compare only). A diff fails the job and uploads the `vrt-diff` artifact
- **main**: `test:vrt -- --update-snapshots` (regenerate). The refreshed `frontend/test/vrt` is uploaded as the `vrt-baselines` artifact
- `timeout-minutes: 20` guards against a hung dev server

The `vrt-baselines` job (`needs: vrt`, `push` to `main` only) checks out `main`, replaces the `*-snapshots` directories with the artifact, and commits them as `github-actions[bot]` with `[skip ci]`. It is a separate job so that `contents: write` is never granted to a job that runs pull-request code.

Notes:

- **No secrets are required.** `ARGOS_TOKEN` is no longer used and can be deleted from the repository secrets.
- The commit is a direct push to `main`. If branch protection forbids it, allow the Actions bot to bypass the rule (or change the job to open a PR instead).
- The workflow is serialized per ref (`concurrency: ci-${{ github.ref }}`) so two `main` runs cannot race on the same baseline files.

## Troubleshooting

### "A snapshot doesn't exist" / every screenshot differs on a PR

The PR adds a story or changes a route that has no baseline yet. If the change is intended, add the `vrt:accepted` label and merge; `main` creates the baselines. If the change is not intended, fix the UI.

### The `vrt` job mass-produces diffs the moment Playwright bumps

A new `@playwright/test` (or chromium build) renders pixels differently, so every baseline changes. This is expected: add `vrt:accepted` to the Renovate PR, merge it, and let the `vrt-baselines` job refresh the batch. The browser cache key is `pnpm-lock.yaml` so the new chromium downloads automatically.

### The bot's baseline commit is rejected

Branch protection is blocking the `github-actions[bot]` push. Either let the bot bypass the pull-request requirement on `main`, or switch `vrt-baselines` to open a PR. The PR's `vrt` check may still be red afterwards; the `main` run is the authoritative comparison.

### ローカルで route テストだけが全滅する (別アプリの画面が写る)

`reuseExistingServer: !process.env.CI` のため、既に :3000 で別のプロセスが動いていると Playwright はそれを再利用する。Vite の起動ログが出ていないのに heading が見つからない場合は、ポート 3000 の占有プロセスを確認して停止する。Storybook 側 (:6007) だけで検証するなら `--project=chromium-storybook-light` を使う。

### `webServer` hangs / Internal Server Error during VRT

**The vite dev server must run on Node.** Vite+ runs Vite on Node; `webServer.command` in `frontend/playwright.config.ts` starts it with `vp dev`. When diagnosing a `webServer` timeout, remember that Playwright's `webServer.stdout` defaults to `"ignore"`; set `stdout: "pipe"` if you need to see Vite's ready banner / optimizer logs.

### Artifact contains no PNGs, only `trace.zip`

The test failed for a non-visual reason (e.g., dev server timeout, route 404). Open `trace.zip` with `pnpm exec playwright show-trace path/to/trace.zip` to investigate.

## Adding a Storybook component VRT

1. Create a story file under `frontend/test/stories/` (e.g. `frontend/test/stories/Scenario/<Name>.stories.tsx`).
2. Use `parameters: { layout: "fullscreen" }` so Storybook does not add padding around the canvas (the screenshot becomes deterministic).
3. Run `pnpm --filter gm-assistant-bot-frontend build-storybook` to confirm the story renders (one screenshot per theme is captured automatically on the next CI run).
4. Push the PR. The new screenshots have no baseline yet, so the `vrt` job fails; review the captures in the `vrt-diff` artifact, then add the `vrt:accepted` label and merge. `main` creates the baselines.

`<id>` follows Storybook's `lowercase(title) + "--" + kebab-case(storyName)` rule. Title segments are joined and lowercased (camelCase is **not** split), while story export names are kebab-cased. Examples: `Scenario/TableOfContents` + `Default` → `scenario-tableofcontents--default`. Verify the actual id in `frontend/storybook-static/index.json` after building.

## Future work

- Mask remaining dynamic elements (animated / live regions) with `mask:` rather than relaxing the threshold.
- Switch to lossless WebP (`toHaveScreenshot("x.webp")`) if the baseline directory outgrows a few tens of MB.
