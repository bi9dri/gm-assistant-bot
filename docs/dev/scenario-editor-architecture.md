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

そこで本文をドキュメントとして書き下ろし、その文中に Discord 操作を差し込む UI に移す。
**本文は外部資料への参照ではなく、GM が再構成した成果物である。** この前提が、以降のほぼ全ての
決定を決めている。

本文と操作を兄弟のブロックとして並べる形は採らない。配布シナリオの原文では操作が散文の中に
埋まっており ―― 「GM は以下を読み上げ、その後に◯◯を伝える」 ―― ブロック列に割ると原文の
流れが失われ、GM は書き込む前に原文を切り分ける作業を強いられる。**操作を段落中のインライン
要素にすると、全文を貼ってから文中に操作を書き込む順序で作業できる ―― 翻訳ではなく注釈になる。**

強調とハイライトを持つのも同じ動機による。GM の失敗は「見落とし」の形で起きるため、
原文で目立っていた注意書きが平文に潰れることの実務上の損失が大きい。

先行例として [シナリー](https://amenohido.booth.pm/items/8552013) (TRPG GM 向けのシナリオ管理・
目次・メモ・ココフォリア連携) がある。ただし本アプリの主眼は「シナリオ管理」ではなく
「セッション進行」なので、資料の取り込み機能ではなく**編集と実行の連続性**に寄せる。

---

## 設計決定

