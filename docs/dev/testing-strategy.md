# Testing Strategy

## Overview

AI-driven code generation is central to development, requiring maximized test coverage to ensure generated code quality. Currently, frontend has ~5 test files (125 test cases, ~45% coverage). Backend has no tests. No CI test execution.

This strategy establishes comprehensive testing based on the Test Pyramid and TDD, targeting 90%+ coverage while maintaining healthy Code to Test Ratio.

---

## Test Pyramid

```
    ┌─────────┐
    │  E2E    │  → Not in current scope (Phase N+1)
    ├─────────┤
    │ Integra-│  25% — Hono route handlers, DB migrations,
    │  tion   │       store+DB integration
    ├─────────┤
    │         │  75% — Pure functions, store actions, Zod schemas,
    │  Unit   │       DB models, API clients, backend utilities
    └─────────┘
```

### Unit Test Definition
Tests single function/module/store action without external dependencies. All external dependencies are mocked.

### Integration Test Definition
Tests collaboration between 2+ modules. Uses fake-indexeddb or Hono's `app.request()`, but mocks Discord API.

### E2E (Deferred to Phase N+1)
- Current Unit + Integration tests provide sufficient coverage
- Future consideration: Playwright for critical paths (template import/export, session creation→execution flow)

---

## Coverage Strategy

### Target Metrics

| Metric     | Target |
|------------|--------|
| Lines      | 90%    |
| Functions  | 95%    |
| Statements | 90%    |

Target 90-95% instead of 100% to avoid coverage-first approach that generates low-value tests (re-export coverage, exhaustive JSX branches) and worsens Code to Test Ratio.

### Coverage Exclusions
- `routeTree.gen.ts` — Auto-generated
- `main.tsx` — Entry point (boot only)
- `**/index.ts` — Re-export only files
- `routes/__root.tsx` — Root layout

### 100% Target Code (logic correctness = app reliability)
- `stores/templateEditorStore.ts`
- `components/Node/utils/DynamicValue.ts`
- `db/models/Template.ts`, `db/models/GameSession.ts`
- `api.ts`, `fileSystem.ts`
- `backend/src/discord.ts`, `backend/src/index.ts`, `backend/src/schemas.ts`

### Low Coverage Acceptable
- `routes/*.tsx` — UI composition only
- `theme/*.tsx`, `toast/` — Visual display only
- Entity-only DB models (`DiscordBot.ts`, `Guild.ts`, `Category.ts`, `Channel.ts`, `Role.ts`) — No logic

---

## Code to Test Ratio Guidelines

**Target ratio: 1:1.5～1:2.0** (1.5～2 lines of test per line of production code)

### Efficiency Techniques

#### a. Test Data Factories (`frontend/test/factories.ts`)
Manage test data centrally, write only diffs in each test. Consolidates local helpers from existing `GameSession.test.ts`.

#### b. Parameterized Tests (`test.each`)
Test multiple patterns of same logic efficiently. Use for `resolveDynamicValue` 5 types and Zod schema boundary values.

#### c. What NOT to Test
| Target | Reason |
|--------|--------|
| Zod schema "happy path only" tests | Repeats schema definition. Test boundaries/transformations/errors only |
| React Flow internal behavior | Library guarantees |
| Static text existence checks | Low regression detection power |
| console.log/error output | Non-essential side effects |

---

## TDD Workflow (AI Development)

### Basic Flow
```
1. [Red]      Write test first — Define expected behavior
2. [Run]      bun run --bun test to confirm failure
3. [Green]    Write minimal implementation code
4. [Run]      Confirm test passes
5. [Refactor] Refactoring
6. [Verify]   test → type-check → format → lint all pass
```

### AI Development Notes
- **Red phase is critical**: Opportunity to verify AI understands "expected behavior"
- **Green phase**: AI tends to output complete implementation at once → consciously constrain to minimal implementation
- **Refactor phase**: AI-generated code tends to be verbose → actively slim down

### Application Timing
- **New feature**: Test → Implementation → Verification
- **Bug fix**: Add reproduction test → Fix → Confirm no regression
- **Refactoring**: No test changes → Code changes → Confirm tests pass

---

## Anti-Patterns

