# Step-List Editor Architecture

> **Canonical reference for issue #182 Phases 1–5.** Read this before implementing any
> phase of the React Flow → step-list editor migration. It fixes the cross-cutting
> decisions so each phase's agent does not re-derive (and drift on) them.
>
> Phase 0 (data model + converter) is already merged — see `frontend/src/flow/schema.ts`
> and `frontend/src/flow/convert.ts`. This doc covers everything built **on top of** that.

## Why this migration

The React Flow UI exposes graph expressiveness the workflows never use. Real flows are
"linear + branch (no loops, no parallel)". The graph causes content clipping and awkward
placement/wiring. We replace it with a **step-list editor**: a vertical list of one-line
step summaries, a wide detail panel for the selected step, and a resident game-flag panel.

Full product rationale lives in issue #182. This doc is the *implementation* canon.

---

## Confirmed architectural decisions

These were settled by design interview. Do not relitigate them inside a phase; if a phase
reveals one is wrong, raise it against this doc first.

| # | Decision | Choice |
|---|----------|--------|
| D1 | Per-step-type code shape | **Pure-module registry.** Each step type registers `{ type, schema, summary(), DetailPanel, execute() }` into one map. List/runner are generic and iterate the map. `summary()` and `execute()` are pure (no DOM) and unit-tested. |
| D2 | Existing field-editor UI | **Reuse as-is.** Drop only the `BaseNode` chrome; keep `DynamicValueInput`, message editor, condition-tree editor, tool bodies. Move shared editors into `flow/` as they are extracted. |
| D3 | Resident flag panel in edit mode | **Edits the template's seed `gameFlags`** in edit mode; shows/edits the live session flags in execute mode. Same panel, different backing store. |
| D4 | Nested-tree state management | **Zustand + Immer** (`zustand/middleware/immer`), with all tree mutations expressed as pure helpers in `flow/treeOps.ts` implemented via `produce`. |

Rationale summary (D4): at this scale (hundreds of steps, whole-tree JSON persistence) the
ops/sec benchmarks are irrelevant — the perf axis that matters is **referential stability**
during live editing of a 3-pane UI, where Immer's structural sharing keeps unchanged list
rows referentially equal so memoized rows skip re-render. Immer is also pmndrs-official
(trust) and ubiquitous (agents reproduce the pattern with low drift). `structuredClone` +
`treeOps.ts` remains an equivalent fallback if the dependency is ever removed; the
`treeOps.ts` pure-helper API is the canon either way.

> Dependency policy still applies: pin Immer to a fixed version ≥7 days old (`ncu --cooldown 7`).

---

## Directory layout

Everything new lives under `frontend/src/flow/` (Phase 0 already started it):

```
frontend/src/flow/
  schema.ts            # Phase 0 — FlowData / Step / Section Zod schema (z.lazy recursion)
  convert.ts           # Phase 0 — convertReactFlowToFlowData(input) => { flowData, warnings }
  treeOps.ts           # Phase 2 — pure tree mutations (produce-based). See "State management".
  ids.ts               # Phase 2 — id generation helper (see "ID generation")
  registry/
    index.ts           # the step-type registry map + lookup helpers
    <StepType>.tsx     # one module per step type: schema re-export + summary + DetailPanel + execute
  store/
    editorStore.ts     # Phase 2 — Zustand store for edit mode (template authoring)
    runnerStore.ts     # Phase 3 — Zustand store for execute mode (cursor + chain execution)
  components/
    StepList.tsx       # left column: generic list iterating the registry
    DetailPanel.tsx    # center column: renders registry[step.type].DetailPanel
    FlagPanel.tsx      # right column: resident game-flag panel (D3)
    SectionHeader.tsx  # collapsible section + table-of-contents
  engine/
    execute.ts         # Phase 3 — cursor runner orchestrating registry[type].execute()
  wizard/              # Phase 4 — new-template wizard (Blueprint replacement)
```

