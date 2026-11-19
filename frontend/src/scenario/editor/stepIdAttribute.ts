const asStepId = (attributes: Record<string, unknown>): string =>
  typeof attributes.stepId === "string" ? attributes.stepId : "";

export const stepIdAttribute = {
  stepId: {
    default: "",
    parseHTML: (element: HTMLElement) => element.getAttribute("data-step-id") ?? "",
    renderHTML: (attributes: Record<string, unknown>) => ({ "data-step-id": asStepId(attributes) }),
  },
};
