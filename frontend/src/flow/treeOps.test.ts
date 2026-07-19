import { describe, expect, test } from "bun:test";

import type { FlowData, Step } from "./schema";

import {
  clearDescendantExecution,
  collectDescendantStepIds,
  collectSteps,
  findSection,
  findStep,
  insertSection,
  insertStep,
  moveSection,
  moveStep,
  removeSection,
  removeStep,
  updateSection,
  updateStepById,
} from "./treeOps";

const leaf = (id: string, title = id): Step => ({
  id,
  type: "SetGameFlag",
  title,
  memo: "",
  autoAdvance: false,
  flagKey: "k",
  flagValue: "v",
  flagKeyOptions: [],
  flagValueOptions: [],
});

const branch = (id: string, arms: Array<{ id: string; label: string; steps: Step[] }>): Step => ({
  id,
  type: "Branch",
  title: id,
  memo: "",
  autoAdvance: false,
  mode: "select",
  matchMode: "first",
  flagName: "",
  branches: arms,
});

// s1: [a, b]   s2: [ br{ arm1:[c], arm2:[d] } ]
const makeFlow = (): FlowData => ({
  version: 1,
  sections: [
    { id: "s1", title: "S1", memo: "", collapsed: false, steps: [leaf("a"), leaf("b")] },
    {
      id: "s2",
      title: "S2",
      memo: "",
      collapsed: false,
      steps: [
        branch("br", [
          { id: "arm1", label: "A1", steps: [leaf("c")] },
          { id: "arm2", label: "A2", steps: [leaf("d")] },
        ]),
      ],
    },
  ],
});

// s1: [ outer{ outerArm:[ inner{ innerArm:[x] } ] } ] — Branch を arm に入れ子にする
const makeNestedFlow = (): FlowData => ({
  version: 1,
  sections: [
    {
      id: "s1",
      title: "S1",
      memo: "",
      collapsed: false,
      steps: [
        branch("outer", [
          {
            id: "outerArm",
            label: "Outer",
            steps: [branch("inner", [{ id: "innerArm", label: "Inner", steps: [leaf("x")] }])],
          },
        ]),
      ],
    },
  ],
});

const stepIds = (flow: FlowData, sectionId: string): string[] =>
  findSection(flow, sectionId)?.steps.map((step) => step.id) ?? [];

const armIds = (flow: FlowData, armId: string): string[] => {
  const br = findStep(flow, "br");
  if (br?.type !== "Branch") return [];
  return br.branches.find((arm) => arm.id === armId)?.steps.map((step) => step.id) ?? [];
};

describe("findStep / findSection", () => {
  test("トップレベルとネストの両方を見つける", () => {
    const flow = makeFlow();
    expect(findStep(flow, "a")?.id).toBe("a");
    expect(findStep(flow, "c")?.id).toBe("c"); // arm1 内
    expect(findStep(flow, "d")?.id).toBe("d"); // arm2 内
    expect(findStep(flow, "br")?.type).toBe("Branch");
  });

  test("存在しない id は undefined", () => {
    expect(findStep(makeFlow(), "zzz")).toBeUndefined();
    expect(findSection(makeFlow(), "zzz")).toBeUndefined();
  });
});

describe("collectSteps", () => {
  test("全セクション・全枝のステップを pre-order で平坦化する", () => {
    expect(collectSteps(makeFlow()).map((step) => step.id)).toEqual(["a", "b", "br", "c", "d"]);
  });

  test("入れ子の Branch の枝にも降りる", () => {
    expect(collectSteps(makeNestedFlow()).map((step) => step.id)).toEqual(["outer", "inner", "x"]);
  });

  test("空のフローは空配列", () => {
    expect(collectSteps({ version: 1, sections: [] })).toEqual([]);
  });
});

