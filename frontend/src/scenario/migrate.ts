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
  memo?: unknown;
  body?: unknown;
  level?: unknown;
}

const textNode = (text: string): JSONContent[] => (text === "" ? [] : [{ type: "text", text }]);

// 保存済みの生 JSON を読むため、v1 の schema (1〜3) は通っていない。範囲外の level は
// 描画も目次のインデントも壊すので、ここで丸める。
const clampLevel = (level: unknown): number =>
  typeof level === "number" ? Math.min(3, Math.max(1, Math.round(level))) : 1;

// v1 の Heading は本文を共通フィールドの title に持っていた。
const headingNode = (block: V1Block): JSONContent => ({
  type: "heading",
  attrs: { level: clampLevel(block.level) },
  content: textNode(typeof block.title === "string" ? block.title : ""),
});

// v1 では Branch のアームにも本文カテゴリのブロックを置けた。アームの中身は doc ではなく
// Branch 実体の内側に残る (D24) ため段落にはできず、Heading は v2 の Step union から
// 消えているのでそのままにすると保存済みデータが読めなくなる。見出しの文字列を落とさない
// よう Text へ移す。
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

// 入れ子の Branch にも降りる。
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
    steps.push(convertNestedArms(raw));
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
