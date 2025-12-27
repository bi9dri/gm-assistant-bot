# TemplateEditor用Zustandストア実装計画

## 概要

TemplateEditorとNode Components（現在はCreateRoleNodeのみ）でのみ使用するZustandストアを実装します。React Flowのノード編集機能に焦点を当て、データベースへの保存機能は後回しにします。

## ユーザーからの要求事項

- docs/node-workflow-system.mdの実装を少しずつ進めている
- React Flowのサンプル（https://reactflow.dev/learn/advanced-use/state-management）を参考にしている
- **アプリケーション全体にステート管理ライブラリを導入しない**
- **ノードエディタ部分だけZustandを導入**
- まずは`TemplateEditor.tsx`と`Node/CreateRoleNode.tsx`で扱えるようにする
- 他のノードタイプは今回実装しない
- **保存機能は後回し**（Zustandストアとノード編集UIに集中）

## データ永続化の方針（ユーザーとの質疑で確定）

1. **React Flowの`toObject()`を使用**: React Flow全体のデータ（nodes, edges, viewport等）を1つのJSONとして保存
2. **Template/GameSessionテーブルに`reactFlowData`フィールドを追加**: 個別のTemplateNodeテーブルではなく、親テーブルに全体を保存する方向で検討中
3. **今回の実装範囲**: データベース保存機能は含めず、Zustandストアとノード編集UIのみ

## 実装する機能

### 1. Zustandストアの導入

**新規ファイル**: `src/stores/templateEditorStore.ts`

#### 目的
- React Flowのノード・エッジの状態管理
- ノードデータの更新（CreateRoleNodeのrolesフィールドなど）
- ノードの追加・削除

#### ストアの状態
```typescript
{
  nodes: FlowNode[],           // React Flowのノード配列
  edges: Edge[],                // React Flowのエッジ配列
  hasUnsavedChanges: boolean    // 変更フラグ（将来の保存機能用）
}
```

#### ストアのアクション
- `onNodesChange`: React Flowのノード変更イベントハンドラ
- `onEdgesChange`: React Flowのエッジ変更イベントハンドラ
- `onConnect`: エッジ接続イベントハンドラ
- `updateNodeData`: 特定ノードのdataフィールド更新（CreateRoleNodeで使用）
- `addNode`: 新しいノードを追加
- `reset`: ストアをリセット

### 2. TemplateEditor.tsxの変更

**変更ファイル**: `src/components/TemplateEditor.tsx`

#### 主な変更点
1. **Zustandストアを使用**:
   - `useNodesState`/`useEdgesState`を削除
   - `useTemplateEditorStore`を使用

2. **nodeTypesプロパティを追加**:
   - `import { NodeTypes } from "@/components/Node"`
   - `<ReactFlow nodeTypes={NodeTypes} .../>`でカスタムノードを有効化

3. **ノード追加モーダルの機能実装**:
   - ラジオボタンでノードタイプを選択
   - 「追加」ボタンでストアの`addNode`アクションを呼び出し
   - 画面中央に新しいノードを配置

#### 現在の問題点
- propsで受け取った`nodes`/`edges`が使われていない → 今回は空配列で固定（保存機能は後回し）
- nodeTypesがReactFlowに渡されていない → 今回追加する
- ノード追加モーダルが動作しない → 今回実装する

### 3. CreateRoleNode.tsxの変更

**変更ファイル**: `src/components/Node/CreateRoleNode.tsx`

#### 主な変更点
1. **Zustandストアから`updateNodeData`を取得**:
   ```typescript
   const updateNodeData = useTemplateEditorStore(state => state.updateNodeData);
   ```

2. **ロール名の更新処理を実装**:
   ```typescript
   const handleRoleChange = (index, newValue) => {
     const updatedRoles = [...data.roles];
     updatedRoles[index] = newValue;
     updateNodeData(id, { roles: updatedRoles });
   };
   ```

