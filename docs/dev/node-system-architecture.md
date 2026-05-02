# Node-Based Workflow System Architecture

> Read this before implementing a new node type. For step-by-step implementation procedures, see `.claude/skills/node-creator/SKILL.md`.

## Overview

A node-based workflow system for managing TRPG / murder-mystery sessions. Built on React Flow (`@xyflow/react`). Nodes operate in two modes:

- **Edit mode** — Template authoring. Data is editable. No execute button. No execution context.
- **Execute mode** — Session runtime. Data is read-only. Execute button is shown. Execution context is provided.

The full list of node types lives in `frontend/src/components/Node/nodes/`. It changes frequently and is intentionally not enumerated here.

---

## Node basics

### Base schema

Every node extends `BaseNodeDataSchema`:

```ts
// frontend/src/components/Node/base/base-schema.ts
export const BaseNodeDataSchema = z.object({
  executedAt: z.coerce.date().optional(), // set when execution completes
});
```

By convention each node also defines a `title: z.string().default(...)` field for the inline-editable header.

### Width and content height

```ts
// frontend/src/components/Node/base/base-schema.ts
const NODE_WIDTHS = {
  sm: 192, // 12 × 16
  md: 256, // 16 × 16 (default)
  lg: 480, // 30 × 16 (complex nodes)
  xl: 640, // 40 × 16 (group nodes)
};

export const NODE_TYPE_WIDTHS: Record<string, NodeWidth> = {
  /* one entry per node type */
};

export const NODE_CONTENT_HEIGHTS = {
  sm: 200,
  md: 300,
  lg: 400,
};
```

Add an entry to `NODE_TYPE_WIDTHS` when introducing a new node type.

---

## Node component pattern

Skeleton only. The full template lives in `.claude/skills/node-creator/SKILL.md`.

```tsx
import { Position, type Node, type NodeProps } from "@xyflow/react";
import z from "zod";

import {
  BaseHandle, BaseNode, BaseNodeContent, BaseNodeFooter,
  BaseNodeHeader, BaseNodeHeaderTitle, EditableTitle,
  BaseNodeDataSchema, NODE_CONTENT_HEIGHTS, NODE_TYPE_WIDTHS,
} from "../base";
import { useNodeExecutionOptional } from "../contexts";

export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().default("Default title"),
  // node-specific fields
});

type ExampleNodeData = Node<z.infer<typeof DataSchema>, "Example">;

export const ExampleNode = ({
  id, data, mode = "edit",
}: NodeProps<ExampleNodeData> & { mode?: "edit" | "execute" }) => {
  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;
  // In execute mode, fetch context with useNodeExecutionOptional()

  return (
    <BaseNode width={NODE_TYPE_WIDTHS.Example}>
      <BaseNodeHeader>
        {isExecuteMode
          ? <BaseNodeHeaderTitle>{data.title}</BaseNodeHeaderTitle>
          : <EditableTitle title={data.title} defaultTitle="Default title" onTitleChange={/* ... */} />}
      </BaseNodeHeader>
      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.md}>
        {/* edit / display UI */}
      </BaseNodeContent>
      {isExecuteMode && <BaseNodeFooter>{/* execute button */}</BaseNodeFooter>}
      <BaseHandle id="target-1" type="target" position={Position.Left} />
      <BaseHandle id="source-1" type="source" position={Position.Right} />
    </BaseNode>
  );
};
```

### Base components

Re-exported from `frontend/src/components/Node/base/`:

| Name | Purpose |
|------|---------|
| `BaseNode` | Top-level node container |
| `BaseNodeHeader` / `BaseNodeHeaderTitle` | Header |
| `BaseNodeContent` | Scrollable body (controlled by `maxHeight`) |
| `BaseNodeFooter` | Footer (execute button etc.) |
| `BaseHandle` / `LabeledHandle` | Connection handles |
| `EditableTitle` | Inline-editable title for edit mode |
| `cn` | Class-name join utility |

### Important CSS classes

- `nodrag` — Disables React Flow drag. **Required** on `input`, `textarea`, `button`, and other interactive elements.
- `bg-base-300` — Default background.
- `border-success bg-success/10` — Conventional style applied when `data.executedAt` is set.

---

## Edit mode vs execute mode

| Aspect | Edit mode | Execute mode |
|--------|-----------|--------------|
| Purpose | Template authoring | Session runtime |
| Data editing | Allowed | Read-only |
| Execute button | Hidden | Shown |
| Delete button | Shown | Hidden |
| Execution context | None | Provided |

### Execution context

```ts
// frontend/src/components/Node/contexts/NodeExecutionContext.tsx
interface NodeExecutionContextValue {
  guildId: string;
  sessionId: number;
  sessionName: string;
  bot: DiscordBotData;
}
```

Nodes call `useNodeExecutionOptional()` to obtain it. The return value can be `null`, so guard before use.

---

## DynamicValue system

