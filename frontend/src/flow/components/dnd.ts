import type { StepContainer } from "../treeOps";

export type DragData<C = StepContainer> =
  | { kind: "section" }
  | { kind: "step"; container: C; index: number }
  | { kind: "emptyContainer"; container: C };

export const getDragData = <C = StepContainer>(entity: {
  data: { current?: unknown };
}): DragData<C> | undefined => entity.data.current as DragData<C> | undefined;

export const sameContainer = (a: StepContainer, b: StepContainer): boolean =>
  a.kind === "section"
    ? b.kind === "section" && a.sectionId === b.sectionId
    : b.kind === "branchArm" && a.branchStepId === b.branchStepId && a.armId === b.armId;

export const dropLocation = <C = StepContainer>(
  over: DragData<C> | undefined,
): { container: C; index: number } | undefined => {
  if (over === undefined || over.kind === "section") return undefined;
  if (over.kind === "step") return { container: over.container, index: over.index };
  return { container: over.container, index: 0 };
};

export const emptyContainerDropId = (container: StepContainer | { kind: "root" }): string => {
  if (container.kind === "root") return "empty-drop:root";
  return container.kind === "section"
    ? `empty-drop:section:${container.sectionId}`
    : `empty-drop:arm:${container.armId}`;
};
