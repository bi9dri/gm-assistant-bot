# ノードベースワークフローシステム 設計書

## 概要

TRPG/マーダーミステリーセッション管理のための、ノードベースワークフローシステムの設計ドキュメントです。有向グラフによる条件分岐、複数のアクションタイプをサポートし、半自動実行でGMをサポートします。

## ユーザー要件まとめ

- **実行順序**: 有向グラフ（条件分岐可能）
- **フラグ管理**: GameSession内に`state: Record<string, unknown>`を追加（正規化しない）
- **アクションタイプ**: Discord操作、権限変更、メッセージ/ファイル送信、フラグ設定、GM向けガイダンス表示
- **実行方式**: 半自動実行（インフラ系は自動、ガイダンス系は手動）
- **アクション粒度**: 1ノード=1アクション（細かい粒度）
- **Actionモデリング**: Union型でクラス分離（CreateChannelAction, SendMessageAction等）
- **実行状態**: SessionNodeは`executedAt`のみで判定（statusフィールド不要）
- **ファイル送信**: File System Access API経由でローカルファイル参照（またはIndexedDB Blob保存）
- **UI**: ビジュアルエディタは将来拡張（React Flow想定）、まずはデータモデルとCRUD機能のみ

## 設計の重要ポイント

1. **Actionクラス体系**: 各アクションタイプを別クラスで実装し、Union型で統合
2. **条件分岐**: シンプルなDSL（`flag:key==value`形式）で条件評価
3. **半自動実行**: 自動実行可能なノードは自動実行、GMガイダンスなどは手動実行
4. **状態管理**: GameSession.stateに直接保存（別テーブル不要）
5. **細粒度ノード**: 1ノード=1アクション（チャンネル作成、メッセージ送信など）

---

## Phase 1: Actionクラス体系の構築

### 1.1 基底Actionクラスと各種Actionクラスの作成

**ファイル**: `src/models/actions/Action.ts`

```typescript
// 基底クラス
export abstract class Action {
  abstract readonly type: string;

  // すべてのActionで共通のメモフィールド（任意）
  memo?: string;

  abstract execute(context: ActionExecutionContext): Promise<ActionExecutionResult>;
  abstract validate(): boolean;

  // 自動実行可能かどうか（デフォルトはfalse = 手動）
  canAutoExecute(): boolean {
    return false;
  }

  // IndexedDB保存用のプレーンオブジェクト化
  toJSON(): object;

  // プレーンオブジェクトからの復元（ファクトリー）
  static fromJSON(json: object): TemplateAction;
}

// Union型定義
export type TemplateAction =
  | CreateChannelAction
  | DeleteChannelAction
  | ChangePermissionsAction
  | SendMessageAction
  | SendFileAction
  | SetFlagAction
  | NoOperationAction;
```

**個別Actionクラス**:

各Actionクラスは専用ファイルで実装します（`src/models/actions/*.ts`）：

- `CreateChannelAction` - チャンネル作成（自動実行可能）
- `DeleteChannelAction` - チャンネル削除（自動実行可能）
- `ChangePermissionsAction` - 権限変更（自動実行可能）
- `SendMessageAction` - メッセージ送信（自動実行可能）
- `SendFileAction` - ファイル送信（手動推奨）
- `SetFlagAction` - フラグ設定（自動実行可能）
- `NoOperationAction` - 何もしないアクション（手動のみ、GMの確認・メモ表示ポイント）

**例: CreateChannelAction**:

```typescript
export class CreateChannelAction extends Action {
  readonly type = "create_channel" as const;

  channelName!: string;
  channelType!: "text" | "voice";
  writerRoleNames!: string[];
  readerRoleNames!: string[];

  static schema = z.object({
    type: z.literal("create_channel"),
    channelName: z.string().trim().nonempty(),
    channelType: z.enum(["text", "voice"]),
    writerRoleNames: z.array(z.string()),
    readerRoleNames: z.array(z.string()),
  });

  validate(): boolean {
    return CreateChannelAction.schema.safeParse(this).success;
  }

  // チャンネル作成は自動実行可能
  canAutoExecute(): boolean {
    return true;
  }

  async execute(context: ActionExecutionContext): Promise<ActionExecutionResult> {
    // Discord API呼び出し
    const res = await context.api.channels.$post({
      json: {
        guildId: context.guildId,
        parentCategoryId: context.categoryId,
        name: this.channelName,
        type: this.channelType,
        writerRoleIds: this.writerRoleNames.map(name => context.roleMap[name]),
        readerRoleIds: this.readerRoleNames.map(name => context.roleMap[name]),
      },
    });

    if (!res.ok) {
      return { success: false, error: await res.text() };
    }

    const { channel } = await res.json();
    return {
      success: true,
      discordResourceIds: { [this.channelName]: channel.id },
    };
  }

  toJSON() {
    return {
      type: this.type,
      channelName: this.channelName,
      channelType: this.channelType,
      writerRoleNames: this.writerRoleNames,
      readerRoleNames: this.readerRoleNames,
    };
  }

  static fromJSON(json: any): CreateChannelAction {
    const action = new CreateChannelAction();
    Object.assign(action, json);
    return action;
  }
}
```

