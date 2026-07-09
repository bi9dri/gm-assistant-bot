import { create } from "zustand";

import { advanceCursor, firstRunnableId, runnableSteps } from "../engine/order";
import { defaultFlowData, type FlowData, type Step } from "../schema";
import { findStep } from "../treeOps";
import * as treeOps from "../treeOps";

// execute モード (セッション実行) の Zustand store。edit モードの editorStore に対して
// cursor (推奨位置) と実行状態を足したもの (docs D4)。ツリーの変更は必ず treeOps 経由。
// - cursor は advisory: 任意のステップを run / re-run / skip できる。
// - in-session editing: executedAt を持つ (実行済み) ステップは read-only。未実行のみ編集可。
// 実際の Discord 実行・永続化は useSessionRunner フックが engine を介して行い、この store は
// 純粋な UI/ツリー状態だけを持つ (unit-test 可能)。

// ライブなゲームフラグは string 値 (evaluateCondition / DynamicValue が string 前提)。
type GameFlags = Record<string, string>;

interface RunnerState {
  flowData: FlowData;
  gameFlags: GameFlags;
  // 次に実行を推奨するステップ id (advanceCursor が算出)。
  cursorId: string | null;
  selectedStepId: string | null;
  // スキップされたステップ id (実行はしないが飛ばしたことを UI に示す。schema には持たない)。
  skippedStepIds: string[];
  // 現在実行中のステップ id (連鎖の先頭)。ボタンの無効化・スピナー表示に使う。
  runningStepId: string | null;
  initialized: boolean;
}

interface RunnerActions {
  initialize: (flowData: FlowData, gameFlags: GameFlags) => void;
  reset: () => void;
  selectStep: (id: string | null) => void;
  setCursor: (id: string | null) => void;
  // ステップ実行の記録: executedAt (Branch は executedBranchIds も) を刻み、cursor を次へ進める。
  markStepExecuted: (id: string, patch: { executedBranchIds?: string[] }) => void;
  // スキップ: skippedStepIds に加え cursor を次へ進める (実行はしない)。
  skipStep: (id: string) => void;
  // in-session editing: 未実行ステップのみ編集可。type (判別子) は変更させない。
  updateStep: (id: string, patch: Omit<Partial<Step>, "type">) => void;
  setFlag: (key: string, value: string) => void;
  setFlags: (patch: GameFlags) => void;
  removeFlag: (key: string) => void;
  setRunningStep: (id: string | null) => void;
  toggleSection: (id: string) => void;
}

type RunnerStore = RunnerState & RunnerActions;

// cursor は「推奨位置」を実行したときだけ前進させる。任意ステップの re-run/実行で
// GM の現在位置を巻き戻さない。ただし Branch の選び直しで cursor が閉じた枝の中に
// 取り残された (実行順序から消えた) 場合は、実行した Branch の直後 = 新しい枝の
// 先頭に置き直す。
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
          // 再実行に備え、以前 descend した枝の子孫の実行痕跡を先にリセットしてから枝を確定する。
          treeOps.clearDescendantExecution(step);
          if (patch.executedBranchIds !== undefined)
            step.executedBranchIds = patch.executedBranchIds;
        }
        step.executedAt = new Date();
      });
      // Branch の (再) 実行では clearDescendantExecution で子孫の実行痕跡が消えるので、
      // skip 痕跡も同じ範囲で消して整合させる。
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
      // cursor 位置のステップをスキップしたときだけ前進させる。
      cursorId: state.cursorId === id ? advanceCursor(state.flowData, id) : state.cursorId,
    })),

  updateStep: (id, patch) =>
    set((state) => {
      const target = findStep(state.flowData, id);
      // 実行済みステップは記録保護 (read-only)。編集を無視する。
      if (target === undefined || target.executedAt !== undefined) return {};
      return {
        flowData: treeOps.updateStepById(state.flowData, id, (step) => {
          Object.assign(step, patch);
        }),
      };
    }),

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
