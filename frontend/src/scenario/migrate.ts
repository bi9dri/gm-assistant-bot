import type { JSONContent } from "@tiptap/core";

import type { Step } from "@/flow/schema";

import { BRANCH_NODE_NAME, STEP_NODE_NAME, emptyDoc, type ScenarioData } from "./schema";
import { splitParagraphs } from "./textTransfer";

interface V1Block {
  id?: unknown;
  type?: unknown;
  title?: unknown;
  memo?: unknown;
  body?: unknown;
  level?: unknown;
}

const textNode = (text: string): JSONContent[] => (text === "" ? [] : [{ type: "text", text }]);

const clampLevel = (level: unknown): number =>
  typeof level === "number" ? Math.min(3, Math.max(1, Math.round(level))) : 1;

const headingNode = (block: V1Block): JSONContent => ({
  type: "heading",
  attrs: { level: clampLevel(block.level) },
  content: textNode(typeof block.title === "string" ? block.title : ""),
});

const armHeadingToText = (block: V1Block, id: string): Step =>
  ({
    id,
    type: "Text",
    title: "本文",
    memo: typeof block.memo === "string" ? block.memo : "",
    autoAdvance: false,
    body: typeof block.title === "string" ? block.title : "",
  }) as Step;

const convertArmSteps = (steps: unknown[]): Step[] =>
  steps.flatMap((raw) => {
    const block = raw as V1Block;
    if (block.type !== "Heading") return [convertNestedArms(raw)];
    return typeof block.id === "string" ? [armHeadingToText(block, block.id)] : [];
  });

const convertNestedArms = (raw: unknown): Step => {
  const step = raw as Step;
  if (step.type !== "Branch" || !Array.isArray(step.branches)) return step;
  return {
    ...step,
    branches: step.branches.map((arm) => ({
      ...arm,
      steps: convertArmSteps(Array.isArray(arm.steps) ? arm.steps : []),
    })),
  };
};

const paragraphNodes = (block: V1Block): JSONContent[] =>
  splitParagraphs(typeof block.body === "string" ? block.body : "").map((paragraph) => ({
    type: "paragraph",
    content: textNode(paragraph),
  }));

export const scenarioDataV1ToV2 = (blocks: unknown[]): ScenarioData => {
  const content: JSONContent[] = [];
  const steps: Step[] = [];

  for (const raw of blocks) {
    const block = raw as V1Block;
    if (block.type === "Heading") {
      content.push(headingNode(block));
      continue;
    }
    if (block.type === "Text") {
      content.push(...paragraphNodes(block));
      continue;
    }
    if (typeof block.id !== "string") continue;
    content.push(
      block.type === "Branch"
        ? { type: BRANCH_NODE_NAME, attrs: { stepId: block.id } }
        : {
            type: "paragraph",
            content: [{ type: STEP_NODE_NAME, attrs: { stepId: block.id } }],
          },
    );
    steps.push(convertNestedArms(raw));
  }

  return {
    version: 2,
    doc: content.length === 0 ? emptyDoc() : { type: "doc", content },
    steps,
  };
};

export const toScenarioDataV2 = (parsed: unknown): unknown => {
  const data = parsed as { version?: unknown; blocks?: unknown };
  if (data.version === 2) return parsed;
  return scenarioDataV1ToV2(Array.isArray(data.blocks) ? data.blocks : []);
};