Exact filenames are a guide; the **registry contract and treeOps API are binding**.

---

## Data model (Phase 0 — recap)

`FlowData = { version: 1, sections: Section[] }`, `Section = { id, title, memo, collapsed, steps: Step[] }`.
`Step` shares `{ id, type, title, memo, autoAdvance, executedAt? }`. The branch step is a single
unified type (`type: "Branch"`, `mode: "auto" | "select"`, `branches: { id, label, condition?, steps: Step[] }[]`)
with recursive `steps` via `z.lazy`. See `frontend/src/flow/schema.ts` — do not redefine it.

The converter is `convertReactFlowToFlowData(input: unknown): { flowData: FlowData; warnings: ConversionWarning[] }`.
It is best-effort: unconvertible structure is flattened and surfaced as a `⚠️` warning memo, not dropped.

---

## D1 — Step-type registry contract

Each step type is one module exporting a registry entry. The list, detail panel, and runner
are **generic**; they never `switch` on `step.type`. Adding a step type = adding one module
and one registration line.

```ts
// flow/registry/types.ts
export interface StepRegistryEntry<S extends Step = Step> {
  type: S["type"];
  schema: z.ZodType<S>;                      // re-export the per-type schema from flow/schema.ts
  defaults: () => Omit<S, "id">;             // for "add step" (replaces the addNode switch)
  summary: (step: S) => string;              // PURE. one-line list-row text. unit-tested.
  DetailPanel: (props: { step: S; onChange: (patch: Partial<S>) => void; mode?: "edit" | "execute" }) => JSX.Element;
  category: "action" | "tool" | "branch";    // tool = flag-only UI, no Discord call (see Tools)
  execute?: (step: S, ctx: ExecuteContext) => Promise<ExecuteResult>; // PURE-ish. omit for tools.
}
```

```ts
// flow/registry/index.ts
const ENTRIES = [CreateRoleEntry, SendMessageEntry, BranchEntry, /* ... */] as const;
export const registry = new Map(ENTRIES.map((e) => [e.type, e]));
export const getEntry = (type: Step["type"]) => registry.get(type)!;
```

Rules:

- **`summary()` and `execute()` must be pure and live in the module, not in a component.**
  This is the autonomous-verification lever: both are unit-tested without rendering.
- `DetailPanel` is a dumb controlled component: it receives `step` + `onChange(patch)` and
  reuses existing field editors (D2). It does **not** touch the store directly — the host
  (`DetailPanel.tsx`) wires `onChange` to `treeOps.updateStepById`. The runner host passes
  `mode="execute"` (default `"edit"`); a panel may branch on it to swap authoring UI for a
  runtime picker (e.g. `SetGameFlag` renders its prepared options as a `<select>`).
- Branch is just another entry; its `DetailPanel` renders nested `<StepList>` per arm and its
  `execute()` returns which arm(s) to descend into (the engine handles recursion — see Engine).
- **Tools** (`Kanban`, `Counter`, `ShuffleAssign`, `RandomSelect`, `RecordCombination`) have
  `category: "tool"` and **no `execute()`**. In execute mode they render an "open/operate" UI
  that mutates game flags directly, not a run button.

---

## D2 — Reusing existing field editors

These already exist and are React-Flow-independent. Reuse them directly in `DetailPanel`s;
extract shared subcomponents from the old nodes into `flow/` as needed, keeping behavior identical.

