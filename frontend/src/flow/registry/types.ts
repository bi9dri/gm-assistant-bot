import type { ComponentType } from "react";
import type { z } from "zod";

import type { Step } from "../schema";

// DetailPanel は「dumb な controlled component」: step と onChange(patch) のみを受け取り、
// store には触れない (host 側が onChange を treeOps.updateStepById に配線する)。
export interface DetailPanelProps<S extends Step = Step> {
  step: S;
  onChange: (patch: Partial<S>) => void;
}

// ステップタイプ 1 つ分の登録エントリ (docs: step-list-editor-architecture D1)。
// list / detail panel / runner はこのマップを総当たりするだけで、step.type で switch しない。
export interface StepRegistryEntry<S extends Step = Step> {
  type: S["type"];
  // 構造のみを検証する per-type schema。Branch の cross-field 制約 (select 枝は条件不可・
  // デフォルト枝は末尾1つ) は集約 StepSchema.superRefine 側にあり、ここには含まれない。
  // Phase 3 で単一ステップ検証に使う際はこの差異に注意。
  schema: z.ZodType<S>;
  // tool = フラグ操作や手動ボード操作など、Discord 呼び出しを伴わない GM 操作系。
  category: "action" | "tool" | "branch";
  // 「ステップ追加」時の初期値 (旧 addNode の switch を置き換える)。id は呼び出し側が採番する。
  defaults: () => Omit<S, "id">;
  // PURE。リスト 1 行の要約テキスト。レンダリング無しで unit-test する。
  summary: (step: S) => string;
  DetailPanel: ComponentType<DetailPanelProps<S>>;
  // execute 関数 (自動 Discord 実行) は Phase 3 で追加。tool/branch は持たない (GM 手動操作のみ)。
}

// 具体ステップ型の entry を union 型 (StepRegistryEntry<Step>) に格納するためのヘルパ。
// summary / DetailPanel の引数が反変になり Map に入れられない問題を、メソッド単位の
// キャストに閉じ込める (type/schema/category/defaults は正直な型のまま)。
// ランタイムは type が一致する entry しか引かれないため安全。
export const defineStep = <S extends Step>(entry: StepRegistryEntry<S>): StepRegistryEntry => ({
  ...entry,
  summary: (step) => entry.summary(step as S),
  // React component は反変のため unknown 経由が必要。summary の引数キャストと違いここは
  // 局所化止まり (whole-object の as unknown as は回避)。
  DetailPanel: entry.DetailPanel as unknown as ComponentType<DetailPanelProps>,
});
