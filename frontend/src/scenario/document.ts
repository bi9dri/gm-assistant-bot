import type { JSONContent } from "@tiptap/core";

import type { Step } from "@/flow/schema";
import { collectDescendantStepIds, findStepIn } from "@/flow/treeOps";

import { BRANCH_NODE_NAME, STEP_NODE_NAME } from "./schema";

const isStepNode = (node: JSONContent): boolean =>
  node.type === STEP_NODE_NAME || node.type === BRANCH_NODE_NAME;

const walk = (node: JSONContent, out: string[]): void => {
  if (isStepNode(node)) {
    const stepId: unknown = node.attrs?.stepId;
    if (typeof stepId === "string") out.push(stepId);
    return;
  }
  for (const child of node.content ?? []) walk(child, out);
};

export const collectStepIds = (doc: JSONContent): string[] => {
  const out: string[] = [];
  walk(doc, out);
  return out;
};

export const orderedSteps = (doc: JSONContent, steps: Step[]): Step[] => {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const seen = new Set<string>();
  return collectStepIds(doc).flatMap((id) => {
    const step = byId.get(id);
    if (step === undefined || seen.has(id)) return [];
    seen.add(id);
    return [step];
  });
};

export const withDescendantIds = (ids: string[], steps: Step[]): string[] =>
  ids.flatMap((id) => {
    const step = findStepIn(steps, id);
    return step === undefined ? [id] : [id, ...collectDescendantStepIds(step)];
  });
