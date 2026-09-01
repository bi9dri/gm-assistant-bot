import { beforeEach, describe, expect, test } from "bun:test";

import type { JSONContent } from "@tiptap/core";

import { runChain, type StepRunner } from "@/flow/engine/execute";
import { createFakeContext } from "@/flow/engine/fakeContext";
import { getEntry } from "@/flow/registry";
import { canRunStep } from "@/flow/runner/canRun";
import type { Step } from "@/flow/schema";
import { useRunnerStore } from "@/flow/store/runnerStore";
import { findStep } from "@/flow/treeOps";

import { restartFromHeading, resumeCursorId, runnerSteps, toRunnerFlow } from "./runner";

// 実行モードはステップ列を FlowData に包んで flow の runnerStore / engine に載せる。
// ここで検証するのはシナリオ側の意味論: 見出しの「ここから再実行」の範囲と、
// autoAdvance の連鎖・カーソル追従。見出しは doc 側にあるため範囲指定は doc を渡す。

const EXECUTED_AT = new Date("2026-01-01T00:00:00.000Z");

const heading = (level: number): JSONContent => ({ type: "heading", attrs: { level } });

const stepNode = (stepId: string): JSONContent => ({
  type: "paragraph",
  content: [{ type: "step", attrs: { stepId } }],
});

const branchNode = (stepId: string): JSONContent => ({ type: "branch", attrs: { stepId } });

const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });

const text = (id: string, autoAdvance = false): Step => ({
  id,
  type: "Text",
  title: "本文",
  memo: "",
  autoAdvance,
  body: id,
});

const executed = (step: Step): Step => ({ ...step, executedAt: EXECUTED_AT });

const branch = (id: string, armId: string, steps: Step[], chosen?: string[]): Step => ({
  id,
  type: "Branch",
  title: "分岐",
  memo: "",
  autoAdvance: false,
  executedAt: chosen === undefined ? undefined : EXECUTED_AT,
  mode: "select",
  matchMode: "first",
  flagName: "vote",
  executedBranchIds: chosen,
  branches: [{ id: armId, label: "枝", steps }],
});

const seed = (steps: Step[]): void => {
  useRunnerStore.getState().initialize(toRunnerFlow(steps), {});
};

const stepById = (id: string): Step => {
  const step = findStep(useRunnerStore.getState().flowData, id);
  if (step === undefined) throw new Error(`step not found: ${id}`);
  return step;
};

beforeEach(() => {
  useRunnerStore.getState().reset();
});

describe("toRunnerFlow / runnerSteps", () => {
  test("包んで取り出すと元のステップ列に戻る", () => {
    const steps = [text("t1"), text("t2")];

    expect(runnerSteps(toRunnerFlow(steps))).toEqual(steps);
  });

  test("空の FlowData からは空のステップ列を返す", () => {
    expect(runnerSteps({ version: 1, sections: [] })).toEqual([]);
  });
});

describe("resumeCursorId", () => {
  test("最初の未実行ステップを指す", () => {
    const steps = [executed(text("t1")), text("t2"), text("t3")];

    expect(resumeCursorId(steps)).toBe("t2");
  });

  test("確定した枝の中の未実行ステップも対象にする", () => {
    const steps = [
      executed(text("t1")),
      branch("br", "a1", [executed(text("t2")), text("t3")], ["a1"]),
    ];

    expect(resumeCursorId(steps)).toBe("t3");
  });

  test("すべて実行済みなら null", () => {
    expect(resumeCursorId([executed(text("t1"))])).toBeNull();
  });
});

