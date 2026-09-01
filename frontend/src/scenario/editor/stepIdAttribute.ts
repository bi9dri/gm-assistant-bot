// 文中の操作ノードが持つ唯一の属性 (docs: scenario-editor-architecture D25)。
// StepNode (インライン) と BranchNode (ブロック) で同じ形を使う。

const asStepId = (attributes: Record<string, unknown>): string =>
  typeof attributes.stepId === "string" ? attributes.stepId : "";

export const stepIdAttribute = {
  stepId: {
    default: "",
    parseHTML: (element: HTMLElement) => element.getAttribute("data-step-id") ?? "",
    renderHTML: (attributes: Record<string, unknown>) => ({ "data-step-id": asStepId(attributes) }),
  },
};
