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
  schema: z.ZodType<S>;
  // tool = フラグ操作のみで Discord 呼び出しを伴わない (execute なし)。
  category: "action" | "tool" | "branch";
  // 「ステップ追加」時の初期値 (旧 addNode の switch を置き換える)。id は呼び出し側が採番する。
  defaults: () => Omit<S, "id">;
  // PURE。リスト 1 行の要約テキスト。レンダリング無しで unit-test する。
  summary: (step: S) => string;
  DetailPanel: ComponentType<DetailPanelProps<S>>;
  // execute は Phase 3 で追加 (tool は持たない)。
}

// 具体ステップ型の entry を union 型 (StepRegistryEntry<Step>) に格納するためのヘルパ。
// summary / DetailPanel の引数が反変になり Map に入れられない問題を 1 箇所に閉じ込める。
// ランタイムは type が一致する entry しか引かれないため安全。
export const defineStep = <S extends Step>(entry: StepRegistryEntry<S>): StepRegistryEntry =>
  entry as unknown as StepRegistryEntry;
