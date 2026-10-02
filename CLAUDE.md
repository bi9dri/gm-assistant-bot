# Project Instructions for AI Assistant

## Code Comments

- Don't restate what identifiers already convey. Keep comments only for Why (context/constraints), non-obvious logic, or TODO/FIXME.

## TypeScript

- Narrow discriminated unions via type guards: `if (node.type !== "XxxNode") return;`

## Runtime / Package Manager (Vite+ / pnpm / Node)

- Use `pnpm install`, `pnpm --filter <pkg> <script>`, and the `vp` CLI (`vp dev/build/test/lint/fmt`). Runtime is Node 24 LTS (Vite+ requires `^22.18.0 || ^24.11.0 || >=26.0.0`). Never npm/yarn/bun.
- Tests run with `vp test` (Vitest 5 bundled by Vite+); API is imported from `vite-plus/test`. Coverage config lives in each `vite.config.ts` `test` block (no `bunfig.toml`).
- `--filter` matches `package.json` `name` (not workspace dir). Wildcards ok: `--filter '*'`.
- Coverage thresholds apply globally — exclude untestable files rather than lowering thresholds.

## Dependency Management

- **Fixed versions only** — no `^` / `~`. Supply chain protection.
- **Use versions ≥7 days old**, except for security updates. Avoids malicious releases caught shortly after publish.
- **GitHub Actions**: pin external actions to full commit SHA (never tags/branches).
- **Renovate (GitHub App, `.github/renovate.json5`) proposes every update** and enforces the three rules above. Don't bump versions by hand — review its PRs instead.
  - If CI fails on a Renovate PR, fix it on that branch (replace deprecated APIs, adapt to the new API) rather than closing the PR.
- **Don't reach for `overrides`.** Fix it by updating the direct dependency. Use `overrides` only when a critical vulnerability is reported against a transitive dependency AND no direct update resolves it — document the advisory, why a direct update isn't viable, and the removal condition in the PR.

## Architecture

pnpm workspace monorepo on Node 24 (Vite+ toolchain): `/frontend` (React + Vite, deployed to GitHub Pages), `/backend` (Hono on Cloudflare Workers). See each `package.json` for the full stack. PR 動作確認用の preview だけ Cloudflare Workers Static Assets に載せる (`/frontend/preview`).

## Docs (`/docs/dev`)

- [node-system-architecture.md](docs/dev/node-system-architecture.md) — required reading before implementing a new node
- [scenario-editor-architecture.md](docs/dev/scenario-editor-architecture.md) — **required reading before any issue #213 sub-issue work** (scenario-document UI; the settled cross-cutting decisions). New features go here, not into the older UIs.
- [step-list-editor-architecture.md](docs/dev/step-list-editor-architecture.md) — step-list editor (issue #182). Frozen: kept only to run existing data, but its registry contract is still shared and live
- [pr-preview-environment.md](docs/dev/pr-preview-environment.md) — PR ごとの使い捨て Cloudflare Worker preview (作成・破棄・必要な Secrets)
- [testing-strategy.md](docs/dev/testing-strategy.md) — test pyramid, TDD, coverage strategy

## Skills (`.claude/skills/`)

- **schema-migration** — MUST use when changing a node's DataSchema

## Commands

See root `package.json` scripts. Run from repo root via `pnpm <script>`, or per-package via `pnpm --filter <pkg> <script>`.

## Development Workflow

After implementing, the task is not done until all of the following pass:

1. `pnpm test` · 2. `pnpm typecheck` · 3. `pnpm format` · 4. `pnpm lint` · 5. `pnpm knip`

## Knowledge Management

- **Update CLAUDE.md** when project structure, dev conventions, or the tech stack changes materially.
- **Add to `/docs/dev/`** for reusable implementation patterns, hard-won troubleshooting knowledge, or significant design decisions (and their rationale).