describe("updateStepById", () => {
  test("ネストしたステップを更新し、元 flow は不変", () => {
    const flow = makeFlow();
    const next = updateStepById(flow, "c", (step) => {
      step.title = "updated";
    });
    expect(findStep(next, "c")?.title).toBe("updated");
    expect(findStep(flow, "c")?.title).toBe("c"); // 元は不変
  });

  test("未変更のセクションは参照が保たれる (構造的共有)", () => {
    const flow = makeFlow();
    const next = updateStepById(flow, "c", (step) => {
      step.title = "updated";
    });
    expect(next.sections[0]).toBe(flow.sections[0]); // s1 は触っていない
    expect(next.sections[1]).not.toBe(flow.sections[1]); // s2 は変わった
  });

  test("存在しない id は no-op", () => {
    const flow = makeFlow();
    const next = updateStepById(flow, "zzz", (step) => {
      step.title = "x";
    });
    expect(next).toBe(flow); // produce は変更なしなら同一参照を返す
  });
});

describe("insertStep", () => {
  test("セクション末尾に挿入", () => {
    const next = insertStep(
      makeFlow(),
      { container: { kind: "section", sectionId: "s1" }, index: 2 },
      leaf("x"),
    );
    expect(stepIds(next, "s1")).toEqual(["a", "b", "x"]);
  });

  test("セクション先頭に挿入", () => {
    const next = insertStep(
      makeFlow(),
      { container: { kind: "section", sectionId: "s1" }, index: 0 },
      leaf("x"),
    );
    expect(stepIds(next, "s1")).toEqual(["x", "a", "b"]);
  });

  test("分岐枝へ挿入", () => {
    const next = insertStep(
      makeFlow(),
      { container: { kind: "branchArm", branchStepId: "br", armId: "arm1" }, index: 1 },
      leaf("x"),
    );
    expect(armIds(next, "arm1")).toEqual(["c", "x"]);
  });

  test("範囲外の index は末尾にクランプ", () => {
    const next = insertStep(
      makeFlow(),
      { container: { kind: "section", sectionId: "s1" }, index: 99 },
      leaf("x"),
    );
    expect(stepIds(next, "s1")).toEqual(["a", "b", "x"]);
  });

  test("存在しないコンテナは no-op", () => {
    const flow = makeFlow();
    const next = insertStep(
      flow,
      { container: { kind: "section", sectionId: "zzz" }, index: 0 },
      leaf("x"),
    );
    expect(next).toBe(flow);
  });
});

describe("removeStep", () => {
  test("トップレベルを削除", () => {
    expect(stepIds(removeStep(makeFlow(), "a"), "s1")).toEqual(["b"]);
  });

  test("ネストしたステップを削除", () => {
    expect(armIds(removeStep(makeFlow(), "c"), "arm1")).toEqual([]);
  });

  test("存在しない id は no-op", () => {
    const flow = makeFlow();
    expect(removeStep(flow, "zzz")).toBe(flow);
  });
});

describe("moveStep", () => {
  test("セクション間移動", () => {
    const next = moveStep(makeFlow(), "a", {
      container: { kind: "section", sectionId: "s2" },
      index: 0,
    });
    expect(stepIds(next, "s1")).toEqual(["b"]);
    expect(stepIds(next, "s2")).toEqual(["a", "br"]);
  });

  test("同一セクション内で後方へ移動 (arrayMove 意味論)", () => {
    const next = moveStep(makeFlow(), "a", {
      container: { kind: "section", sectionId: "s1" },
      index: 1,
    });
    expect(stepIds(next, "s1")).toEqual(["b", "a"]);
  });

  test("同一セクション内で前方へ移動", () => {
    const next = moveStep(makeFlow(), "b", {
      container: { kind: "section", sectionId: "s1" },
      index: 0,
    });
    expect(stepIds(next, "s1")).toEqual(["b", "a"]);
  });

  test("セクションから分岐枝へ移動", () => {
    const next = moveStep(makeFlow(), "a", {
      container: { kind: "branchArm", branchStepId: "br", armId: "arm1" },
      index: 0,
    });
    expect(stepIds(next, "s1")).toEqual(["b"]);
    expect(armIds(next, "arm1")).toEqual(["a", "c"]);
  });

  test("分岐枝からセクションへ移動", () => {
    const next = moveStep(makeFlow(), "c", {
      container: { kind: "section", sectionId: "s1" },
      index: 2,
    });
    expect(armIds(next, "arm1")).toEqual([]);
    expect(stepIds(next, "s1")).toEqual(["a", "b", "c"]);
  });

  test("自分自身の枝の中へは移動できない (循環防止)", () => {
    const flow = makeFlow();
    const next = moveStep(flow, "br", {
      container: { kind: "branchArm", branchStepId: "br", armId: "arm1" },
      index: 0,
    });
    expect(next).toBe(flow); // no-op
  });

  test("子孫の分岐枝の中へも移動できない (再帰的な循環防止)", () => {
    // outer を、その内側にある inner の枝へ移そうとするとツリーが自己包含する。
    // collectBranchIds が {outer, inner} を再帰収集して阻止する。
    const flow = makeNestedFlow();
    const next = moveStep(flow, "outer", {
      container: { kind: "branchArm", branchStepId: "inner", armId: "innerArm" },
      index: 0,
    });
    expect(next).toBe(flow); // no-op
  });
});

