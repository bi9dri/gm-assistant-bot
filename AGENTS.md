# Project Instructions for AI Assistants

## TypeScript

- Narrow discriminated unions via type guards: `if (node.type !== "XxxNode") return;`

## Runtime / Package Manager (Vite+ / pnpm / Node)

- Use `pnpm install`, `pnpm --filter <pkg> <script>`, and the `vp` CLI (`vp dev/build/test/lint/fmt`). Runtime is Node 26 (Vite+ requires `^22.18.0 || ^24.11.0 || >=26.0.0`). Never npm/yarn/bun.
- Tests run with `vp test` (Vitest 5 bundled by Vite+); API is imported from `vite-plus/test`. Coverage config lives in each `vite.config.ts` `test` block (no `bunfig.toml`).
- `--filter` matches `package.json` `name` (not workspace dir). Wildcards ok: `--filter '*'`.
- Coverage thresholds apply globally — exclude untestable files rather than lowering thresholds.

## Dependency Management

- **Fixed versions only** — no `^` / `~`. Supply chain protection.
- **Use versions ≥7 days old**, except for security updates. Avoids malicious releases caught shortly after publish.
- **GitHub Actions (step `uses:`)**: reference release tags; `.github/workflows/actions.lock` pins each ref to a commit. After adding or changing a `uses:`, run `gh actions-lock` and commit the lockfile (never edit it by hand). Reusable workflows (`jobs.<id>.uses`) are not covered by the lockfile, so keep them pinned to a full commit SHA.
- **Renovate (GitHub App, `.github/renovate.json5`) proposes every update** and enforces the rules above. Don't bump versions by hand — PRs are automatically merged once CI passes. For GitHub Actions it bumps the tag and regenerates `actions.lock` in the same PR.
  - If CI fails on a Renovate PR, fix it on that branch (replace deprecated APIs, adapt to the new API) rather than closing the PR.
  - Pin the pnpm version only in `packageManager`. Renovate does not update `devEngines.packageManager` (renovatebot/renovate#38067), so duplicating it there makes artifact updates fail with `ERR_PNPM_BAD_PM_VERSION`.
- **Avoid `overrides`.** Fix it by updating the direct dependency. Use `overrides` only as a temporary measure when a critical vulnerability is reported against a transitive dependency AND no direct update resolves it — document the advisory, why a direct update isn't viable, and the removal condition in the PR.

## Architecture

pnpm workspace monorepo on Node 26 (Vite+ toolchain): `/frontend` (React + TanStack Start, SSR/Workers via `@cloudflare/vite-plugin`), `/backend` (Hono on Cloudflare Workers). See each `package.json` for the full stack. PR 動作確認用の preview は `.github/workflows/preview.yml` が本番ビルドを `wrangler deploy --temporary` で使い捨て Worker に上げる。

### Key Constraints

- **Full-height layout chain**: daisyUI `.drawer` is CSS Grid, so `.drawer-content` must stay `height: 100dvh` (`frontend/src/styles.css`). TanStack Router child `beforeLoad` context is not visible from `useRouteContext({ from: "__root__" })`, so `__root.tsx` resolves `layoutMode` by walking `state.matches` from deepest match upward.
- **Vite plugins (`frontend/vite.config.ts`)**: Place `cloudflare({ viteEnvironment: { name: "ssr" } })` before `tanstackStart()`. Both plugins must be omitted when `STORYBOOK=true` or `VITEST=true` (otherwise Storybook build / Vitest breaks).
- **SSR safety**: Guard `window`/`localStorage` with `typeof window === "undefined"`. Dynamically import `fake-indexeddb` only when `NODE_ENV === "test"` (and keep it in `optimizeDeps.include`).

## Docs (`/docs/dev`)

- [scenario-editor-architecture.md](docs/dev/scenario-editor-architecture.md) — **required reading before any issue #213 sub-issue work** (scenario-document UI; the settled cross-cutting decisions). New features go here, not into the older UIs.

## Skills (`.agents/skills/`)

- **modern-web-guidance** — Use for modern web platform capabilities, UI patterns, accessibility, and CSS standards
- **schema-migration** — MUST use when changing a node's DataSchema

## Commands

See root `package.json` scripts. Run from repo root via `pnpm <script>`, or per-package via `pnpm --filter <pkg> <script>`.

## Development Workflow

After implementing, the task is not done until all of the following pass:

1. `pnpm test` · 2. `pnpm typecheck` · 3. `pnpm format` · 4. `pnpm lint` · 5. `pnpm knip`

## Vite+ Reference

Vite+ is a unified toolchain (Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt) behind the `vp` CLI. Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

- `vp <name>` runs a built-in command; `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so check `package.json` / `vite.config.ts` and use `vp run <name>` when the project defines a script with that name.
- `vp toolchain` shows the tool versions/relationships in the active release; `vp why <package>` shows the dependency graph.
- `vp env doctor` reports setup/runtime/package-manager problems.
