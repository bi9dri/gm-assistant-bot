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
- **Use versions ≥7 days old**, except for security updates. Avoids malicious releases caught shortly after publish. Tooling enforces this: `ncu --cooldown 7` for npm/bun, `pinact run -m 7` for GitHub Actions.
- **GitHub Actions**: pin external actions to full commit SHA (never tags/branches). Run `pinact run -m 7` to auto-pin.

## Architecture
Bun workspace monorepo: `/frontend` (React + Vite, deployed as Cloudflare Workers Static Assets), `/backend` (Hono on Cloudflare Workers). See each `package.json` for the full stack.

## Docs (`/docs/dev`)
- [node-system-architecture.md](docs/dev/node-system-architecture.md) — required reading before implementing a new node
- [testing-strategy.md](docs/dev/testing-strategy.md) — test pyramid, TDD, coverage strategy

## Skills (`.claude/skills/`)
- **node-creator** — MUST use when implementing a new `XxxNode`
- **schema-migration** — MUST use when changing a node's DataSchema
- **update-dependencies** — use when updating npm/bun packages or GitHub Actions

## Commands
See root `package.json` scripts. Run from repo root via `bun run --bun <script>`, or per-package via `bun run --bun --filter <pkg> <script>`.

## Development Workflow
After implementing, the task is not done until all of the following pass:
1. `bun run --bun test` · 2. `bun run --bun type-check` · 3. `bun run --bun format` · 4. `bun run --bun lint` · 5. `bun run knip`

## Knowledge Management
- **Update CLAUDE.md** when project structure, dev conventions, or the tech stack changes materially.
- **Add to `/docs/dev/`** for reusable implementation patterns, hard-won troubleshooting knowledge, or significant design decisions (and their rationale).
