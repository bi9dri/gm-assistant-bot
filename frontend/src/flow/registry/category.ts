import type { StepRegistryEntry } from "./types";

// ステップカテゴリの表示ラベルと badge 色。edit の StepList と execute の RunnerStepList で共有する。
export const CATEGORY_LABEL: Record<StepRegistryEntry["category"], string> = {
  action: "操作",
  tool: "ツール",
  branch: "分岐",
};

export const CATEGORY_CLASS: Record<StepRegistryEntry["category"], string> = {
  action: "badge-primary",
  tool: "badge-secondary",
  branch: "badge-accent",
};
