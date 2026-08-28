import type { StepContainer } from "../treeOps";

// StepListPanel の単一 DndContext に同居するドラッグ要素の種別。
// セクションもステップも同じ DndContext に登録されるため、useSortable / useDroppable の
// data に種別を載せ、衝突判定の絞り込みとドロップ先の解決に使う。
// コンテナの型は UI ごとに異なる (ステップリストは Section / 分岐枝、シナリオ
// ドキュメントはブロック列の root / 分岐枝) ため型引数にする。既定はステップリスト。
export type DragData<C = StepContainer> =
  | { kind: "section" }
  | { kind: "step"; container: C; index: number }
  | { kind: "emptyContainer"; container: C };

// dnd-kit の active / over / droppableContainer はいずれも data を ref で持つ。
export const getDragData = <C = StepContainer>(entity: {
  data: { current?: unknown };
}): DragData<C> | undefined => entity.data.current as DragData<C> | undefined;

export const sameContainer = (a: StepContainer, b: StepContainer): boolean =>
  a.kind === "section"
    ? b.kind === "section" && a.sectionId === b.sectionId
    : b.kind === "branchArm" && a.branchStepId === b.branchStepId && a.armId === b.armId;

// over 要素からドロップ先を解決する。ステップの上ならその位置 (手前に挿入)、
// 空コンテナなら先頭。セクションヘッダなどドロップ先にならないものは undefined。
export const dropLocation = <C = StepContainer>(
  over: DragData<C> | undefined,
): { container: C; index: number } | undefined => {
  if (over === undefined || over.kind === "section") return undefined;
  if (over.kind === "step") return { container: over.container, index: over.index };
  return { container: over.container, index: 0 };
};

// 空リスト用 droppable の id。ステップ/セクションの UUID と衝突しないよう接頭辞を付ける。
// シナリオドキュメント UI のブロック列 (root) も同じ採番に乗せる。
export const emptyContainerDropId = (container: StepContainer | { kind: "root" }): string => {
  if (container.kind === "root") return "empty-drop:root";
  return container.kind === "section"
    ? `empty-drop:section:${container.sectionId}`
    : `empty-drop:arm:${container.armId}`;
};