| Editor | Current location | Reuse for |
|--------|------------------|-----------|
| `DynamicValueInput` | `components/Node/utils/DynamicValueInput.tsx` | any `DynamicValueSchema` field (e.g. `CreateCategory.categoryName`) |
| `FlagValueSelector` | `components/Node/utils/FlagValueSelector.tsx` | flag pickers |
| `ResourceSelector` / `PortaledSelect` | `components/Node/utils/` | role/channel reference inputs |
| message-block editor | inline in `components/Node/nodes/SendMessageNode.tsx` / `CombinationSendMessageNode.tsx` | `SendMessage` / `CombinationSendMessage` panels — **extract** to `flow/components/MessageBlocksEditor.tsx` |
| condition-tree editor | inline in `components/Node/nodes/ConditionalBranchNode.tsx` | `Branch` panel (auto mode) — **extract** to `flow/components/ConditionTreeEditor.tsx` |
| tool bodies (Kanban etc.) | `components/Node/nodes/*Node.tsx` | tool DetailPanels — reuse the body, drop node chrome |

`DynamicValue` resolution stays as-is: `resolveDynamicValue(value, ctx)` with `DynamicValueContext`
(see `docs/dev/node-system-architecture.md`). The new engine builds that context from session resources.

---

## D4 — State management

Two Zustand stores, both holding the `FlowData` tree, both mutating only through `treeOps.ts`.

```ts
// flow/treeOps.ts — pure, produce-based, unit-tested. The recursion lives HERE, once.
import { produce } from "immer";

export const updateStepById = (flow: FlowData, id: string, patch: (s: Step) => void): FlowData =>
  produce(flow, (draft) => { const s = findStep(draft, id); if (s) patch(s); });

export const insertStep: (flow: FlowData, at: StepLocation, step: Step) => FlowData = /* ... */;
export const moveStep:   (flow: FlowData, id: string, to: StepLocation) => FlowData = /* ... */;
export const removeStep: (flow: FlowData, id: string) => FlowData = /* ... */;
// findStep / mapBranchSteps must descend into Branch arms (branches[].steps) recursively.
```

- **`treeOps.ts` is the only place that knows the tree is recursive.** Stores and components
  call named helpers; they never hand-roll nested spreads or walk `branches[].steps` themselves.
- Persistence is unchanged in shape: serialize the whole tree to the `flowData` JSON string
  field (Phase 1) on save. No coordinates, no viewport.
- `editorStore` (edit mode) is template-authoring: add/move/remove/edit steps + seed flags.
- `runnerStore` (execute mode) adds the cursor and chain-execution state (see Engine). It may
  edit **unexecuted** steps of a session copy; executed steps are record-protected (read-only).

---

## D3 — Resident flag panel

`FlagPanel.tsx` is present in both modes (right column).

- **Edit mode** → backed by the template's seed `gameFlags` (`Template.gameFlags`, a JSON
  `z.record(z.string(), z.any())`). Editing seeds the initial flag values a session starts with.
- **Execute mode** → backed by the live `GameSession.gameFlags`. Reading/writing here changes
  the running session; it coexists with scripted `SetGameFlag` steps and tool mutations.

Same component, swap the backing store/handlers by mode. It is always available regardless of
the cursor position or selected step.

---

## Execution engine (Phase 3)

Execution logic is **extracted out of components** into `registry[type].execute()` (pure-ish:
takes a step + context, performs Validate → Resolve → Call → Persist, returns a result). The
engine in `flow/engine/execute.ts` owns orchestration only:

- Holds the **cursor** ("recommended position"); the cursor is advisory — any step may be run,
  re-run, or skipped at any time.
- Runs one step, then if `step.autoAdvance` is true, chains into the next step (the authored
  "auto-run" sections, e.g. setup).
- For a `Branch` step, calls its `execute()` to decide arm(s): `mode:"auto"` evaluates the
  condition tree (`matchMode:"first"` → first match; `matchMode:"all"` → every match top-to-bottom),
  `mode:"select"` takes the GM's choice and writes `flagName`. Records chosen arms in
  `executedBranchIds`, then descends into the chosen arm's `steps`. Unchosen arms collapse in the UI.
- **Branch re-selection**: an executed `mode:"select"` Branch keeps offering its arm buttons, so a
  mis-chosen arm can be redone. Re-executing a Branch clears descendant execution *and* skip marks
  across all arms (`clearDescendantExecution` / `collectDescendantStepIds`) before committing the
  new arm. If the cursor was left inside the now-closed arm (no longer in the run order), it is
  repositioned to the head of the newly opened arm.
