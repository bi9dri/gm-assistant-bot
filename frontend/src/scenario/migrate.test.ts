import { describe, expect, test } from "bun:test";

import { scenarioDataV1ToV2, toScenarioDataV2 } from "./migrate";
import { ScenarioDataSchema, defaultScenarioData } from "./schema";

// v1 (ブロック列) → v2 (doc + steps) の変換 (docs: scenario-editor-architecture D26)。

const base = { title: "", memo: "", autoAdvance: false };

const textBlock = (id: string, body: string) => ({ ...base, id, type: "Text", body });

const counterBlock = (id: string) => ({
  ...base,
  id,
  type: "Counter",
  title: "周回",
  flagKey: "round",
  step: 1,
});

const branchBlock = (id: string) => ({
  ...base,
  id,
  type: "Branch",
  title: "分岐",
  mode: "select",
  matchMode: "first",
  flagName: "vote",
  branches: [{ id: `${id}-arm`, label: "枝", steps: [counterBlock("nested")] }],
});

describe("scenarioDataV1ToV2", () => {
  test("Heading は level を保った heading ノードになる", () => {
    const { doc } = scenarioDataV1ToV2([
      { ...base, id: "h", type: "Heading", title: "導入", level: 2, collapsed: false },
    ]);

    expect(doc.content).toEqual([
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "導入" }] },
    ]);
  });

  test("Text は空行区切りで複数の段落に割れる", () => {
    const { doc } = scenarioDataV1ToV2([textBlock("t", "第一段落\n続き\n\n第二段落")]);

    expect(doc.content).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "第一段落\n続き" }] },
      { type: "paragraph", content: [{ type: "text", text: "第二段落" }] },
    ]);
  });

  test("操作ステップは段落中のインラインアトムになり、実体は steps へ移る", () => {
    const { doc, steps } = scenarioDataV1ToV2([counterBlock("c1")]);

    expect(doc.content).toEqual([
      { type: "paragraph", content: [{ type: "step", attrs: { stepId: "c1" } }] },
    ]);
    expect(steps.map((step) => step.id)).toEqual(["c1"]);
  });

  test("Branch はブロックレベルのノードになり、枝の中身は実体側に残る", () => {
    const { doc, steps } = scenarioDataV1ToV2([branchBlock("br")]);

    expect(doc.content).toEqual([{ type: "branch", attrs: { stepId: "br" } }]);
    const branch = steps[0];
    if (branch?.type !== "Branch") throw new Error("expected Branch");
    expect(branch.branches[0]?.steps[0]?.id).toBe("nested");
  });

  test("本文と操作の並び順がそのまま doc の並びになる", () => {
    const { doc } = scenarioDataV1ToV2([textBlock("t", "本文"), counterBlock("c1")]);

    expect((doc.content ?? []).map((node) => node.type)).toEqual(["paragraph", "paragraph"]);
  });

  test("空のブロック列からは空のドキュメントを作る (ProseMirror が空 doc を許さないため)", () => {
    expect(scenarioDataV1ToV2([])).toEqual(defaultScenarioData);
  });

  test("変換結果は v2 スキーマを満たす", () => {
    const converted = scenarioDataV1ToV2([
      { ...base, id: "h", type: "Heading", title: "導入", level: 1, collapsed: false },
      textBlock("t", "本文"),
      branchBlock("br"),
    ]);

    expect(() => ScenarioDataSchema.parse(converted)).not.toThrow();
  });
});

describe("toScenarioDataV2", () => {
  test("すでに v2 のデータはそのまま返す", () => {
    const v2 = { version: 2, doc: { type: "doc", content: [] }, steps: [] };

    expect(toScenarioDataV2(v2)).toBe(v2);
  });

  test("v1 のデータは変換する", () => {
    const result = toScenarioDataV2({ version: 1, blocks: [counterBlock("c1")] });

    expect(result).toMatchObject({ version: 2, steps: [{ id: "c1" }] });
  });

  test("blocks を持たない壊れたデータからは空の v2 を返す", () => {
    expect(toScenarioDataV2({})).toEqual(defaultScenarioData);
  });
});
