import { produce } from "immer";

import type { FlowData, Step } from "./schema";

// FlowData のツリー (Section[] > Step[]、Branch は branches[].steps に再帰) を
// 純粋に変換するヘルパ群。**ツリーが再帰的であることを知るのはこのファイルだけ**で、
// store / コンポーネントは名前付きヘルパを呼ぶだけにする (docs: step-list-editor-architecture D4)。
// すべて produce ベースで、未変更のノードは参照を保つ (memo 化された行が再レンダーを免れる)。

export type Section = FlowData["sections"][number];

// ステップが属しうるコンテナ。セクション直下か、分岐ステップの枝 (arm) の直下。
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

// 移動先コンテナが移動対象ステップ自身またはその子孫の分岐枝なら true。
// 自分自身の内側へ移動する循環を防ぐ。
const isSelfOrDescendantContainer = (moved: Step, container: StepContainer): boolean => {
  if (container.kind !== "branchArm") return false;
  const ids = new Set<string>();
  collectBranchIds(moved, ids);
  return ids.has(container.branchStepId);
};

// Branch の全枝の子孫ステップの実行痕跡 (executedAt / 入れ子 Branch の executedBranchIds) を消す。
// Branch を再実行する際、以前 descend した (今回は選ばれない) 枝の子が実行済みのまま孤立する
// のを防ぐ。draft を in-place で書き換える前提で updateStepById の produce 内から呼ぶ。
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

// Branch の全枝の子孫ステップ id を集める (入れ子 Branch にも再帰)。Branch 以外は空。
// clearDescendantExecution で実行痕跡が消える範囲と一致させ、store 側の skip 痕跡の
// リセットに使う。
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

// dnd-kit の arrayMove と同じ意味論: 対象を取り除いた後の配列に to.index で挿入する。
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