- On completion: set `executedAt`, update flags/resources, toast. Reuses the existing pipeline
  semantics and `NodeExecutionContext` shape (`{ guildId, sessionId, sessionName, bot }`).

The per-step `execute()` functions must be unit-testable by mocking the Discord call layer.

---

## Edit vs execute mode

| Aspect | Edit mode (template) | Execute mode (session) |
|--------|----------------------|------------------------|
| Backing record | `Template.flowData` | `GameSession.flowData` (a copy of the template) |
| Step editing | Full | Unexecuted steps only; executed = read-only |
| Run / cursor | None | Cursor + run/re-run/skip + chain via `autoAdvance` |
| Flag panel (D3) | Seed `Template.gameFlags` | Live `GameSession.gameFlags` |
| Tools | Configured | Operated (open/operate UI) |

---

## Routing & coexistence

The new editor ships on **separate routes** and runs alongside React Flow until validated.

- Both UIs live under a **`$id/` directory route**, one file per view:
  `routes/template/$id/index.tsx` (React Flow, `/template/$id`) + `routes/template/$id/steps.tsx`
  (step-list, `/template/$id/steps`), and the same pair under `routes/session/$id/`.
  Old views read `reactFlowData`; new views read `flowData`.
  - **Do not** use the flat `routes/template/$id.steps.tsx` form: it nests the steps route under
    `$id.tsx`, which renders its React Flow editor with no `<Outlet/>`, so the child never shows
    (the "broken route" from #182). The directory form has no `$id.tsx` layout, so TanStack
    synthesizes a pathless parent that renders `<Outlet/>` and both views resolve as siblings.
  - Discoverability: `TemplateCard` / `SessionCard` link to the `/steps` view alongside the old one.
- New-UI edits write **only** `flowData`. The old UI is reference-only; divergence between
  `flowData` and `reactFlowData` is accepted during coexistence.
- Phase 5 deletes React Flow, the old node implementations, the old routes, and `reactFlowData`
  once a real session has been completed on the new UI. `knip` catches the leftovers.

---

## Persistence & migration (Phase 1)

- Add a `flowData` field to **both** `Template` and `GameSession` (JSON-encoded string, like
  `reactFlowData`). Add a `FlowDataSchema`-backed parse/serialize path on each model (mirror the
  existing `getParsedReactFlowData` / `update` pattern).
- Bulk-convert existing records via the next Dexie version (`this.version(7).upgrade`) using
  `convertReactFlowToFlowData`. **Keep `reactFlowData`** (old UI + backup); do not delete it.
- Surface converter `warnings` so the user can fix flattened structures. **Resolved (Phase 1):**
  `foldWarningsIntoFlowData` in `flow/migrate.ts` folds them into `⚠️` memos — a `nodeId` matching a
  step appends to that step's `memo` (recursing into `branches[].steps`), one matching a section
  appends to that section's `memo`; every remaining warning (no `nodeId`, or a `nodeId` that is
  neither a step nor a section — global warnings, unrealized groups, etc.) is aggregated into the
  first section's `memo`, or a synthetic `conversion-warnings` section if the flow has none.
  Nothing is dropped.
- **Use the `schema-migration` skill** for the Dexie work. Migrate both tables with `modify()`.
  **Implemented:** the pure, unit-tested transforms (`migrateRecordToFlowData` /
  `reactFlowToFlowData` / `foldWarningsIntoFlowData`) and the side-effecting orchestrator that
  `modify()`s both tables (`applyFlowDataMigration`, fake-indexeddb integration-tested) live in
  `flow/migrate.ts`; `database.ts`'s `version(7).upgrade` is a thin caller. `migrateRecordToFlowData`
  is idempotent: a record that already holds valid `flowData` is kept as-is, so re-running is safe.
