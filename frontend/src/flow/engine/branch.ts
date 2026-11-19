import { evaluateConditionNode } from "@/components/Node/utils/evaluateCondition";

import type { BranchStep } from "../schema";

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