describe("section ops", () => {
  test("insertSection (index 指定)", () => {
    const next = insertSection(
      makeFlow(),
      { id: "s0", title: "S0", memo: "", collapsed: false, steps: [] },
      0,
    );
    expect(next.sections.map((s) => s.id)).toEqual(["s0", "s1", "s2"]);
  });

  test("insertSection (末尾)", () => {
    const next = insertSection(makeFlow(), {
      id: "s3",
      title: "S3",
      memo: "",
      collapsed: false,
      steps: [],
    });
    expect(next.sections.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  test("removeSection", () => {
    expect(removeSection(makeFlow(), "s1").sections.map((s) => s.id)).toEqual(["s2"]);
  });

  test("updateSection", () => {
    const flow = makeFlow();
    const next = updateSection(flow, "s1", (section) => {
      section.collapsed = true;
    });
    expect(findSection(next, "s1")?.collapsed).toBe(true);
    expect(next.sections[1]).toBe(flow.sections[1]); // s2 は同一参照で保たれる
  });

  test("moveSection (arrayMove 意味論)", () => {
    expect(moveSection(makeFlow(), "s1", 1).sections.map((s) => s.id)).toEqual(["s2", "s1"]);
  });

  test("元 flow は不変", () => {
    const flow = makeFlow();
    removeSection(flow, "s1");
    expect(flow.sections.map((s) => s.id)).toEqual(["s1", "s2"]);
  });
});

describe("clearDescendantExecution", () => {
  test("Branch の全枝の子孫の executedAt と入れ子 Branch の executedBranchIds を消す", () => {
    const nested = branch("nested", [
      { id: "n1", label: "N1", steps: [{ ...leaf("deep"), executedAt: new Date() }] },
    ]);
    if (nested.type === "Branch") nested.executedBranchIds = ["n1"];
    const outer = branch("outer", [
      { id: "o1", label: "O1", steps: [{ ...leaf("c"), executedAt: new Date() }, nested] },
      { id: "o2", label: "O2", steps: [] },
    ]);
    clearDescendantExecution(outer);
    if (outer.type !== "Branch") throw new Error("expected branch");
    const c = outer.branches[0]?.steps[0];
    const nestedAfter = outer.branches[0]?.steps[1];
    expect(c?.executedAt).toBeUndefined();
    expect(nestedAfter?.type === "Branch" ? nestedAfter.executedBranchIds : "x").toBeUndefined();
    const deep = nestedAfter?.type === "Branch" ? nestedAfter.branches[0]?.steps[0] : undefined;
    expect(deep?.executedAt).toBeUndefined();
  });

  test("Branch 以外は何もしない", () => {
    const step = { ...leaf("x"), executedAt: new Date() };
    clearDescendantExecution(step);
    expect(step.executedAt).toBeInstanceOf(Date);
  });
});

describe("collectDescendantStepIds", () => {
  test("Branch の全枝の子孫 id を集める (入れ子 Branch にも再帰)", () => {
    const nested = branch("nested", [{ id: "n1", label: "N1", steps: [leaf("deep")] }]);
    const outer = branch("outer", [
      { id: "o1", label: "O1", steps: [leaf("c"), nested] },
      { id: "o2", label: "O2", steps: [leaf("d")] },
    ]);
    expect(collectDescendantStepIds(outer).sort()).toEqual(["c", "d", "deep", "nested"]);
  });

  test("Branch 以外は空配列", () => {
    expect(collectDescendantStepIds(leaf("x"))).toEqual([]);
  });
});
