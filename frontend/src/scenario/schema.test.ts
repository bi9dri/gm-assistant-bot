import { describe, expect, test } from "bun:test";

import { ScenarioDataSchema, defaultScenarioData, emptyDoc, hasScenarioContent } from "./schema";

const counterStep = {
  id: "c1",
  type: "Counter",
  title: "周回",
  flagKey: "round",
  step: 1,
};

const branchStep = {
  id: "b1",
  type: "Branch",
  title: "分岐",
  mode: "select",
  branches: [{ id: "b1-a", label: "A", steps: [counterStep] }],
};

const docWith = (...content: unknown[]) => ({ type: "doc", content });

describe("ScenarioDataSchema", () => {
  test("空のシナリオをパースできる", () => {
    expect(ScenarioDataSchema.parse({ version: 2, doc: emptyDoc(), steps: [] })).toEqual(
      defaultScenarioData,
    );
  });

  test("省略されたフィールドは既定値で埋まる", () => {
    const parsed = ScenarioDataSchema.parse({
      version: 2,
      doc: emptyDoc(),
      steps: [counterStep],
    });

    expect(parsed.steps[0]).toMatchObject({ id: "c1", memo: "", autoAdvance: false });
  });

  test("Branch のアームにネストしたステップもパースできる", () => {
    const parsed = ScenarioDataSchema.parse({ version: 2, doc: emptyDoc(), steps: [branchStep] });
    const branch = parsed.steps[0];
    if (branch?.type !== "Branch") throw new Error("Branch が取れない");

    expect(branch.branches[0]?.steps[0]?.id).toBe("c1");
  });

  test("JSON へシリアライズして往復できる", () => {
    const parsed = ScenarioDataSchema.parse({
      version: 2,
      doc: docWith({ type: "paragraph", content: [{ type: "text", text: "本文" }] }),
      steps: [counterStep, branchStep],
    });

    expect(ScenarioDataSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  test("未知のステップ型は弾く", () => {
    expect(() =>
      ScenarioDataSchema.parse({
        version: 2,
        doc: emptyDoc(),
        steps: [{ id: "x", type: "Unknown", title: "" }],
      }),
    ).toThrow();
  });

  test("見出しはステップ型ではなく doc のノードなので、Heading ステップは弾く", () => {
    expect(() =>
      ScenarioDataSchema.parse({
        version: 2,
        doc: emptyDoc(),
        steps: [{ id: "h", type: "Heading", title: "導入", level: 1 }],
      }),
    ).toThrow();
  });

  // 通してしまうと Node.fromJSON が描画中に throw し、空へ落ちるフォールバックではなく
  // 画面のクラッシュになる。
  test("doc ノードでない本文は弾く", () => {
    expect(() =>
      ScenarioDataSchema.parse({ version: 2, doc: { content: [] }, steps: [] }),
    ).toThrow();
    expect(() => ScenarioDataSchema.parse({ version: 2, doc: null, steps: [] })).toThrow();
  });

  test("version が 2 以外なら弾く", () => {
    expect(() => ScenarioDataSchema.parse({ version: 1, blocks: [] })).toThrow();
  });
});

describe("hasScenarioContent", () => {
  test("本文が書かれていれば true", () => {
    const data = {
      version: 2,
      doc: docWith({ type: "paragraph", content: [{ type: "text", text: "館に着いた" }] }),
      steps: [],
    };

    expect(hasScenarioContent(JSON.stringify(data))).toBe(true);
  });

  test("本文が空でも操作があれば true", () => {
    expect(
      hasScenarioContent(JSON.stringify({ version: 2, doc: emptyDoc(), steps: [counterStep] })),
    ).toBe(true);
  });

  test("空のシナリオは false (旧形式のテンプレートと区別できないため)", () => {
    expect(hasScenarioContent(JSON.stringify(defaultScenarioData))).toBe(false);
  });

  test("空白だけの段落は本文とみなさない", () => {
    const data = {
      version: 2,
      doc: docWith({ type: "paragraph", content: [{ type: "text", text: "   " }] }),
      steps: [],
    };

    expect(hasScenarioContent(JSON.stringify(data))).toBe(false);
  });

  test("壊れた JSON は false", () => {
    expect(hasScenarioContent("not json")).toBe(false);
  });
});
