# Visual Regression Testing (VRT)

Operational guide for the VRT setup introduced in [#141](https://github.com/bi9dri/gm-assistant-bot/issues/141) / [#142](https://github.com/bi9dri/gm-assistant-bot/issues/142), the CI integration from [#144](https://github.com/bi9dri/gm-assistant-bot/issues/144), the Storybook component VRT from [#147](https://github.com/bi9dri/gm-assistant-bot/issues/147), the Desktop / Mobile viewport matrix from [#171](https://github.com/bi9dri/gm-assistant-bot/issues/171), the light / dark theme matrix from [#148](https://github.com/bi9dri/gm-assistant-bot/issues/148), and the migration to [Argos](https://argos-ci.com) in [#311](https://github.com/bi9dri/gm-assistant-bot/issues/311).

For purpose, scope, and design principles see [testing-strategy.md § VRT](./testing-strategy.md#vrt). This document only covers **how to run it and how to review diffs**. Screenshot baselines are no longer committed: the Argos reporter uploads captures and Argos performs the comparison in the cloud.

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

Argos namespaces each screenshot by Playwright project name (`<project>/<name>`), so calling `argosScreenshot(page, "home")` in every project produces separate baselines under `chromium-desktop-light/home`, `chromium-desktop-dark/home`, etc. — no suffix needs to be encoded in the name.

The mobile projects exist to catch Tailwind / DaisyUI responsive regressions (`sm:` / `md:` / `lg:`) that desktop alone cannot detect — most visibly the `lg:drawer-open` sidebar nav in `src/routes/__root.tsx`, which collapses on mobile.

React Flow の Node Editor / Node Element は deprecated のため、route VRT（`template-editor.vrt.ts`・`template-detail.vrt.ts`・`session-detail.vrt.ts`）と Storybook の Node コンポーネント VRT（`test/stories/Node/**`・`test/stories/editable-title.stories.tsx`）を削除した。

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

The Argos reporter only uploads when `CI` is set and `ARGOS_TOKEN` is present (`uploadToArgos: !!process.env.CI && !!process.env.ARGOS_TOKEN`), so local runs never hit Argos. `argosScreenshot` writes captures to `frontend/screenshots/` only when the reporter is not in use (gitignored).

VRT はテスト時のみ `bypassCSP: true` で CSP を無効化する (Argos が inject する inline script を通すため)。CSP 自体の検証は VRT の責務ではない。

## Reviewing diffs in Argos

On CI, the reporter uploads every `argosScreenshot` capture and Argos compares it against the baseline build for the branch:

- The Argos check appears on the pull request with a summary of added / changed / unchanged screenshots.
- Review each change in the Argos UI and approve or reject it. Merging the PR accepts the current build as the new baseline for the default branch.
- **Orphan builds:** until a build has run on the default branch, PR builds have no baseline to compare against and are marked orphan. The first build on `main` establishes the baseline.
- If a failure is not visual (dev server timeout, route 404), open the uploaded Playwright trace to investigate. The `vrt-diff` CI artifact also holds `frontend/test-results/` (traces / failure screenshots).

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

`.github/workflows/ci.yml` defines a `vrt` job that runs in parallel with the existing `check` job:

- Triggered on `push` to `main` and on every `pull_request` to `main`
- Runs natively on `ubuntu-latest` (no container)
- Chromium binary is restored from `actions/cache` (`~/.cache/ms-playwright`, key derived from `pnpm-lock.yaml`); on miss `pnpm exec playwright install --with-deps chromium` populates it. On hit `pnpm exec playwright install-deps chromium` only installs system libs
- Vite dev server is launched by `playwright.config.ts`'s `webServer`
- Playwright runs with `ARGOS_TOKEN` set (repository secret). The `@argos-ci/playwright` reporter uploads screenshots and traces; the Argos check posts to the PR
- On failure, `frontend/test-results/` is uploaded as the `vrt-diff` artifact (`retention-days: 14`)
- `timeout-minutes: 20` guards against a hung dev server

### Required secret

`ARGOS_TOKEN` must be configured as a repository secret (GitHub → Settings → Secrets and variables → Actions). It is the project token from Argos **Settings → General → Token**. Use `null`-safe reference only if Argos is intentionally disabled — otherwise the upload step fails without it.

## Troubleshooting

### Argos upload fails / check is missing

Verify `ARGOS_TOKEN` is set as a repository secret and that the Argos project is linked to this repository. Locally the reporter does not upload; trigger the `vrt` job on CI (or a PR) to see the check.

### `vrt` job mass-produces diffs the moment Playwright bumps

A new `@playwright/test` (or chromium build) renders pixels differently, and Argos flags every screenshot as changed. This is expected: review and approve the batch in Argos. The browser cache key is `pnpm-lock.yaml` so the new chromium downloads automatically.

### `webServer` hangs / Internal Server Error during VRT

**The vite dev server must run on Node.** Vite+ runs Vite on Node; `webServer.command` in `frontend/playwright.config.ts` starts it with `vp dev`. When diagnosing a `webServer` timeout, remember that Playwright's `webServer.stdout` defaults to `"ignore"`; set `stdout: "pipe"` if you need to see Vite's ready banner / optimizer logs.

### Artifact contains no PNGs, only `trace.zip`

The test failed for a non-visual reason (e.g., dev server timeout, route 404). Open `trace.zip` with `pnpm exec playwright show-trace path/to/trace.zip` to investigate.

## Adding a Storybook component VRT

1. Create a story file under `frontend/test/stories/` (e.g. `frontend/test/stories/Scenario/<Name>.stories.tsx`).
2. Use `parameters: { layout: "fullscreen" }` so Storybook does not add padding around the canvas (the screenshot becomes deterministic).
3. Run `pnpm --filter gm-assistant-bot-frontend build-storybook` to confirm the story renders (one screenshot per theme is captured automatically for the next CI run).
4. Push the PR. The new screenshots appear in Argos as **added**; approve them.

`<id>` follows Storybook's `lowercase(title) + "--" + kebab-case(storyName)` rule. Title segments are joined and lowercased (camelCase is **not** split), while story export names are kebab-cased. Examples: `Scenario/TableOfContents` + `Default` → `scenario-tableofcontents--default`. Verify the actual id in `frontend/storybook-static/index.json` after building.

## Future work

- Stabilize remaining flaky captures surfaced by Argos (e.g. animated / dynamic elements) using `data-visual-test` attributes or `stabilize` options.
