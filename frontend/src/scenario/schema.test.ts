import { describe, expect, test } from "bun:test";

import { ScenarioDataSchema, defaultScenarioData, hasScenarioBlocks } from "./schema";

const textBlock = {
  id: "t1",
  type: "Text",
  title: "導入",
  body: "館に着いた。",
};

const branchBlock = {
  id: "b1",
  type: "Branch",
  title: "分岐",
  mode: "select",
  branches: [{ id: "b1-a", label: "A", steps: [textBlock] }],
};

describe("ScenarioDataSchema", () => {
  test("空のブロック列をパースできる", () => {
    expect(ScenarioDataSchema.parse({ version: 1, blocks: [] })).toEqual(defaultScenarioData);
  });

  test("省略されたフィールドは既定値で埋まる", () => {
    const parsed = ScenarioDataSchema.parse({ version: 1, blocks: [textBlock] });

    expect(parsed.blocks[0]).toMatchObject({
      id: "t1",
      type: "Text",
      body: "館に着いた。",
      memo: "",
      autoAdvance: false,
    });
  });

  test("Branch のアームにネストしたブロックもパースできる", () => {
    const parsed = ScenarioDataSchema.parse({ version: 1, blocks: [branchBlock] });
    const branch = parsed.blocks[0];
    if (branch?.type !== "Branch") throw new Error("Branch が取れない");

    expect(branch.branches[0]?.steps[0]?.id).toBe("t1");
  });

  test("JSON へシリアライズして往復できる", () => {
    const parsed = ScenarioDataSchema.parse({ version: 1, blocks: [textBlock, branchBlock] });

    expect(ScenarioDataSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  test("未知のブロック型は弾く", () => {
    expect(() =>
      ScenarioDataSchema.parse({ version: 1, blocks: [{ id: "x", type: "Unknown", title: "" }] }),
    ).toThrow();
  });

  test("version が 1 以外なら弾く", () => {
    expect(() => ScenarioDataSchema.parse({ version: 2, blocks: [] })).toThrow();
  });
});

describe("hasScenarioBlocks", () => {
  test("ブロックが 1 つ以上あれば true", () => {
    expect(hasScenarioBlocks(JSON.stringify({ version: 1, blocks: [textBlock] }))).toBe(true);
  });

  test("空のブロック列は false (旧形式のテンプレートと区別できないため)", () => {
    expect(hasScenarioBlocks(JSON.stringify(defaultScenarioData))).toBe(false);
  });

  test("壊れた JSON は false", () => {
    expect(hasScenarioBlocks("not json")).toBe(false);
  });
});
