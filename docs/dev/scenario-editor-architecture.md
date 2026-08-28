# Scenario Editor Architecture

> **#213 系サブ issue の設計基準。着手前に読むこと。**
> ここに書かれた決定は確定済みであり、実装中に再検討しない。誤りが判明した場合は、
> コードを書く前に本ドキュメントに対して提起する。
>
> 対象は「シナリオ本文を背骨にしたドキュメント型 UI」で、
> `docs/dev/step-list-editor-architecture.md` のステップリスト UI (#182) に続く第 3 世代にあたる。

## Why this UI

ステップリスト UI は「Discord 操作の並び」を編集する道具であり、シナリオ本文の居場所がない
(唯一の受け皿が各ステップの `memo`)。しかし GM の実務は「読みにくいシナリオブックを読み解き、
自分が進行できる形に再構成する」ことが大半を占める。

そこで本文をドキュメントとして書き下ろし、その文中に Discord 操作ブロックを差し込む UI に移す。
**本文は外部資料への参照ではなく、GM が再構成した成果物である。** この前提が、以降のほぼ全ての
決定を決めている。

先行例として [シナリー](https://amenohido.booth.pm/items/8552013) (TRPG GM 向けのシナリオ管理・
目次・メモ・ココフォリア連携) がある。ただし本アプリの主眼は「シナリオ管理」ではなく
「セッション進行」なので、資料の取り込み機能ではなく**編集と実行の連続性**に寄せる。

---

## 設計決定

| # | 決定 | 内容 |
|---|------|------|
| D1 | 新画面の形 | シナリオ本文を背骨にした **ドキュメント型ブロックエディタ**。本文中に Discord 操作ブロックを差し込む |
| D2 | 対象モード | 編集・実行の両方。**編集 → 実行の順**で作る (新形式のデータを手で作れないと実行画面を検証できないため) |
| D3 | #213 の位置づけ | 親テーマ。項目ごとにサブ issue へ分解する |
| D4 | データ | `Template.scenarioData` / `GameSession.scenarioData` を新設。**旧 `flowData` からの変換は行わない**。旧テンプレートは新画面に現れない |
| D5 | 旧 UI | React Flow (#182 Phase 5) は削除しない。**3 系統併存**とする |
| D6 | 依存 | **ライブラリ追加ゼロ**。ブロック = 既存 `Step` 型 + `Text` / `Heading` の 2 型追加。Markdown パーサは持たない |
| D7 | レイアウト | 本文ブロックは **インライン編集**、Discord 操作ブロックは **既存 `DetailPanel`** で編集 |
| D8 | 構造 | **フラットなブロック列 + `Branch` のみネスト**。Section 階層は持たず、`Heading` ブロックが見出しを担う |
| D9 | ループ | 見出しの「ここから再実行」で配下の `executedAt` / スキップ印をクリアする。周回数は既存 `Counter` ステップで数える |
| D10 | 実行意味論 | カーソルは advisory で、任意ステップを実行できる。本文ブロックは通過で `executedAt` を打つだけ (実行は no-op)。UI で「今ここ」を追従表示する |
| D11 | registry | 既存 registry を **完全共有**し、`InlineBody?` を任意フィールドとして追加する。**新機能は新画面にのみ実装する** |
| D12 | 導線 | `scenarioData` の有無でバッジ判定。`/template/new` の隣に「シナリオ形式で作成」。ルートは `/template/$id/scenario`・`/session/$id/scenario` |
| D13 | CCFOLIA 連携 | **クリップボードへのコピーボタン**で行う |
| D14 | メタ情報 | `Template` に個別カラム 6 つ (人数の下限/上限・システム・時間の下限/上限・画像パス) + OPFS 画像 |
| D15 | 旧画面の凍結 | コードは変更しない。`/template/new` を新形式のみに変更し、**古い形式のデータがこれ以上増えないようにする**。既存テストは残し、VRT の追加のみ止める |
| D16 | セッション生成 | `scenarioData` を 3 本目として既存のコピー経路に追加する。セッション画面は **空でないほうを開く** |
| D17 | 投票 | リアクション集計を先、返信一覧を後。バックエンドに読み取り API を新設する |
| D18 | 配役 | 「ギルドメンバー一覧の取得」「ユーザー指定のロール付与」の 2 エンドポイントを追加する |
| D19 | 本文の入力 | 貼り付けが主体。`.txt` / `.md` の取り込みは小追加 |
| D20 | ブロック種別 | **`Text` / `Heading` のみ**。シナリオを 3 本書き下ろすまで構造化ブロック (`Character` 等) を作らない |
| D21 | ダイス | 既存 `RandomSelect` / `ShuffleAssign` で足りるため専用ブロックは持たない |
| D22 | 回遊 | 目次パネル + `<details>` による折りたたみ。ブラウザの検索が畳んだ中を自動で開くため、アプリ内全文検索は持たない |

### D6 / D20 — 型を先に切らない

`Character` に何のフィールドが要るかは、現時点では確定できない。システムによって「秘密」の
有無も HO の枚数も能力値の有無も変わる。推測で型を切ると次のシナリオで `extra: string` を
足すことになり、結局 `Text` に戻る。

したがって **実際にシナリオを 2〜3 本 `Text` で書き下ろし、繰り返し現れた形だけをブロック化する**。
`Character` を作る自然なタイミングは、CCFOLIA 駒データ出力と配役 (D18) の両方が必要になった時。

### D9 — ループにコードを足さない

「議論フェーズ×3ラウンド」のような繰り返しは実在する。必要なプリミティブは
**Branch のアーム再選択のために既に存在する** (`treeOps.clearDescendantExecution` /
`collectDescendantStepIds`、`runnerStore.markStepExecuted` から使用)。

専用の `Loop` ブロックを持つと「反復ごとの実行記録」という別問題が付いてくる
(`executedAt` は 1 個しかなく、3 周目の 2 番目をどう表示するかの設計が丸ごと必要になる)。
GM が「もう 1 周」を宣言して押す形は、実際の卓の進行とも一致する。

**`Loop` に上げる条件**: 「条件を満たすまで自動で回る」が必要になったとき。その際は
先に「反復ごとの実行履歴を持つか、最後の 1 周だけ持つか」を決めること。

---

## ディレクトリ構成

新規は `frontend/src/scenario/` 配下。既存 `frontend/src/flow/` は共有資産として参照する
(registry・engine・既存フィールドエディタ)。

```
frontend/src/scenario/
  schema.ts              # ScenarioData = { version: 1, blocks: Block[] }
  blockOps.ts            # フラット列 + Branch ネストに対する純粋な変更操作
  store/
    editorStore.ts       # 編集モード (テンプレート著作)
    runnerStore.ts       # 実行モード (カーソル + 連鎖実行)
  outline.ts             # ブロック列を Heading の level で階層化 (折りたたみと目次が共有)
  components/
    ScenarioEditor.tsx   # 編集モードの 2 カラム + 目次 (store 初期化・自動保存)
    ScenarioRunner.tsx   # 実行モード
    BlockDocument.tsx    # ドキュメントのカラム (単一 DndContext)
    BlockList.tsx        # ドキュメント本体 (ブロック列の描画)
    TableOfContents.tsx  # Heading から生成する目次 (D22)
    CopyButton.tsx       # クリップボードコピー (D13)
```

`flow/registry/Text.tsx` と `flow/registry/Heading.tsx` は既存 registry 側に置く (D11)。
`Step` union の定義が `flow/schema.ts` にあるため、2 型の追加もそこに行う。

---

## データモデル

```ts
// scenario/schema.ts
export const ScenarioDataSchema = z.object({
  version: z.literal(1),
  blocks: z.array(StepSchema),   // flow/schema.ts の StepSchema をそのまま再利用
});
export const defaultScenarioData: ScenarioData = { version: 1, blocks: [] };
```

- **ブロック = `Step`** (D6/D11)。新画面のために別の Block 型を定義しない。
- トップレベルはフラットな `Step[]` で、`Heading` ブロックが見出しを担う (D8)。
- ネストは `Branch` のアーム (`branches[].steps`) のみ。この再帰は既存コードが扱える。

### 追加するステップ型

```ts
const TextStepSchema = StepBaseSchema.extend({
  type: z.literal("Text"),
  body: z.string().default(""),
});

const HeadingStepSchema = StepBaseSchema.extend({
  type: z.literal("Heading"),
  level: z.number().int().min(1).max(3).default(1),
  collapsed: z.boolean().default(false),
});
```

`Text` は Discord 処理を伴わないメモ的ステップも兼ねる。どちらも `category: "text"` として
`execute()` を持たず、実行は no-op で `executedAt` だけ打つ (D10)。

### 既存エンジンの再利用

`flow/engine/order.ts` と `flow/treeOps.ts` の `FlowData` 依存は入口だけで、中核の再帰
(`visit` の Branch 降下、`locateInSteps`、`collectInSteps`) は既に `Step[]` に対して動く。
これらに `Step[]` を受ける入口を足して共有する。

**Branch 降下ロジックを新画面用に書き直さないこと。** 実装が二重化してドリフトする。

---

## registry 契約の拡張 (D11)

既存 `StepRegistryEntry` に任意フィールドを 1 つ足す。既存画面は知らないフィールドを無視する。

```ts
export interface StepRegistryEntry<S extends Step = Step> {
  // ...既存フィールドは変更しない...

  // 新画面でドキュメント中にインライン描画される本文。持たない型は DetailPanel に落ちる (D7)。
  InlineBody?: (props: { step: S; onChange: (patch: Partial<S>) => void }) => JSX.Element;
}
```

- `InlineBody` を持つのは `Text` / `Heading` のみ。
- Discord 操作ブロックは 1 行サマリ (既存 `summary()` を流用) を出し、選択すると
  **既存 `DetailPanel` が開く**。メッセージブロック編集や条件ツリーを狭いカード内に
  押し込むと、React Flow を離れる原因となったコンテンツのはみ出しが再発する。
- `Heading` は既存 Section と役割が重複するため、旧ステップリストの追加メニューには出さない。

---

## 編集モードと実行モード

| 観点 | 編集モード (テンプレート) | 実行モード (セッション) |
|------|--------------------------|------------------------|
| バッキング | `Template.scenarioData` | `GameSession.scenarioData` |
| 本文編集 | インラインで自由 | 未実行ブロックのみ |
| カーソル | なし | advisory。任意ブロックを実行・再実行・スキップ可 |
| ループ | なし | 見出しの「ここから再実行」(D9) |
| フラグパネル | seed `Template.gameFlags` | ライブ `GameSession.gameFlags` |

実行意味論はステップリスト UI の実行モデルを引き継ぐ (D10)。**本文ブロックに「既読」という
別状態を持たせないこと。** `executedAt` と併存する 2 種類の進捗が生まれ、実行エンジンの状態が倍になる。

---

## ルーティングと併存 (D5 / D12)

既存の `$id/` ディレクトリルート形式に揃え、3 兄弟にする。

| ルート | UI | 読むフィールド |
|--------|----|----------------|
| `/template/$id` | React Flow (第 1 世代) | `reactFlowData` |
| `/template/$id/steps` | ステップリスト (第 2 世代) | `flowData` |
| `/template/$id/scenario` | **シナリオドキュメント (第 3 世代)** | `scenarioData` |

セッション側も同じ 3 兄弟。**フラットな `$id.scenario.tsx` 形式は使わないこと。**
`$id.tsx` の下にネストされ、親が `<Outlet/>` を描画しないため子が表示されない (#182 で発生済み)。

- 一覧のカードは `scenarioData` の有無でバッジを出し、ある場合のみ `/scenario` へのリンクを足す。
- `/template/new` は新形式のみを作る (D15)。
- 旧 2 系統のコードには手を入れない。既存テスト・VRT スナップショットは残す (動作保証の唯一の担保)。
  旧画面に対する VRT の追加のみ行わない。

---

## 永続化 (D4 / D16)

- `Template` / `GameSession` に `scenarioData` (JSON 文字列) を追加。Dexie の次バージョンで
  フィールド追加のみを行う。旧 `flowData` からの変換器は持たない。
- 旧形式のテンプレートは新画面に現れない。作り直しが前提。
- `CreateSession` は現在 `reactFlowData` と `flowData` を同じ replacer で OPFS パス書き換えして
  いる。ここに 3 本目を足す (`convertFilePathsInScenarioData`)。
- セッション画面は `scenarioData` が空でないほうを開く。旧テンプレート由来のセッションは
  `scenarioData` が空、新テンプレート由来は `flowData` が空になる。
- `Template` にメタ情報カラムを追加する (D14): 人数・システム・所要時間・カバー画像パス。
  いずれも optional 追加なのでマイグレーションコストは実質ゼロ。画像は OPFS の `template/{id}/`
  配下に置き、パスのみをカラムに持つ。**`schema-migration` スキルを使うこと。**
  1 シナリオでも人数と所要時間は範囲を取る (2〜4 人 / 2〜3 時間) ため、下限と上限を別カラムに
  分ける: `playerCountMin` / `playerCountMax` / `durationMinutesMin` / `durationMinutesMax`
  (Dexie v8)。絞り込みは「人数がその範囲に入るか」「所要時間の上限が
  指定時間以内か」で判定し、メタ情報が無い軸は判定不能として除外する。

---

## バックエンド拡張 (D17 / D18)

`backend/src/index.ts` は Discord REST のステートレスプロキシで、`GET` 系は `/profile` と
`/guilds` のみ。Gateway 接続はない。したがって以下は新規エンドポイントを要する。

| 機能 | 必要な追加 |
|------|-----------|
| 投票のリアクション集計 (#213-5) | メッセージのリアクション取得 |
| 投票の返信一覧 (#213-5、後回し) | チャンネルのメッセージ取得 + `message_reference` での紐付け |
| 配役 (#213-4) | ギルドメンバー一覧の取得、ユーザー指定のロール付与 |

既存 `addRoleToRoleMembers` はロール単位 (あるロールの保持者全員に別ロールを付ける) のみで、
特定ユーザーへの付与ができない。ここが配役の欠けているピース。

集計は Gateway を張らずポーリングで行う。リアクション集計を先に実装するのは、返信は表記揺れの
ため機械集計が原理的に不可能で、成果が「一覧表示」に留まるため。

---

## テストと受け入れゲート

`docs/dev/testing-strategy.md` に従う。

- **ユニット (最重要)**: `blockOps`、`Text`/`Heading` の `summary()`、共有した engine 入口、
  目次生成、ループの範囲リセット。いずれも純粋関数として TDD する。
- **VRT**: UI を伴うフェーズは Storybook ストーリーを追加し、そのスナップショットを受け入れ基準とする。
  カバー対象: ブロック列 (種別ごと)、インライン編集、DetailPanel、目次、折りたたみ、
  実行状態 (実行済み / スキップ / カーソル)、Branch ネスト。
- **`verify` スキル**: インライン編集とドラッグ並び替えは静止画スナップショットで担保しきれないため、
  Playwright での実操作確認をフェーズ 2 / 3 の受け入れに含める。
- 全フェーズ共通: `bun run --bun test` · `typecheck` · `format` · `lint` · `bun run knip`

---

## フェーズマップ

各フェーズを #213 のサブ issue とする。順序は 1 → 2 → 3 →(4 と 5 は並行)。0 は独立。

| # | サブ issue | 内容 | 依存 |
|---|-----------|------|------|
| 0 | メタ情報 | `Template` に 4 カラム + OPFS カバー画像 + 一覧の絞り込み (#213-3) | なし・並行可 |
| 1 | データ基盤 | `scenarioData` スキーマ、`Text`/`Heading` の registry エントリ、Dexie バージョン追加、モデルの parse/serialize、engine 入口の共有 | なし |
| 2 | 編集画面 | `/template/$id/scenario`。インライン編集 + DetailPanel + dnd-kit + フラグパネル + 目次 + 折りたたみ。`/template/new` の切り替え、一覧バッジ | 1 |
| 3 | 実行画面 | `/session/$id/scenario`。カーソル追従、実行/スキップ/再実行、`autoAdvance`、「ここから再実行」、セッション生成でのコピーとパス変換 | 2 |
| 4 | 小物 | コピーボタン (#213-2)、`.txt`/`.md` 取り込み、メモ的ステップ (#213-6) の完了確認 | 2 |
| 5 | バックエンド拡張 | 投票のリアクション集計 (#213-5)、配役の 2 エンドポイント (#213-4) | 3 |

フェーズ 0 は新画面に依存しない唯一の項目で、他が詰まったときに独立して進められる。
フェーズ 5 は唯一 `backend/` を触り、デプロイと API スキーマが絡むため最後に置く。

---

## スコープ外

| 項目 | 理由 |
|------|------|
| プレイ履歴 (セッション側メタ) | セッションに必要なメタは性質が異なる (実施日・参加者・実所要時間)。テンプレートのメタを流用すると双方が半端になる |
| CCFOLIA 駒データ出力 | 「キャラクター」エンティティが存在せず、その定義から始まる (D20 も参照) |
| PDF 併置ビューア | 本文は再構成した成果物である、という前提と両立しない |
| 構造化ブロック (`Character` 等) | シナリオ 3 本を `Text` で書くまで作らない (D20) |
| `docs/dev/node-system-architecture.md` の整理 | `DynamicValue` の解決仕様は新画面でも有効なので、ノード実装手順のみ削る。#182 Phase 5 の後 |

## 参照ファイル

| ファイル | 役割 |
|----------|------|
| `frontend/src/flow/schema.ts` | `Step` union の定義。`Text`/`Heading` もここに足す |
| `frontend/src/flow/registry/index.ts` | 共有 registry (D11) |
| `frontend/src/flow/treeOps.ts` | Branch ネストへの純粋な操作。入口を共有する |
| `frontend/src/flow/engine/order.ts` | 実行順序と Branch 降下。入口を共有する |
| `frontend/src/flow/components/DetailPanel.tsx` | 操作ブロックの編集 UI (D7 で再利用) |
| `frontend/src/db/database.ts` | Dexie バージョン (フェーズ 0 / 1) |
| `frontend/src/components/CreateSession.tsx` | セッション生成時のコピー経路 (D16) |
| `backend/src/index.ts` | Discord REST プロキシ (フェーズ 5) |
| `docs/dev/step-list-editor-architecture.md` | 第 2 世代 UI。凍結対象だが registry 契約は有効 |
| `docs/dev/testing-strategy.md` | テストピラミッドと VRT |
