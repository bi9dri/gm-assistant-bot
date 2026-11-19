import type { StepRegistryEntry } from "./types";

export const CATEGORY_LABEL: Record<StepRegistryEntry["category"], string> = {
  action: "操作",
  tool: "ツール",
  branch: "分岐",
  text: "本文",
};

export const CATEGORY_CLASS: Record<StepRegistryEntry["category"], string> = {
  action: "badge-primary",
  tool: "badge-secondary",
  branch: "badge-accent",
  text: "badge-ghost",
};
