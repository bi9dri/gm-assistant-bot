import { create } from "zustand";

import { advanceCursor, firstRunnableId, runnableSteps } from "../engine/order";
import {
  defaultFlowData,
  type FlowData,
  type KanbanStep,
  type RecordCombinationStep,
  type Step,
} from "../schema";
import { findStep } from "../treeOps";
import * as treeOps from "../treeOps";

type GameFlags = Record<string, string>;

type ToolStatePatch = Partial<
  Pick<KanbanStep, "cardPlacements"> & Pick<RecordCombinationStep, "recordedPairs">
>;

interface RunnerState {
  flowData: FlowData;
  gameFlags: GameFlags;
  cursorId: string | null;
  selectedStepId: string | null;
  skippedStepIds: string[];
  runningStepId: string | null;
  initialized: boolean;
}

interface RunnerActions {
  initialize: (flowData: FlowData, gameFlags: GameFlags) => void;
  reset: () => void;
  selectStep: (id: string | null) => void;
  setCursor: (id: string | null) => void;
  markStepExecuted: (id: string, patch: { executedBranchIds?: string[] }) => void;
  skipStep: (id: string) => void;
  clearExecution: (ids: string[]) => void;
  updateStep: (id: string, patch: Omit<Partial<Step>, "type">) => void;
  updateToolState: (id: string, patch: ToolStatePatch) => void;
  setFlag: (key: string, value: string) => void;
  setFlags: (patch: GameFlags) => void;
  removeFlag: (key: string) => void;
  setRunningStep: (id: string | null) => void;
  toggleSection: (id: string) => void;
}

type RunnerStore = RunnerState & RunnerActions;

const nextCursorId = (
  cursorId: string | null,
  flowData: FlowData,
  executedId: string,
): string | null => {
  if (cursorId === executedId) return advanceCursor(flowData, executedId);
  if (cursorId !== null && !runnableSteps(flowData).some((step) => step.id === cursorId)) {
    return advanceCursor(flowData, executedId);
  }
  return cursorId;
};

const initialState: RunnerState = {
  flowData: defaultFlowData,
  gameFlags: {},
  cursorId: null,
  selectedStepId: null,
  skippedStepIds: [],
  runningStepId: null,
  initialized: false,
};

export const useRunnerStore = create<RunnerStore>()((set) => ({
  ...initialState,

  initialize: (flowData, gameFlags) =>
    set({
      ...initialState,
      flowData,
      gameFlags,
      cursorId: firstRunnableId(flowData),
      initialized: true,
    }),

  reset: () => set({ ...initialState }),

  selectStep: (id) => set({ selectedStepId: id }),

  setCursor: (id) => set({ cursorId: id }),

  markStepExecuted: (id, patch) =>
    set((state) => {
      const flowData = treeOps.updateStepById(state.flowData, id, (step) => {
        if (step.type === "Branch") {
          treeOps.clearDescendantExecution(step);
          if (patch.executedBranchIds !== undefined)
            step.executedBranchIds = patch.executedBranchIds;
        }
        step.executedAt = new Date();
      });
      const target = findStep(flowData, id);
      const cleared = new Set([
        id,
        ...(target === undefined ? [] : treeOps.collectDescendantStepIds(target)),
      ]);
      return {
        flowData,
        skippedStepIds: state.skippedStepIds.filter((skipped) => !cleared.has(skipped)),
        cursorId: nextCursorId(state.cursorId, flowData, id),
      };
    }),

  skipStep: (id) =>
    set((state) => ({
      skippedStepIds: state.skippedStepIds.includes(id)
        ? state.skippedStepIds
        : [...state.skippedStepIds, id],
      cursorId: state.cursorId === id ? advanceCursor(state.flowData, id) : state.cursorId,
    })),

  clearExecution: (ids) =>
    set((state) => {
      const cleared = new Set(ids);
      return {
        flowData: treeOps.clearExecutionByIds(state.flowData, cleared),
        skippedStepIds: state.skippedStepIds.filter((skipped) => !cleared.has(skipped)),
      };
    }),

  updateStep: (id, patch) =>
    set((state) => {
      const target = findStep(state.flowData, id);
      if (target === undefined || target.executedAt !== undefined) return {};
      return {
        flowData: treeOps.updateStepById(state.flowData, id, (step) => {
          Object.assign(step, patch);
        }),
      };
    }),

  updateToolState: (id, patch) =>
    set((state) => ({
      flowData: treeOps.updateStepById(state.flowData, id, (step) => {
        Object.assign(step, patch);
      }),
    })),

  setFlag: (key, value) => set((state) => ({ gameFlags: { ...state.gameFlags, [key]: value } })),

  setFlags: (patch) => set((state) => ({ gameFlags: { ...state.gameFlags, ...patch } })),

  removeFlag: (key) =>
    set((state) => {
      const next = { ...state.gameFlags };
      delete next[key];
      return { gameFlags: next };
    }),

  setRunningStep: (id) => set({ runningStepId: id }),

  toggleSection: (id) =>
    set((state) => ({
      flowData: treeOps.updateSection(state.flowData, id, (section) => {
        section.collapsed = !section.collapsed;
      }),
    })),
}));