3. **ロール追加機能を実装**:
   ```typescript
   const handleAddRole = () => {
     updateNodeData(id, { roles: [...data.roles, ""] });
   };
   ```

4. **ロール削除機能を実装**:
   ```typescript
   const handleRemoveRole = (index) => {
     const updatedRoles = data.roles.filter((_, i) => i !== index);
     updateNodeData(id, { roles: updatedRoles });
   };
   ```

#### 現在の問題点
- `updateRoles`関数が空実装（console.logのみ） → 今回実装する
- フォーム入力が双方向バインディングされていない → 今回実装する

## 実装手順

### Phase 1: Zustandのインストール
```bash
fish -c "bun add zustand@5.0.9"
```

**注**: zustand@5.0.9が最新版（1 month ago）なので、これを使用します。

### Phase 2: Zustandストアの作成

**ファイル**: `src/stores/templateEditorStore.ts`

#### 型定義
```typescript
import { create } from 'zustand';
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';

// CreateRoleNodeのデータ型
export type CreateRoleNodeData = {
  roles: string[];
};

// React Flowノード型（カスタムノードタイプ付き）
export type FlowNode = Node<CreateRoleNodeData, 'CreateRole'>;

// ストア型定義
interface TemplateEditorState {
  nodes: FlowNode[];
  edges: Edge[];
  hasUnsavedChanges: boolean;
}

interface TemplateEditorActions {
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: Partial<CreateRoleNodeData>) => void;
  addNode: (type: 'CreateRole', position: { x: number; y: number }) => void;
  reset: () => void;
}

export type TemplateEditorStore = TemplateEditorState & TemplateEditorActions;
```

#### ストア実装
```typescript
export const useTemplateEditorStore = create<TemplateEditorStore>((set, get) => ({
  nodes: [],
  edges: [],
  hasUnsavedChanges: false,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      hasUnsavedChanges: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      hasUnsavedChanges: true,
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
      hasUnsavedChanges: true,
    });
  },

  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      ),
      hasUnsavedChanges: true,
    });
  },

  addNode: (type, position) => {
    const newNode: FlowNode = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { roles: [''] }, // CreateRoleNodeのデフォルト値
    };
    set({
      nodes: [...get().nodes, newNode],
      hasUnsavedChanges: true,
    });
  },

  reset: () => {
    set({ nodes: [], edges: [], hasUnsavedChanges: false });
  },
}));
```

### Phase 3: TemplateEditor.tsxの更新

#### 変更内容
1. Zustandストアのインポートと使用
2. nodeTypesの追加
3. ノード追加モーダルの実装

#### 主な変更箇所

**インポート追加**:
```typescript
import { NodeTypes } from "@/components/Node";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";
import { useState } from "react";
```

**useNodesState/useEdgesStateを削除し、Zustandストアを使用**:
```typescript
export const TemplateEditor = ({ nodes, edges }: Props) => {
  // 削除: const [nodesState, _, onNodesChange] = useNodesState<FlowNode>(nodes);
  // 削除: const [edgesState, setEdges, onEdgeChange] = useEdgesState<Edge>(edges);

  // 追加: Zustandストアを使用
  const {
    nodes: storeNodes,
    edges: storeEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
  } = useTemplateEditorStore();

  // モーダル制御用
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
```

**ReactFlowコンポーネントの更新**:
```typescript
<ReactFlow
  proOptions={{hideAttribution: true}}
  nodes={storeNodes}        // Zustandストアから取得
  edges={storeEdges}        // Zustandストアから取得
  nodeTypes={NodeTypes}     // 追加: カスタムノードタイプ
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onReconnect={onReconnect}
  snapToGrid
  fitView
>
```