1. **Zod schema "mirror" tests** — Parse valid value to confirm same value returns → Test boundaries/transformation logic/errors only
2. **Implementation detail tests** — Spy on Zustand's internal `setState` → Test results (state changes)
3. **Async timing dependencies** — Wait with `setTimeout` → Make deterministic with `Date.now` mock
4. **Discord API over-mocking** — Test REST client internal structure → Test input/output correspondence
5. **Component existence tests** — Check static text → Test state changes from user operations

---

## Implementation Roadmap

### Phase 1: Foundation + High-Value Unit Tests ✅

**Infrastructure:**
- `frontend/bunfig.toml` — Add coverage config
- `backend/bunfig.toml` — Create new (coverage config)
- `backend/package.json` — Add `"test": "bun test"` script
- `frontend/test/factories.ts` — Create test data factory

**Tests Added (Frontend):**

| Target | Test File | Est. Cases |
|--------|-----------|------------|
| `expandBlueprint()` | `stores/templateEditorStore.test.ts` (append) | ~15 |
| `resolveDynamicValue()` | `components/Node/utils/DynamicValue.test.ts` (new) | ~10 |
| RecordCombination pure functions | `components/Node/utils/recordCombination.test.ts` (new) | ~18 |
| `fisherYatesShuffle()` | `components/Node/utils/shuffle.test.ts` (new) | ~5 |

**Source Code Changes:**
- Extract `getFilteredTargetOptions`, `validatePair` from `RecordCombinationNode.tsx` to `recordCombination.ts`
- Extract `fisherYatesShuffle` from `ShuffleAssignNode.tsx` to `shuffle.ts`

### Phase 2: Backend Tests

| Target | Test File | Est. Cases |
|--------|-----------|------------|
| Utility functions | `backend/src/discord.test.ts` (new) | ~10 |
| Zod schema boundaries | `backend/src/schemas.test.ts` (new) | ~15 |
| Hono route handlers | `backend/src/index.test.ts` (new) | ~20 |

**Source Code Changes:**
- Export utility functions in `discord.ts`

### Phase 3: Frontend Remaining Coverage + CI

| Target | Test File | Est. Cases |
|--------|-----------|------------|
| DB migrations | `frontend/src/db/database.test.ts` (new) | ~6 |
| Zod schema boundaries | `frontend/src/db/schemas.test.ts` (new) | ~10 |

**CI Pipeline:**
- `.github/workflows/ci.yml` (new) — test → type-check → lint

### Projections

| | New Test Files | Est. Test Cases | Coverage |
|---|---|---|---|
| Phase 1 | 3 new + 1 append | ~48 | ~80% |
| Phase 2 | 3 new | ~45 | ~85% |
| Phase 3 | 2 new + CI | ~16 | 90%+ |
| **Total** | **8 new** | **~109** | **90%+** |

Combined with existing 125 cases = total ~234 test cases.

---

## Infrastructure Settings

### `frontend/bunfig.toml`
```toml
[test]
preload = ["./test/unit.setup.ts"]
coverage = true
coverageReporter = ["text", "lcov"]
coverageDir = "./coverage"
coverageThreshold = { lines = 0.9, functions = 0.95, statements = 0.9 }
coverageSkipTestFiles = true
```

### `backend/bunfig.toml` (New)
```toml
[test]
coverage = true
coverageReporter = ["text", "lcov"]
coverageDir = "./coverage"
coverageThreshold = { lines = 0.9, functions = 0.95, statements = 0.9 }
coverageSkipTestFiles = true
```

### `.github/workflows/ci.yml` (New)
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2
      - uses: oven-sh/setup-bun@3d267786b128fe76c2f16a390aa2448b815359f3  # v2.1.2
      - run: bun install --frozen-lockfile
      - run: bun run --bun type-check
      - run: bun run --bun test
      - run: bun run --bun lint
```

> Note: Hash values unified with those currently used in `deploy-frontend.yml`.

### Test File Placement Convention
Place tests in same directory as target with `.test.ts` suffix (follows existing pattern).

---

## Verification Method

At each Phase completion, execute:
1. `bun run --bun test` — All tests pass
2. `bun run --bun type-check` — No type errors
3. `bun run --bun format` — Format
4. `bun run --bun lint` — No lint errors
5. Confirm threshold achievement in coverage report
