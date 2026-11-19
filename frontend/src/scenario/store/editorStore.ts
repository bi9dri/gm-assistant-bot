import type { JSONContent } from "@tiptap/core";
import { create } from "zustand";

import { generateId } from "@/flow/ids";
import { getEntry } from "@/flow/registry";
import type { Step } from "@/flow/schema";
import { updateStepIn } from "@/flow/treeOps";

import { collectStepIds, withDescendantIds } from "../document";
import { emptyDoc } from "../schema";

type GameFlags = Record<string, unknown>;

interface EditorState {
  doc: JSONContent;
  steps: Step[];
  gameFlags: GameFlags;
  selectedStepId: string | null;
  initialized: boolean;
}

interface EditorActions {
  initialize: (doc: JSONContent, steps: Step[], gameFlags: GameFlags) => void;
  setDoc: (doc: JSONContent) => void;
  selectStep: (id: string | null) => void;
  updateStep: (id: string, patch: Omit<Partial<Step>, "type">) => void;
  createStep: (type: Step["type"]) => Step | undefined;
  setGameFlag: (key: string, value: unknown) => void;
  removeGameFlag: (key: string) => void;
}

type EditorStore = EditorState & EditorActions;

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
