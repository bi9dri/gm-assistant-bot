import type { FlowData, Step } from "../schema";
import { findStep } from "../treeOps";
import { advanceCursor } from "./order";
import type { ExecuteResult } from "./types";

export interface StepRunner {
  getFlow(): FlowData;
  runOne(stepId: string): Promise<ExecuteResult>;
  canAutoRun(step: Step): boolean;
}

export const runChain = async (runner: StepRunner, startId: string): Promise<ExecuteResult[]> => {
  const results: ExecuteResult[] = [];
  let currentId: string | null = startId;
  let isStart = true;

  while (currentId !== null) {
    const step = findStep(runner.getFlow(), currentId);
    if (step === undefined) break;

    if (!isStart && (step.executedAt !== undefined || !runner.canAutoRun(step))) break;

    const result = await runner.runOne(currentId);
    results.push(result);
    isStart = false;

    if (result.status !== "success" || !step.autoAdvance) break;

    currentId = advanceCursor(runner.getFlow(), currentId);
  }

  return results;
};