describe("restartFromHeading", () => {
  test("見出し配下の実行痕跡とスキップ印を消し、カーソルを範囲の先頭へ戻す", () => {
    const source = doc(heading(1), stepNode("t1"), heading(1), stepNode("t2"));
    seed([executed(text("t1")), executed(text("t2"))]);
    useRunnerStore.getState().skipStep("t1");
    useRunnerStore.getState().skipStep("t2");

    restartFromHeading(source, 0);

    expect(stepById("t1").executedAt).toBeUndefined();
    expect(stepById("t2").executedAt).toEqual(EXECUTED_AT);
    expect(useRunnerStore.getState().skippedStepIds).toEqual(["t2"]);
    expect(useRunnerStore.getState().cursorId).toBe("t1");
  });

  test("Branch の枝の中まで消し、確定した枝も選び直せる状態に戻す", () => {
    const source = doc(heading(1), branchNode("br"), heading(1), stepNode("t3"));
    seed([
      branch(
        "br",
        "a1",
        [executed(text("t1")), branch("br2", "a2", [executed(text("t2"))], ["a2"])],
        ["a1"],
      ),
      executed(text("t3")),
    ]);

    restartFromHeading(source, 0);

    const outer = stepById("br");
    if (outer.type !== "Branch") throw new Error("expected Branch");
    expect(outer.executedAt).toBeUndefined();
    expect(outer.executedBranchIds).toBeUndefined();
    const inner = stepById("br2");
    if (inner.type !== "Branch") throw new Error("expected Branch");
    expect(inner.executedBranchIds).toBeUndefined();
    expect(stepById("t1").executedAt).toBeUndefined();
    expect(stepById("t2").executedAt).toBeUndefined();
    // 次の見出し以降は範囲外なので残る
    expect(stepById("t3").executedAt).toEqual(EXECUTED_AT);
  });

  test("下位見出しからの再実行は自分の配下だけに閉じる", () => {
    const source = doc(heading(1), stepNode("t1"), heading(2), stepNode("t2"));
    seed([executed(text("t1")), executed(text("t2"))]);

    restartFromHeading(source, 1);

    expect(stepById("t1").executedAt).toEqual(EXECUTED_AT);
    expect(stepById("t2").executedAt).toBeUndefined();
  });
});

// 本文の通過ではなく操作ステップの実行が進捗の単位になる (docs D10)。
// autoAdvance の連鎖と、カーソルが実行位置に追従することを合わせて確認する。
describe("連鎖実行とカーソル追従", () => {
  const runFrom = async (startId: string) => {
    const { ctx } = createFakeContext();
    const runner: StepRunner = {
      getFlow: () => useRunnerStore.getState().flowData,
      canAutoRun: canRunStep,
      runOne: async (id) => {
        const step = stepById(id);
        const execute = getEntry(step.type)?.execute;
        if (execute === undefined) return { status: "error", message: "実行できません" };
        const result = await execute(step, ctx);
        if (result.status === "success") {
          useRunnerStore
            .getState()
            .markStepExecuted(id, { executedBranchIds: result.branchArmIds });
        }
        return result;
      },
    };
    return runChain(runner, startId);
  };

  test("autoAdvance が続く限り実行し、カーソルが次へ進む", async () => {
    seed([text("t1", true), text("t2", true), text("t3"), text("t4")]);

    const results = await runFrom("t1");

    expect(results.map((result) => result.status)).toEqual(["success", "success", "success"]);
    expect(stepById("t3").executedAt).toBeDefined();
    expect(stepById("t4").executedAt).toBeUndefined();
    expect(useRunnerStore.getState().cursorId).toBe("t4");
  });

  test("カーソル以外のステップを実行してもカーソルは動かない", async () => {
    seed([text("t1"), text("t2"), text("t3")]);

    await runFrom("t3");

    expect(stepById("t3").executedAt).toBeDefined();
    expect(useRunnerStore.getState().cursorId).toBe("t1");
  });

  test("見出しから再実行した範囲を実行し直せる", async () => {
    const source = doc(heading(1), stepNode("t1"), stepNode("t2"));
    seed([text("t1", true), text("t2")]);
    await runFrom("t1");
    restartFromHeading(source, 0);

    await runFrom("t1");

    expect(stepById("t1").executedAt).toBeDefined();
    expect(stepById("t2").executedAt).toBeDefined();
  });
});
