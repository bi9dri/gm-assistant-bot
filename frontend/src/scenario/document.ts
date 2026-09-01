import type { JSONContent } from "@tiptap/core";

import type { Step } from "@/flow/schema";
import { collectDescendantStepIds, findStepIn } from "@/flow/treeOps";

import { BRANCH_NODE_NAME, STEP_NODE_NAME } from "./schema";

// doc (本文) と steps (操作の実体) を繋ぐブリッジ (docs: scenario-editor-architecture D25)。
// **実行順 = 読む順**なので、順序は doc の走査だけから決まり、steps は順序を持たない。

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

// 文中に現れる stepId を出現順に集める。
export const collectStepIds = (doc: JSONContent): string[] => {
  const out: string[] = [];
  walk(doc, out);
  return out;
};

// doc の出現順に並べ、参照が消えたステップ (孤児) を落とす。保存時にこれを通す。
// チップごと本文をコピーすると同じ stepId のノードが 2 つできるため、実体は先頭の
// 1 つだけを採る (id が重複した Step 列は engine の id 検索を壊す)。
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

// 与えた id 群と、その Branch アームに入れ子になっている子孫の id。文中に現れるのは
// Branch 自身だけで、アームの中身は Branch step の内側にあるため (D24 の例外)、
// 「この範囲のステップ」を id 集合で扱う側はここを通す。
export const withDescendantIds = (ids: string[], steps: Step[]): string[] =>
  ids.flatMap((id) => {
    const step = findStepIn(steps, id);
    return step === undefined ? [id] : [id, ...collectDescendantStepIds(step)];
  });
