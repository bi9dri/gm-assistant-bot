import type { StepContainer, StepLocation } from "../treeOps";

// StepListPanel の単一 DndContext に同居するドラッグ要素の種別。
// セクションもステップも同じ DndContext に登録されるため、useSortable / useDroppable の
// data に種別を載せ、衝突判定の絞り込みとドロップ先の解決に使う。
export type DragData =
  | { kind: "section" }
  | { kind: "step"; container: StepContainer; index: number }
  | { kind: "emptyContainer"; container: StepContainer };

// dnd-kit の active / over / droppableContainer はいずれも data を ref で持つ。
export const getDragData = (entity: { data: { current?: unknown } }): DragData | undefined =>
  entity.data.current as DragData | undefined;

export const sameContainer = (a: StepContainer, b: StepContainer): boolean =>
  a.kind === "section"
    ? b.kind === "section" && a.sectionId === b.sectionId
    : b.kind === "branchArm" && a.branchStepId === b.branchStepId && a.armId === b.armId;

// over 要素からドロップ先を解決する。ステップの上ならその位置 (手前に挿入)、
// 空コンテナなら先頭。セクションヘッダなどドロップ先にならないものは undefined。
export const dropLocation = (over: DragData | undefined): StepLocation | undefined => {
  if (over === undefined || over.kind === "section") return undefined;
  if (over.kind === "step") return { container: over.container, index: over.index };
  return { container: over.container, index: 0 };
};

// 空リスト用 droppable の id。ステップ/セクションの UUID と衝突しないよう接頭辞を付ける。
export const emptyContainerDropId = (container: StepContainer): string =>
  container.kind === "section"
    ? `empty-drop:section:${container.sectionId}`
    : `empty-drop:arm:${container.armId}`;
