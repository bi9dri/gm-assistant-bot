import { create } from "zustand";

import type { Section, StepLocation } from "../treeOps";

import { generateId } from "../ids";
import { getEntry } from "../registry";
import { defaultFlowData, type FlowData, type Step } from "../schema";
import * as treeOps from "../treeOps";

// edit モード (テンプレート作成) の Zustand store。
// FlowData ツリーの変更は必ず treeOps の named helper を経由する (docs D4)。
// treeOps が produce で構造的共有を保つため、未変更の行は参照が変わらず memo 化が効く。

type GameFlags = Record<string, unknown>;

interface EditorState {
  flowData: FlowData;
  // D3: edit モードでは Template.gameFlags (セッション開始時の seed) を編集する。
  gameFlags: GameFlags;
  selectedStepId: string | null;
  initialized: boolean;
}

interface EditorActions {
  initialize: (flowData: FlowData, gameFlags: GameFlags) => void;
  reset: () => void;
  selectStep: (id: string | null) => void;
  // type (判別子) は patch で変更させない。Object.assign で discriminant を壊し
  // union 不変条件を破る事故を型レベルで防ぐ。
  updateStep: (id: string, patch: Omit<Partial<Step>, "type">) => void;
  addStep: (type: Step["type"], at: StepLocation) => void;
  removeStep: (id: string) => void;
  moveStep: (id: string, to: StepLocation) => void;
  addSection: (title: string, index?: number) => void;
  updateSection: (id: string, patch: Partial<Section>) => void;
  removeSection: (id: string) => void;
  moveSection: (id: string, toIndex: number) => void;
  setGameFlag: (key: string, value: unknown) => void;
  removeGameFlag: (key: string) => void;
}

type EditorStore = EditorState & EditorActions;

export const useEditorStore = create<EditorStore>()((set) => ({
  flowData: defaultFlowData,
  gameFlags: {},
  selectedStepId: null,
  initialized: false,

  initialize: (flowData, gameFlags) =>
    set({ flowData, gameFlags, selectedStepId: null, initialized: true }),
  reset: () =>
    set({ flowData: defaultFlowData, gameFlags: {}, selectedStepId: null, initialized: false }),

  selectStep: (id) => set({ selectedStepId: id }),

  updateStep: (id, patch) =>
    set((state) => ({
      flowData: treeOps.updateStepById(state.flowData, id, (step) => {
        Object.assign(step, patch);
      }),
    })),

  addStep: (type, at) => {
    const entry = getEntry(type);
    if (entry === undefined) return;
    const step = { ...entry.defaults(), id: generateId() } as Step;
    set((state) => ({
      flowData: treeOps.insertStep(state.flowData, at, step),
      selectedStepId: step.id,
    }));
  },

  removeStep: (id) =>
    set((state) => {
      const flowData = treeOps.removeStep(state.flowData, id);
      // 削除した step 自身だけでなく、その分岐枝に居た選択中の子 step も消えるため、
      // 「新ツリーに選択 id が残っているか」で判定して掃除する。
      return {
        flowData,
        selectedStepId:
          state.selectedStepId !== null &&
          treeOps.findStep(flowData, state.selectedStepId) === undefined
            ? null
            : state.selectedStepId,
      };
    }),

  moveStep: (id, to) => set((state) => ({ flowData: treeOps.moveStep(state.flowData, id, to) })),

  addSection: (title, index) => {
    const section: Section = { id: generateId(), title, memo: "", collapsed: false, steps: [] };
    set((state) => ({ flowData: treeOps.insertSection(state.flowData, section, index) }));
  },

  updateSection: (id, patch) =>
    set((state) => ({
      flowData: treeOps.updateSection(state.flowData, id, (section) => {
        Object.assign(section, patch);
      }),
    })),

  removeSection: (id) =>
    set((state) => {
      const flowData = treeOps.removeSection(state.flowData, id);
      // セクションごと消えた step が選択中なら掃除する。
      return {
        flowData,
        selectedStepId:
          state.selectedStepId !== null &&
          treeOps.findStep(flowData, state.selectedStepId) === undefined
            ? null
            : state.selectedStepId,
      };
    }),

  moveSection: (id, toIndex) =>
    set((state) => ({ flowData: treeOps.moveSection(state.flowData, id, toIndex) })),

  setGameFlag: (key, value) =>
    set((state) => ({ gameFlags: { ...state.gameFlags, [key]: value } })),

  removeGameFlag: (key) =>
    set((state) => {
      const next = { ...state.gameFlags };
      delete next[key];
      return { gameFlags: next };
    }),
}));
