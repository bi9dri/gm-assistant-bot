import { describe, expect, test } from "bun:test";

import type { BranchStep, FlowData, Step } from "../schema";

import { advanceCursor, firstRunnableId, runnableSteps } from "./order";

const step = (id: string, overrides: Partial<Step> = {}): Step =>
  ({
    id,
    type: "SetGameFlag",
    title: id,
    memo: "",
    autoAdvance: false,
    flagKey: id,
    flagValue: "",
    ...overrides,
  }) as Step;

const branch = (id: string, overrides: Partial<BranchStep> = {}): BranchStep => ({
  id,
  type: "Branch",
  title: id,
  memo: "",
  autoAdvance: false,
  mode: "auto",
  matchMode: "first",
  flagName: "",
  branches: [
    { id: `${id}-a`, label: "A", steps: [] },
    { id: `${id}-b`, label: "B", steps: [] },
  ],
  ...overrides,
});

const flowOf = (...steps: Step[]): FlowData => ({
  version: 1,
  sections: [{ id: "s", title: "", memo: "", collapsed: false, steps }],
});

describe("runnableSteps", () => {
  test("セクション順・ステップ順で平坦化する", () => {
    const flow = flowOf(step("a"), step("b"), step("c"));
    expect(runnableSteps(flow).map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  test("未実行の Branch はリーフ (枝の子を含めない)", () => {
    const br = branch("br", {
      branches: [
        { id: "br-a", label: "A", steps: [step("a1")] },
        { id: "br-b", label: "B", steps: [step("b1")] },
      ],
    });
    expect(runnableSteps(flowOf(step("x"), br)).map((s) => s.id)).toEqual(["x", "br"]);
  });

  test("実行済み Branch は選ばれた枝の子だけを順序に開く", () => {
    const br = branch("br", {
      executedBranchIds: ["br-a"],
      branches: [
        { id: "br-a", label: "A", steps: [step("a1"), step("a2")] },
        { id: "br-b", label: "B", steps: [step("b1")] },
      ],
    });
    expect(runnableSteps(flowOf(br, step("after"))).map((s) => s.id)).toEqual([
      "br",
      "a1",
      "a2",
      "after",
    ]);
  });

  test("ネストした Branch も再帰的に descend する", () => {
    const inner = branch("inner", {
      executedBranchIds: ["inner-a"],
      branches: [
        { id: "inner-a", label: "A", steps: [step("deep")] },
        { id: "inner-b", label: "B", steps: [] },
      ],
    });
    const outer = branch("outer", {
      executedBranchIds: ["outer-a"],
      branches: [
        { id: "outer-a", label: "A", steps: [inner] },
        { id: "outer-b", label: "B", steps: [] },
      ],
    });
    expect(runnableSteps(flowOf(outer)).map((s) => s.id)).toEqual(["outer", "inner", "deep"]);
  });
});

describe("advanceCursor", () => {
  test("null からは先頭を返す", () => {
    expect(advanceCursor(flowOf(step("a"), step("b")), null)).toBe("a");
  });

  test("次のステップを返す", () => {
    expect(advanceCursor(flowOf(step("a"), step("b")), "a")).toBe("b");
  });

  test("末尾では null", () => {
    expect(advanceCursor(flowOf(step("a"), step("b")), "b")).toBeNull();
  });

  test("順序に存在しない id では null", () => {
    expect(advanceCursor(flowOf(step("a")), "ghost")).toBeNull();
  });

  test("実行済み Branch の直後は選ばれた枝の先頭", () => {
    const br = branch("br", {
      executedBranchIds: ["br-a"],
      branches: [
        { id: "br-a", label: "A", steps: [step("a1")] },
        { id: "br-b", label: "B", steps: [step("b1")] },
      ],
    });
    expect(advanceCursor(flowOf(br, step("after")), "br")).toBe("a1");
  });
});

describe("firstRunnableId", () => {
  test("先頭ステップの id", () => {
    expect(firstRunnableId(flowOf(step("a"), step("b")))).toBe("a");
  });

  test("空フローでは null", () => {
    expect(firstRunnableId({ version: 1, sections: [] })).toBeNull();
  });
});
