# 組み合わせ記録ノード (RecordCombinationNode) 設計書

> GitHub Issue: https://github.com/bi9dri/gm-assistant-bot/issues/23
> 作成日: 2026-01-21

## 概要

TRPG/マーダーミステリーセッション管理で使用する「組み合わせを記録するノード」を実装する。

### ユースケース
1. **密談記録**: キャラクター同士の1対1密談ペアを順番に記録
2. **探索割当記録**: キャラクター→場所のマッピングを記録

### 4つのパターン
| # | パターン | 例 |
|---|---------|---|
| 1 | キャラ-キャラ（自分自身NG、重複禁止） | 密談順番記録 |
| 2 | キャラ-キャラ（自分自身NG、重複OK） | 何度も密談可能な場合 |
| 3 | キャラ→場所（異なる集合間、重複禁止） | 1人1場所のみ探索 |
| 4 | キャラ→場所（異なる集合間、重複OK） | 1人が複数場所探索可能 |

---

## 設計方針

### ノード構成: 単一ノード + モード切替（推奨）

**理由**:
- 既存パターン（DynamicValueの`type`による分岐）に沿っている
- 4つのパターンは本質的に同じ「組み合わせ記録」の変種
- 将来の拡張（キャラ-アイテム等）に対応しやすい
- プリセット（密談記録/探索割当）でUXをカバー

---

## データスキーマ

```typescript
// 選択肢
const OptionItemSchema = z.object({
  id: z.string(),      // UUID
  label: z.string(),   // 表示名
});

// 記録されたペア
const RecordedPairSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  recordedAt: z.coerce.date(),  // タイムライン表示用
  memo: z.string().optional(),  // 将来拡張用
});

// 設定
const PairingConfigSchema = z.object({
  mode: z.enum(["same-set", "different-set"]),
  allowSelfPairing: z.boolean().default(false),
  allowDuplicates: z.boolean().default(false),
  directionality: z.enum(["undirected", "directed"]).default("directed"),
  allowMultipleAssignments: z.boolean().default(false),
});

// メインスキーマ
export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().default("組み合わせを記録"),
  config: PairingConfigSchema,
  sourceOptions: z.object({
    label: z.string().default("キャラクター"),
    items: z.array(OptionItemSchema),
  }),
  targetOptions: z.object({
    label: z.string().default("場所"),
    items: z.array(OptionItemSchema),
  }).optional(),  // different-setモードのみ使用
  recordedPairs: z.array(RecordedPairSchema).default([]),
});
```

### 設定の対応表
| パターン | mode | allowSelfPairing | allowDuplicates | directionality |
|---------|------|------------------|-----------------|----------------|
| 密談（重複禁止） | same-set | false | false | directed |
| 密談（重複OK） | same-set | false | true | directed |
| 探索（1人1場所） | different-set | - | false | - |
| 探索（1人複数場所） | different-set | - | true | - |

---

## UI設計

### Edit Mode
```
┌─────────────────────────────────────────┐
│ [タイトル入力: 密談記録             ]    │
│ プリセット: [▼ 密談記録]                 │
├─────────────────────────────────────────┤
│ 設定                             [▼]    │
│  モード: ○同一集合 ○異なる集合           │
│  □ 重複ペアを許可                        │
│  方向性: ○無向(A-B) ○有向(A→B)          │
├─────────────────────────────────────────┤
│ キャラクター                             │
│  [田中太郎    ] [削除]                   │
│  [佐藤花子    ] [削除]                   │
│  [+ 追加]                               │
└─────────────────────────────────────────┘
```

### Execute Mode
```
┌─────────────────────────────────────────┐
│ 密談記録                                 │
├─────────────────────────────────────────┤
│ [▼ キャラ1] → [▼ キャラ2]               │
│         [記録する]                       │
├─────────────────────────────────────────┤
│ 記録履歴 (3件)                           │
│ 1. 田中太郎 → 佐藤花子    14:30:25      │
│ 2. 鈴木一郎 → 田中太郎    14:31:10      │
│ 3. 佐藤花子 → 鈴木一郎    14:32:45      │
└─────────────────────────────────────────┘
```

### 動的フィルタリング
- 左側で選択した項目は右側から除外（allowSelfPairing: false時）
- 記録済みペアは右側でグレーアウト表示（allowDuplicates: false時）

---

## 実装ステップ

### Phase 1 (MVP): 密談記録の基本機能
1. [ ] `RecordCombinationNode.tsx` - スキーマ定義 + メインコンポーネント
2. [ ] `OptionListEditor.tsx` - 選択肢の追加/削除/編集UI
3. [ ] `PairingInputForm.tsx` - ペア入力フォーム（ドロップダウン×2）
4. [ ] `useFilteredOptions.ts` - 自分自身除外の動的フィルタリング
5. [ ] `PairingTimeline.tsx` - シンプルなリスト表示
6. [ ] ストア統合（templateEditorStore.ts）
7. [ ] NODE_CATEGORIESへの追加
8. [ ] node-wrapper.tsxへの登録

### Phase 2: 探索割当対応
- [ ] different-setモード対応（ターゲット選択肢）
- [ ] 詳細設定UI（directionality, allowMultipleAssignments）
- [ ] プリセット機能
- [ ] 重複時のグレーアウト表示

### Phase 3: UX改善
- [ ] メモ機能
- [ ] 削除/修正機能
- [ ] エクスポート機能

---

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/Node/nodes/RecordCombinationNode.tsx` | 新規作成: メインコンポーネント + スキーマ |
| `frontend/src/components/Node/base/base-schema.ts` | NODE_TYPE_WIDTHSに `RecordCombination: NODE_WIDTHS.lg` 追加 |
| `frontend/src/components/Node/base/node-wrapper.tsx` | createNodeTypes関数への登録 |
| `frontend/src/components/Node/nodes/index.ts` | エクスポート追加 |
| `frontend/src/stores/templateEditorStore.ts` | FlowNode型 + addNode関数の拡張 |
| `frontend/src/components/TemplateEditor.tsx` | NODE_CATEGORIESの「ゲーム管理」カテゴリに追加 |

### templateEditorStore.ts への追加内容

```typescript
// import追加
import type { RecordCombinationDataSchema } from "@/components/Node";

// 型定義追加
export type RecordCombinationNodeData = z.infer<typeof RecordCombinationDataSchema>;

// FlowNode union型への追加
| Node<RecordCombinationNodeData, "RecordCombination">

// addNode関数への追加
} else if (type === "RecordCombination") {
  newNode = {
    id,
    type,
    position,
    data: {
      title: "組み合わせを記録",
      config: {
        mode: "same-set",
        allowSelfPairing: false,
        allowDuplicates: false,
        directionality: "directed",
        allowMultipleAssignments: false,
      },
      sourceOptions: {
        label: "キャラクター",
        items: [],
      },
      recordedPairs: [],
    },
  };
}
```

### TemplateEditor.tsx NODE_CATEGORIESへの追加

```typescript
{
  category: "ゲーム管理",
  nodes: [
    { type: "SetGameFlag", label: "ゲームフラグを設定する" },
    { type: "RecordCombination", label: "組み合わせを記録する" },  // 追加
  ],
},
```

---

## 検証方法

1. テンプレートエディタでRecordCombinationノードを追加できる
2. Edit modeでキャラクター名を入力できる
3. Execute modeでペアを選択・記録できる
4. 自分自身とのペアが作れないことを確認
5. 重複禁止設定時、既存ペアがグレーアウトされることを確認
6. タイムラインに記録順で表示されることを確認
7. セッションを保存・再読み込みしてもデータが保持されることを確認