- A record's `flowData` file paths are kept identical to its `reactFlowData` paths. Session
  creation (`CreateSession`) and template import (`importTemplate`) rewrite both with the same
  replacer (`convertFilePathsInFlowData` mirrors `convertFilePathsInReactFlowData`).

---

## ID generation

Use `crypto.randomUUID()` for all new step/section/branch/arm ids (matches existing usage in
`templateEditorStore`'s `crypto.randomUUID()` calls). Put a thin helper in `flow/ids.ts` so tests
can stub it. Do not reuse the old sequential `<Type>-N` scheme — it assumed a flat node array.

---

## Testing & acceptance (the autonomous gate)

The autonomy of these phases depends on machine-checkable gates. Per `docs/dev/testing-strategy.md`:

- **Unit (highest leverage here):** `treeOps.ts`, every `summary()`, every `execute()`, the
  engine's cursor/chain/branch logic, and the Phase 1 migration. These are pure and must be
  TDD'd. A phase is not done until its pure logic is covered.
- **VRT (acceptance for UI phases):** each phase that adds UI must ship Storybook stories whose
  VRT snapshots are the acceptance criterion — "this story renders/changes as specified" is how
  a UI phase is judged complete without manual hand-holding. Cover: StepList rows per category,
  each DetailPanel, FlagPanel (edit + execute), Branch nesting, section collapse, runner states
  (executed/skipped/cursor badges).
- Every phase must pass the full gate before "done":
  `bun run --bun test` · `typecheck` · `format` · `lint` · `bun run knip`.

---

## Phase map

Each phase becomes a sub-issue of #182 with the design pinned (grilled) before `/goals`.
Split each into stacked PRs as Phase 0 did.

| Phase | Deliverable | Primary acceptance gate |
|-------|-------------|-------------------------|
| 1 | Dexie migration: `flowData` on Template + GameSession, bulk convert, keep `reactFlowData` | Migration unit tests (both tables, legacy + already-new records); `schema-migration` skill |
| 2 | Edit-mode editor: StepList + DetailPanel + FlagPanel + sections + dnd-kit reorder, new route, registry + treeOps + editorStore | `treeOps`/`summary` unit tests + VRT stories for list/panels/sections |
| 3 | Session runner: cursor, chain (`autoAdvance`), re-run/skip/arbitrary run, in-session editing, tools, engine + per-type `execute()` | Engine + `execute()` unit tests + VRT for runner states |
| 4 | New-template wizard (Blueprint replacement): char names / VC count → initial sections + steps | Generator unit tests + VRT for wizard |
| 5 | Real-session validation → delete React Flow, old nodes/routes, `reactFlowData` | `@xyflow/react` gone; `knip` clean; full gate green |

Human-in-the-loop is confined to: (a) approving each phase's sub-issue spec, and (b) the Phase 5
real-session sign-off. Everything else runs autonomously behind the gates above.

---

## Reference files

| File | Role |
|------|------|
| `frontend/src/flow/schema.ts` | Phase 0 data model (do not redefine) |
| `frontend/src/flow/convert.ts` | Phase 0 converter (`convertReactFlowToFlowData`) |
| `frontend/src/components/Node/utils/DynamicValue.ts` | DynamicValue resolution (reused) |
| `frontend/src/components/Node/utils/DynamicValueInput.tsx` | reused field editor |
| `frontend/src/components/Node/contexts/NodeExecutionContext.tsx` | execution context shape |
| `frontend/src/db/database.ts` | Dexie versions/migrations (Phase 1) |
| `frontend/src/db/models/{Template,GameSession}.ts` | records gaining `flowData` |
| `docs/dev/node-system-architecture.md` | old node system (being replaced; still the source for DynamicValue/pipeline) |
| `docs/dev/testing-strategy.md` | test pyramid + VRT (acceptance gates) |
