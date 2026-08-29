import { create } from "zustand";

import { generateId } from "@/flow/ids";
import { getEntry } from "@/flow/registry";
import { TextEntry } from "@/flow/registry/Text";
import type { HeadingStep, Step } from "@/flow/schema";
import { findStepIn } from "@/flow/treeOps";

import * as blockOps from "../blockOps";
import type { BlockLocation } from "../blockOps";

// シナリオ編集モード (テンプレート著作) の Zustand store。
// ブロック列の変更は必ず blockOps の named helper を経由する
// (構造的共有が保たれ、未変更のブロック行が再レンダーを免れる)。

type GameFlags = Record<string, unknown>;

interface EditorState {
  blocks: Step[];
  // 編集モードでは Template.gameFlags (セッション開始時の seed) を編集する。
  gameFlags: GameFlags;
  selectedBlockId: string | null;
  initialized: boolean;
}

interface EditorActions {
  initialize: (blocks: Step[], gameFlags: GameFlags) => void;
  selectBlock: (id: string | null) => void;
  // type (判別子) は patch で変更させない (union 不変条件を型レベルで守る)。
  updateBlock: (id: string, patch: Omit<Partial<Step>, "type">) => void;
  addBlock: (type: Step["type"], at: BlockLocation) => void;
  // 取り込んだテキストを本文ブロック列として流し込む (docs: scenario-editor-architecture D19)。
  insertTextBlocks: (bodies: string[], at: BlockLocation) => void;
  duplicateBlock: (id: string) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, to: BlockLocation) => void;
  // ドラッグキャンセル時に、以前の immutable スナップショットへ丸ごと差し戻す。
  restoreBlocks: (blocks: Step[]) => void;
  setGameFlag: (key: string, value: unknown) => void;
  removeGameFlag: (key: string) => void;
}

type EditorStore = EditorState & EditorActions;

// 挿入位置を含む見出しが畳まれていると、追加したブロックが <details> の中に隠れて
// 「押しても何も起きない」ように見える。直前の見出しを開いて見えるようにする。
const openEnclosingHeading = (blocks: Step[], at: BlockLocation): Step[] => {
  if (at.container.kind !== "root") return blocks;
  for (let index = Math.min(at.index, blocks.length - 1) - 1; index >= 0; index--) {
    const block = blocks[index];
    if (block?.type !== "Heading") continue;
    if (!block.collapsed) return blocks;
    const patch: Partial<HeadingStep> = { collapsed: false };
    return blockOps.updateBlockById(blocks, block.id, (target) => {
      Object.assign(target, patch);
    });
  }
  return blocks;
};

// 削除された結果として選択中ブロックが消えたら選択を外す。
const keepSelection = (blocks: Step[], selectedBlockId: string | null): string | null =>
  selectedBlockId !== null && findStepIn(blocks, selectedBlockId) === undefined
    ? null
    : selectedBlockId;

export const useScenarioEditorStore = create<EditorStore>()((set) => ({
  blocks: [],
  gameFlags: {},
  selectedBlockId: null,
  initialized: false,

  initialize: (blocks, gameFlags) =>
    set({ blocks, gameFlags, selectedBlockId: null, initialized: true }),

  selectBlock: (id) => set({ selectedBlockId: id }),

  updateBlock: (id, patch) =>
    set((state) => ({
      blocks: blockOps.updateBlockById(state.blocks, id, (block) => {
        Object.assign(block, patch);
      }),
    })),

  addBlock: (type, at) => {
    const entry = getEntry(type);
    if (entry === undefined) return;
    const block = { ...entry.defaults(), id: generateId() } as Step;
    set((state) => ({
      blocks: openEnclosingHeading(blockOps.insertBlock(state.blocks, at, block), at),
      selectedBlockId: block.id,
    }));
  },

  insertTextBlocks: (bodies, at) =>
    set((state) => {
      const inserted = bodies.reduce(
        (blocks, body, offset) =>
          blockOps.insertBlock(blocks, { container: at.container, index: at.index + offset }, {
            ...TextEntry.defaults(),
            id: generateId(),
            body,
          } as Step),
        state.blocks,
      );
      return { blocks: openEnclosingHeading(inserted, at) };
    }),

  duplicateBlock: (id) =>
    set((state) => {
      const { blocks, newBlock } = blockOps.duplicateBlock(state.blocks, id);
      return newBlock === undefined ? {} : { blocks, selectedBlockId: newBlock.id };
    }),

  removeBlock: (id) =>
    set((state) => {
      const removed = blockOps.removeBlock(state.blocks, id);
      // ドキュメントを空にしない。空の scenarioData は「旧形式」と区別できず
      // (Dexie v9 の backfill)、一覧からシナリオ編集への導線が消えて戻れなくなる。
      const blocks =
        removed.length === 0 ? [{ ...TextEntry.defaults(), id: generateId() } as Step] : removed;
      return { blocks, selectedBlockId: keepSelection(blocks, state.selectedBlockId) };
    }),

  moveBlock: (id, to) => set((state) => ({ blocks: blockOps.moveBlock(state.blocks, id, to) })),

  restoreBlocks: (blocks) => set({ blocks }),

  setGameFlag: (key, value) =>
    set((state) => ({ gameFlags: { ...state.gameFlags, [key]: value } })),

  removeGameFlag: (key) =>
    set((state) => {
      const next = { ...state.gameFlags };
      delete next[key];
      return { gameFlags: next };
    }),
}));
