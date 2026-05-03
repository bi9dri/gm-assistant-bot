# Visual Regression Testing (VRT)

Operational guide for the VRT setup introduced in [#141](https://github.com/bi9dri/gm-assistant-bot/issues/141) / [#142](https://github.com/bi9dri/gm-assistant-bot/issues/142), the CI integration from [#144](https://github.com/bi9dri/gm-assistant-bot/issues/144), and the Storybook component VRT from [#147](https://github.com/bi9dri/gm-assistant-bot/issues/147).

For purpose, scope, and design principles see [testing-strategy.md § VRT](./testing-strategy.md#vrt). This document only covers **how to run it and how to update baselines**.

## Layout

Two Playwright projects, both chromium-only:

- `chromium` — Routes / full-page flows. Tests live in `frontend/test/vrt/*.vrt.ts`. webServer = Vite dev server (:3000) with `VITE_USE_MSW=true`.
- `chromium-storybook` — Individual component snapshots via Storybook iframes. Tests live in `frontend/test/vrt/storybook/*.vrt.ts`. webServer = a tiny Bun-based static server (:6007) serving `frontend/storybook-static/`.

The Storybook VRT auto-discovers stories from `storybook-static/index.json`, so adding a new `*.stories.tsx` under `frontend/test/stories/` automatically adds one snapshot per story — no test file edits needed.

## Local execution

```bash
# Routes / full-page VRT only
bun run --bun --filter gm-assistant-bot-frontend test:vrt -- --project=chromium

# Storybook component VRT (build static first)
bun run --bun --filter gm-assistant-bot-frontend build-storybook
bun run --bun --filter gm-assistant-bot-frontend test:vrt -- --project=chromium-storybook

# Both
bun run --bun --filter gm-assistant-bot-frontend build-storybook
bun run --bun --filter gm-assistant-bot-frontend test:vrt
```

Playwright auto-starts the Vite dev server with `VITE_USE_MSW=true` and the Storybook static server (see `frontend/playwright.config.ts`). Chromium only.

The first local run also needs the chromium binary:

```bash
bun --cwd frontend x playwright install chromium
```

## Updating baselines (local)

```bash
bun run --bun --filter gm-assistant-bot-frontend test:vrt -- --update-snapshots
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
   cp test-results/.../home-chromium-linux-actual.png \
      frontend/test/vrt/home.vrt.ts-snapshots/home-chromium-linux.png
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
3. Run `bun run --bun --filter gm-assistant-bot-frontend build-storybook` then `... test:vrt --update-snapshots` to generate the baseline png.
4. Commit both the `*.stories.tsx` and the new `frontend/test/vrt/storybook/components.vrt.ts-snapshots/<id>-chromium-linux.png`.

`<id>` follows Storybook's `lowercase(title) + "--" + kebab-case(storyName)` rule. Title segments are joined and lowercased (camelCase is **not** split), while story export names are kebab-cased. Examples: `Node/Nodes/SendMessage` + `MultipleMessages` → `node-nodes-sendmessage--multiple-messages`. Verify the actual id in `frontend/storybook-static/index.json` after building.

## Future work

- PR-comment-triggered automatic baseline updates (e.g., `/update-snapshots` bot reply that opens a follow-up commit). Out of scope for [#144](https://github.com/bi9dri/gm-assistant-bot/issues/144).
- light/dark theme パラメタライズ snapshot 二重化 (現状は light のみ)。`@storybook/addon-themes` の `withThemeByDataAttribute` decorator は既に入っているので、Playwright 側で `data-theme` を切り替える decorator パターンを足せば実現可能。
