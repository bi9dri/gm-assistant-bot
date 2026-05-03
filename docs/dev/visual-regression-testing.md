# Visual Regression Testing (VRT)

Operational guide for the VRT setup introduced in [#141](https://github.com/bi9dri/gm-assistant-bot/issues/141) / [#142](https://github.com/bi9dri/gm-assistant-bot/issues/142), the CI integration from [#144](https://github.com/bi9dri/gm-assistant-bot/issues/144), the Storybook component VRT from [#147](https://github.com/bi9dri/gm-assistant-bot/issues/147), the Desktop / Mobile viewport matrix from [#171](https://github.com/bi9dri/gm-assistant-bot/issues/171), and the light / dark theme matrix from [#148](https://github.com/bi9dri/gm-assistant-bot/issues/148).

For purpose, scope, and design principles see [testing-strategy.md § VRT](./testing-strategy.md#vrt). This document only covers **how to run it and how to update baselines**.

## Project matrix

VRT runs six Playwright projects in parallel (all chromium-only) — three viewports × two themes:

| Project name                | Scope                                       | Base URL                | Viewport                                     | Theme   |
| --------------------------- | ------------------------------------------- | ----------------------- | -------------------------------------------- | ------- |
| `chromium-desktop-light`    | Routes (`test/vrt/*.vrt.ts`)                | `http://localhost:3000` | 1280x720                                     | `light` |
| `chromium-desktop-dark`     | Routes (`test/vrt/*.vrt.ts`)                | `http://localhost:3000` | 1280x720                                     | `dark`  |
| `chromium-mobile-light`     | Routes (`test/vrt/*.vrt.ts`)                | `http://localhost:3000` | 390x844 (iPhone 13, `isMobile`, `hasTouch`)  | `light` |
| `chromium-mobile-dark`      | Routes (`test/vrt/*.vrt.ts`)                | `http://localhost:3000` | 390x844 (iPhone 13, `isMobile`, `hasTouch`)  | `dark`  |
| `chromium-storybook-light`  | Storybook stories (`test/vrt/storybook/**`) | `http://localhost:6007` | 1280x720                                     | `light` |
| `chromium-storybook-dark`   | Storybook stories (`test/vrt/storybook/**`) | `http://localhost:6007` | 1280x720                                     | `dark`  |

`chromium-mobile-*` spreads `devices["iPhone 13"]` for the viewport / `isMobile` / `hasTouch` / `deviceScaleFactor` traits, but overrides `defaultBrowserType: "chromium"` because CI only caches the chromium binary.

Snapshots are stored as `{arg}-{projectName}-{platform}.png` via `snapshotPathTemplate`, so viewport × theme baselines coexist without conflict (e.g. `home-chromium-desktop-light-linux.png` / `home-chromium-desktop-dark-linux.png`). The CI `vrt-diff` artifact is split by project automatically — no CI changes required when projects are added.

The mobile projects exist to catch Tailwind / DaisyUI responsive regressions (`sm:` / `md:` / `lg:`) that desktop alone cannot detect — most visibly the `lg:drawer-open` sidebar nav in `src/routes/__root.tsx`, which collapses on mobile.

### Tests skipped on `chromium-mobile-*`

React Flow を使う route は touch UI と小幅 viewport を想定しておらず、mobile レイアウトでは `.react-flow__viewport` が描画されない。Mobile UX 対応は別 issue で扱う方針なので、以下を `testInfo.skip(...)` で mobile project (`startsWith("chromium-mobile")` 判定) からのみ skip している:

- `template-editor.vrt.ts` — full file (4 tests)
- `template-new.vrt.ts` — full file (1 test)
- `session-detail.vrt.ts` — `populated` only (`not found` は mobile でも実行)
- `template-detail.vrt.ts` — `populated` only (`not found` は mobile でも実行)

Mobile UX 対応 (responsive React Flow) が入った段階で各 file の `testInfo.skip(...)` を外して mobile baseline を追加する。判定は `startsWith("chromium-mobile")` なので theme suffix の有無に関わらず両 mobile project が skip 対象となる。

The `chromium-storybook-*` projects stay desktop-only because current stories do not use responsive utilities; a mobile pass would only inflate the baseline count without catching anything. Revisit when stories start consuming `sm:`/`md:` classes.

The Storybook VRT auto-discovers stories from `storybook-static/index.json`, so adding a new `*.stories.tsx` under `frontend/test/stories/` automatically adds one snapshot per story per theme — no test file edits needed.

## Theme matrix

DaisyUI の light / dark テーマ両方で snapshot を撮ることで、片テーマだけが壊れる UI 変更を検知できる。

### How theme is applied

Theme は worker option `theme: "light" | "dark"` で渡され、project ごとに二重に効かせている:

1. **`use.colorScheme: "light" | "dark"`** — Playwright が context 起動時に CSS Media Query `(prefers-color-scheme: ...)` を強制設定する。Tailwind の `dark:` バリアント (例: `src/components/Node/base/base-node.tsx` の `dark:bg-secondary`) はこちらで切り替わる。
2. **`theme` worker option → `localStorage.theme`** — Routes 用 `test/vrt/fixtures.ts` の `context` fixture が `addInitScript` で `localStorage.setItem("theme", t)` を仕込む。`ThemeProvider` (`src/theme/ThemeProvider.tsx`) は module-load 時にこの値を読んで `<div data-theme={theme}>` を出力するので、DaisyUI トークン (`bg-base-100` 等) がテーマに追従する。

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
bun run --bun --filter gm-assistant-bot-frontend build-storybook
bun run --bun --filter gm-assistant-bot-frontend test:vrt

# Single viewport / theme combination
bun run --bun --filter gm-assistant-bot-frontend test:vrt -- --project=chromium-desktop-light
bun run --bun --filter gm-assistant-bot-frontend test:vrt -- --project=chromium-mobile-dark

# Single theme across all viewports
bun run --bun --filter gm-assistant-bot-frontend test:vrt -- \
  --project=chromium-desktop-dark --project=chromium-mobile-dark --project=chromium-storybook-dark
```

Playwright auto-starts the Vite dev server with `VITE_USE_MSW=true` and the Storybook static server (see `frontend/playwright.config.ts`). Chromium only.

The first local run also needs the chromium binary:

```bash
bun --cwd frontend x playwright install chromium
```

## Updating baselines (local)

```bash
# All six projects (desktop + mobile + storybook × light + dark)
bun run --bun --filter gm-assistant-bot-frontend test:vrt -- --update-snapshots

# Single project — useful when only one viewport / theme is intentionally diverging
bun run --bun --filter gm-assistant-bot-frontend test:vrt -- \
  --update-snapshots --project=chromium-mobile-dark

git add frontend/test/vrt
git commit -m "chore(vrt): update baselines"
```

Snapshots are written to `frontend/test/vrt/{name}.vrt.ts-snapshots/{arg}-{projectName}-{platform}.png`. CI runs on Linux so only the `-linux.png` set is consumed by CI; other platforms are ignored.

If your local Linux render matches the GitHub `ubuntu-latest` runner this is enough. When pixels diverge (font / fontconfig / chromium-libdeps differences), use the recovery flow below — **do not** chase pixel parity locally.

## Updating baselines from CI artifact (recovery flow)

Use this when local baselines pass locally but `vrt` fails in CI with rendering diffs.

1. Push the PR and wait for the `vrt` job to fail.
2. Open the failed run on GitHub Actions and download the `vrt-diff` artifact (zip).
3. For each failing snapshot, replace the baseline with CI's `*-actual.png`:

   ```bash
   # inside the unzipped artifact
   # path layout: test-results/<test-id>/<arg>-<projectName>-<platform>-actual.png
   cp test-results/.../home-chromium-desktop-light-linux-actual.png \
      frontend/test/vrt/home.vrt.ts-snapshots/home-chromium-desktop-light-linux.png
   ```

4. Commit the updated baseline and push. CI should now be green.

This is the canonical reconciliation path: **CI's rendering is the source of truth**.

## CI behavior

`.github/workflows/ci.yml` defines a `vrt` job that runs in parallel with the existing `check` job:

- Triggered on `push` to `main` and on every `pull_request` to `main`
- Runs natively on `ubuntu-latest` (no container) so the env mirrors a typical local Linux / WSL setup
- Chromium binary is restored from `actions/cache` (`~/.cache/ms-playwright`, key derived from `bun.lock`); on miss `bun x playwright install --with-deps chromium` populates it. On hit `bun x playwright install-deps chromium` only installs system libs
- Vite dev server is launched by `playwright.config.ts`'s `webServer`
- On failure, `frontend/test-results/` is uploaded as the `vrt-diff` artifact
  - Contents: `*-actual.png`, `*-expected.png`, `*-diff.png`, Playwright trace
  - `retention-days: 14`

## Troubleshooting

### `vrt` job mass-fails the moment Playwright bumps

A new `@playwright/test` ships a new chromium build, which renders pixels differently. Bump first, then regenerate baselines via the recovery flow above. The browser cache key is `bun.lock` so the new chromium downloads automatically.

### `webServer` hangs / Internal Server Error during VRT

Documented Tailwind + `@tailwindcss/vite` + DaisyUI + Bun-runtime issue. See [testing-strategy.md § Known Workaround](./testing-strategy.md#known-workaround). The `webServer.command` in `frontend/playwright.config.ts` deliberately uses `bun run dev` (not `bun run --bun dev`) so vite executes via its node shebang. Do not "fix" this without re-reading the comment in that file.

### Artifact contains no PNGs, only `trace.zip`

The test failed for a non-snapshot reason (e.g., dev server timeout, route 404). Open `trace.zip` with `bun x playwright show-trace path/to/trace.zip` to investigate.

### Local Linux baseline drifts on every commit

If you regenerate locally and CI keeps failing on the same snapshot, stop syncing from local — switch entirely to the CI artifact recovery flow. Mixing the two sources is what causes ping-pong updates.

## Adding a Storybook component VRT

1. Create `frontend/test/stories/Node/nodes/<Name>.stories.tsx` (or any path under `frontend/test/stories/`). Use `renderSingleNode` from `_render.tsx` to wrap React Flow custom nodes in a minimal `<ReactFlow>` instance — direct `<Component {...} />` won't render handles correctly.
2. Use `parameters: { layout: "fullscreen" }` so Storybook does not add padding around the canvas (the snapshot becomes deterministic).
3. Run `bun run --bun --filter gm-assistant-bot-frontend build-storybook` then `... test:vrt --update-snapshots` to generate the baseline png (両 theme 分が自動で生成される).
4. Commit both the `*.stories.tsx` and the new `frontend/test/vrt/storybook/components.vrt.ts-snapshots/<id>-chromium-storybook-{light,dark}-linux.png`.

`<id>` follows Storybook's `lowercase(title) + "--" + kebab-case(storyName)` rule. Title segments are joined and lowercased (camelCase is **not** split), while story export names are kebab-cased. Examples: `Node/Nodes/SendMessage` + `MultipleMessages` → `node-nodes-sendmessage--multiple-messages`. Verify the actual id in `frontend/storybook-static/index.json` after building.

## Future work

- PR-comment-triggered automatic baseline updates (e.g., `/update-snapshots` bot reply that opens a follow-up commit). Out of scope for [#144](https://github.com/bi9dri/gm-assistant-bot/issues/144).
