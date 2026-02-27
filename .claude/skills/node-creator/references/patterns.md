# Node Implementation Patterns

## Pattern 1: Single Value Input

Simple node with one input field. Example: CreateCategoryNode

```tsx
export const DataSchema = BaseNodeDataSchema.extend({
  categoryName: z.string().trim().default(""),
});

// In component:
<BaseNodeContent>
  <input
    type="text"
    className="nodrag input input-bordered w-full"
    value={data.categoryName}
    onChange={(evt) => handleChange(evt.target.value)}
    placeholder="カテゴリ名を入力"
    disabled={isExecuteMode || isLoading || isExecuted}
  />
</BaseNodeContent>
```

Execution:
```tsx
const handleExecute = async () => {
  const value = data.categoryName.trim();
  if (value === "") {
    addToast({ message: "入力してください", status: "warning" });
    return;
  }

  setIsLoading(true);
  try {
    const result = await client.createCategory({ guildId, name: value });
    await db.Category.add({ id: result.id, sessionId, name: result.name });
    addToast({ message: `「${result.name}」を作成しました`, status: "success" });
    updateNodeData(id, { executedAt: new Date() });
  } catch {
    addToast({ message: "作成に失敗しました", status: "error" });
  } finally {
    setIsLoading(false);
  }
};
```

## Pattern 2: Multiple Value List

Node with dynamic list of inputs. Example: CreateRoleNode

```tsx
export const DataSchema = BaseNodeDataSchema.extend({
  roles: z.array(z.string().trim()).min(1).default([""]),
});

// Handlers:
const handleItemChange = (index: number, newValue: string) => {
  const updated = [...data.roles];
  updated[index] = newValue;
  updateNodeData(id, { roles: updated });
};

const handleAddItem = () => {
  updateNodeData(id, { roles: [...data.roles, ""] });
};

const handleRemoveItem = (index: number) => {
  updateNodeData(id, { roles: data.roles.filter((_, i) => i !== index) });
};

// In component:
<BaseNodeContent>
  {data.roles.map((role, index) => (
    <div key={`${id}-role-${index}`} className="flex gap-2 items-center mb-2">
      <input
        type="text"
        className="nodrag input input-bordered w-full"
        value={role}
        onChange={(evt) => handleItemChange(index, evt.target.value)}
        placeholder="ロール名を入力"
        disabled={isExecuteMode || isLoading || isExecuted}
      />
      {!isExecuteMode && data.roles.length > 1 && (
        <button
          type="button"
          className="nodrag btn btn-ghost btn-sm"
          onClick={() => handleRemoveItem(index)}
          disabled={isLoading || isExecuted}
        >
          削除
        </button>
      )}
    </div>
  ))}
  {!isExecuteMode && (
    <button
      type="button"
      className="nodrag btn btn-ghost btn-sm mt-2"
      onClick={handleAddItem}
      disabled={isLoading || isExecuted}
    >
      + 追加
    </button>
  )}
</BaseNodeContent>
```

## Pattern 3: Selection from Existing Data

Node that selects from DB data. Example: DeleteRoleNode

```tsx
export const DataSchema = BaseNodeDataSchema.extend({
  deleteAll: z.boolean().default(false),
  selectedRoleIds: z.array(z.string()).default([]),
});

// Load data from DB:
const [roles, setRoles] = useState<RoleData[]>([]);

useEffect(() => {
  if (executionContext) {
    void db.Role.where("sessionId")
      .equals(executionContext.sessionId)
      .toArray()
      .then(setRoles);
  }
}, [executionContext]);

// In component:
<BaseNodeContent>
  <div className="form-control mb-2">
    <label className="label cursor-pointer justify-start gap-2">
      <input
        type="checkbox"
        className="nodrag checkbox"
        checked={data.deleteAll}
        onChange={(e) => updateNodeData(id, { deleteAll: e.target.checked })}
        disabled={isExecuteMode || isLoading || isExecuted}
      />
      <span className="label-text">すべて削除</span>
    </label>
  </div>

  {!data.deleteAll && (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {roles.map((role) => (
        <label key={role.id} className="label cursor-pointer justify-start gap-2 py-1">
          <input
            type="checkbox"
            className="nodrag checkbox checkbox-sm"
            checked={data.selectedRoleIds.includes(role.id)}
            onChange={() => {
              const newSelected = data.selectedRoleIds.includes(role.id)
                ? data.selectedRoleIds.filter((id) => id !== role.id)
                : [...data.selectedRoleIds, role.id];
              updateNodeData(id, { selectedRoleIds: newSelected });
            }}
            disabled={isExecuteMode || isLoading || isExecuted}
          />
          <span className="label-text">{role.name}</span>
        </label>
      ))}
    </div>
  )}
</BaseNodeContent>
```