| # | 決定 | 内容 |
|---|------|------|
| D1 | 新画面の形 | シナリオ本文を背骨にした **段落ベースのリッチテキストエディタ**。Discord 操作は段落の兄弟ではなく**文中のインライン要素**として置く |
| D2 | 対象モード | 編集・実行の両方。**編集 → 実行の順**で作る (新形式のデータを手で作れないと実行画面を検証できないため) |
| D3 | #213 の位置づけ | 親テーマ。項目ごとにサブ issue へ分解する |
| D4 | データ | `Template.scenarioData` / `GameSession.scenarioData` を新設。**旧 `flowData` からの変換は行わない**。旧テンプレートは新画面に現れない |
| D5 | 旧 UI | React Flow (#182 Phase 5) は削除しない。**3 系統併存**とする |
| D6 | 依存 | **Tiptap (ProseMirror)** をリッチテキスト基盤に使う。Markdown パーサは持たない (入力ルールで代替) |
| D7 | レイアウト | 本文は**エディタ内で直接編集**、Discord 操作は文中のチップを選択して **既存 `DetailPanel`** で編集 |
| D8 | 構造 | **ProseMirror ドキュメント 1 本**。Section 階層は持たず `heading` ノードが見出しを担う。ブロックレベルの操作は `Branch` のみ |
| D9 | ループ | 見出しの「ここから再実行」で配下の `executedAt` / スキップ印をクリアする。周回数は既存 `Counter` ステップで数える |
| D10 | 実行意味論 | カーソルは advisory で、任意ステップを実行できる。本文ブロックは通過で `executedAt` を打つだけ (実行は no-op)。UI で「今ここ」を追従表示する |
| D11 | registry | 既存 registry を **完全共有**し、契約は変更しない。**新機能は新画面にのみ実装する** |
| D12 | 導線 | `scenarioData` の有無でバッジ判定。`/template/new` の隣に「シナリオ形式で作成」。ルートは `/template/$id/scenario`・`/session/$id/scenario` |
| D13 | CCFOLIA 連携 | **クリップボードへのコピーボタン**で行う |
| D14 | メタ情報 | `Template` に個別カラム 6 つ (人数の下限/上限・システム・時間の下限/上限・画像パス) + OPFS 画像 |
| D15 | 旧画面の凍結 | コードは変更しない。`/template/new` を新形式のみに変更し、**古い形式のデータがこれ以上増えないようにする**。既存テストは残し、VRT の追加のみ止める |
| D16 | セッション生成 | `scenarioData` を 3 本目として既存のコピー経路に追加する。セッション画面は **空でないほうを開く** |
| D17 | 投票 | リアクション集計を先、返信一覧を後。バックエンドに読み取り API を新設する |
| D18 | 配役 | 「ギルドメンバー一覧の取得」「ユーザー指定のロール付与」の 2 エンドポイントを追加する |
| D19 | 本文の入力 | 貼り付けが主体。段落・見出し・箇条書きは貼り付けで保たれる。`.txt` / `.md` の取り込みは小追加 |
| D20 | 本文の表現力 | **段落・見出し・箇条書き・太字・ハイライト・引用のみ**。シナリオを 3 本書き下ろすまで構造化ブロック (`Character` 等) を作らない |
| D21 | ダイス | 既存 `RandomSelect` / `ShuffleAssign` で足りるため専用ブロックは持たない |
| D22 | 回遊 | 目次パネル。全文が常に展開されておりブラウザの検索がそのまま効くため、折りたたみもアプリ内全文検索も持たない |
| D23 | リッチテキスト基盤 | **Tiptap (ProseMirror)**。自前 contentEditable は書かない |
| D24 | 操作の置き場所 | Discord 操作は**段落中のインラインアトム**。`Branch` だけはブロックレベル |
| D25 | データの持ち方 | `doc` (本文) と `steps` (操作の実体) を**分けて持つ**。`doc` には `stepId` の参照だけを置く |
| D26 | 移行 | `ScenarioData` の旧形式からは変換器で移す (D4 の「旧 `flowData` は変換しない」とは別判断) |

### D23 — 自前 contentEditable を書かない

必要なのは (a) 段落中に埋め込めるインライン要素、(b) 強調・ハイライト、(c) **日本語 IME 下で
壊れない編集**の 3 つ。(c) が自前 contentEditable の主要な破綻点で、composition 中の再レンダーと
キャレット復元は、本アプリの主題 (Discord 進行支援) と無関係なコードが最も厚くなる場所になる。

ProseMirror は inline atom + NodeView がそのまま (a) の形をしており、IME・undo・選択・
貼り付け正規化を既に解いている。さらに **schema による許可ノードのホワイトリスト**が
「ユーザ入力から任意のタグを持ち込ませない」を構造的に満たす。HTML を保存しないので、
そもそもサニタイズすべき対象が存在しない。

Lexical でも同じことはできるが inline decorator の実例が薄く記述量が増える。Tiptap は
React 用の NodeView が既製で、書く量が最も少ない。バージョンは固定・公開 7 日以上の
ルールに従って導入時に選ぶ (CLAUDE.md)。

### D25 — doc と steps を分ける

操作ステップの実体を ProseMirror の node attrs に丸ごと持たせる案は採らない。そうすると
実行時の `executedAt` の書き込みが doc の書き換えになり、**編集の undo 履歴と実行記録が
同じ木に乗る**。実行モードのために編集用トランザクションを触ることになり、
「実行意味論を新画面用に書き直さない」という本設計の前提が崩れる。

分けて持てば、doc から出現順に集めた `Step[]` がそのまま `toRunnerFlow` に渡り、
registry・`DetailPanel`・engine・`runnerStore` はいずれも無改造で動く。

孤児 (doc から参照が消えたのに `steps` に残ったステップ) は保存時に落とす。

### D6 / D20 — 型を先に切らない

`Character` に何のフィールドが要るかは、現時点では確定できない。システムによって「秘密」の
有無も HO の枚数も能力値の有無も変わる。推測で型を切ると次のシナリオで `extra: string` を
足すことになり、結局 `Text` に戻る。

したがって **実際にシナリオを 2〜3 本ふつうの本文として書き下ろし、繰り返し現れた形だけをブロック化する**。
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
  schema.ts              # ScenarioData = { version: 2, doc: JSONContent, steps: Step[] }
  document.ts            # doc ↔ Step[] のブリッジ (出現順の収集・孤児の除去)
  migrate.ts             # ScenarioData v1 → v2 の変換 (D26)
  filePaths.ts           # セッション作成時の添付パス書き換え (D16)
  autosave.tsx           # scenarioData の debounce 保存 (編集・実行で共有)
  outline.ts             # doc の heading から目次を組む (目次と現在地表示が共有)
  scrollToBlock.ts       # 見出し / 操作チップへのスクロール (目次とカーソル追従が共有)
  runner.ts              # 実行モード: steps を FlowData に包んで flow の runnerStore に載せる
  textTransfer.ts        # コピー (D13) と .txt/.md 取り込み (D19)
  editor/
    extensions.ts        # 許可するノード / マークの定義 (StarterKit + 下の 3 つ)
    StepNode.ts          # 文中の操作を表すインラインアトム (attrs: stepId)
    BranchNode.ts        # ブロックレベルの分岐 (アームの中身は DetailPanel で編集)
    HighlightMark.ts     # 見落とし防止のハイライト (D20)
  store/
    editorStore.ts       # 編集モード (テンプレート著作)
  components/
    ScenarioEditor.tsx   # 編集モードの 2 カラム + 目次 (store 初期化・自動保存)
    ScenarioRunner.tsx   # 実行モードの 3 カラム (store 初期化・自動保存)
    ScenarioDocument.tsx # 本文エディタ (Tiptap の EditorContent)
    StepChip.tsx         # 操作の NodeView。1 行サマリ + 選択で DetailPanel を開く
    Toolbar.tsx          # 見出し / 強調 / ハイライト / 操作の挿入
    TableOfContents.tsx  # heading から生成する目次 (D22)
    CopyButton.tsx       # クリップボードコピー (D13)
```

**置き換えて消えるもの**: `blockOps.ts`・`BlockList.tsx`・`BlockDocument.tsx`・
`RunnerBlockList.tsx`。フラットな `Step[]` に対する挿入・移動・複製は ProseMirror の
トランザクションが担うため、同じ操作を 2 系統持たない。`blockOps.sectionBlockIds`
(「ここから再実行」の範囲・D9) だけは doc の見出し階層から求める形で `outline.ts` へ移す。
`textTransfer` / `filePaths` / `autosave` / `runner` はそのまま残る。

実行モードは専用の store を持たない。`steps` をセクション 1 つの `FlowData` に包んで
(`runner.ts` の `toRunnerFlow`) 既存の `flow/store/runnerStore` に載せ、`useSessionRunner`・
`RunnerDetailPanel`・`RunnerFlagPanel`・`RunnerToolDock` をそのまま使う。実行意味論
(カーソル・連鎖・Branch のアーム再選択・記録保護) を書き直すと実装が二重化するため、
新画面が足すのはドキュメントの描画とループ (D9) だけにする。
セクションはこの包みの中にしか存在せず、UI には出ない (D8)。

---

## データモデル---

## データモデル

```ts
// scenario/schema.ts
export const ScenarioDataSchema = z.object({
  version: z.literal(2),
  // ProseMirror の JSON。中身の妥当性は Tiptap の schema が担保するため z では検証しない。
  doc: z.custom<JSONContent>(),
  // 文中から stepId で参照される操作の実体。doc の出現順に並ぶ (D25)。
  steps: z.array(z.lazy(() => StepSchema)),
});
```

- **操作 = 既存 `Step`** (D11)。新画面のために別の型を定義しない。
- `doc` の中の操作は `{ type: "step", attrs: { stepId } }` のインラインアトムで、
  **参照だけを持つ** (D25)。`Branch` は同じく `stepId` を持つブロックレベルノード。
- `steps` は doc を先頭から走査して得た出現順の配列。したがって
  **実行順 = 読む順**であり、順序を別に持たない。
- 保存時に doc から参照されない `stepId` を落とす (孤児の除去)。

### 本文が持てる要素 (D20)

| 種別 | 用途 |
|------|------|
| `paragraph` / `heading` (1〜3) / `bulletList` / `orderedList` / `blockquote` | 原文の構造 |
| `bold` / `highlight` | 見落とし防止の強調 (D20) |
| `step` (インラインアトム) | 文中の Discord 操作 (D24) |
| `branch` (ブロック) | 分岐 (D24 の例外) |

**専用の Callout ノードは作らない。** 「注意」「秘密情報」は `blockquote` + `highlight` で足りる。
リンク・テーブル・インライン画像も当面持たない (スコープ外を参照)。

Markdown パーサは持たない (D6)。行頭の `# ` `- ` や `**` は ProseMirror の入力ルールが
その場で変換するため、パーサを介さずに Markdown 風の打鍵だけが手に入る。

### 追加するステップ型

```ts
const TextStepSchema = StepBaseSchema.extend({
  type: z.literal("Text"),
  body: z.string().default(""),
});
```

本文が `doc` に移ったため、`Heading` ステップ型は持たない (見出しは `heading` ノード)。
`Text` は v1 データの受け皿および「本文なしのメモ的ステップ」として残す。

### 既存エンジンの再利用

`flow/engine/order.ts` と `flow/treeOps.ts` の `FlowData` 依存は入口だけで、中核の再帰
(`visit` の Branch 降下、`locateInSteps`、`collectInSteps`) は既に `Step[]` に対して動く。
`steps` をそのまま渡せるため、**engine には手を入れない**。

**Branch 降下ロジックを新画面用に書き直さないこと。** 実装が二重化してドリフトする。

`Text` は Discord 副作用を持たないが、`execute()` を「常に成功する no-op」として持つ。
こうすると通過が既存の実行経路 (`canRunStep` → `runChain` → `markStepExecuted`) にそのまま
乗り、本文専用の通過処理を engine に足さずに済む (D10)。

### v1 → v2 の変換 (D26)

D4 が旧 `flowData` の変換を拒んだのは、ステップリストとシナリオドキュメントで
「何を書くための道具か」が違い、機械変換の結果が使いものにならないため。
v1 → v2 はそれと異なり、同じ道具の中の表現形式の変更なので 1 対 1 に写せる。

| v1 のブロック | v2 |
|--------------|-----|
| `Text` | `paragraph` (空行区切りで複数段落に割る) |
| `Heading` | `heading` (level をそのまま) |
| その他のステップ | その位置に段落 1 つ + `step` インラインアトム、実体は `steps` へ |
| `Branch` | `branch` ブロックノード、実体は `steps` へ |

Dexie の次バージョンで `scenarioData` を読み替える。**`schema-migration` スキルを使うこと。**

---

## registry 契約の拡張---

## registry 契約の拡張 (D11)

既存 `StepRegistryEntry` は**変更しない**。文中のチップは既存の `summary()` を、
編集は既存の `DetailPanel` をそのまま使う。

- 文中の操作は 1 行サマリのチップとして描画し、選択すると **既存 `DetailPanel` が開く** (D7)。
  メッセージブロック編集や条件ツリーを本文の行内に押し込むと、React Flow を離れる原因となった
  コンテンツのはみ出しが再発する。
- 本文は registry ではなく ProseMirror が持つため、`InlineBody?` は registry から**削除する**。
- `Heading` ステップ型も削除する (見出しは `heading` ノード)。

---

## 編集モードと実行モード

| 観点 | 編集モード (テンプレート) | 実行モード (セッション) |
|------|--------------------------|------------------------|
| バッキング | `Template.scenarioData` | `GameSession.scenarioData` |
| 本文編集 | 自由 | 未実行の範囲のみ |
| カーソル | なし | advisory。任意の操作を実行・再実行・スキップ可 |
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

- **ユニット (最重要)**: `document.ts` (doc → 出現順 `Step[]`・孤児の除去)、`migrate.ts` の
  v1 → v2 変換、目次生成、ループの範囲リセット。いずれも純粋関数として TDD する。
- **VRT**: UI を伴うフェーズは Storybook ストーリーを追加し、そのスナップショットを受け入れ基準とする。
  カバー対象: 本文 (段落・見出し・箇条書き・強調・ハイライト)、文中の操作チップ (種別ごと)、
  DetailPanel、目次、実行状態 (実行済み / スキップ / カーソル)、Branch。
- **`verify` スキル**: 文字入力・**IME での日本語入力**・貼り付け・文中への操作挿入は静止画
  スナップショットで担保しきれないため、Playwright での実操作確認をフェーズ 2 / 3 の受け入れに
  含める。IME は D23 で最も壊れやすい箇所なので、ここは必ず実操作で見る。
- 全フェーズ共通: `bun run --bun test` · `typecheck` · `format` · `lint` · `bun run knip`

---

## フェーズマップ

各フェーズを #213 のサブ issue とする。順序は 1 → 2 → 3 →(4 と 5 は並行)。0 は独立。

| # | サブ issue | 内容 | 依存 |
|---|-----------|------|------|
| 0 | メタ情報 | `Template` に 4 カラム + OPFS カバー画像 + 一覧の絞り込み (#213-3) | なし・並行可 |
| 1 | 基盤 | Tiptap 導入、`ScenarioData` v2、`document.ts` のブリッジ、旧形式からの変換、Dexie バージョン追加、`InlineBody` / `Heading` 型の削除 | なし |
| 2 | 編集画面 | 本文エディタ、ツールバー、文中の操作チップ + DetailPanel、`Branch` ブロック、フラグパネル、目次 | 1 |
| 3 | 実行画面 | 読み取り専用の本文描画、チップからの実行 / スキップ / 再実行、カーソル追従、`autoAdvance`、「ここから再実行」、セッション生成でのコピーとパス変換 | 2 |
| 4 | 小物 | コピーボタン (#213-2)、`.txt`/`.md` 取り込み、メモ的ステップ (#213-6) の再確認 | 2 |
| 5 | バックエンド拡張 | 投票のリアクション集計 (#213-5)、配役の 2 エンドポイント (#213-4) | 3 |

フェーズ 0 は新画面に依存しない唯一の項目で、他が詰まったときに独立して進められる。
フェーズ 5 は唯一 `backend/` を触り、デプロイと API スキーマが絡むため最後に置く。

フェーズ 1〜3 は `frontend/src/scenario/` の既存実装を置き換える。
旧 2 系統 (React Flow・ステップリスト) には引き続き手を入れない (D5 / D15)。

---

## スコープ外---

## スコープ外

| 項目 | 理由 |
|------|------|
| プレイ履歴 (セッション側メタ) | セッションに必要なメタは性質が異なる (実施日・参加者・実所要時間)。テンプレートのメタを流用すると双方が半端になる |
| CCFOLIA 駒データ出力 | 「キャラクター」エンティティが存在せず、その定義から始まる (D20 も参照) |
| PDF 併置ビューア | 本文は再構成した成果物である、という前提と両立しない |
| 構造化ブロック (`Character` 等) | シナリオ 3 本をふつうの本文で書くまで作らない (D20) |
| テーブル・インライン画像・リンク | 本文の表現力を増やす前に、まず操作をインライン化した効果を測る (D20) |
| 共同編集 (Y.js 等) | 単一 GM が編集する前提。同期のためのバックエンドを持たない |
| Markdown の入出力 | 貼り付けと入力ルールで足りる。パーサを持たない (D6) |
| `docs/dev/node-system-architecture.md` の整理 | `DynamicValue` の解決仕様は新画面でも有効なので、ノード実装手順のみ削る。#182 Phase 5 の後 |

## 参照ファイル

| ファイル | 役割 |
|----------|------|
| `frontend/src/flow/schema.ts` | `Step` union の定義。`Text` もここにある |
| `frontend/src/flow/registry/index.ts` | 共有 registry (D11) |
| `frontend/src/flow/treeOps.ts` | Branch ネストへの純粋な操作。入口を共有する |
| `frontend/src/flow/engine/order.ts` | 実行順序と Branch 降下。入口を共有する |
| `frontend/src/flow/components/DetailPanel.tsx` | 操作ブロックの編集 UI (D7 で再利用) |
| `frontend/src/db/database.ts` | Dexie バージョン (フェーズ 0 / 1) |
| `frontend/src/components/CreateSession.tsx` | セッション生成時のコピー経路 (D16) |
| `backend/src/index.ts` | Discord REST プロキシ (フェーズ 5) |
| `docs/dev/step-list-editor-architecture.md` | 第 2 世代 UI。凍結対象だが registry 契約は有効 |
| `docs/dev/testing-strategy.md` | テストピラミッドと VRT |
