# 実装計画: Issue #31 & #35 - テンプレートリソース参照

## 概要

### Issue #31: テンプレート詳細ページで作成されうるロールなどを一覧して、各ノードで参照できるようにする
テンプレート編集モードで、前のノードで作成されるリソース（ロール、チャンネル）を参照できるようにする。

### Issue #35: ノードから GameFlags などにアクセスできるようにする
DynamicValueシステムを拡張し、GameFlagsやセッションリソースへの参照をサポートする。

> **Note**: メッセージ補間機能（`{flag:key}` 構文）は別PRで実装予定

---

## 実装フェーズ

### Phase 1: DynamicValue スキーマ拡張

**ファイル**: `frontend/src/components/Node/utils/DynamicValue.ts`

現在のスキーマに以下の参照タイプを追加:

```typescript
export const DynamicValueSchema = z.discriminatedUnion("type", [
  // 既存
  z.object({ type: z.literal("literal"), value: z.string() }),
  z.object({ type: z.literal("session.name") }),
  // 新規追加
  z.object({ type: z.literal("roleRef"), roleName: z.string() }),
  z.object({ type: z.literal("channelRef"), channelName: z.string() }),
  z.object({ type: z.literal("gameFlag"), flagKey: z.string() }),
]);
```

`resolveDynamicValue` 関数のコンテキストを拡張:
```typescript
export interface DynamicValueContext {
  sessionName?: string;
  roles?: Map<string, string>;      // roleName -> roleId
  channels?: Map<string, string>;   // channelName -> channelId
  gameFlags?: Record<string, string>;
}
```

---

### Phase 2: テンプレートリソース収集Hook

**新規ファイル**: `frontend/src/components/Node/utils/useTemplateResources.ts`

ワークフローグラフを解析し、指定ノードより前に作成されるリソースを収集:

```typescript
export interface TemplateResources {
  roles: Array<{ name: string; sourceNodeId: string }>;
  channels: Array<{ name: string; type: "text" | "voice"; sourceNodeId: string }>;
  gameFlags: Array<{ key: string; sourceNodeId: string }>;
}

export function useTemplateResources(nodeId: string): TemplateResources;
```

**収集ロジック**:
1. エッジを逆方向にたどり、対象ノードより前の全ノードを特定
2. CreateRoleNode → `roles` を抽出
3. CreateChannelNode → `channels` を抽出
4. SetGameFlagNode → `gameFlags` を抽出

---

### Phase 3: ResourceSelector コンポーネント

**新規ファイル**: `frontend/src/components/Node/utils/ResourceSelector.tsx`

ロール/チャンネル選択用のドロップダウンコンポーネント:

```typescript
interface ResourceSelectorProps {
  nodeId: string;
  resourceType: "role" | "channel" | "gameFlag";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  channelTypeFilter?: "text" | "voice";
}
```

**動作**:
- 利用可能なリソースがある場合: ドロップダウン表示
- リソースがない場合/カスタム入力: テキストフィールド表示
- 切り替えボタンでモード変更可能

---

### Phase 4: DynamicValueInput 拡張

**ファイル**: `frontend/src/components/Node/utils/DynamicValueInput.tsx`

新しい参照タイプに対応:

```typescript
interface DynamicValueInputProps {
  nodeId: string;  // 追加
  value: DynamicValue;
  onChange: (value: DynamicValue) => void;
  supportedTypes?: Array<"literal" | "session.name" | "roleRef" | "channelRef" | "gameFlag">;
  // ...
}
```

---

### Phase 5: ノードコンポーネント更新

#### 5.1 CreateChannelNode
**ファイル**: `frontend/src/components/Node/nodes/CreateChannelNode.tsx`

ロール権限入力をResourceSelectorに変更:
- `roleName` テキスト入力 → ResourceSelector

#### 5.2 SendMessageNode
**ファイル**: `frontend/src/components/Node/nodes/SendMessageNode.tsx`

- チャンネル名入力 → ResourceSelector

#### 5.3 ChangeChannelPermissionNode
**ファイル**: `frontend/src/components/Node/nodes/ChangeChannelPermissionNode.tsx`

- チャンネル名、ロール名入力 → ResourceSelector

#### 5.4 その他のノード
- AddRoleToRoleMembersNode
- DeleteRoleNode
- DeleteChannelNode

---

## 修正対象ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/Node/utils/DynamicValue.ts` | スキーマ拡張、コンテキスト型定義 |
| `frontend/src/components/Node/utils/DynamicValueInput.tsx` | 新参照タイプ対応、nodeId prop追加 |
| `frontend/src/components/Node/utils/useTemplateResources.ts` | **新規作成** |
| `frontend/src/components/Node/utils/ResourceSelector.tsx` | **新規作成** |
| `frontend/src/components/Node/utils/index.ts` | エクスポート追加 |
| `frontend/src/components/Node/nodes/CreateChannelNode.tsx` | ResourceSelector使用 |
| `frontend/src/components/Node/nodes/SendMessageNode.tsx` | ResourceSelector使用 |
| `frontend/src/components/Node/nodes/ChangeChannelPermissionNode.tsx` | ResourceSelector使用 |
| `frontend/src/components/Node/nodes/AddRoleToRoleMembersNode.tsx` | ResourceSelector使用 |
| `frontend/src/components/Node/nodes/DeleteRoleNode.tsx` | ResourceSelector使用 |
| `frontend/src/components/Node/nodes/DeleteChannelNode.tsx` | ResourceSelector使用 |

---

## 後方互換性

- 既存の `literal` / `session.name` タイプは変更なし
- 既存テンプレートのデータ移行は不要（新タイプは追加のみ）
- リソースが見つからない場合は名前をそのまま使用（フォールバック）

---

## 検証方法

1. **編集モードでのリソース参照**
   - CreateRoleNode を追加 → CreateChannelNode のロール選択に表示されるか確認
   - SetGameFlagNode を追加 → 他ノードでGameFlag参照が可能か確認

2. **実行モードでの解決**
   - 参照が実際のDiscordリソースIDに解決されるか確認

3. **エッジケース**
   - 接続されていないノードのリソースは表示されないこと
   - 循環参照があっても無限ループしないこと

---

## 実装順序

1. Phase 1: DynamicValue スキーマ拡張
2. Phase 2: useTemplateResources Hook
3. Phase 3: ResourceSelector コンポーネント
4. Phase 4: DynamicValueInput 拡張
5. Phase 5: 各ノードコンポーネント更新
6. テスト・検証

---

## 別PRで実装予定

### メッセージ補間機能
SendMessageNodeのメッセージ本文で `{flag:key}` 構文によるGameFlags値の埋め込み機能は別PRで実装する。

```typescript
// 将来の実装
export function interpolateMessage(
  content: string,
  gameFlags: Record<string, string>,
): string {
  return content.replace(/\{flag:([^}]+)\}/g, (match, key) => {
    return gameFlags[key.trim()] ?? match;
  });
}
```