**例: NoOperationAction**:

```typescript
export class NoOperationAction extends Action {
  readonly type = "noop" as const;

  // 表示タイプ（必須、デフォルト: "memo"）
  displayType: "memo" | "read_aloud" | "instruction" | "warning" = "memo";

  static schema = z.object({
    type: z.literal("noop"),
    memo: z.string().optional(),
    displayType: z.enum(["memo", "read_aloud", "instruction", "warning"]).default("memo"),
  });

  validate(): boolean {
    return NoOperationAction.schema.safeParse(this).success;
  }

  // NoOpは常に手動実行（自動実行チェーンの停止ポイント）
  canAutoExecute(): boolean {
    return false;
  }

  async execute(context: ActionExecutionContext): Promise<ActionExecutionResult> {
    // 何もしない、GMの確認のみ
    return { success: true };
  }

  toJSON() {
    return {
      type: this.type,
      memo: this.memo,
      displayType: this.displayType,
    };
  }

  static fromJSON(json: any): NoOperationAction {
    const action = new NoOperationAction();
    Object.assign(action, json);
    return action;
  }
}
```

**displayTypeの用途**:
- `memo`: 通常のメモ・注意事項
- `read_aloud`: プレイヤーに読み上げるテキスト
- `instruction`: GMへの指示・手順
- `warning`: 重要な警告・確認事項

### 1.2 TemplateNodeモデルの拡張

**ファイル**: `src/models/TemplateNode.ts`

**新規フィールド**:
- `nodeKey: string` - テンプレート内で一意な識別子
- `title: string` - 表示名
- `action: TemplateAction` - **Union型のActionオブジェクト**
- `nextNodeCandidates: Array<{targetNodeKey, condition?, label?, priority}>` - 次ノード候補
- `position?: {x, y}` - 将来のビジュアルエディタ用（今回未使用）
- `tags: string[]` - フィルタリング/検索用（例: "entry_point"）
- `updatedAt: Date`

**新規メソッド**:
- `possibleDestinationNodes(sessionState): Promise<TemplateNode[]>` - 条件評価済みの次ノード候補
- `evaluateCondition(condition, state): boolean` - 条件式評価
- `save(): Promise<void>`

**条件式の仕様**:
- DSL: `flag:key==value`, `flag:key>5`, `flag:key!=false`
- 演算子: `==`, `!=`, `>`, `<`, `>=`, `<=`
- 値の型: 文字列、数値、真偽値を自動判定

**actionの保存**:
- IndexedDBにはActionオブジェクトをJSON化して保存
- 読み込み時に`Action.fromJSON()`でUnion型を復元

### 1.3 SessionNodeモデルの簡略化

**ファイル**: `src/models/SessionNode.ts`

**フィールド**:
- `templateNodeKey: string` - TemplateNode.nodeKeyへの参照
- `executedAt: Date | null` - **実行済みかどうかはこれだけで判定**
- `executionResult?: object` - 実行結果
  - `success: boolean`
  - `error?: string`
  - `discordResourceIds?: Record<string, string>`
  - `messagesSent?: string[]`
- `executionNotes: string` - GMのメモ

**メソッド**:
- `getTemplateNode(): Promise<TemplateNode | undefined>`
- `markExecuted(result): Promise<void>`
- `isExecuted(): boolean` - `executedAt !== null`

### 1.4 GameSessionモデルの拡張

**ファイル**: `src/models/GameSession.ts`

**新規フィールド**:
- `templateId: number`
- `state: Record<string, unknown>` - **セッション状態のkey-valueストア**
- `currentNodeKey: string | null` - 現在GMが見ているノード
- `completedNodeKeys: string[]` - 実行済みノードの履歴