## Pattern 4: Progress Tracking for Batch Operations

For nodes that process multiple items:

```tsx
const [progress, setProgress] = useState({ current: 0, total: 0 });

const handleExecute = async () => {
  const items = data.roles.filter((r) => r.trim() !== "");
  if (items.length === 0) {
    addToast({ message: "処理する項目がありません", status: "warning" });
    return;
  }

  setIsLoading(true);
  setProgress({ current: 0, total: items.length });

  let successCount = 0;
  for (let i = 0; i < items.length; i++) {
    setProgress({ current: i + 1, total: items.length });
    try {
      await client.someMethod({ ... });
      successCount++;
    } catch {
      addToast({ message: `「${items[i]}」の処理に失敗しました`, status: "error" });
    }
  }

  setIsLoading(false);

  if (successCount > 0) {
    addToast({
      message: `${successCount}件を処理しました`,
      status: "success",
      durationSeconds: 5,
    });
    if (successCount === items.length) {
      updateNodeData(id, { executedAt: new Date() });
    }
  }
};

// Progress UI:
{isLoading && (
  <div className="mt-2">
    <progress
      className="progress progress-primary w-full"
      value={progress.current}
      max={progress.total}
    />
    <p className="text-sm text-center mt-1">
      {progress.current} / {progress.total}
    </p>
  </div>
)}
```

## Pattern 5: ResourceSelector (Channel/Role Picker)

`ResourceSelector` は先行ノードが作成したチャンネルやロールを候補に表示するセレクタ。
Import: `import { ResourceSelector } from "../utils";`

```tsx
export const DataSchema = BaseNodeDataSchema.extend({
  channelName: z.string().trim().default(""),
});

// In component:
<BaseNodeContent>
  <label className="text-xs font-semibold mb-1 block">送信先チャンネル</label>
  <ResourceSelector
    nodeId={id}
    resourceType="channel"   // "channel" | "role"
    value={data.channelName}
    onChange={(newName) => updateNodeData(id, { channelName: newName })}
    placeholder="チャンネル名"
    disabled={isExecuteMode || isLoading || isExecuted}
    channelTypeFilter="text"  // "text" | "voice" (channelのみ)
  />
</BaseNodeContent>
```

実行時のチャンネル解決:
```tsx
const [channels, setChannels] = useState<ChannelData[]>([]);

useEffect(() => {
  if (executionContext) {
    void db.Channel.where("sessionId")
      .equals(executionContext.sessionId)
      .toArray()
      .then(setChannels);
  }
}, [executionContext]);

// In handleExecute:
const channel = channels.find((c) => c.name === data.channelName.trim());
if (!channel) {
  addToast({ message: `チャンネルが見つかりません: ${data.channelName}`, status: "error" });
  return;
}
await client.sendMessage({ channelId: channel.id, content: "..." });
```

## Pattern 6: Message Blocks with File Attachment

複数メッセージ+ファイル添付が必要な場合は共通ユーティリティを使用する。
Import: `import { MessageBlockSchema, type Attachment, FILE_SIZE_WARNING_THRESHOLD, formatFileSize, saveFileToOPFS } from "../utils";`

```tsx
export const DataSchema = BaseNodeDataSchema.extend({
  messages: z
    .array(MessageBlockSchema)
    .min(1)
    .default([{ content: "", attachments: [] }]),
});
```

ファイル保存には `templateEditorContext` (テンプレートID) または `executionContext` (セッションID) が必要:
```tsx
import { useTemplateEditorContextOptional } from "../contexts";

const templateEditorContext = useTemplateEditorContextOptional();
// saveFileToOPFS(file, { templateId: templateEditorContext?.templateId, sessionId: executionContext?.sessionId })
```

実装例: `SendMessageNode.tsx` を参照。

---

## UI Guidelines

### Button Styling
- Primary action (create/send): `nodrag btn btn-primary`
- Destructive action (delete): `nodrag btn btn-error`
- Neutral/ghost action: `nodrag btn btn-ghost`

### Disabled State Rules
- Edit-only inputs: `disabled={isExecuteMode || isLoading || isExecuted}`
- Action button: `disabled={!isExecuteMode || isLoading || isExecuted}`

### Node Width Guidelines

| Width | px  | Use Case |
|-------|-----|----------|
| sm    | 192 | Single short input |
| md    | 256 | Simple input(s) with label |
| lg    | 480 | Complex forms |
| xl    | 640 | Nested/complex layout (e.g., entry lists) |
