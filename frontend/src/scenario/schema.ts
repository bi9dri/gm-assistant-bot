import type { JSONContent } from "@tiptap/core";
import z from "zod";

import { StepSchema } from "@/flow/schema";

export const STEP_NODE_NAME = "step";
export const BRANCH_NODE_NAME = "branch";

export const ScenarioDataSchema = z.object({
  version: z.literal(2),
  doc: z.custom<JSONContent>((value) => (value as JSONContent | null)?.type === "doc"),
  steps: z.array(z.lazy(() => StepSchema)),
});

export type ScenarioData = z.infer<typeof ScenarioDataSchema>;

export const emptyDoc = (): JSONContent => ({ type: "doc", content: [{ type: "paragraph" }] });

export const defaultScenarioData: ScenarioData = { version: 2, doc: emptyDoc(), steps: [] };

const hasVisibleContent = (node: JSONContent): boolean => {
  if (node.type === STEP_NODE_NAME || node.type === BRANCH_NODE_NAME) return true;
  if (typeof node.text === "string" && node.text.trim() !== "") return true;
  return (node.content ?? []).some(hasVisibleContent);
};

export const hasScenarioContent = (scenarioData: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(scenarioData);
    const { doc, steps } = parsed as { doc?: JSONContent; steps?: unknown };
    if (Array.isArray(steps) && steps.length > 0) return true;
    return doc !== undefined && hasVisibleContent(doc);
  } catch {
    return false;
  }
};
