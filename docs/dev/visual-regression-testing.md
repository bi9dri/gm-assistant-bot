# Visual Regression Testing (VRT)

Operational guide for the VRT setup introduced in [#141](https://github.com/bi9dri/gm-assistant-bot/issues/141) / [#142](https://github.com/bi9dri/gm-assistant-bot/issues/142) and the CI integration from [#144](https://github.com/bi9dri/gm-assistant-bot/issues/144).

For purpose, scope, and design principles see [testing-strategy.md § VRT](./testing-strategy.md#vrt). This document only covers **how to run it and how to update baselines**.

## Local execution

```bash
bun run --bun --filter gm-assistant-bot-frontend test:vrt
```

Playwright auto-starts the Vite dev server with `VITE_USE_MSW=true` (see `frontend/playwright.config.ts`). Chromium only.

## Updating baselines (local)

Local updates do **not** require Docker:

```bash
bun run --bun --filter gm-assistant-bot-frontend test:vrt -- --update-snapshots
git add frontend/test/vrt
git commit -m "chore(vrt): update baselines"
```

Snapshots are written to `frontend/test/vrt/{name}.vrt.ts-snapshots/{arg}-{projectName}-{platform}.png`. Since CI is Linux, only the `-linux.png` set is consumed by CI; other platforms are ignored.

If your local Linux environment renders identically to the CI Playwright Docker image, this is enough. When it does not (font / libfontconfig / chromium-build differences), use the recovery flow below — **don't** try to chase pixel parity locally.

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
- Runs inside `mcr.microsoft.com/playwright:v1.59.1-noble` to fix OS / font / chromium-build pixel parity
- Bun is installed inside the container; the dev server is launched by `playwright.config.ts`'s `webServer`
- On failure, `frontend/test-results/` is uploaded as the `vrt-diff` artifact
  - Contents: `*-actual.png`, `*-expected.png`, `*-diff.png`, Playwright trace
  - `retention-days: 14`

## Troubleshooting

### `vrt` job fails the moment Playwright bumps

`@playwright/test` in `frontend/package.json` and the `container.image` tag in `.github/workflows/ci.yml` **must** be updated together. A version mismatch ships a different chromium build and breaks every baseline at once. Pin both to the same `vX.Y.Z` and regenerate baselines via the recovery flow above.

### `webServer` hangs / Internal Server Error during VRT

This is the documented Tailwind + `@tailwindcss/vite` + DaisyUI Bun-runtime issue. See [testing-strategy.md § Known Workaround](./testing-strategy.md#known-workaround). The `webServer.command` in `frontend/playwright.config.ts` deliberately spawns vite via `node node_modules/.bin/vite` (not `bun run dev`) so the `--bun` flag from `bun run --bun --filter ... test:vrt` does not propagate into the dev server child process. Do not "fix" this back to `bun run dev` without re-reading the comment in that file.

### Artifact contains no PNGs, only `trace.zip`

The test failed for a non-snapshot reason (e.g., dev server timeout, route 404). Open `trace.zip` with `bun x playwright show-trace path/to/trace.zip` to investigate.

### Local Linux baseline drifts on every commit

If you regenerate locally and CI keeps failing on the same snapshot, stop syncing from local — switch entirely to the CI artifact recovery flow. Mixing the two sources is what causes ping-pong updates.

## Future work

- PR-comment-triggered automatic baseline updates (e.g., `/update-snapshots` bot reply that opens a follow-up commit). Out of scope for [#144](https://github.com/bi9dri/gm-assistant-bot/issues/144).
- Storybook story snapshots and React Flow editor scenes (per [#141](https://github.com/bi9dri/gm-assistant-bot/issues/141) scope) will be added as separate VRT files; this document does not change for that work.
