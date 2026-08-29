import { beforeEach, describe, expect, test } from "bun:test";

import { runChain, type StepRunner } from "@/flow/engine/execute";
import { createFakeContext } from "@/flow/engine/fakeContext";
import { getEntry } from "@/flow/registry";
import { canRunStep } from "@/flow/runner/canRun";
import type { Step } from "@/flow/schema";
import { useRunnerStore } from "@/flow/store/runnerStore";
import { findStep } from "@/flow/treeOps";

import { restartFromHeading, resumeCursorId, runnerBlocks, toRunnerFlow } from "./runner";

// 実行モードはブロック列を FlowData に包んで flow の runnerStore / engine に載せる。
// ここで検証するのはシナリオ側の意味論: 見出しの「ここから再実行」の範囲と、
// 本文ブロックを通過しながらの連鎖実行・カーソル追従。

const EXECUTED_AT = new Date("2026-01-01T00:00:00.000Z");

const heading = (id: string, level: number, autoAdvance = false): Step => ({
  id,
  type: "Heading",
  title: id,
  memo: "",
  autoAdvance,
  level,
  collapsed: false,
});

const text = (id: string, autoAdvance = false): Step => ({
  id,
  type: "Text",
  title: "本文",
  memo: "",
  autoAdvance,
  body: id,
});

const executed = (block: Step): Step => ({ ...block, executedAt: EXECUTED_AT });

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

const seed = (blocks: Step[]): void => {
  useRunnerStore.getState().initialize(toRunnerFlow(blocks), {});
};

const blockById = (id: string): Step => {
  const step = findStep(useRunnerStore.getState().flowData, id);
  if (step === undefined) throw new Error(`block not found: ${id}`);
  return step;
};

beforeEach(() => {
  useRunnerStore.getState().reset();
});

describe("toRunnerFlow / runnerBlocks", () => {
  test("包んで取り出すと元のブロック列に戻る", () => {
    const blocks = [heading("h1", 1), text("t1")];

    expect(runnerBlocks(toRunnerFlow(blocks))).toEqual(blocks);
  });

  test("空の FlowData からは空のブロック列を返す", () => {
    expect(runnerBlocks({ version: 1, sections: [] })).toEqual([]);
  });
});

describe("resumeCursorId", () => {
  test("最初の未実行ブロックを指す", () => {
    const blocks = [executed(heading("h1", 1)), executed(text("t1")), text("t2"), text("t3")];

    expect(resumeCursorId(blocks)).toBe("t2");
  });

  test("確定した枝の中の未実行ブロックも対象にする", () => {
    const blocks = [
      executed(text("t1")),
      branch("br", "a1", [executed(text("t2")), text("t3")], ["a1"]),
    ];

    expect(resumeCursorId(blocks)).toBe("t3");
  });

  test("すべて実行済みなら null", () => {
    expect(resumeCursorId([executed(text("t1"))])).toBeNull();
  });
});

describe("restartFromHeading", () => {
  test("見出し配下の実行痕跡とスキップ印を消し、カーソルを見出しへ戻す", () => {
    seed([
      executed(heading("h1", 1)),
      executed(text("t1")),
      executed(heading("h2", 1)),
      executed(text("t2")),
    ]);
    useRunnerStore.getState().skipStep("t1");
    useRunnerStore.getState().skipStep("t2");

    restartFromHeading("h1");

    expect(blockById("h1").executedAt).toBeUndefined();
    expect(blockById("t1").executedAt).toBeUndefined();
    expect(blockById("h2").executedAt).toEqual(EXECUTED_AT);
    expect(blockById("t2").executedAt).toEqual(EXECUTED_AT);
    expect(useRunnerStore.getState().skippedStepIds).toEqual(["t2"]);
    expect(useRunnerStore.getState().cursorId).toBe("h1");
  });

  test("Branch の枝の中まで消し、確定した枝も選び直せる状態に戻す", () => {
    seed([
      heading("h1", 1),
      branch(
        "br",
        "a1",
        [executed(text("t1")), branch("br2", "a2", [executed(text("t2"))], ["a2"])],
        ["a1"],
      ),
      heading("h2", 1),
      executed(text("t3")),
    ]);

    restartFromHeading("h1");

    const outer = blockById("br");
    if (outer.type !== "Branch") throw new Error("expected Branch");
    expect(outer.executedAt).toBeUndefined();
    expect(outer.executedBranchIds).toBeUndefined();
    const inner = blockById("br2");
    if (inner.type !== "Branch") throw new Error("expected Branch");
    expect(inner.executedBranchIds).toBeUndefined();
    expect(blockById("t1").executedAt).toBeUndefined();
    expect(blockById("t2").executedAt).toBeUndefined();
    // 次の見出し以降は範囲外なので残る
    expect(blockById("t3").executedAt).toEqual(EXECUTED_AT);
  });

  test("下位見出しからの再実行は自分の配下だけに閉じる", () => {
    seed([executed(heading("h1", 1)), executed(heading("h2", 2)), executed(text("t1"))]);

    restartFromHeading("h2");

    expect(blockById("h1").executedAt).toEqual(EXECUTED_AT);
    expect(blockById("h2").executedAt).toBeUndefined();
    expect(blockById("t1").executedAt).toBeUndefined();
  });
});

// 本文ブロックの実行は no-op で、通過印 (executedAt) が付くだけ (docs D10)。
// autoAdvance の連鎖と、カーソルが実行位置に追従することを合わせて確認する。
describe("連鎖実行とカーソル追従", () => {
  const runFrom = async (startId: string) => {
    const { ctx } = createFakeContext();
    const runner: StepRunner = {
      getFlow: () => useRunnerStore.getState().flowData,
      canAutoRun: canRunStep,
      runOne: async (id) => {
        const step = blockById(id);
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

  test("autoAdvance が続く限り本文ブロックを通過し、カーソルが次へ進む", async () => {
    seed([heading("h1", 1, true), text("t1", true), text("t2"), heading("h2", 1)]);

    const results = await runFrom("h1");

    expect(results.map((result) => result.status)).toEqual(["success", "success", "success"]);
    expect(blockById("h1").executedAt).toBeDefined();
    expect(blockById("t1").executedAt).toBeDefined();
    expect(blockById("t2").executedAt).toBeDefined();
    expect(blockById("h2").executedAt).toBeUndefined();
    expect(useRunnerStore.getState().cursorId).toBe("h2");
  });

  test("カーソル以外のブロックを実行してもカーソルは動かない", async () => {
    seed([text("t1"), text("t2"), text("t3")]);

    await runFrom("t3");

    expect(blockById("t3").executedAt).toBeDefined();
    expect(useRunnerStore.getState().cursorId).toBe("t1");
  });

  test("再実行した見出しから通過し直せる", async () => {
    seed([heading("h1", 1, true), text("t1")]);
    await runFrom("h1");
    restartFromHeading("h1");

    await runFrom("h1");

    expect(blockById("h1").executedAt).toBeDefined();
    expect(blockById("t1").executedAt).toBeDefined();
  });
});
