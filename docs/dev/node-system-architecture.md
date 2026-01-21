# ノードベースワークフローシステム アーキテクチャ

> このドキュメントは、新しいノードタイプを実装する際の参照用です。

## 概要

このプロジェクトは、TRPG/マーダーミステリーセッション管理のためのノードベースワークフローシステムを実装しています。React Flow (@xyflow/react) を使用し、ノードの編集（テンプレート作成）と実行（セッション管理）の2つのモードをサポートします。

---

## 既存ノードタイプ一覧

| ノードタイプ | 役割 | 幅 |
|-------------|------|-----|
| CreateCategory | Discord カテゴリを作成 | md (256px) |
| CreateRole | Discord ロールを複数作成 | md |
| CreateChannel | テキスト/ボイスチャンネル作成＆権限設定 | lg (480px) |
| DeleteCategory | カテゴリの削除 | md |
| DeleteRole | ロール削除（全体または指定） | md |
| DeleteChannel | チャンネル削除（指定名） | md |
| ChangeChannelPermission | チャンネル権限を更新 | md |
| AddRoleToRoleMembers | ロールメンバーに別のロール付与 | md |
| SendMessage | チャンネルへメッセージ送信＆ファイル添付 | lg |
| Blueprint | マーダーミステリー基本セット（展開ノード） | lg |
| SetGameFlag | セッションのゲームフラグ設定 | md |
| LabeledGroup | ノードをグループ化するコンテナ | xl (640px) |
| Comment | ワークフロー内のコメント | md |

---

## ノードの基本構造

### ベーススキーマ

すべてのノードは `BaseNodeDataSchema` を拡張します。

```typescript
// frontend/src/components/Node/base/base-schema.ts
export const BaseNodeDataSchema = z.object({
  executedAt: z.coerce.date().optional(),  // 実行完了時刻
});
```

### ノード幅の定義

```typescript
export const NODE_WIDTHS = {
  sm: 192,  // 12 × 16px
  md: 256,  // 16 × 16px（標準）
  lg: 480,  // 30 × 16px（複雑なノード用）
  xl: 640,  // 40 × 16px（グループノード用）
} as const;

export const NODE_TYPE_WIDTHS: Record<string, NodeWidth> = {
  CreateRole: NODE_WIDTHS.md,
  CreateChannel: NODE_WIDTHS.lg,
  // ... 新しいノードもここに追加
};
```

### コンテンツ高さの定義

```typescript
export const NODE_CONTENT_HEIGHTS = {
  sm: 200,  // 小さいノード
  md: 300,  // 標準ノード
  lg: 400,  // 大きい/複雑なノード
} as const;
```

---

## ノードコンポーネントの実装パターン

### 基本構造

```typescript
// frontend/src/components/Node/nodes/ExampleNode.tsx
import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import z from "zod";

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
  BaseNodeDataSchema,
  NODE_CONTENT_HEIGHTS,
  NODE_TYPE_WIDTHS,
} from "../base";
import { useNodeExecutionOptional } from "../contexts";

// 1. スキーマ定義
export const DataSchema = BaseNodeDataSchema.extend({
  // ノード固有のデータフィールド
  myField: z.string(),
});

type ExampleNodeData = Node<z.infer<typeof DataSchema>, "Example">;

// 2. コンポーネント定義
export const ExampleNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<ExampleNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  // 3. データ更新ハンドラ
  const handleFieldChange = (newValue: string) => {
    updateNodeData(id, { myField: newValue });
  };

  // 4. 実行ハンドラ（execute mode用）
  const handleExecute = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    setIsLoading(true);
    try {
      // Discord API呼び出しなど
      // await client.doSomething();

      // 成功時
      updateNodeData(id, { executedAt: new Date() });
      addToast({ message: "実行完了", status: "success" });
    } catch (error) {
      addToast({ message: "実行失敗", status: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;

  // 5. レンダリング
  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.Example}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>ノードタイトル</BaseNodeHeaderTitle>
      </BaseNodeHeader>

      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.md}>
        {/* Edit mode: 編集可能なフォーム */}
        {/* Execute mode: 読み取り専用の表示 */}
        <input
          type="text"
          className="nodrag input input-bordered w-full"
          value={data.myField}
          onChange={(e) => handleFieldChange(e.target.value)}
          disabled={isExecuteMode || isLoading || isExecuted}
        />
      </BaseNodeContent>

      {/* Execute mode時のみフッター表示 */}
      {isExecuteMode && (
        <BaseNodeFooter>
          <button
            type="button"
            className="nodrag btn btn-primary"
            onClick={handleExecute}
            disabled={isLoading || isExecuted}
          >
            {isLoading && <span className="loading loading-spinner loading-sm" />}
            実行
          </button>
        </BaseNodeFooter>
      )}

      {/* 接続ハンドル */}
      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
```

---

## UIコンポーネント

### BaseNode コンポーネント群

```typescript
// frontend/src/components/Node/base/base-node.tsx
export function BaseNode({ className, width, style, ...props })
export function BaseNodeHeader({ className, ...props })
export function BaseNodeHeaderTitle({ className, ...props })
export function BaseNodeContent({ className, maxHeight, ...props })
export function BaseNodeFooter({ className, ...props })
export function BaseHandle({ className, ...props })
export function LabeledHandle({ title, position, ...props })
```

### 重要なクラス

- `nodrag`: React Flow のドラッグを無効化（input要素などに必須）
- `bg-base-300`: 標準の背景色
- `border-success bg-success/10`: 実行完了時のスタイル

---

## Edit Mode vs Execute Mode

| 観点 | Edit Mode | Execute Mode |
|------|-----------|--------------|
| 用途 | テンプレート設計時 | セッション実行時 |
| データ編集 | 可能 | 不可（表示のみ） |
| 実行ボタン | 非表示 | 表示 |
| 削除ボタン | 表示 | 非表示 |
| 実行コンテキスト | なし | あり（guildId, sessionId, bot等） |

