---
name: node-creator
description: Create new Node types for the React Flow based workflow editor. Use when implementing new workflow nodes (e.g., CreateRoleNode, DeleteRoleNode, CreateCategoryNode), adding Discord API operations to the template editor, or extending the node-based workflow system. Triggers on requests like "create a new node", "implement XxxNode", "add node type".
---

# Node Creator

Create new Node components for the @xyflow/react based workflow editor. Each node represents a Discord operation (create/delete roles, categories, channels, etc.).

## Implementation Checklist

When creating a new node type `{NodeName}Node`:

1. Create `frontend/src/components/Node/{NodeName}Node.tsx`
2. Add width to `frontend/src/components/Node/base-schema.ts`
3. Register in `frontend/src/components/Node/node-wrapper.tsx`
4. Export from `frontend/src/components/Node/index.ts`
5. Add types/data to `frontend/src/stores/templateEditorStore.ts`
6. Add UI option in `frontend/src/components/TemplateEditor.tsx`

## Node Component Template

```tsx
import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import z from "zod";

import { db } from "@/db";
import { DiscordClient } from "@/discord";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";
import { useToast } from "@/toast/ToastProvider";

import {
  BaseHandle,
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  cn,
} from "./base-node";
import { BaseNodeDataSchema, NODE_TYPE_WIDTHS } from "./base-schema";
import { useNodeExecutionOptional } from "./NodeExecutionContext";

// 1. Define schema extending BaseNodeDataSchema
export const DataSchema = BaseNodeDataSchema.extend({
  // Add node-specific fields here
  fieldName: z.string().trim(),
});
type {NodeName}NodeData = Node<z.infer<typeof DataSchema>, "{NodeName}">;

// 2. Component with edit/execute modes
export const {NodeName}Node = ({
  id,
  data,
  mode = "edit",
}: NodeProps<{NodeName}NodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  // 3. Handler for data changes (edit mode)
  const handleFieldChange = (newValue: string) => {
    updateNodeData(id, { fieldName: newValue });
  };

  // 4. Handler for execution (execute mode)
  const handleExecute = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { guildId, sessionId, bot } = executionContext;
    // Validate input
    if (data.fieldName.trim() === "") {
      addToast({ message: "入力してください", status: "warning" });
      return;
    }

    setIsLoading(true);
    const client = new DiscordClient(bot.token);

    try {
      // Call Discord API and save to DB
      // const result = await client.someMethod({ guildId, ... });
      // await db.SomeTable.add({ id: result.id, sessionId, ... });

      addToast({ message: "成功しました", status: "success", durationSeconds: 5 });
      updateNodeData(id, { executedAt: new Date() });
    } catch {
      addToast({ message: "失敗しました", status: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const isExecuteMode = mode === "execute";

  // 5. Render with BaseNode components
  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.{NodeName}}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>ノードタイトル</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <input
          type="text"
          className="input input-bordered w-full"
          value={data.fieldName}
          onChange={(evt) => handleFieldChange(evt.target.value)}
          placeholder="入力"
          disabled={isLoading}
        />
      </BaseNodeContent>
      {isExecuteMode && (
        <BaseNodeFooter>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExecute}
            disabled={isLoading || !!data.executedAt}
          >
            {isLoading && <span className="loading loading-spinner loading-sm"></span>}
            実行
          </button>
        </BaseNodeFooter>
      )}
      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
```

## Registration Steps

### base-schema.ts

```ts
export const NODE_TYPE_WIDTHS: Record<string, NodeWidth> = {
  // existing...
  {NodeName}: NODE_WIDTHS.md, // sm:192, md:256, lg:480, xl:640
} as const;
```

### node-wrapper.tsx

```ts
import { {NodeName}Node } from "./{NodeName}Node";

export function createNodeTypes(mode: "edit" | "execute" = "edit"): NodeTypes {
  const {NodeName}WithMode: ComponentType<NodeProps<any>> = (props) => (
    <{NodeName}Node {...props} mode={mode} />
  );
  // ...
  return {
    // existing...
    {NodeName}: {NodeName}WithMode,
  } as NodeTypes;
}
```

### index.ts

```ts
export { {NodeName}Node } from "./{NodeName}Node";
```

### templateEditorStore.ts

```ts
import type { DataSchema as {NodeName}DataSchema } from "@/components/Node/{NodeName}Node";

export type {NodeName}NodeData = z.infer<typeof {NodeName}DataSchema>;

export type FlowNode =
  // existing...
  | Node<{NodeName}NodeData, "{NodeName}">;

// In addNode function:
addNode: (type, position) => {
  // ...
  if (type === "{NodeName}") {
    newNode = {
      id,
      type,
      position,
      data: { fieldName: "" }, // default data
    };
  }
  // ...
}

// Update type signatures:
updateNodeData: (nodeId: string, data: Partial<... | {NodeName}NodeData>) => void;
addNode: (type: "..." | "{NodeName}", position: { x: number; y: number }) => void;
```

### TemplateEditor.tsx

Add to modal and handleAddNode:

```tsx
// In handleAddNode:
if (selectedNodeType === "{NodeName}" || ...) {
  addNode(selectedNodeType, position);
}

// In modal radio buttons:
<label className="card cursor-pointer">
  <div className="card-body">
    <input
      type="radio"
      name="nodeType"
      value="{NodeName}"
      checked={selectedNodeType === "{NodeName}"}
      onChange={(e) => setSelectedNodeType(e.target.value)}
      className="radio"
    />
    <span className="ml-2">ノードの説明</span>
  </div>
</label>
```

## Node Patterns

See [references/patterns.md](references/patterns.md) for common implementation patterns:
- Single value input (like CreateCategoryNode)
- Multiple value list (like CreateRoleNode)
- Selection from existing data (like DeleteRoleNode)
- Progress tracking for batch operations

## Execution Context

Nodes receive execution context via `useNodeExecutionOptional()`:

```ts
interface NodeExecutionContextValue {
  guildId: string;      // Discord guild ID
  sessionId: number;    // Session ID for DB scoping
  bot: DiscordBotData;  // Bot token and profile
}
```

## Discord Client Methods

Available in `@/discord`:
- `createRole({ guildId, name })`
- `deleteRole({ guildId, roleId })`
- `createCategory({ guildId, name })`
- `createChannel({ guildId, parentCategoryId, name, type, writerRoleIds, readerRoleIds })`
- `deleteChannel({ guildId, channelId })`
- `changeChannelPermissions({ channelId, writerRoleIds, readerRoleIds })`
