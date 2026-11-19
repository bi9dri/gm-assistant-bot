export const SCENARIO_DOC_CLASS = "scenario-doc";

const scrollTo = (element: Element | null | undefined): void =>
  element?.scrollIntoView({ behavior: "smooth", block: "start" });

export const scrollToStep = (stepId: string): void =>
  scrollTo(document.getElementById(`step-${stepId}`));

export const scrollToHeading = (index: number): void => {
  const doc = document.querySelector(`.${SCENARIO_DOC_CLASS}`);
  scrollTo(doc?.querySelectorAll("h1, h2, h3")[index]);
};