**ノード追加モーダルの実装**:
```typescript
// ノード追加処理
const handleAddNode = useCallback(() => {
  if (!selectedNodeType) return;

  // 画面中央にノード追加
  const position = { x: 250, y: 250 };
  if (selectedNodeType === "CreateRole") {
    addNode("CreateRole", position);
  }

  // モーダルを閉じる
  const modal = document.getElementById("addNodeModal") as HTMLInputElement;
  if (modal) modal.checked = false;
  setSelectedNodeType(null);
}, [selectedNodeType, addNode]);

// モーダルUI
<div className="modal" role="dialog">
  <div className="modal-box rounded-xs">
    <h3 className="text-lg font-bold">ノードを追加する</h3>
    <div className="flex flex-wrap gap-4 mt-4">
      <label className="card cursor-pointer">
        <div className="card-body">
          <input
            type="radio"
            name="nodeType"
            value="CreateRole"
            checked={selectedNodeType === "CreateRole"}
            onChange={(e) => setSelectedNodeType(e.target.value)}
            className="radio"
          />
          <span className="ml-2">ロールを作成する</span>
        </div>
      </label>
    </div>
    <div className="modal-action">
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleAddNode}
        disabled={!selectedNodeType}
      >
        追加
      </button>
      <label htmlFor="addNodeModal" className="btn">
        キャンセル
      </label>
    </div>
  </div>
  <label htmlFor="addNodeModal" className="modal-backdrop">キャンセル</label>
</div>
```

### Phase 4: CreateRoleNode.tsxの更新

#### 変更内容

**インポート追加**:
```typescript
import { useTemplateEditorStore } from "@/stores/templateEditorStore";
import type { CreateRoleNodeData } from "@/stores/templateEditorStore";
```

**コンポーネント実装**:
```typescript
export const CreateRoleNode = ({ id, data }: NodeProps<Node<CreateRoleNodeData, "CreateRole">>) => {
  // Zustandストアからアクションを取得
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);

  // ロール名を更新
  const handleRoleChange = (index: number, newValue: string) => {
    const updatedRoles = [...data.roles];
    updatedRoles[index] = newValue;
    updateNodeData(id, { roles: updatedRoles });
  };

  // ロールを追加
  const handleAddRole = () => {
    updateNodeData(id, { roles: [...data.roles, ""] });
  };

  // ロールを削除
  const handleRemoveRole = (index: number) => {
    const updatedRoles = data.roles.filter((_, i) => i !== index);
    updateNodeData(id, { roles: updatedRoles });
  };

  return (
    <BaseNode>
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>ロールを作成する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        {data.roles.map((role, index) => (
          <div key={`${id}-role-${index}`} className="flex gap-2 items-center mb-2">
            <input
              type="text"
              className="input input-bordered w-full"
              value={role}
              onChange={(evt) => handleRoleChange(index, evt.target.value)}
              placeholder="ロール名を入力"
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => handleRemoveRole(index)}
            >
              削除
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={handleAddRole}>
          ロールを追加
        </button>
      </BaseNodeContent>
      <BaseNodeFooter>
        <button type="button" className="btn btn-primary">
          作成
        </button>
      </BaseNodeFooter>
    </BaseNode>
  );
};
```

## 技術的な考慮事項

### パフォーマンス最適化

**セレクタの使用**: 必要な値だけを購読
```typescript
// 良い例
const updateNodeData = useTemplateEditorStore(state => state.updateNodeData);

// 悪い例（すべての状態を購読してしまう）
const store = useTemplateEditorStore();
```

### 型安全性

- React FlowのNode型とZustandの型を統一
- CreateRoleNodeDataをZodスキーマとして定義することも検討可能

### デバッグ

- `hasUnsavedChanges`フラグで状態変更を追跡
- React DevToolsでZustandストアの状態を確認可能

## インポート・エクスポート機能の実装予定

React Flowの`toObject()`メソッドを使用して、ワークフロー全体をJSON形式でインポート・エクスポートする機能を実装します。

### エクスポート機能

