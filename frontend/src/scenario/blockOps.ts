import { produce } from "immer";

import type { Step } from "@/flow/schema";
import {
  clampIndex,
  collectDescendantStepIds,
  findStepIn,
  locateInSteps,
  reassignIds,
} from "@/flow/treeOps";

// シナリオドキュメントのブロック列 (フラットな Step[] + Branch アームのネスト) に対する
// 純粋な変更操作 (docs: scenario-editor-architecture)。Branch 降下と id 採番は
// treeOps の内部ヘルパを共有し、再帰ロジックを二重化しない。

export type BlockContainer =
  | { kind: "root" }
  | { kind: "branchArm"; branchStepId: string; armId: string };

export interface BlockLocation {
  container: BlockContainer;
  index: number;
}

const resolveContainerBlocks = (blocks: Step[], container: BlockContainer): Step[] | undefined => {
  if (container.kind === "root") return blocks;
  const branch = findStepIn(blocks, container.branchStepId);
  if (branch === undefined || branch.type !== "Branch") return undefined;
  return branch.branches.find((arm) => arm.id === container.armId)?.steps;
};

// 移動先が移動対象自身、またはその子孫 Branch のアームなら true (自分の内側への移動を防ぐ)。
const isSelfOrDescendantContainer = (moved: Step, container: BlockContainer): boolean =>
  container.kind === "branchArm" &&
  (moved.id === container.branchStepId ||
    collectDescendantStepIds(moved).includes(container.branchStepId));

export const sameBlockContainer = (a: BlockContainer, b: BlockContainer): boolean =>
  a.kind === "root"
    ? b.kind === "root"
    : b.kind === "branchArm" && a.branchStepId === b.branchStepId && a.armId === b.armId;

export const updateBlockById = (blocks: Step[], id: string, patch: (block: Step) => void): Step[] =>
  produce(blocks, (draft) => {
    const block = findStepIn(draft as Step[], id);
    if (block !== undefined) patch(block);
  });

export const insertBlock = (blocks: Step[], at: BlockLocation, block: Step): Step[] =>
  produce(blocks, (draft) => {
    const target = resolveContainerBlocks(draft as Step[], at.container);
    if (target === undefined) return;
    target.splice(clampIndex(at.index, target.length), 0, block);
  });

export const removeBlock = (blocks: Step[], id: string): Step[] =>
  produce(blocks, (draft) => {
    const located = locateInSteps(draft as Step[], id);
    if (located !== undefined) located.parentSteps.splice(located.index, 1);
  });

// 見出しが束ねる範囲の終端 (次の同レベル以下の見出しの位置、無ければ列の末尾)。
// 複製した見出しをこの位置に置くことで、配下のブロックが複製側にぶら下がるのを防ぐ。
const sectionEnd = (steps: Step[], headingIndex: number): number => {
  const heading = steps[headingIndex];
  if (heading?.type !== "Heading") return headingIndex + 1;
  for (let index = headingIndex + 1; index < steps.length; index++) {
    const step = steps[index];
    if (step?.type === "Heading" && step.level <= heading.level) return index;
  }
  return steps.length;
};

export const duplicateBlock = (
  blocks: Step[],
  id: string,
): { blocks: Step[]; newBlock: Step | undefined } => {
  const located = locateInSteps(blocks, id);
  if (located === undefined) return { blocks, newBlock: undefined };
  const newBlock = structuredClone(located.step);
  reassignIds(newBlock);
  return {
    blocks: produce(blocks, (draft) => {
      const draftLocated = locateInSteps(draft as Step[], id);
      if (draftLocated === undefined) return;
      const at =
        draftLocated.step.type === "Heading"
          ? sectionEnd(draftLocated.parentSteps, draftLocated.index)
          : draftLocated.index + 1;
      draftLocated.parentSteps.splice(at, 0, newBlock);
    }),
    newBlock,
  };
};

// dnd-kit の arrayMove と同じ意味論: 対象を取り除いた後の配列に to.index で挿入する。
export const moveBlock = (blocks: Step[], id: string, to: BlockLocation): Step[] =>
  produce(blocks, (draft) => {
    const located = locateInSteps(draft as Step[], id);
    if (located === undefined) return;
    if (isSelfOrDescendantContainer(located.step, to.container)) return;
    const target = resolveContainerBlocks(draft as Step[], to.container);
    if (target === undefined) return;
    const [moved] = located.parentSteps.splice(located.index, 1);
    if (moved === undefined) return;
    target.splice(clampIndex(to.index, target.length), 0, moved);
  });
