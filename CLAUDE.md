# Project Instructions for AI Assistant

## Code Comments
- Don't restate what identifiers already convey. Keep comments only for Why (context/constraints), non-obvious logic, or TODO/FIXME.

## TypeScript
- Narrow discriminated unions via type guards: `if (node.type !== "XxxNode") return;`

## Runtime / Package Manager (Bun)
- Use `bun install`, `bun run --bun <script>`, `bun <file>` — never npm/yarn/pnpm/node/ts-node.
- Tests: `bun run --bun test`. No dotenv (Bun auto-loads `.env`).
- `--filter` matches `package.json` `name` (not workspace dir). Wildcards ok: `--filter '*'`.
- Coverage: `coveragePathIgnorePatterns` uses glob (not regex). Thresholds apply globally — exclude untestable files rather than lowering thresholds.

## Dependency Management
- **Fixed versions only** — no `^` / `~`. Supply chain protection.
- **Use versions ≥7 days old**, except for security updates. Avoids malicious releases caught shortly after publish.
- **GitHub Actions**: pin external actions to full commit SHA (never tags/branches).
- **Renovate (GitHub App, `.github/renovate.json5`) proposes every update** and enforces the three rules above. Don't bump versions by hand — review its PRs instead.
  - Bun bumps arrive as one PR covering `devbox.json` / `packageManager` / `@types/bun`, but Renovate can't regenerate `devbox.lock`: run `devbox install` on the branch before merging.
  - If CI fails on a Renovate PR, fix it on that branch (replace deprecated APIs, adapt to the new API) rather than closing the PR.
- **Don't reach for `overrides`.** Fix it by updating the direct dependency. Use `overrides` only when a critical vulnerability is reported against a transitive dependency AND no direct update resolves it — document the advisory, why a direct update isn't viable, and the removal condition in the PR.

## Architecture
Bun workspace monorepo: `/frontend` (React + Vite, deployed as Cloudflare Workers Static Assets), `/backend` (Hono on Cloudflare Workers). See each `package.json` for the full stack.

## Docs (`/docs/dev`)
- [node-system-architecture.md](docs/dev/node-system-architecture.md) — required reading before implementing a new node
- [scenario-editor-architecture.md](docs/dev/scenario-editor-architecture.md) — **required reading before any issue #213 sub-issue work** (scenario-document UI; the settled cross-cutting decisions). New features go here, not into the older UIs.
- [step-list-editor-architecture.md](docs/dev/step-list-editor-architecture.md) — step-list editor (issue #182). Frozen: kept only to run existing data, but its registry contract is still shared and live
- [testing-strategy.md](docs/dev/testing-strategy.md) — test pyramid, TDD, coverage strategy

## Skills (`.claude/skills/`)
- **node-creator** — MUST use when implementing a new `XxxNode`
- **schema-migration** — MUST use when changing a node's DataSchema

## Commands
See root `package.json` scripts. Run from repo root via `bun run --bun <script>`, or per-package via `bun run --bun --filter <pkg> <script>`.

## Development Workflow
After implementing, the task is not done until all of the following pass:
1. `bun run --bun test` · 2. `bun run --bun typecheck` · 3. `bun run --bun format` · 4. `bun run --bun lint` · 5. `bun run knip`

## Knowledge Management
- **Update CLAUDE.md** when project structure, dev conventions, or the tech stack changes materially.
- **Add to `/docs/dev/`** for reusable implementation patterns, hard-won troubleshooting knowledge, or significant design decisions (and their rationale).