**React FlowInstanceから状態を取得**:
```typescript
import { useReactFlow } from '@xyflow/react';

const { toObject } = useReactFlow();

const handleExport = () => {
  const flowData = toObject();
  // flowData: { nodes: [], edges: [], viewport: { x, y, zoom } }
  const json = JSON.stringify(flowData, null, 2);

  // JSONファイルとしてダウンロード
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template.json';
  a.click();
  URL.revokeObjectURL(url);
};
```

### インポート機能

**JSONファイルから状態を復元**:
```typescript
const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const json = e.target?.result as string;
    const flowData = JSON.parse(json);

    // Zustandストアに反映
    useTemplateEditorStore.setState({
      nodes: flowData.nodes,
      edges: flowData.edges,
      hasUnsavedChanges: true,
    });

    // Viewportも復元
    setViewport(flowData.viewport);
  };
  reader.readAsText(file);
};
```

### 保存される情報

- **nodes**: ノード配列（id, type, position, data）
- **edges**: エッジ配列（id, source, target, sourceHandle, targetHandle）
- **viewport**: ビューポート情報（x, y, zoom）

### TemplateEditor.tsxへの追加

エクスポート・インポートボタンをPanelに追加:
```typescript
<Panel position="top-right">
  <div className="flex gap-2">
    <label htmlFor="importFile" className="btn btn-outline btn-secondary">
      インポート
    </label>
    <input
      id="importFile"
      type="file"
      accept="application/json"
      onChange={handleImport}
      className="hidden"
    />
    <button onClick={handleExport} className="btn btn-outline btn-secondary">
      エクスポート
    </button>
    <label htmlFor="addNodeModal" className="btn btn-outline btn-primary">
      ノード追加
    </label>
  </div>
</Panel>
```

### 将来の拡張（IndexedDBへの保存）

エクスポートしたJSONデータを、将来的にはIndexedDBに保存します:

**Template/GameSessionテーブルに`reactFlowData`フィールドを追加**:
```typescript
// db.ts
this.version(2).stores({
  Template: "++id, name, reactFlowData, createdAt, updatedAt",
  GameSession: "++id, name, guildId, reactFlowData, createdAt",
});
```

**保存処理**:
```typescript
const handleSave = async () => {
  const { toObject } = useReactFlow();
  const flowData = toObject();

  await db.Template.update(templateId, {
    reactFlowData: flowData,
    updatedAt: new Date(),
  });

  markAsSaved();
};
```

## 今回実装しないこと（将来の拡張）

1. **IndexedDBへの自動保存**: `toObject()`でエクスポートした結果をDBに保存する機能は後回し
2. **Template/GameSessionテーブルの変更**: `reactFlowData`フィールドの追加は保存機能実装時に対応
3. **他のノードタイプ**: CreateRoleNode以外のノード（DeleteRole, CreateCategory等）は今回実装しない
4. **Undo/Redo機能**: Zustandのtemporalミドルウェアで実装可能だが今回は対象外

## 変更するファイル一覧

- **新規作成**: `src/stores/templateEditorStore.ts` - Zustandストアの実装
- **大幅変更**: `src/components/TemplateEditor.tsx` - Zustandストアの使用、nodeTypes追加、ノード追加機能実装
- **大幅変更**: `src/components/Node/CreateRoleNode.tsx` - Zustandストアを使ったデータ更新、フォーム機能実装
- **依存関係追加**: `package.json` - zustand@5.0.9を追加

## 動作確認方法

1. `fish -c "bun run dev"`で開発サーバーを起動
2. `/template/new`ページにアクセス
3. 「ノード追加」ボタンをクリック
4. 「ロールを作成する」を選択して追加
5. ノード内でロール名を入力
6. 「ロールを追加」でロールを増やす
7. 「削除」でロールを減らす
8. ノードをドラッグして移動
9. ノード間をつないでエッジを作成
10. 「エクスポート」ボタンでJSONファイルをダウンロード
11. 「インポート」ボタンでJSONファイルを読み込んでワークフローを復元

すべての操作がZustandストアを経由して動作することを確認します。
