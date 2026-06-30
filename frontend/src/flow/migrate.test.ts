import { describe, expect, test } from "bun:test";

import type { FlowData } from "./schema";

import { foldWarningsIntoFlowData, migrateRecordToFlowData } from "./migrate";
import { FlowDataSchema, defaultFlowData } from "./schema";

// ---- フィクスチャ ----

const flow = (sections: unknown[]): FlowData => FlowDataSchema.parse({ version: 1, sections });

const setFlagStep = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: "SetGameFlag",
  title: id,
  flagKey: "k",
  flagValue: "v",
  ...extra,
});

const rfGraph = (nodes: unknown[], edges: unknown[] = []) => ({
  nodes,
  edges,
  viewport: { x: 0, y: 0, zoom: 1 },
});

const sgNode = (id: string, title: string) => ({
  id,
  type: "SetGameFlag",
  position: { x: 0, y: 0 },
  data: { title, flagKey: "k", flagValue: "v" },
});

describe("foldWarningsIntoFlowData", () => {
  test("warnings が空なら入力をそのまま (同一参照で) 返す", () => {
    const input = flow([{ id: "s1", title: "S1", steps: [setFlagStep("st1")] }]);
    expect(foldWarningsIntoFlowData(input, [])).toBe(input);
  });

  test("nodeId が一致するステップの memo に ⚠️ 付きで追記する", () => {
    const input = flow([{ id: "s1", title: "S1", steps: [setFlagStep("st1")] }]);

    const result = foldWarningsIntoFlowData(input, [{ nodeId: "st1", message: "危険" }]);

    expect(result.sections[0].steps[0].memo).toBe("⚠️ 危険");
    // 入力は変更しない (純粋)
    expect(input.sections[0].steps[0].memo).toBe("");
  });

  test("Branch の arm 内ネストステップにも追記する", () => {
    const input = flow([
      {
        id: "s1",
        title: "S1",
        steps: [
          {
            id: "br1",
            type: "Branch",
            title: "分岐",
            mode: "select",
            flagName: "f",
            branches: [{ id: "arm1", label: "A", steps: [setFlagStep("nested1")] }],
          },
        ],
      },
    ]);

    const result = foldWarningsIntoFlowData(input, [{ nodeId: "nested1", message: "深部" }]);

    const branch = result.sections[0].steps[0];
    if (branch.type !== "Branch") throw new Error("expected Branch");
    expect(branch.branches[0].steps[0].memo).toBe("⚠️ 深部");
  });

  test("nodeId 無し / 不一致の警告は先頭セクションの memo に集約する", () => {
    const input = flow([{ id: "s1", title: "S1", steps: [setFlagStep("st1")] }]);

    const result = foldWarningsIntoFlowData(input, [
      { message: "全体警告" },
      { nodeId: "unknown", message: "未一致" },
    ]);

    expect(result.sections[0].memo).toContain("⚠️ 変換時の警告:");
    expect(result.sections[0].memo).toContain("- 全体警告");
    expect(result.sections[0].memo).toContain("- 未一致");
    // ステップ memo は変更されない
    expect(result.sections[0].steps[0].memo).toBe("");
  });

  test("セクションが無い場合は受け皿セクションを作って集約する", () => {
    const input = flow([]);

    const result = foldWarningsIntoFlowData(input, [{ message: "孤立警告" }]);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].id).toBe("conversion-warnings");
    expect(result.sections[0].memo).toContain("孤立警告");
  });
});

describe("migrateRecordToFlowData", () => {
  test("legacy な reactFlowData を変換して flowData JSON 文字列を返す", () => {
    const result = migrateRecordToFlowData(JSON.stringify(rfGraph([sgNode("n1", "A")])), undefined);

    const parsed = FlowDataSchema.parse(JSON.parse(result));
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].steps[0].title).toBe("A");
  });

  test("reactFlowData がオブジェクト (非文字列) でも変換する", () => {
    const result = migrateRecordToFlowData(rfGraph([sgNode("n1", "B")]), undefined);

    const parsed = FlowDataSchema.parse(JSON.parse(result));
    expect(parsed.sections[0].steps[0].title).toBe("B");
  });

  test("already-new: 妥当な flowData はそのまま返し reactFlowData を無視する", () => {
    const existing = JSON.stringify(
      flow([{ id: "keep", title: "既存", steps: [setFlagStep("st1")] }]),
    );

    const result = migrateRecordToFlowData("これは壊れた reactFlowData", existing);

    expect(result).toBe(existing);
  });

  test("空文字の flowData は already-new とみなさず reactFlowData から変換する", () => {
    const result = migrateRecordToFlowData(JSON.stringify(rfGraph([sgNode("n1", "C")])), "");

    const parsed = FlowDataSchema.parse(JSON.parse(result));
    expect(parsed.sections[0].steps[0].title).toBe("C");
  });

  test("既存 flowData が壊れていれば reactFlowData から再構築する", () => {
    const result = migrateRecordToFlowData(
      JSON.stringify(rfGraph([sgNode("n1", "D")])),
      "{壊れた json",
    );

    const parsed = FlowDataSchema.parse(JSON.parse(result));
    expect(parsed.sections[0].steps[0].title).toBe("D");
  });

  test("reactFlowData が壊れていれば defaultFlowData を返す", () => {
    const result = migrateRecordToFlowData("not json", undefined);

    expect(JSON.parse(result)).toEqual(defaultFlowData);
  });

  test("converter の warnings を flowData のメモへ畳み込む", () => {
    // 未知ノードのみ → ステップ化されず警告のみ → 受け皿セクションへ集約される
    const result = migrateRecordToFlowData(
      JSON.stringify(rfGraph([{ id: "x1", type: "Bogus", position: { x: 0, y: 0 }, data: {} }])),
      undefined,
    );

    const parsed = FlowDataSchema.parse(JSON.parse(result));
    const memos = parsed.sections.map((s) => s.memo).join("\n");
    expect(memos).toContain("未知のノード型");
  });
});
