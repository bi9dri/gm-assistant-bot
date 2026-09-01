import type { JSONContent } from "@tiptap/core";

import type { Step } from "@/flow/schema";

import { BRANCH_NODE_NAME, STEP_NODE_NAME, emptyDoc, type ScenarioData } from "./schema";
import { splitParagraphs } from "./textTransfer";

// ScenarioData v1 (ブロック列) → v2 (doc + steps) の変換 (docs: scenario-editor-architecture D26)。
// 旧 flowData と違い同じ道具の中の表現形式の変更なので 1 対 1 に写せる。
// 検証は呼び出し側 (ScenarioDataSchema) に任せ、ここは形の変換だけを行う。

interface V1Block {
  id?: unknown;
  type?: unknown;
  title?: unknown;
  body?: unknown;
  level?: unknown;
}

const textNode = (text: string): JSONContent[] => (text === "" ? [] : [{ type: "text", text }]);

// v1 の Heading は本文を共通フィールドの title に持っていた。
const headingNode = (block: V1Block): JSONContent => ({
  type: "heading",
  attrs: { level: typeof block.level === "number" ? block.level : 1 },
  content: textNode(typeof block.title === "string" ? block.title : ""),
});

// v1 の Text は 1 ブロックに複数段落を含みうるので、空行区切りで段落に割る (D19 と同じ規則)。
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
    // Branch だけはブロックレベル、それ以外は段落中のインラインアトム (D24)。
    content.push(
      block.type === "Branch"
        ? { type: BRANCH_NODE_NAME, attrs: { stepId: block.id } }
        : {
            type: "paragraph",
            content: [{ type: STEP_NODE_NAME, attrs: { stepId: block.id } }],
          },
    );
    steps.push(raw as Step);
  }

  return {
    version: 2,
    doc: content.length === 0 ? emptyDoc() : { type: "doc", content },
    steps,
  };
};

// 保存済み JSON 文字列を v2 の形に揃える。v2 はそのまま返し、それ以外は v1 として読む
// (壊れていれば blocks が空配列になり、空の v2 が返る)。
export const toScenarioDataV2 = (parsed: unknown): unknown => {
  const data = parsed as { version?: unknown; blocks?: unknown };
  if (data.version === 2) return parsed;
  return scenarioDataV1ToV2(Array.isArray(data.blocks) ? data.blocks : []);
};