### 実行コンテキスト

```typescript
// frontend/src/components/Node/contexts/NodeExecutionContext.tsx
interface NodeExecutionContextValue {
  guildId: string;
  sessionId: number;
  sessionName: string;
  bot: DiscordBotData;
}
```

---

## ストア統合

### templateEditorStore.ts への追加手順

1. **型のインポート**
```typescript
import type { ExampleDataSchema } from "@/components/Node";
```

2. **型定義の追加**
```typescript
export type ExampleNodeData = z.infer<typeof ExampleDataSchema>;
```

3. **FlowNode union型への追加**
```typescript
export type FlowNode =
  | Node<ExampleNodeData, "Example">
  | // ... 既存の型
```

4. **addNode関数への追加**
```typescript
} else if (type === "Example") {
  newNode = {
    id,
    type,
    position,
    data: {
      // デフォルト値
      myField: "",
    },
  };
}
```

5. **updateNodeData の型にも追加**
```typescript
updateNodeData: (
  nodeId: string,
  data: Partial<
    | ExampleNodeData
    | // ... 既存の型
  >,
) => void;
```

6. **addNode の type 引数にも追加**
```typescript
addNode: (
  type:
    | "Example"
    | // ... 既存の型
  position: { x: number; y: number },
) => void;
```

---

## node-wrapper.tsx への登録

```typescript
// frontend/src/components/Node/base/node-wrapper.tsx
import { ExampleNode } from "../nodes/ExampleNode";

export function createNodeTypes(mode: "edit" | "execute" = "edit"): NodeTypes {
  const ExampleWithMode: ComponentType<NodeProps<any>> = (props) => (
    <ExampleNode {...props} mode={mode} />
  );

  return {
    Example: ExampleWithMode,
    // ... 既存のノード
  };
}
```

---

## TemplateEditor.tsx への追加

```typescript
// frontend/src/components/TemplateEditor.tsx
const NODE_CATEGORIES = [
  {
    category: "カテゴリ名",
    nodes: [
      { type: "Example", label: "サンプルノード" },
      // ...
    ],
  },
  // ...
] as const;
```

---

## 新しいノード実装のチェックリスト

1. [ ] `frontend/src/components/Node/nodes/NewNode.tsx` を作成
   - DataSchema を定義
   - コンポーネントを実装
2. [ ] `frontend/src/components/Node/base/base-schema.ts` に幅を追加
   - `NODE_TYPE_WIDTHS` に追加
3. [ ] `frontend/src/components/Node/base/node-wrapper.tsx` に登録
   - インポート追加
   - `createNodeTypes` 関数内で mode を注入
4. [ ] `frontend/src/components/Node/nodes/index.ts` にエクスポート追加
   - ノードコンポーネントと DataSchema をエクスポート
5. [ ] `frontend/src/stores/templateEditorStore.ts` を更新
   - 型インポート
   - 型定義追加
   - FlowNode union型に追加
   - addNode 関数に初期データ追加
   - updateNodeData の型に追加
6. [ ] `frontend/src/components/TemplateEditor.tsx` に追加
   - `NODE_CATEGORIES` に追加

---

## DynamicValue システム

ノードのパラメータを動的に解決するシステム。

```typescript
// frontend/src/components/Node/utils/DynamicValue.ts
export const DynamicValueSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("literal"), value: z.string() }),
  z.object({ type: z.literal("session.name") }),
]);

export function resolveDynamicValue(
  value: DynamicValue,
  context: { sessionName?: string },
): string {
  switch (value.type) {
    case "literal":
      return value.value;
    case "session.name":
      return context.sessionName ?? "";
  }
}
```

**使用例（CreateCategoryNode）:**
```typescript
export const DataSchema = BaseNodeDataSchema.extend({
  categoryName: DynamicValueSchema,
});
```

---

## データ永続化

### ReactFlowData

```typescript
export const ReactFlowDataSchema = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number(),
  }),
});
```

- ノードデータは `GameSession.reactFlowData` に JSON 文字列として保存
- Dexie.js (IndexedDB) を使用

---

## 実行フロー

1. **検証**: 入力データチェック
2. **解決**: ロール名→ID変換など参照データ取得
3. **API呼び出し**: Discord API を通じて実行
4. **DB保存**: 作成したリソース情報を DB に記録
5. **ステート更新**: `executedAt` タイムスタンプを設定
6. **トースト通知**: 実行結果をユーザーに通知

### プログレス表示パターン

```typescript
const [progress, setProgress] = useState({ current: 0, total: 0 });

// ループ処理中
for (let i = 0; i < items.length; i++) {
  setProgress({ current: i + 1, total: items.length });
  // 処理
}

// UI
{isLoading && (
  <progress
    className="progress progress-primary w-full"
    value={progress.current}
    max={progress.total}
  />
)}
```

---

## 関連ファイル

| ファイル | 説明 |
|---------|------|
| `frontend/src/components/Node/base/base-node.tsx` | UIプリミティブ |
| `frontend/src/components/Node/base/base-schema.ts` | 共通スキーマ・定数 |
| `frontend/src/components/Node/base/node-wrapper.tsx` | ノードタイプ登録 |
| `frontend/src/components/Node/contexts/NodeExecutionContext.tsx` | 実行コンテキスト |
| `frontend/src/components/Node/utils/DynamicValue.ts` | 動的値システム |
| `frontend/src/components/Node/nodes/` | 全ノード実装（14種類） |
| `frontend/src/stores/templateEditorStore.ts` | Zustandストア |
| `frontend/src/components/TemplateEditor.tsx` | エディタ本体 |