**新規メソッド**:
- `get template`
- `get nodes`
- `getState(key): unknown`
- `setState(key, value): Promise<void>`
- `getCurrentNode(): Promise<TemplateNode | undefined>`
- `getNextPossibleNodes(): Promise<TemplateNode[]>` - 条件評価済み
- `executeNode(nodeKey): Promise<SessionNode>` - ノード実行
- `processAutoExecutionChain(): Promise<void>` - 自動実行可能なノードを連鎖的に実行

### 1.5 データベーススキーマ更新

**ファイル**: `src/db.ts`

```typescript
db.version(3).stores({
  GameSession: "++id, name, templateId, guildId, categoryId, *roleIds, currentNodeKey, *completedNodeKeys, createdAt",
  SessionNode: "++id, sessionId, templateNodeKey, executedAt",
  // SessionStateテーブルは作らない（GameSession.stateで管理）
  Guild: "id, name, icon",
  Category: "id, name",
  Channel: "id, name, type, *writerRoleIds, *readerRoleIds",
  Role: "[id+guildId], name",
  Template: "++id, name, *roles, createdAt, updatedAt",
  TemplateChannel: "++id, templateId, name, type, *writerRoles, *readerRoles",
  TemplateNode: "++id, templateId, nodeKey, *tags, createdAt, updatedAt",
});
```

**インデックス戦略**:
- `TemplateNode`: `templateId`, `nodeKey`, `tags`
- `SessionNode`: `sessionId`, `templateNodeKey`, `executedAt`
- `GameSession`: `templateId`, `currentNodeKey`, `completedNodeKeys`

**マイグレーション**:

```typescript
db.version(3).upgrade(async (tx) => {
  // 既存GameSessionに新フィールド追加
  const sessions = await tx.table("GameSession").toArray();
  for (const session of sessions) {
    await tx.table("GameSession").update(session.id, {
      state: {},
      currentNodeKey: null,
      completedNodeKeys: [],
    });
  }
});
```

---

## Phase 2: 半自動実行システム

### 2.1 自動実行の仕組み

**自動実行可能なアクション**:
- CreateChannelAction
- DeleteChannelAction
- ChangePermissionsAction
- SendMessageAction
- SetFlagAction

**手動実行のみのアクション**:
- NoOperationAction（何もしない、GMの確認ポイント）
- SendFileAction（手動推奨）

### 2.2 自動実行チェーンの実装

**GameSession.processAutoExecutionChain()の動作**:

```typescript
async processAutoExecutionChain(): Promise<void> {
  const nextNodes = await this.getNextPossibleNodes();

  for (const node of nextNodes) {
    if (node.action.canAutoExecute()) {
      // 自動実行
      await this.executeNode(node.nodeKey);

      // 再帰的に次の自動実行ノードをチェック
      await this.processAutoExecutionChain();
      break; // 一度に1ノードのみ実行
    }
  }

  // 手動実行ノードに到達したら停止
}
```

**実行フロー**:
1. GMが手動でNoOperationActionやSendFileActionを実行
2. 完了後、`processAutoExecutionChain()`を呼び出し
3. 次ノード候補の中で自動実行可能なものを順次実行
4. 手動実行ノードに到達したら停止
5. GMが次の手動ノードを実行...

---

## Phase 3: アクション実行コンテキストと共通型

**ファイル**: `src/models/actions/types.ts`

```typescript
export type ActionExecutionContext = {
  session: GameSession;
  guildId: string;
  categoryId: string;
  roleMap: Record<string, string>; // Template role name -> Discord role ID
  channelMap: Record<string, string>; // Channel name -> Discord channel ID
  db: DB;
  api: typeof import("@/api").default;
};

export type ActionExecutionResult = {
  success: boolean;
  error?: string;
  discordResourceIds?: Record<string, string>;
  messagesSent?: string[];
};
```

各Actionクラスの`execute()`メソッドは、このcontextを受け取り、Discord APIを呼び出します。

---

## Phase 4: ファイル送信機能（優先度：低）

SendFileActionでは、File System Access APIを使ってローカルファイルを参照します。

**実装の要点**:
- File System Access APIはChromium系ブラウザのみ対応
- ユーザー操作トリガーが必須（セキュリティ制約）
- フォールバックとしてIndexedDB Blob保存も可能（容量制限あり）

**実装は後回し可能**（まずは基本的なDiscord操作系Actionを優先）

---

## Phase 5: バックエンドAPI拡張 (deprecated)

各Actionの実行に必要な新規エンドポイントを追加します。

**必要なエンドポイント**:

