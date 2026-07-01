import { evaluateConditionNode } from "@/components/Node/utils/evaluateCondition";

import type { BranchStep } from "../schema";

// auto モードの Branch で descend する枝 (arm) id を決める純関数。
// 条件付き枝 = 条件ツリーで評価、条件なし枝 = デフォルト (else)。schema により
// デフォルト枝は末尾に 1 つだけ許される。
// - matchMode "first": 上から順に最初にマッチした枝 (デフォルトに到達すればそれ)。
// - matchMode "all": 条件にマッチした全枝を上から順に。1 つもマッチしなければデフォルト。
export const selectAutoArms = (step: BranchStep, flags: Record<string, string>): string[] => {
  if (step.matchMode === "all") {
    const matched = step.branches
      .filter((arm) => arm.condition !== undefined && evaluateConditionNode(arm.condition, flags))
      .map((arm) => arm.id);
    if (matched.length > 0) return matched;
    const defaultArm = step.branches.find((arm) => arm.condition === undefined);
    return defaultArm ? [defaultArm.id] : [];
  }

  for (const arm of step.branches) {
    if (arm.condition === undefined) return [arm.id];
    if (evaluateConditionNode(arm.condition, flags)) return [arm.id];
  }
  return [];
};
