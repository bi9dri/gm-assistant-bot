import type { JSONContent } from "@tiptap/core";
import { create } from "zustand";

import { generateId } from "@/flow/ids";
import { getEntry } from "@/flow/registry";
import type { Step } from "@/flow/schema";
import { updateStepIn } from "@/flow/treeOps";

import { collectStepIds, withDescendantIds } from "../document";
import { emptyDoc } from "../schema";

// シナリオ編集モード (テンプレート著作) の Zustand store。
// 本文 (doc) は ProseMirror が持つ木をそのまま受け取るだけで、この store は加工しない。
// 操作の実体 (steps) は doc と分けて持ち、実行記録が本文の undo 履歴に乗らないようにする
// (docs: scenario-editor-architecture D25)。

type GameFlags = Record<string, unknown>;

interface EditorState {
  doc: JSONContent;
  steps: Step[];
  // 編集モードでは Template.gameFlags (セッション開始時の seed) を編集する。
  gameFlags: GameFlags;
  selectedStepId: string | null;
  initialized: boolean;
}

interface EditorActions {
  initialize: (doc: JSONContent, steps: Step[], gameFlags: GameFlags) => void;
  setDoc: (doc: JSONContent) => void;
  selectStep: (id: string | null) => void;
  // type (判別子) は patch で変更させない (union 不変条件を型レベルで守る)。
  updateStep: (id: string, patch: Omit<Partial<Step>, "type">) => void;
  // 実体を作って id を返す。本文への挿入は呼び出し側が ProseMirror のトランザクションで行う
  // (doc の変更経路を 1 本に保つ)。
  createStep: (type: Step["type"]) => Step | undefined;
  setGameFlag: (key: string, value: unknown) => void;
  removeGameFlag: (key: string) => void;
}

type EditorStore = EditorState & EditorActions;

// registry の初期値から実体を 1 つ作る。Branch の枝に入れるステップは top-level の
// steps に載せない (枝の中身は Branch 実体の内側に持つ・D24) ため、生成だけを切り出す。
export const newStep = (type: Step["type"]): Step | undefined => {
  const entry = getEntry(type);
  return entry === undefined ? undefined : ({ ...entry.defaults(), id: generateId() } as Step);
};

export const useScenarioEditorStore = create<EditorStore>()((set) => ({
  doc: emptyDoc(),
  steps: [],
  gameFlags: {},
  selectedStepId: null,
  initialized: false,

  initialize: (doc, steps, gameFlags) =>
    set({ doc, steps, gameFlags, selectedStepId: null, initialized: true }),

  // 孤児 (本文から参照が消えた実体) はここでは落とさない。打鍵ごとに落とすと
  // 切り取り → 貼り付けの途中や undo で実体が失われる。除去は保存時に行う (D25)。
  // ただし選択だけは外す。本文から消えた操作を右カラムで編集し続けられると、その編集は
  // 保存時に孤児ごと捨てられ、書いたものが無言で消える。
  setDoc: (doc) =>
    set((state) => ({
      doc,
      selectedStepId:
        state.selectedStepId === null ||
        withDescendantIds(collectStepIds(doc), state.steps).includes(state.selectedStepId)
          ? state.selectedStepId
          : null,
    })),

  selectStep: (id) => set({ selectedStepId: id }),

  updateStep: (id, patch) =>
    set((state) => ({
      steps: updateStepIn(state.steps, id, (step) => {
        Object.assign(step, patch);
      }),
    })),

  createStep: (type) => {
    const step = newStep(type);
    if (step === undefined) return undefined;
    set((state) => ({ steps: [...state.steps, step], selectedStepId: step.id }));
    return step;
  },

  setGameFlag: (key, value) =>
    set((state) => ({ gameFlags: { ...state.gameFlags, [key]: value } })),

  removeGameFlag: (key) =>
    set((state) => {
      const next = { ...state.gameFlags };
      delete next[key];
      return { gameFlags: next };
    }),
}));
