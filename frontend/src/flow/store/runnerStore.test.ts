import { beforeEach, describe, expect, test } from "bun:test";

import type { FlowData, Step } from "../schema";

import { findStep } from "../treeOps";
import { useRunnerStore } from "./runnerStore";

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

const flowOf = (...steps: Step[]): FlowData => ({
  version: 1,
  sections: [{ id: "s", title: "", memo: "", collapsed: false, steps }],
});

beforeEach(() => {
  useRunnerStore.getState().reset();
});

describe("initialize", () => {
  test("cursor を先頭ステップに合わせる", () => {
    useRunnerStore.getState().initialize(flowOf(step("a"), step("b")), { phase: "day" });
    const state = useRunnerStore.getState();
    expect(state.cursorId).toBe("a");
    expect(state.gameFlags.phase).toBe("day");
    expect(state.initialized).toBe(true);
  });
});

describe("markStepExecuted", () => {
  test("executedAt を刻み cursor を次へ進める", () => {
    useRunnerStore.getState().initialize(flowOf(step("a"), step("b")), {});
    useRunnerStore.getState().markStepExecuted("a", {});
    const state = useRunnerStore.getState();
    expect(findStep(state.flowData, "a")?.executedAt).toBeInstanceOf(Date);
    expect(state.cursorId).toBe("b");
  });

  test("Branch は executedBranchIds を刻み枝を開く", () => {
    const branch = step("br", {
      type: "Branch",
      mode: "select",
      matchMode: "first",
      flagName: "",
      branches: [
        { id: "arm-a", label: "A", steps: [step("a1")] },
        { id: "arm-b", label: "B", steps: [step("b1")] },
      ],
    });
    useRunnerStore.getState().initialize(flowOf(branch, step("after")), {});
    useRunnerStore.getState().markStepExecuted("br", { executedBranchIds: ["arm-a"] });
    const state = useRunnerStore.getState();
    const stored = findStep(state.flowData, "br");
    expect(stored?.type === "Branch" ? stored.executedBranchIds : undefined).toEqual(["arm-a"]);
    // 開いた枝の先頭が次の cursor になる。
    expect(state.cursorId).toBe("a1");
  });

  test("cursor 以外のステップを再実行しても cursor を巻き戻さない", () => {
    useRunnerStore.getState().initialize(flowOf(step("a"), step("b"), step("c")), {});
    useRunnerStore.getState().setCursor("c");
    useRunnerStore.getState().markStepExecuted("a", {});
    // cursor は c のまま (a は cursor ではない)。
    expect(useRunnerStore.getState().cursorId).toBe("c");
  });

  test("Branch 再実行時に旧枝の子孫の実行痕跡をリセットする", () => {
    const branch = step("br", {
      type: "Branch",
      mode: "auto",
      matchMode: "first",
      flagName: "",
      branches: [
        { id: "arm-a", label: "A", steps: [step("a1", { executedAt: new Date() })] },
        { id: "arm-b", label: "B", steps: [step("b1")] },
      ],
    });
    useRunnerStore.getState().initialize(flowOf(branch), {});
    // 枝 B を選んで再実行 → 旧枝 A の子 a1 の executedAt が消える。
    useRunnerStore.getState().markStepExecuted("br", { executedBranchIds: ["arm-b"] });
    const stored = findStep(useRunnerStore.getState().flowData, "a1");
    expect(stored?.executedAt).toBeUndefined();
  });

  test("Branch 選び直しで cursor が閉じた枝に取り残されたら新しい枝の先頭へ置き直す", () => {
    const branch = step("br", {
      type: "Branch",
      mode: "select",
      matchMode: "first",
      flagName: "",
      branches: [
        { id: "arm-a", label: "A", steps: [step("a1")] },
        { id: "arm-b", label: "B", steps: [step("b1")] },
      ],
    });
    useRunnerStore.getState().initialize(flowOf(branch, step("after")), {});
    useRunnerStore.getState().markStepExecuted("br", { executedBranchIds: ["arm-a"] });
    expect(useRunnerStore.getState().cursorId).toBe("a1");
    // 枝 B へ選び直し → a1 は実行順序から消えるので cursor を b1 に置き直す。
    useRunnerStore.getState().markStepExecuted("br", { executedBranchIds: ["arm-b"] });
    expect(useRunnerStore.getState().cursorId).toBe("b1");
  });

  test("Branch 選び直しでも cursor が枝の外なら動かさない", () => {
    const branch = step("br", {
      type: "Branch",
      mode: "select",
      matchMode: "first",
      flagName: "",
      branches: [
        { id: "arm-a", label: "A", steps: [step("a1")] },
        { id: "arm-b", label: "B", steps: [step("b1")] },
      ],
    });
    useRunnerStore.getState().initialize(flowOf(branch, step("after")), {});
    useRunnerStore.getState().markStepExecuted("br", { executedBranchIds: ["arm-a"] });
    useRunnerStore.getState().setCursor("after");
    useRunnerStore.getState().markStepExecuted("br", { executedBranchIds: ["arm-b"] });
    expect(useRunnerStore.getState().cursorId).toBe("after");
  });

  test("Branch 選び直しで枝の子孫の skip 痕跡もリセットする", () => {
    const branch = step("br", {
      type: "Branch",
      mode: "select",
      matchMode: "first",
      flagName: "",
      branches: [
        { id: "arm-a", label: "A", steps: [step("a1")] },
        { id: "arm-b", label: "B", steps: [step("b1")] },
      ],
    });
    useRunnerStore.getState().initialize(flowOf(branch, step("after")), {});
    useRunnerStore.getState().markStepExecuted("br", { executedBranchIds: ["arm-a"] });
    useRunnerStore.getState().skipStep("a1");
    expect(useRunnerStore.getState().skippedStepIds).toEqual(["a1"]);
    // 選び直しで子孫の実行痕跡が消えるのに合わせ、skip 痕跡も消して整合させる。
    useRunnerStore.getState().markStepExecuted("br", { executedBranchIds: ["arm-b"] });
    expect(useRunnerStore.getState().skippedStepIds).toEqual([]);
  });

  test("スキップ済みを実行したら skipped から外す", () => {
    useRunnerStore.getState().initialize(flowOf(step("a"), step("b")), {});
    useRunnerStore.getState().skipStep("a");
    expect(useRunnerStore.getState().skippedStepIds).toEqual(["a"]);
    useRunnerStore.getState().markStepExecuted("a", {});
    expect(useRunnerStore.getState().skippedStepIds).toEqual([]);
  });
});

