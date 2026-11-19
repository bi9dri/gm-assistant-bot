import type { FlowData, Step } from "../schema";

const visit = (step: Step, out: Step[]): void => {
  out.push(step);
  if (step.type !== "Branch") return;
  const chosen = new Set(step.executedBranchIds ?? []);
  for (const arm of step.branches) {
    if (!chosen.has(arm.id)) continue;
    for (const child of arm.steps) visit(child, out);
  }
};

export const runnableStepsIn = (steps: Step[]): Step[] => {
  const out: Step[] = [];
  for (const step of steps) visit(step, out);
  return out;
};

export const runnableSteps = (flow: FlowData): Step[] =>
  flow.sections.flatMap((section) => runnableStepsIn(section.steps));

export const firstRunnableId = (flow: FlowData): string | null =>
  runnableSteps(flow)[0]?.id ?? null;

export const advanceCursor = (flow: FlowData, fromId: string | null): string | null => {
  const order = runnableSteps(flow);
  if (fromId === null) return order[0]?.id ?? null;
  const index = order.findIndex((step) => step.id === fromId);
  if (index < 0) return null;
  return order[index + 1]?.id ?? null;
};