Resolves node parameters dynamically — literals, session names, role/channel references, and game flags — through a single discriminated union.

```ts
// frontend/src/components/Node/utils/DynamicValue.ts
export const DynamicValueSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("literal"), value: z.string() }),
  z.object({ type: z.literal("session.name") }),
  z.object({ type: z.literal("roleRef"), roleName: z.string() }),
  z.object({ type: z.literal("channelRef"), channelName: z.string() }),
  z.object({ type: z.literal("gameFlag"), flagKey: z.string() }),
]);

export interface DynamicValueContext {
  sessionName?: string;
  roles?: Map<string, string>;       // roleName -> roleId
  channels?: Map<string, string>;    // channelName -> channelId
  gameFlags?: Record<string, string>;
}

export function resolveDynamicValue(value: DynamicValue, context: DynamicValueContext): string;
```

Use `DynamicValueSchema` directly as a node field, then call `resolveDynamicValue` at execute time. Adding a new variant requires updating three places: the schema, `DynamicValueContext`, and `resolveDynamicValue`.

---

## Persistence

Nodes are persisted to IndexedDB via Dexie.js using the React Flow data shape:

```ts
export const ReactFlowDataSchema = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
});
```

- Stored on both `Template.reactFlowData` and `GameSession.reactFlowData`.
- `nodes` is typed as `z.any()`, so each node's `DataSchema` is responsible for validating its own payload at read time.

---

## Execution flow

1. **Validate** — Check inputs.
2. **Resolve** — Use `resolveDynamicValue` to translate role/channel names to IDs, etc.
3. **Call** — Hit Discord API.
4. **Persist** — Record the created resource in the DB.
5. **Update state** — `updateNodeData(id, { executedAt: new Date() })`.
6. **Toast** — Notify the user of the result.

### Progress reporting pattern

For nodes that loop (e.g. creating multiple roles), keep a progress counter in state and render a `<progress>` element:

```tsx
const [progress, setProgress] = useState({ current: 0, total: 0 });

for (let i = 0; i < items.length; i++) {
  setProgress({ current: i + 1, total: items.length });
  // work
}

{isLoading && (
  <progress className="progress progress-primary w-full"
    value={progress.current} max={progress.total} />
)}
```

---

## DataSchema changes and migrations

### Policy

Schema changes are handled via **Dexie DB versioning** (`this.version(N).upgrade()`), not at app startup. This guarantees a one-time, deterministic transformation of stored records.

### Key files

| File | Role |
|------|------|
| `frontend/src/db/database.ts` | Dexie migration definitions |
| `frontend/src/db/schemas.ts` | DB table type definitions |
| `frontend/src/components/Node/nodes/{NodeName}Node.tsx` | The `DataSchema` being changed |

### Things to watch

- Both `Template` and `GameSession` carry `reactFlowData`. Migrate **both** tables with `modify()`.
- Define the old shape as a separate `z.object({ ... })` and use `safeParse` to detect legacy records — skip records that already match the new shape.
- After conversion, `delete node.data.oldField` to remove obsolete keys.

### Procedure

See `.claude/skills/schema-migration/SKILL.md` for full templates and worked examples (rename, string → discriminated union, array element type change).

---

## Adding a new node type

These files must be edited. None of this is automated by type inference — every list is enumerated by hand.

- `frontend/src/components/Node/nodes/{NodeName}Node.tsx` — create
- `frontend/src/components/Node/nodes/index.ts` — re-export
- `frontend/src/components/Node/base/base-schema.ts` — add to `NODE_TYPE_WIDTHS`
- `frontend/src/components/Node/base/node-wrapper.tsx` — register in `createNodeTypes` (injects `mode`)
- `frontend/src/stores/templateEditorStore.ts` — extend the `FlowNode` union, the `addNode` switch, and `updateNodeData`'s parameter type (three separate sites)
- `frontend/src/components/TemplateEditor.tsx` — add to `NODE_CATEGORIES`

**For the full procedure and code templates, follow `.claude/skills/node-creator/SKILL.md`.**

---

## Reference files

| File | Description |
|------|-------------|
| `frontend/src/components/Node/base/base-node.tsx` | UI primitives |
| `frontend/src/components/Node/base/base-schema.ts` | Shared schema and width/height constants |
| `frontend/src/components/Node/base/editable-title.tsx` | Inline-editable title |
| `frontend/src/components/Node/base/node-wrapper.tsx` | Node-type registration with `mode` injection |
| `frontend/src/components/Node/contexts/NodeExecutionContext.tsx` | Execution context provider |
| `frontend/src/components/Node/utils/DynamicValue.ts` | DynamicValue system |
| `frontend/src/components/Node/nodes/` | All node implementations |
| `frontend/src/stores/templateEditorStore.ts` | Zustand store |
| `frontend/src/components/TemplateEditor.tsx` | Editor entry point |
| `frontend/src/db/database.ts` | Dexie DB and migrations |
