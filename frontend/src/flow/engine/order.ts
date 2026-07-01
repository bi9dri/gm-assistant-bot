import type { FlowData, Step } from "../schema";

// 実行順序の純粋な計算。cursor (推奨位置) はこの順序上を進む。
// **Branch は実行済み (executedBranchIds) の枝にだけ descend する**。未実行の Branch は
// リーフとして扱われ、実行して枝が確定してから初めてその枝の子ステップが順序に加わる。
// executedBranchIds は Branch step 自身が持つため、順序は flow だけの純関数になる。

const visit = (step: Step, out: Step[]): void => {
  out.push(step);
  if (step.type !== "Branch") return;
  const chosen = new Set(step.executedBranchIds ?? []);
  for (const arm of step.branches) {
    if (!chosen.has(arm.id)) continue;
    for (const child of arm.steps) visit(child, out);
  }
};

// セクション順・ステップ順の pre-order で、実行可能なステップを平坦化する。
export const runnableSteps = (flow: FlowData): Step[] => {
  const out: Step[] = [];
  for (const section of flow.sections) {
    for (const step of section.steps) visit(step, out);
  }
  return out;
};

export const firstRunnableId = (flow: FlowData): string | null =>
  runnableSteps(flow)[0]?.id ?? null;

// fromId の次に実行を推奨するステップ id。fromId が null なら先頭、末尾なら null。
// fromId が順序に存在しない (未選択の枝に入った等) 場合も null。
export const advanceCursor = (flow: FlowData, fromId: string | null): string | null => {
  const order = runnableSteps(flow);
  if (fromId === null) return order[0]?.id ?? null;
  const index = order.findIndex((step) => step.id === fromId);
  if (index < 0) return null;
  return order[index + 1]?.id ?? null;
};
