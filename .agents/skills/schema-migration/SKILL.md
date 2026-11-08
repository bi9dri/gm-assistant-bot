---
name: schema-migration
description: Migrate node DataSchema changes with Dexie DB versioning. Use when changing a node's DataSchema fields (rename, type change, discriminated union conversion, etc.) to ensure existing IndexedDB data is migrated correctly. Triggers on requests like "スキーマを変更", "マイグレーションを追加", "DataSchemaを更新", "フィールドをリネーム".
---

# Schema Migration

ノードの `DataSchema` を変更する際に、既存の IndexedDB データとの互換性を保つための Dexie マイグレーション実装ガイド。

## Implementation Checklist

1. `{NodeName}Node.tsx` の `DataSchema` を変更する
2. `frontend/src/db/database.ts` に旧スキーマの型定義を追加する（`{NodeName}V{N}Data`）
3. `this.version(N).upgrade()` を追加する（N は現在の最大バージョン + 1）
4. `migrateReactFlowData` 内で対象ノードを `safeParse` してから変換する
5. `Template` と `GameSession` の**両テーブル**を `modify()` で更新する
6. 旧フィールドを `delete node.data.{oldField}` で削除する

## Migration Code Template

```ts
// 1. 旧スキーマ定義（database.ts のトップレベルに追加）
const {NodeName}NodeV{N}Data = z.object({
  {oldField}: {oldType},
});

// 2. バージョンアップグレード（DB クラスのコンストラクタ内に追加）
this.version({N+1}).upgrade(async (tx) => {
  const migrateReactFlowData = (reactFlowDataStr: string): string => {
    let parsed: z.infer<typeof ReactFlowDataMigrationSchema>;
    try {
      parsed = ReactFlowDataMigrationSchema.parse(JSON.parse(reactFlowDataStr));
    } catch {
      return reactFlowDataStr;
    }

    let modified = false;
    for (const node of parsed.nodes) {
      if (node.type === "{NodeName}" && node.data) {
        const v{N} = {NodeName}NodeV{N}Data.safeParse(node.data);
        if (v{N}.success) {
          // 変換ロジック
          node.data.{newField} = /* v{N}.data.{oldField} から変換 */;
          delete node.data.{oldField};
          modified = true;
        }
      }
    }

    return modified ? JSON.stringify(parsed) : reactFlowDataStr;
  };

  await tx
    .table("Template")
    .toCollection()
    .modify((template) => {
      template.reactFlowData = migrateReactFlowData(template.reactFlowData);
    });

  await tx
    .table("GameSession")
    .toCollection()
    .modify((session) => {
      session.reactFlowData = migrateReactFlowData(session.reactFlowData);
    });
});
```

## 重要なルール

- **safeParse を必ず使う**: 既に新スキーマのデータが存在する場合でも安全に処理できる
- **両テーブルを移行**: `Template` と `GameSession` の両方に `reactFlowData` があるため、両方を修正すること
- **旧フィールドを削除**: 変換後は `delete node.data.{oldField}` で不要なフィールドを取り除く
- **バージョンは連番**: 既存の最大バージョン番号 + 1 を使う（スキップ禁止）
- **`ReactFlowDataMigrationSchema` を再利用**: `z.looseObject` ベースの既存スキーマを使う

## 変換パターン例

### パターン 1: フィールドリネーム（同型）

```ts
// oldField: string → newField: string
node.data.newField = v1.data.oldField;
delete node.data.oldField;
```

### パターン 2: 文字列 → Discriminated Union

```ts
// fieldName: string → fieldName: { type: "literal", value: string }
node.data.fieldName = {
  type: "literal",
  value: v1.data.fieldName,
};
// フィールド名が同じなので delete 不要
```

### パターン 3: 配列要素の型変更

```ts
// names: string[] → targets: { type: "channelName", value: string }[]
node.data.targets = v1.data.names.map((name) => ({
  type: "channelName",
  value: name,
}));
delete node.data.names;
```

## 参考

- 実際の実装例: `frontend/src/db/database.ts`（version 2, 3 の upgrade）
- アーキテクチャの背景: `docs/dev/node-system-architecture.md` の「DataSchema 変更とマイグレーション」セクション
