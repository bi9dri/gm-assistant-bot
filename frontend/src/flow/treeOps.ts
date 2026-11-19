import { produce } from "immer";

import { generateId } from "./ids";
import type { FlowData, Step } from "./schema";

export type Section = FlowData["sections"][number];

export type StepContainer =
  | { kind: "section"; sectionId: string }
  | { kind: "branchArm"; branchStepId: string; armId: string };

export interface StepLocation {
  container: StepContainer;
  index: number;
}

interface StepLocator {
  parentSteps: Step[];
  index: number;
  step: Step;
}

const locateInSteps = (steps: Step[], id: string): StepLocator | undefined => {
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    if (step === undefined) continue;
    if (step.id === id) return { parentSteps: steps, index, step };
    if (step.type === "Branch") {
      for (const arm of step.branches) {
        const located = locateInSteps(arm.steps, id);
        if (located !== undefined) return located;
      }
    }
  }
  return undefined;
};

const locateStep = (flow: FlowData, id: string): StepLocator | undefined => {
  for (const section of flow.sections) {
    const located = locateInSteps(section.steps, id);
    if (located !== undefined) return located;
  }
  return undefined;
};

export const findStep = (flow: FlowData, id: string): Step | undefined =>
  locateStep(flow, id)?.step;

export const findStepIn = (steps: Step[], id: string): Step | undefined =>
  locateInSteps(steps, id)?.step;

export const updateStepIn = (steps: Step[], id: string, patch: (step: Step) => void): Step[] =>
  produce(steps, (draft) => {
    const step = findStepIn(draft as Step[], id);
    if (step !== undefined) patch(step);
  });

export const findSection = (flow: FlowData, id: string): Section | undefined =>
  flow.sections.find((section) => section.id === id);

const resolveContainerSteps = (flow: FlowData, container: StepContainer): Step[] | undefined => {
  if (container.kind === "section") {
    return flow.sections.find((section) => section.id === container.sectionId)?.steps;
  }
  const branch = findStep(flow, container.branchStepId);
  if (branch === undefined || branch.type !== "Branch") return undefined;
  return branch.branches.find((arm) => arm.id === container.armId)?.steps;
};

const clampIndex = (index: number, length: number): number => Math.max(0, Math.min(index, length));

const collectBranchIds = (step: Step, acc: Set<string>): void => {
  if (step.type !== "Branch") return;
  acc.add(step.id);
  for (const arm of step.branches) {
    for (const child of arm.steps) collectBranchIds(child, acc);
  }
};

const isSelfOrDescendantContainer = (moved: Step, container: StepContainer): boolean => {
  if (container.kind !== "branchArm") return false;
  const ids = new Set<string>();
  collectBranchIds(moved, ids);
  return ids.has(container.branchStepId);
};

export const clearDescendantExecution = (step: Step): void => {
  if (step.type !== "Branch") return;
  for (const arm of step.branches) {
    for (const child of arm.steps) {
      child.executedAt = undefined;
      if (child.type === "Branch") {
        child.executedBranchIds = undefined;
        clearDescendantExecution(child);
      }
    }
  }
};

export const collectDescendantStepIds = (step: Step): string[] => {
  if (step.type !== "Branch") return [];
  const out: string[] = [];
  for (const arm of step.branches) {
    for (const child of arm.steps) {
      out.push(child.id, ...collectDescendantStepIds(child));
    }
  }
  return out;
};

const collectInSteps = (steps: Step[], out: Step[]): void => {
  for (const step of steps) {
    out.push(step);
    if (step.type !== "Branch") continue;
    for (const arm of step.branches) collectInSteps(arm.steps, out);
  }
};

export const collectSteps = (flow: FlowData): Step[] => {
  const out: Step[] = [];
  for (const section of flow.sections) collectInSteps(section.steps, out);
  return out;
};

export const clearExecutionByIds = (flow: FlowData, ids: Set<string>): FlowData =>
  produce(flow, (draft) => {
    for (const step of collectSteps(draft as FlowData)) {
      if (!ids.has(step.id)) continue;
      step.executedAt = undefined;
      if (step.type === "Branch") step.executedBranchIds = undefined;
    }
  });

export const updateStepById = (flow: FlowData, id: string, patch: (step: Step) => void): FlowData =>
  produce(flow, (draft) => {
    const step = findStep(draft as FlowData, id);
    if (step !== undefined) patch(step);
  });

export const insertStep = (flow: FlowData, at: StepLocation, step: Step): FlowData =>
  produce(flow, (draft) => {
    const target = resolveContainerSteps(draft as FlowData, at.container);
    if (target === undefined) return;
    target.splice(clampIndex(at.index, target.length), 0, step);
  });

export const removeStep = (flow: FlowData, id: string): FlowData =>
  produce(flow, (draft) => {
    const located = locateStep(draft as FlowData, id);
    if (located !== undefined) located.parentSteps.splice(located.index, 1);
  });

const reassignIds = (step: Step): void => {
  step.id = generateId();
  step.executedAt = undefined;
  if (step.type !== "Branch") return;
  step.executedBranchIds = undefined;
  for (const arm of step.branches) {
    arm.id = generateId();
    for (const child of arm.steps) reassignIds(child);
  }
};

export const duplicateStep = (
  flow: FlowData,
  id: string,
): { flowData: FlowData; newStep: Step | undefined } => {
  const located = locateStep(flow, id);
  if (located === undefined) return { flowData: flow, newStep: undefined };
  const newStep = structuredClone(located.step);
  reassignIds(newStep);
  const flowData = produce(flow, (draft) => {
    const draftLocated = locateStep(draft as FlowData, id);
    draftLocated?.parentSteps.splice(draftLocated.index + 1, 0, newStep);
  });
  return { flowData, newStep };
};

export const moveStep = (flow: FlowData, id: string, to: StepLocation): FlowData =>
  produce(flow, (draft) => {
    const located = locateStep(draft as FlowData, id);
    if (located === undefined) return;
    if (isSelfOrDescendantContainer(located.step, to.container)) return;
    const target = resolveContainerSteps(draft as FlowData, to.container);
    if (target === undefined) return;
    const [moved] = located.parentSteps.splice(located.index, 1);
    if (moved === undefined) return;
    target.splice(clampIndex(to.index, target.length), 0, moved);
  });

export const insertSection = (flow: FlowData, section: Section, index?: number): FlowData =>
  produce(flow, (draft) => {
    const { sections } = draft as FlowData;
    const at = index === undefined ? sections.length : clampIndex(index, sections.length);
    sections.splice(at, 0, section);
  });

export const removeSection = (flow: FlowData, id: string): FlowData =>
  produce(flow, (draft) => {
    const { sections } = draft as FlowData;
    const index = sections.findIndex((section) => section.id === id);
    if (index >= 0) sections.splice(index, 1);
  });

export const updateSection = (
  flow: FlowData,
  id: string,
  patch: (section: Section) => void,
): FlowData =>
  produce(flow, (draft) => {
    const section = findSection(draft as FlowData, id);
    if (section !== undefined) patch(section);
  });

export const moveSection = (flow: FlowData, id: string, toIndex: number): FlowData =>
  produce(flow, (draft) => {
    const { sections } = draft as FlowData;
    const from = sections.findIndex((section) => section.id === id);
    if (from < 0) return;
    const [moved] = sections.splice(from, 1);
    if (moved === undefined) return;
    sections.splice(clampIndex(toIndex, sections.length), 0, moved);
  });
