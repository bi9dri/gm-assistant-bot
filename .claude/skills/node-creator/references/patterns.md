# Node Implementation Patterns

## Pattern 1: Single Value Input

Simple node with one input field. Example: CreateCategoryNode

```tsx
export const DataSchema = BaseNodeDataSchema.extend({
  categoryName: z.string().trim(),
});

// In component:
<BaseNodeContent>
  <input
    type="text"
    className="input input-bordered w-full"
    value={data.categoryName}
    onChange={(evt) => handleChange(evt.target.value)}
    placeholder="カテゴリ名を入力"
    disabled={isLoading}
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
  roles: z.array(z.string().nonempty().trim()),
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
        className="input input-bordered w-full"
        value={role}
        onChange={(evt) => handleItemChange(index, evt.target.value)}
        placeholder="ロール名を入力"
        disabled={isLoading}
      />
      {!isExecuteMode && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => handleRemoveItem(index)}
        >
          削除
        </button>
      )}
    </div>
  ))}
  {!isExecuteMode && (
    <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={handleAddItem}>
      ロールを追加
    </button>
  )}
</BaseNodeContent>
```

## Pattern 3: Selection from Existing Data

Node that selects from DB data. Example: DeleteRoleNode

```tsx
export const DataSchema = BaseNodeDataSchema.extend({
  deleteAll: z.boolean(),
  selectedRoleIds: z.array(z.string()),
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

// Handlers:
const handleDeleteAllChange = (checked: boolean) => {
  updateNodeData(id, { deleteAll: checked, selectedRoleIds: [] });
};

const handleItemToggle = (itemId: string) => {
  const newSelected = data.selectedRoleIds.includes(itemId)
    ? data.selectedRoleIds.filter((id) => id !== itemId)
    : [...data.selectedRoleIds, itemId];
  updateNodeData(id, { selectedRoleIds: newSelected });
};

// In component:
<BaseNodeContent>
  <div className="form-control mb-2">
    <label className="label cursor-pointer justify-start gap-2">
      <input
        type="checkbox"
        className="checkbox"
        checked={data.deleteAll}
        onChange={(e) => handleDeleteAllChange(e.target.checked)}
        disabled={isLoading}
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
            className="checkbox checkbox-sm"
            checked={data.selectedRoleIds.includes(role.id)}
            onChange={() => handleItemToggle(role.id)}
            disabled={isLoading}
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

## Button Styling

- Primary action (create): `btn btn-primary`
- Destructive action (delete): `btn btn-error`
- Neutral action: `btn btn-ghost`

## Node Width Guidelines

| Width | Use Case |
|-------|----------|
| sm (192) | Single short input |
| md (256) | Basic size, Simple input(s) with label |
| lg (480) | Complex forms |
| xl (640) | Complex layout |
