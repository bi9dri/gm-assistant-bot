import type { JSONContent } from "@tiptap/core";

import { runnableStepsIn } from "@/flow/engine/order";
import type { FlowData, Step } from "@/flow/schema";
import { useRunnerStore } from "@/flow/store/runnerStore";

import { withDescendantIds } from "./document";
import { sectionStepIds } from "./outline";

const SECTION_ID = "scenario";

export const toRunnerFlow = (steps: Step[]): FlowData => ({
  version: 1,
  sections: [{ id: SECTION_ID, title: "", memo: "", collapsed: false, steps }],
});

export const runnerSteps = (flowData: FlowData): Step[] => flowData.sections[0]?.steps ?? [];

export const resumeCursorId = (steps: Step[]): string | null =>
  runnableStepsIn(steps).find((step) => step.executedAt === undefined)?.id ?? null;

export const restartFromHeading = (doc: JSONContent, headingIndex: number): void => {
  const { flowData, clearExecution, setCursor } = useRunnerStore.getState();
  const ids = sectionStepIds(doc, headingIndex);
  clearExecution(withDescendantIds(ids, runnerSteps(flowData)));
  setCursor(ids[0] ?? null);
};
