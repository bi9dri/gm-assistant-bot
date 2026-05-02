# Testing Strategy

## Overview

AI-driven code generation is central to development; generated code quality must be backed by sustained high test coverage. This document defines the current strategy combining Unit, Integration, and Visual Regression Test (VRT) layers, on top of the Test Pyramid and TDD.

VRT was introduced via Issue [#141](https://github.com/bi9dri/gm-assistant-bot/issues/141) using Playwright + MSW + Storybook. Baselines are unified on Linux Docker; Chromium only.

---

## Test Pyramid

```
    ┌─────────┐
    │   VRT   │  Playwright + MSW; freeze appearance as fixtures
    │(Visual) │  Routes / React Flow editor / Storybook stories × light/dark
    ├─────────┤
    │ Integra-│  Hono `app.request()`, fake-indexeddb, etc.
    │  tion   │  store ↔ DB collaboration, route handler + schema
    ├─────────┤
    │  Unit   │  pure functions / store actions / Zod schema boundaries / DB model logic
    └─────────┘
```

### Unit Test
Verifies a single function / module / store action with all external dependencies mocked.

### Integration Test
Verifies collaboration between two or more modules. Uses `fake-indexeddb` or Hono's `app.request()`, but mocks Discord API and other external I/O.

### VRT (Visual Regression Test)
**Visual regression detection only.** Detects changes in CSS / Tailwind / DaisyUI / React Flow / layout by diffing against baseline screenshots. Logic, state transitions, and API correctness are the responsibility of Unit / Integration tests — never VRT.

---

## VRT

### Purpose
- Tailwind + DaisyUI usage makes CSS-driven visual breakage easy to introduce
- The React Flow-based template editor is highly susceptible to visual regressions in node rendering, connections, and layout
- Provide a CI safety net that catches visual diffs

### Scope
Follows the policy table in [#141](https://github.com/bi9dri/gm-assistant-bot/issues/141).

- **All routes** (template / session / bot)
- **React Flow template editor** (empty state / single representative node / multiple nodes connected by edges)
- **Individual components via Storybook stories**
- **light / dark theme matrix**

### Stack
| Item | Decision |
|------|----------|
| Browser | Chromium only |
| Snapshot strategy | Playwright's standard `toHaveScreenshot` + git commit |
| OS-difference handling | Update baselines in the same Linux environment as CI (Playwright official Docker recommended) |
| External dependency mocking | MSW pins Discord OAuth and the entire `/api`. Activated by passing env `VITE_USE_MSW=true` to the dev server |
| Component isolation | Storybook + `@storybook/addon-themes`'s `data-theme` decorator for light/dark switching |

### Determinism Principles
Screenshots must be deterministic to be meaningful. The following must always hold project-wide:

- Disable animations (`animations: "disabled"`) and hide caret (`caret: "hide"`)
- Keep `maxDiffPixelRatio` conservative; do not let small diffs slip through
- Mask dynamic elements (timestamps, random IDs, counters) or pin them with a fixed seed
- Wait for `document.fonts.ready` before capturing
- Pin React Flow viewport by explicitly calling `fitView`
- Set `prefers-reduced-motion` on the browser context

### Known Workaround
Starting the VRT dev server under the Bun runtime hits an Internal Server Error / startup hang caused by the Tailwind + `@tailwindcss/vite` + DaisyUI plugin combination. The `webServer.command` in `frontend/playwright.config.ts` therefore spawns vite via `node node_modules/.bin/vite` so the `--bun` flag from the parent `bun run --bun --filter ... test:vrt` invocation does not propagate into the child process. The reason and reproduction conditions are documented as a comment in that file — always consult it before modifying the config.

### Snapshot Operations
- Commit baselines to git
- Layout: auto-organized next to `frontend/test/vrt/{name}.vrt.ts` as `*.vrt.ts-snapshots/{arg}-{projectName}-{platform}{ext}`
- Update baselines in the same Linux environment as CI. Updating from local macOS or similar mass-produces false positives from pixel differences
- CI integration (fail on diff in PRs / upload diff PNGs as artifacts) and the baseline update workflow live in [`docs/dev/visual-regression-testing.md`](./visual-regression-testing.md)

### What VRT Does Not Cover
- Logic verification after a button click (Unit / Integration responsibility)
- Correctness of API response parsing (covered by backend Unit tests)
- Fine-grained assertions (do not use `toHaveText` and similar in VRT — screenshot diffing is sufficient)

---

## Coverage Strategy

Coverage is a **guideline**, not a hard requirement. Chasing 100% generates low-value tests (re-export coverage, exhaustive JSX branches, etc.) and degrades the Code-to-Test Ratio. Set realistic thresholds.

### Direction

| Metric | Direction |
|--------|-----------|
| Lines | Keep high |
| Statements | Keep high |
| Functions | Allowed to be lower (UI-side helpers cannot always be excluded cleanly) |

The actual thresholds live in `frontend/bunfig.toml` / `backend/bunfig.toml` and are the source of truth. Do not duplicate them in this doc (avoids drift).

### High-Coverage Targets
Code where logical correctness directly drives application reliability:

- store actions (template editor state transitions)
- node utility functions (dynamic value resolution, condition evaluation, resource collection, shuffle, etc.)
- Zod schema boundary values / transformations / errors
- DB model logic (non-entity-only models)
- Backend Discord integration / Hono route handlers / schemas

### Low-Coverage Acceptable (or Excluded)
- Route components (`routes/*.tsx`), theme, toast, and other display-only code → **covered by VRT instead**
- Logic-free DB entity models
- `database.ts` Dexie upgrade callback (hard to test due to Dexie internal API dependencies)
- `api.ts` (covered indirectly by backend tests)
- `fileSystem.ts` and OPFS-dependent helpers (mostly external API dependent)
- React contexts / hooks

The actual exclusion patterns live in `frontend/bunfig.toml`'s `coveragePathIgnorePatterns`.

---

## Code-to-Test Ratio

**Target: 1:1.5–1:2.0** (1.5 to 2 lines of test per line of production code)

### Efficiency Techniques

- **Test data factories**: consolidate fixtures shared across tests in one place
- **Parameterized tests** (`test.each`): batch the many patterns of a single logic (each dynamic value type, Zod boundary values)

### What Not to Test

| Target | Reason |
|--------|--------|
| Zod schema "happy path only" tests | Mirror of the schema definition. Test boundaries / transformations / errors only |
| React Flow internals | Library guarantees |
| Static text existence checks | Low regression-detection power |
| `console.log` / `console.error` output | Non-essential side effect |

---

## TDD Workflow (AI-Development Premise)

### Basic Flow
```
1. [Red]      Write the test first — define expected behavior
2. [Run]      bun run --bun test, confirm failure
3. [Green]    Write minimal implementation
4. [Run]      Confirm pass
5. [Refactor] Refactor
6. [Verify]   test → typecheck → format → lint → knip all pass
```

### Notes for AI Development
- **Red phase is critical**: this is where you verify the AI correctly understands the expected behavior
- **Green phase**: AI tends to dump a complete solution at once → consciously constrain it to a minimal implementation
- **Refactor phase**: AI-generated code tends to be verbose → actively slim it down

### Application Timing
- **New feature**: test → implementation → verification
- **Bug fix**: add reproduction test → fix → confirm no regression
- **Refactor**: no test changes → code changes → confirm tests still pass

---

## Anti-Patterns

### Cross-Layer
1. **Zod schema "mirror" tests** — parsing a valid value just to confirm it round-trips → test boundaries / transformations / errors only
2. **Implementation-detail tests** — spying on Zustand's internal `setState` → test results (state changes) instead
3. **Async timing dependencies** — waiting via `setTimeout` → make it deterministic by mocking `Date.now`, etc.
4. **Discord API over-mocking** — testing the REST client's internal structure → test only input/output correspondence
5. **Component existence tests** — checking static text → test state transitions driven by user interaction

### VRT-Specific
6. **Capturing dynamic elements without masking** — timestamps / random values / mid-animation frames cause flakiness
7. **Capturing React Flow without fixing the viewport** — without `fitView` (or equivalent) zoom/pan drift triggers diffs
8. **Multiple Storybook screenshots without changing `args`** — the story has no purpose
9. **Fine-grained assertions in VRT** — keep `toHaveText`-style checks in Unit/Integration. Screenshot diffing is enough for VRT

---

## Where Infrastructure Settings Live

Do not duplicate config **values** in this doc — files are the source of truth. This keeps the doc from drifting when values change.

| Config | Location | Role |
|--------|----------|------|
| Frontend coverage thresholds / exclusions | `frontend/bunfig.toml` | `coverageThreshold` / `coveragePathIgnorePatterns` |
| Backend coverage | `backend/bunfig.toml` | Coverage enabled (thresholds to be added later) |
| Unit test preload | `frontend/test/unit.setup.ts` | Clear Dexie tables / OPFS in-memory mock |
| VRT config | `frontend/playwright.config.ts` | testDir / Chromium / determinism / `webServer` |
| VRT MSW | `frontend/test/vrt/msw/{handlers.ts, browser.ts}` | Per-test handler overrides extend `frontend/test/vrt/fixtures.ts` |
| Storybook | `frontend/.storybook/{main.ts, preview.ts}` | Isolation for VRT. `viteFinal` deliberately does not spread `vite.config.ts` (avoids tanstackRouter / MSW middleware / devtools conflicts) |
| CI | `.github/workflows/ci.yml` | `check` job (typecheck → test → lint) and `vrt` job (Playwright Docker container) run in parallel. See [`visual-regression-testing.md`](./visual-regression-testing.md) for VRT operations |

### Test File Placement Convention

| Kind | Location |
|------|----------|
| Unit / Integration | Co-located in `src/`, `*.test.ts(x)` |
| VRT | `frontend/test/vrt/*.vrt.ts` |
| Storybook stories | `frontend/test/stories/**/*.stories.@(ts\|tsx\|mdx)` |

---

## Verification Method

Aligned with the Development Workflow in CLAUDE.md. After implementation, the task is not done until **all** of the following pass:

1. `bun run --bun test` — all tests pass
2. `bun run --bun typecheck` — no type errors
3. `bun run --bun format` — formatted
4. `bun run --bun lint` — no lint errors
5. `bun run knip` — no unused code detected

VRT-only verification (optional):

- `bun run --bun --filter gm-assistant-bot-frontend test:vrt`
- Baseline updates and the CI artifact recovery flow are documented in [`visual-regression-testing.md`](./visual-regression-testing.md)