1. **メッセージ送信**: `POST /api/channels/:channelId/messages`
2. **ファイル送信**: `POST /api/channels/:channelId/files`（FormData）
3. **権限変更**: `PATCH /api/channels/:channelId/permissions`
4. **チャンネル削除**: `DELETE /api/channels/:channelId`

**ファイル**: `backend/src/index.ts`, `backend/src/handler/*.ts`, `backend/src/discord.ts`

実装は各Actionクラスが必要になった段階で追加していきます。

---

## Phase 6: UI実装

データモデルとCRUD機能を優先し、UIは必要最小限に留めます。

**必要なUI**:
- TemplateNodeリスト表示・追加・編集フォーム（`src/routes/template/$id.tsx`）
- セッション実行UI（`src/routes/session/$id.tsx`）
  - 現在ノード表示
  - 次ノード候補リスト
  - ノード実行ボタン
  - セッション状態ビューア（フラグ一覧）
- アクション表示モーダル（`src/components/ActionDisplayModal.tsx`）
  - NoOperationActionのメモ表示（displayTypeに応じたアイコン・色分け）
  - 他のアクションの実行確認・結果表示

**ビジュアルグラフエディタは将来拡張**

---

## 実装順序

### Step 1: 基盤データモデル
1. Actionクラス体系（基底クラス + 各種Actionクラス）
2. TemplateNode拡張（action, nextNodeCandidates, 条件評価）
3. SessionNode簡略化（executedAtのみ）
4. GameSession拡張（state, currentNodeKey, completedNodeKeys）
5. データベーススキーマ更新とマイグレーション

### Step 2: コアActionの実装
1. CreateChannelAction（最も基本的）
2. SetFlagAction（状態管理の基礎）
3. NoOperationAction（UI表示の基礎、確認ポイント）

### Step 3: バックエンドAPI (deprecated)
1. メッセージ送信エンドポイント
2. 権限変更エンドポイント
3. チャンネル削除エンドポイント

### Step 4: UI実装
1. 基本的なノードCRUD UI
2. セッション実行UI
3. アクション表示モーダル（NoOperationActionのメモ表示など）

---

## 重要なファイル一覧

### 新規作成
- `src/models/actions/Action.ts` - 基底Actionクラスと型定義（memoフィールド含む）
- `src/models/actions/CreateChannelAction.ts`
- `src/models/actions/DeleteChannelAction.ts`
- `src/models/actions/ChangePermissionsAction.ts`
- `src/models/actions/SendMessageAction.ts`
- `src/models/actions/SendFileAction.ts`
- `src/models/actions/SetFlagAction.ts`
- `src/models/actions/NoOperationAction.ts` - 何もしないアクション
- `src/models/actions/types.ts` - 実行コンテキストと結果の型
- `src/components/ActionDisplayModal.tsx` - アクション実行時の表示（NoOperationActionのメモ表示など）

### 大幅変更
- `src/models/TemplateNode.ts` - action, nextNodeCandidates追加、条件評価実装
- `src/models/SessionNode.ts` - executedAtベースに簡略化
- `src/models/GameSession.ts` - state, ノード実行機能追加
- `src/db.ts` - スキーマ更新とマイグレーション

### バックエンド拡張 (deprecated)
- `backend/src/index.ts` - 新規エンドポイント追加
- `backend/src/discord.ts` - Discord API機能追加
- `backend/src/schema.ts` - APIのスキーマ追加

---

## 技術的な注意点

1. **Union型の保存**: ActionオブジェクトはJSON化してIndexedDBに保存、読み込み時に型を復元
2. **条件式評価**: シンプルな実装から開始。将来的にはより高度な式評価エンジンに拡張可能
3. **File System Access API**: 権限管理に注意。ユーザー操作トリガー必須
4. **型安全性**: Actionクラスごとにstatic schemaでZod検証

---

## 成功基準

- [ ] すべてのActionクラスに共通のmemoフィールドが実装されている
- [ ] GameSession.stateでセッション全体の状態を管理できる
- [ ] TemplateNodeで有向グラフの条件分岐を表現できる
- [ ] SessionNodeで実行履歴と結果を追跡できる
- [ ] 7種類のActionクラスすべてが実装され、実行可能
- [ ] 条件式評価が正しく動作する
- [ ] 半自動実行システムが正しく動作する（自動実行可能なノードは自動実行）
- [ ] GMが手動ノードを選んで実行できる
- [ ] NoOperationActionでdisplayTypeに応じた表示が適切に行われる
- [ ] セッション実行の基本的なUIが動作する
