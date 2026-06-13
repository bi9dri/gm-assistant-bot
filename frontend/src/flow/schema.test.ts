import { describe, expect, test } from "bun:test";

import { FlowDataSchema, StepSchema } from "./schema";

const sendMessageStep = (overrides: Record<string, unknown> = {}) => ({
  id: "step-send",
  type: "SendMessage",
  title: "メッセージを送信する",
  channelTargets: [{ type: "channelName", value: "general" }],
  messages: [{ content: "hello", attachments: [] }],
  ...overrides,
});

const arm = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  label: `枝${id}`,
  steps: [],
  ...overrides,
});

const rule = (id: string) => ({
  type: "rule",
  id,
  flagKey: "chapter",
  operator: "equals",
  value: "1",
});

const branchStep = (overrides: Record<string, unknown> = {}) => ({
  id: "step-branch",
  type: "Branch",
  title: "条件分岐",
  mode: "auto",
  branches: [arm("a", { condition: rule("r1") }), arm("b")],
  ...overrides,
});

const flowData = (steps: unknown[]): unknown => ({
  version: 1,
  sections: [{ id: "sec-1", title: "セットアップ", steps }],
});

describe("FlowDataSchema", () => {
  test("セクション + 線形ステップを受理し、共通フィールドのデフォルトを補完する", () => {
    const parsed = FlowDataSchema.parse(flowData([sendMessageStep()]));

    const step = parsed.sections[0].steps[0];
    expect(step.memo).toBe("");
    expect(step.autoAdvance).toBe(false);
    expect(step.executedAt).toBeUndefined();
    expect(parsed.sections[0].memo).toBe("");
    expect(parsed.sections[0].collapsed).toBe(false);
  });

  test("JSON 経由の executedAt (ISO文字列) を Date に復元する", () => {
    const data = FlowDataSchema.parse(
      flowData([sendMessageStep({ executedAt: new Date("2026-06-12T00:00:00Z") })]),
    );
    const roundTripped = FlowDataSchema.parse(JSON.parse(JSON.stringify(data)));

    expect(roundTripped.sections[0].steps[0].executedAt).toEqual(new Date("2026-06-12T00:00:00Z"));
  });

  test("version が 1 以外なら拒否する", () => {
    const result = FlowDataSchema.safeParse({ version: 2, sections: [] });
    expect(result.success).toBe(false);
  });

  test("未知のステップ型を拒否する", () => {
    const result = FlowDataSchema.safeParse(flowData([sendMessageStep({ type: "Unknown" })]));
    expect(result.success).toBe(false);
  });
});

describe("StepSchema (Branch)", () => {
  test("分岐の中に分岐をネストでき、JSON 往復後も parse できる", () => {
    const nested = branchStep({
      id: "outer",
      branches: [
        arm("a", {
          condition: rule("r1"),
          steps: [branchStep({ id: "inner" }), sendMessageStep()],
        }),
        arm("b"),
      ],
    });
    const parsed = StepSchema.parse(JSON.parse(JSON.stringify(nested)));

    if (parsed.type !== "Branch") throw new Error("Branch であるべき");
    expect(parsed.matchMode).toBe("first");
    const innerSteps = parsed.branches[0].steps;
    expect(innerSteps[0].type).toBe("Branch");
    expect(innerSteps[1].type).toBe("SendMessage");
  });

  test("auto モード: 条件なし枝 (デフォルト枝) は末尾の1つだけ許す", () => {
    const defaultNotLast = branchStep({
      branches: [arm("a"), arm("b", { condition: rule("r1") })],
    });
    expect(StepSchema.safeParse(defaultNotLast).success).toBe(false);

    const twoDefaults = branchStep({
      branches: [arm("a", { condition: rule("r1") }), arm("b"), arm("c")],
    });
    expect(StepSchema.safeParse(twoDefaults).success).toBe(false);

    const defaultLast = branchStep({
      branches: [arm("a", { condition: rule("r1") }), arm("b")],
    });
    expect(StepSchema.safeParse(defaultLast).success).toBe(true);
  });

  test("select モード: 枝に条件を持てない", () => {
    const invalid = branchStep({
      mode: "select",
      branches: [arm("a", { condition: rule("r1") }), arm("b")],
    });
    expect(StepSchema.safeParse(invalid).success).toBe(false);

    const valid = branchStep({ mode: "select", flagName: "route", branches: [arm("a"), arm("b")] });
    expect(StepSchema.safeParse(valid).success).toBe(true);
  });

  test("枝が空の分岐を拒否する", () => {
    expect(StepSchema.safeParse(branchStep({ branches: [] })).success).toBe(false);
  });

  test("条件ツリー: グループの children が空なら拒否する", () => {
    const emptyGroup = branchStep({
      branches: [
        arm("a", { condition: { type: "group", id: "g1", logic: "and", children: [] } }),
        arm("b"),
      ],
    });
    expect(StepSchema.safeParse(emptyGroup).success).toBe(false);
  });
});
