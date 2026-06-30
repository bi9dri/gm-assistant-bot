import { describe, expect, spyOn, test } from "bun:test";

import type { FlowData } from "./schema";

import { foldWarningsIntoFlowData, migrateRecordToFlowData, reactFlowToFlowData } from "./migrate";
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

// console.error を黙らせつつ fn を実行する (フォールバック経路のログ汚染を防ぐ)
const silencingErrors = <T>(fn: () => T): T => {
  const spy = spyOn(console, "error").mockImplementation(() => {});
  try {
    return fn();
  } finally {
    spy.mockRestore();
  }
};

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

  test("同一ステップへの複数警告は \\n\\n 区切りで追記し既存内容を保つ", () => {
    const input = flow([{ id: "s1", title: "S1", steps: [setFlagStep("st1")] }]);

    const result = foldWarningsIntoFlowData(input, [
      { nodeId: "st1", message: "A" },
      { nodeId: "st1", message: "B" },
    ]);

    expect(result.sections[0].steps[0].memo).toBe("⚠️ A\n\n⚠️ B");
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

  test("nodeId がセクション id に一致する警告は当該セクションの memo に追記する", () => {
    const input = flow([
      { id: "s1", title: "S1", steps: [] },
      { id: "s2", title: "S2", steps: [] },
    ]);

    const result = foldWarningsIntoFlowData(input, [{ nodeId: "s2", message: "区間警告" }]);

    expect(result.sections[1].memo).toBe("⚠️ 区間警告");
    expect(result.sections[0].memo).toBe("");
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

  test("集約先セクションに既存 memo があれば \\n\\n 区切りで保持して追記する", () => {
    const input = flow([{ id: "s1", title: "S1", memo: "既存メモ", steps: [] }]);

    const result = foldWarningsIntoFlowData(input, [{ message: "孤立警告" }]);

    expect(result.sections[0].memo.startsWith("既存メモ\n\n⚠️ 変換時の警告:")).toBe(true);
    expect(result.sections[0].memo).toContain("- 孤立警告");
  });

  test("セクションが無い場合は受け皿セクションを作って集約する", () => {
    const input = flow([]);

    const result = foldWarningsIntoFlowData(input, [{ message: "孤立警告" }]);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].id).toBe("conversion-warnings");
    expect(result.sections[0].memo).toContain("孤立警告");
  });
});

describe("reactFlowToFlowData", () => {
  test("グラフを FlowData へ変換する", () => {
    const result = reactFlowToFlowData(rfGraph([sgNode("n1", "A")]));

    expect(result.sections[0].steps[0].title).toBe("A");
  });

  test("変換が throw する入力 (有効 JSON だが非グラフ) は空フロー + 警告メモにフォールバックする", () => {
    const result = silencingErrors(() => reactFlowToFlowData(42));

    const memos = result.sections.map((s) => s.memo).join("\n");
    expect(memos).toContain("変換できなかった");
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
    const result = silencingErrors(() =>
      migrateRecordToFlowData(JSON.stringify(rfGraph([sgNode("n1", "D")])), "{壊れた json"),
    );

    const parsed = FlowDataSchema.parse(JSON.parse(result));
    expect(parsed.sections[0].steps[0].title).toBe("D");
  });

  test("reactFlowData が壊れた JSON なら警告メモ付きの空フローにフォールバックする", () => {
    const result = silencingErrors(() => migrateRecordToFlowData("not json", undefined));

    const parsed = FlowDataSchema.parse(JSON.parse(result));
    const memos = parsed.sections.map((s) => s.memo).join("\n");
    expect(memos).toContain("不正な JSON");
  });

  test("reactFlowData が有効 JSON だが非グラフなら空フロー + 警告にフォールバックする", () => {
    const result = silencingErrors(() => migrateRecordToFlowData("42", undefined));

    const parsed = FlowDataSchema.parse(JSON.parse(result));
    const memos = parsed.sections.map((s) => s.memo).join("\n");
    expect(memos).toContain("変換できなかった");
  });

  test("reactFlowData が欠落 (undefined) なら defaultFlowData を返す", () => {
    const result = migrateRecordToFlowData(undefined, undefined);

    expect(JSON.parse(result)).toEqual(defaultFlowData);
  });

  test("変換結果を再度マイグレートしても変化しない (冪等)", () => {
    // 警告を伴うグラフ (Bogus ノード混在) で、畳み込み済みメモが再検証を通り
    // already-new 短絡に乗る = 二重畳み込みが起きないことを確認する
    const legacy = JSON.stringify(
      rfGraph([sgNode("n1", "A"), { id: "x1", type: "Bogus", position: { x: 0, y: 0 }, data: {} }]),
    );

    const once = migrateRecordToFlowData(legacy, undefined);
    const twice = migrateRecordToFlowData(legacy, once);

    expect(twice).toBe(once);
  });

  test("converter の warnings を flowData のメモへ畳み込む", () => {
    const result = migrateRecordToFlowData(
      JSON.stringify(rfGraph([{ id: "x1", type: "Bogus", position: { x: 0, y: 0 }, data: {} }])),
      undefined,
    );

    const parsed = FlowDataSchema.parse(JSON.parse(result));
    const memos = parsed.sections.map((s) => s.memo).join("\n");
    expect(memos).toContain("未知のノード型");
  });
});