describe("skipStep", () => {
  test("skipped に加え cursor を次へ進める", () => {
    useRunnerStore.getState().initialize(flowOf(step("a"), step("b")), {});
    useRunnerStore.getState().skipStep("a");
    const state = useRunnerStore.getState();
    expect(state.skippedStepIds).toEqual(["a"]);
    expect(state.cursorId).toBe("b");
  });

  test("重複追加しない", () => {
    useRunnerStore.getState().initialize(flowOf(step("a")), {});
    useRunnerStore.getState().skipStep("a");
    useRunnerStore.getState().skipStep("a");
    expect(useRunnerStore.getState().skippedStepIds).toEqual(["a"]);
  });
});

describe("updateStep (in-session editing)", () => {
  test("未実行ステップは編集できる", () => {
    useRunnerStore.getState().initialize(flowOf(step("a", { flagValue: "old" })), {});
    useRunnerStore.getState().updateStep("a", { flagValue: "new" } as Partial<Step>);
    const stored = findStep(useRunnerStore.getState().flowData, "a");
    expect(stored?.type === "SetGameFlag" ? stored.flagValue : undefined).toBe("new");
  });

  test("実行済みステップは read-only (編集を無視)", () => {
    useRunnerStore.getState().initialize(flowOf(step("a", { flagValue: "old" })), {});
    useRunnerStore.getState().markStepExecuted("a", {});
    useRunnerStore.getState().updateStep("a", { flagValue: "new" } as Partial<Step>);
    const stored = findStep(useRunnerStore.getState().flowData, "a");
    expect(stored?.type === "SetGameFlag" ? stored.flagValue : undefined).toBe("old");
  });
});

describe("flags", () => {
  test("setFlag / setFlags / removeFlag", () => {
    useRunnerStore.getState().initialize(flowOf(step("a")), { keep: "1" });
    useRunnerStore.getState().setFlag("phase", "day");
    useRunnerStore.getState().setFlags({ round: "3", turn: "2" });
    expect(useRunnerStore.getState().gameFlags).toEqual({
      keep: "1",
      phase: "day",
      round: "3",
      turn: "2",
    });
    useRunnerStore.getState().removeFlag("keep");
    expect(useRunnerStore.getState().gameFlags.keep).toBeUndefined();
  });
});
