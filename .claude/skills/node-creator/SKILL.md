---
name: node-creator
description: Create new Node types for the React Flow based workflow editor. Use when implementing new workflow nodes (e.g., CreateRoleNode, DeleteRoleNode, CreateCategoryNode), adding Discord API operations to the template editor, or extending the node-based workflow system. Triggers on requests like "create a new node", "implement XxxNode", "add node type".
---

# Node Creator

Create new Node components for the @xyflow/react based workflow editor. Each node represents a Discord operation (create/delete roles, categories, channels, send messages, etc.).

## Implementation Checklist

When creating a new node type `{NodeName}Node`:

1. Create `frontend/src/components/Node/nodes/{NodeName}Node.tsx`
2. Add width to `frontend/src/components/Node/base/base-schema.ts`
3. Register in `frontend/src/components/Node/base/node-wrapper.tsx`
4. Export from `frontend/src/components/Node/nodes/index.ts`
5. Re-export from `frontend/src/components/Node/index.ts`
6. Add types/data to `frontend/src/stores/templateEditorStore.ts`
7. Add UI option in `frontend/src/components/TemplateEditor.tsx`

## Node Component Template

```tsx
import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import z from "zod";

import { ApiClient } from "@/api";
import { db } from "@/db";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";
import { useToast } from "@/toast/ToastProvider";

import {
  BaseHandle,
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  EditableTitle,
  cn,
  BaseNodeDataSchema,
  NODE_CONTENT_HEIGHTS,
  NODE_TYPE_WIDTHS,
} from "../base";
import { useNodeExecutionOptional } from "../contexts";

// 1. Define schema extending BaseNodeDataSchema
export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().default("{デフォルトタイトル}"),
  fieldName: z.string().trim().default(""),
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
  const handleTitleChange = (newTitle: string) => {
    updateNodeData(id, { title: newTitle });
  };

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
    if (data.fieldName.trim() === "") {
      addToast({ message: "入力してください", status: "warning" });
      return;
    }

    setIsLoading(true);
    const client = new ApiClient(bot.token);

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
  const isExecuted = !!data.executedAt;

  // 5. Render with BaseNode components
  //    - Add "nodrag" class to ALL interactive elements (inputs, buttons, textareas)
  //    - Disable inputs when: isExecuteMode || isLoading || isExecuted
  //    - Disable action button when: !isExecuteMode || isLoading || isExecuted
  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.{NodeName}}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        {isExecuteMode ? (
          <BaseNodeHeaderTitle>{data.title || "{デフォルトタイトル}"}</BaseNodeHeaderTitle>
        ) : (
          <EditableTitle
            title={data.title}
            defaultTitle="{デフォルトタイトル}"
            onTitleChange={handleTitleChange}
          />
        )}
      </BaseNodeHeader>
      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.md}>
        <input
          type="text"
          className="nodrag input input-bordered w-full"
          value={data.fieldName}
          onChange={(evt) => handleFieldChange(evt.target.value)}
          placeholder="入力"
          disabled={isExecuteMode || isLoading || isExecuted}
        />
      </BaseNodeContent>
      <BaseNodeFooter>
        <button
          type="button"
          className="nodrag btn btn-primary"
          onClick={handleExecute}
          disabled={!isExecuteMode || isLoading || isExecuted}
        >
          {isLoading && <span className="loading loading-spinner loading-sm"></span>}
          実行
        </button>
      </BaseNodeFooter>
      <BaseHandle id="target-1" type="target" position={Position.Left} />
      <BaseHandle id="source-1" type="source" position={Position.Right} />
    </BaseNode>
  );
};
```

> **重要**: `nodrag` クラスはドラッグ誤作動を防ぐため、すべてのインタラクティブ要素（`input`, `button`, `textarea`, `select` 等）に必須。

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
import { {NodeName}Node } from "../nodes";  // nodes/index.ts 経由

export function createNodeTypes(mode: "edit" | "execute" = "edit"): NodeTypes {
  const {NodeName}WithMode: ComponentType<NodeProps<any>> = (props) => (
    <{NodeName}Node {...props} mode={mode} />
  );
  return {
    // existing...
    {NodeName}: {NodeName}WithMode,
  } as NodeTypes;
}
```

### nodes/index.ts

```ts
export { {NodeName}Node, DataSchema as {NodeName}DataSchema } from "./{NodeName}Node";
```

### Node/index.ts

```ts
export {
  // existing...
  {NodeName}DataSchema,
} from "./nodes";
```

### templateEditorStore.ts

```ts
import type { {NodeName}DataSchema } from "@/components/Node";

export type {NodeName}NodeData = z.infer<typeof {NodeName}DataSchema>;

export type FlowNode =
  // existing...
  | Node<{NodeName}NodeData, "{NodeName}">;

// updateNodeData の data 引数 union に追加:
data: Partial<... | {NodeName}NodeData>

// addNode の type union に追加:
addNode: (type: "..." | "{NodeName}", position: { x: number; y: number }) => void;

// addNode 実装に分岐追加:
} else if (type === "{NodeName}") {
  newNode = { id, type, position, data: { title: "{デフォルトタイトル}", fieldName: "" } };
}
```

### TemplateEditor.tsx

`NODE_CATEGORIES` 配列の適切なカテゴリに追加するだけ:

```tsx
const NODE_CATEGORIES = [
  // ...
  {
    category: "カテゴリ名",
    nodes: [
      // existing...
      { type: "{NodeName}", label: "ノードの説明" },
    ],
  },
] as const;
```

## Node Patterns

See [references/patterns.md](references/patterns.md) for common implementation patterns:
- Single value input (like CreateCategoryNode)
- Multiple value list (like CreateRoleNode)
- Selection from existing data (like DeleteRoleNode)
- Progress tracking for batch operations
- ResourceSelector (channel/role picker from preceding nodes)
- Message blocks with file attachment

## Execution Context

Nodes receive execution context via `useNodeExecutionOptional()`:

```ts
interface NodeExecutionContextValue {
  guildId: string;      // Discord guild ID
  sessionId: number;    // Session ID for DB scoping
  sessionName: string;  // Session name (for DynamicValue resolution)
  bot: DiscordBotData;  // Bot token and profile
}
```

## Discord Client Methods

Available in `@/api`:
- `createRole({ guildId, name })`
- `deleteRole({ guildId, roleId })`
- `createCategory({ guildId, name })`
- `createChannel({ guildId, parentCategoryId, name, type, writerRoleIds, readerRoleIds })`
- `deleteChannel({ guildId, channelId })`
- `changeChannelPermissions({ channelId, writerRoleIds, readerRoleIds })`
- `sendMessage({ channelId, content, files? })`
