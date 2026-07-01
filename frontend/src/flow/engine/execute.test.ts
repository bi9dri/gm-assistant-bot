import { describe, expect, test } from "bun:test";

import type { BranchStep, FlowData, Step } from "../schema";
import type { StepRunner } from "./execute";
import type { ExecuteResult } from "./types";

import * as treeOps from "../treeOps";
import { runChain } from "./execute";

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

// runOne が executedAt / executedBranchIds を刻む挙動を模した StepRunner。
// results で各 id の返り値を差し替えられる。実行された id の順序を order に記録する。
const makeRunner = (
  initial: FlowData,
  results: Record<string, ExecuteResult> = {},
): StepRunner & { order: string[] } => {
  let flow = initial;
  const order: string[] = [];
  return {
    order,
    getFlow: () => flow,
    runOne: async (id) => {
      order.push(id);
      const result = results[id] ?? { status: "success", message: "" };
      flow = treeOps.updateStepById(flow, id, (target) => {
        target.executedAt = new Date();
        if (result.branchArmIds !== undefined && target.type === "Branch") {
          target.executedBranchIds = result.branchArmIds;
        }
      });
      return result;
    },
  };
};

describe("runChain", () => {
  test("autoAdvance が無ければ 1 ステップで止まる", async () => {
    const runner = makeRunner(flowOf(step("a"), step("b")));
    const results = await runChain(runner, "a");
    expect(runner.order).toEqual(["a"]);
    expect(results).toHaveLength(1);
  });

  test("autoAdvance が続く限り次ステップへ連鎖する", async () => {
    const runner = makeRunner(
      flowOf(step("a", { autoAdvance: true }), step("b", { autoAdvance: true }), step("c")),
    );
    await runChain(runner, "a");
    expect(runner.order).toEqual(["a", "b", "c"]);
  });

  test("失敗したステップで連鎖が止まる", async () => {
    const runner = makeRunner(
      flowOf(step("a", { autoAdvance: true }), step("b", { autoAdvance: true }), step("c")),
      { b: { status: "error", message: "boom" } },
    );
    const results = await runChain(runner, "a");
    expect(runner.order).toEqual(["a", "b"]);
    expect(results[results.length - 1]?.status).toBe("error");
  });

  test("実行済み Branch の枝に descend して連鎖を続ける", async () => {
    const branch: BranchStep = {
      id: "br",
      type: "Branch",
      title: "分岐",
      memo: "",
      autoAdvance: true,
      mode: "select",
      matchMode: "first",
      flagName: "",
      branches: [
        { id: "br-a", label: "A", steps: [step("a1", { autoAdvance: true }), step("a2")] },
        { id: "br-b", label: "B", steps: [step("b1")] },
      ],
    };
    const runner = makeRunner(flowOf(branch, step("after")), {
      br: { status: "success", message: "", branchArmIds: ["br-a"] },
    });
    await runChain(runner, "br");
    // br → 選ばれた枝 br-a の a1(autoAdvance) → a2(停止)。b1 と after は含まない。
    expect(runner.order).toEqual(["br", "a1", "a2"]);
  });

  test("存在しない開始 id では何も実行しない", async () => {
    const runner = makeRunner(flowOf(step("a")));
    const results = await runChain(runner, "ghost");
    expect(runner.order).toEqual([]);
    expect(results).toEqual([]);
  });
});
