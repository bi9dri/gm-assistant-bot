import type { Step } from "../schema";

import { getEntry } from "../registry";

// GM 入力なしに実行できるステップか。execute() を持ち、かつ select 分岐でないこと
// (select は枝選択が必要)。tool は execute() を持たないため false。
// runner の [実行] ボタン表示 (canRunDirectly) と、連鎖の自動実行可否 (canAutoRun) の共通判定。
export const canRunStep = (step: Step): boolean => {
  if (getEntry(step.type)?.execute === undefined) return false;
  if (step.type === "Branch" && step.mode === "select") return false;
  return true;
};
