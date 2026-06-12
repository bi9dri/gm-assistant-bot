import { describe, expect, test } from "bun:test";

import { convertReactFlowToFlowData } from "./convert";

let nodeSeq = 0;
const rfNode = (
  type: string,
  data: Record<string, unknown>,
  position: { x: number; y: number },
  extra: Record<string, unknown> = {},
) => ({
  id: `${type}-${++nodeSeq}`,
  type,
  position,
  data,
  ...extra,
});

const setFlag = (position: { x: number; y: number }, title = "フラグ設定") =>
  rfNode("SetGameFlag", { title, flagKey: "k", flagValue: "v" }, position);

const edge = (source: { id: string }, target: { id: string }, sourceHandle = "source-1") => ({
  id: `${source.id}->${target.id}`,
  source: source.id,
  target: target.id,
  sourceHandle,
});

const convert = (nodes: unknown[], edges: unknown[] = []) =>
  convertReactFlowToFlowData({ nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } });

describe("convertReactFlowToFlowData: 線形フロー", () => {
  test("空グラフは空の FlowData になる", () => {
    const { flowData, warnings } = convert([]);
    expect(flowData).toEqual({ version: 1, sections: [] });
    expect(warnings).toEqual([]);
  });

  test("エッジの順序に従って 1 セクションに直列化する (座標順ではない)", () => {
    const a = setFlag({ x: 0, y: 300 }, "A");
    const b = setFlag({ x: 0, y: 0 }, "B");
    const c = setFlag({ x: 0, y: 150 }, "C");
    const { flowData, warnings } = convert([b, c, a], [edge(a, b), edge(b, c)]);

    expect(warnings).toEqual([]);
    expect(flowData.sections).toHaveLength(1);
    expect(flowData.sections[0].title).toBe("未分類");
    expect(flowData.sections[0].steps.map((s) => s.title)).toEqual(["A", "B", "C"]);
  });

  test("複数の独立チェーンは座標 (y, x) 順に連結する", () => {
    const a1 = setFlag({ x: 0, y: 200 }, "A1");
    const a2 = setFlag({ x: 100, y: 200 }, "A2");
    const b1 = setFlag({ x: 0, y: 0 }, "B1");
    const { flowData } = convert([a1, a2, b1], [edge(a1, a2)]);

    expect(flowData.sections[0].steps.map((s) => s.title)).toEqual(["B1", "A1", "A2"]);
  });

  test("ステップの id / executedAt / ペイロードを引き継ぎ、autoAdvance は false になる", () => {
    const node = rfNode(
      "SendMessage",
      {
        title: "送信",
        executedAt: "2026-06-01T00:00:00.000Z",
        channelTargets: [{ type: "channelName", value: "general" }],
        messages: [{ content: "hi", attachments: [] }],
      },
      { x: 0, y: 0 },
    );
    const { flowData } = convert([node]);

    const step = flowData.sections[0].steps[0];
    expect(step.id).toBe(node.id);
    expect(step.type).toBe("SendMessage");
    expect(step.executedAt).toEqual(new Date("2026-06-01T00:00:00.000Z"));
    expect(step.autoAdvance).toBe(false);
  });

  test("title が無いノードは型名でフォールバックする", () => {
    const node = rfNode("SetGameFlag", { flagKey: "k", flagValue: "v" }, { x: 0, y: 0 });
    const { flowData } = convert([node]);
    expect(flowData.sections[0].steps[0].title).toBe("SetGameFlag");
  });

  test("未知のノード型はスキップして警告を返す", () => {
    const known = setFlag({ x: 0, y: 0 });
    const unknown = rfNode("Mystery", {}, { x: 0, y: 100 });
    const { flowData, warnings } = convert([known, unknown]);

    expect(flowData.sections[0].steps).toHaveLength(1);
    expect(warnings.some((w) => w.nodeId === unknown.id)).toBe(true);
  });
});

describe("convertReactFlowToFlowData: 異常系", () => {
  test("循環した接続でも全ノードを出力し、警告を返す", () => {
    const a = setFlag({ x: 0, y: 0 }, "A");
    const b = setFlag({ x: 0, y: 100 }, "B");
    const { flowData, warnings } = convert([a, b], [edge(a, b), edge(b, a)]);

    expect(flowData.sections[0].steps.map((s) => s.title)).toEqual(["A", "B"]);
    expect(warnings.some((w) => w.message.includes("循環"))).toBe(true);
  });

  test("読み取れないノードはスキップして警告を返す", () => {
    const { flowData, warnings } = convert([{ id: "broken" }, setFlag({ x: 0, y: 0 }, "A")]);

    expect(flowData.sections[0].steps.map((s) => s.title)).toEqual(["A"]);
    expect(warnings).toHaveLength(1);
  });

  test("新スキーマの検証に失敗するノードはスキップして警告を返す", () => {
    const invalid = rfNode(
      "ShuffleAssign",
      { title: "壊", items: [], targets: [], resultFlagPrefix: "" },
      { x: 0, y: 0 },
    );
    const ok = setFlag({ x: 0, y: 100 }, "A");
    const { flowData, warnings } = convert([invalid, ok], [edge(invalid, ok)]);

    expect(flowData.sections[0].steps.map((s) => s.title)).toEqual(["A"]);
    expect(warnings.some((w) => w.nodeId === invalid.id)).toBe(true);
  });
});

describe("convertReactFlowToFlowData: セクション (LabeledGroup)", () => {
  const group = (label: string, x: number, y: number, width: number, height: number) =>
    rfNode("LabeledGroup", { label }, { x, y }, { style: { width, height } });

  test("グループ内のノードはグループ名のセクションへ、外は「未分類」へ", () => {
    const g = group("第1章", 0, 0, 400, 300);
    const inside = setFlag({ x: 50, y: 50 }, "中");
    const outside = setFlag({ x: 1000, y: 1000 }, "外");
    const { flowData } = convert([g, inside, outside], [edge(inside, outside)]);

    expect(flowData.sections.map((s) => s.title)).toEqual(["第1章", "未分類"]);
    expect(flowData.sections[0].steps.map((s) => s.title)).toEqual(["中"]);
    expect(flowData.sections[1].steps.map((s) => s.title)).toEqual(["外"]);
  });

  test("実行順でグループが分断される場合はセクションを分割して警告する", () => {
    const g = group("章", 0, 0, 400, 1000);
    const in1 = setFlag({ x: 50, y: 50 }, "中1");
    const out = setFlag({ x: 1000, y: 100 }, "外");
    const in2 = setFlag({ x: 50, y: 500 }, "中2");
    const { flowData, warnings } = convert([g, in1, out, in2], [edge(in1, out), edge(out, in2)]);

    expect(flowData.sections.map((s) => s.title)).toEqual(["章", "未分類", "章"]);
    expect(warnings.some((w) => w.nodeId === g.id)).toBe(true);
  });

  test("ネストしたグループは内側のグループを優先する", () => {
    const outer = group("外側", 0, 0, 1000, 1000);
    const inner = group("内側", 100, 100, 300, 300);
    const node = setFlag({ x: 150, y: 150 }, "N");
    const { flowData } = convert([outer, inner, node]);

    expect(flowData.sections[0].title).toBe("内側");
  });
});

describe("convertReactFlowToFlowData: Comment の吸収", () => {
  const comment = (text: string, x: number, y: number) =>
    rfNode("Comment", { comment: text }, { x, y }, { style: { width: 200, height: 100 } });

  test("最近接ステップの memo に転記し、複数 Comment は連結する", () => {
    const near = setFlag({ x: 0, y: 0 }, "近");
    const far = setFlag({ x: 2000, y: 2000 }, "遠");
    const c1 = comment("メモ1", 0, 120);
    const c2 = comment("メモ2", 0, 260);
    const { flowData } = convert([near, far, c1, c2], [edge(near, far)]);

    const steps = flowData.sections[0].steps;
    expect(steps[0].memo).toBe("メモ1\n\nメモ2");
    expect(steps[1].memo).toBe("");
  });

  test("グループ内にステップが無い Comment はセクションの memo へ", () => {
    const g = rfNode(
      "LabeledGroup",
      { label: "導入" },
      { x: 0, y: 0 },
      {
        style: { width: 400, height: 300 },
      },
    );
    const c = comment("グループ用メモ", 50, 50);
    const far = setFlag({ x: 5000, y: 5000 }, "遠");
    const { flowData } = convert([g, c, far]);

    const introSection = flowData.sections.find((s) => s.title === "導入");
    expect(introSection?.memo).toBe("グループ用メモ");
    expect(flowData.sections.flatMap((s) => s.steps).every((s) => s.memo === "")).toBe(true);
  });
});

describe("convertReactFlowToFlowData: 分岐ノード", () => {
  test("SelectBranch は select モードの分岐ステップになり、後続は直列のまま", () => {
    const select = rfNode(
      "SelectBranch",
      {
        title: "ルート選択",
        options: [
          { id: "o1", label: "平和" },
          { id: "o2", label: "戦闘" },
        ],
        flagName: "route",
        selectedValue: "戦闘",
      },
      { x: 0, y: 0 },
    );
    const next = setFlag({ x: 0, y: 200 }, "次");
    const { flowData, warnings } = convert([select, next], [edge(select, next)]);

    expect(warnings).toEqual([]);
    const [branch, after] = flowData.sections[0].steps;
    if (branch.type !== "Branch") throw new Error("Branch であるべき");
    expect(branch.mode).toBe("select");
    expect(branch.flagName).toBe("route");
    expect(branch.branches.map((b) => b.label)).toEqual(["平和", "戦闘"]);
    expect(branch.executedBranchIds).toEqual(["o2"]);
    expect(after.title).toBe("次");
  });

  const conditionalBranch = (overrides: Record<string, unknown> = {}) =>
    rfNode(
      "ConditionalBranch",
      {
        title: "章で分岐",
        conditions: [
          {
            id: "c1",
            root: { type: "rule", id: "r1", flagKey: "chapter", operator: "equals", value: "1" },
          },
        ],
        hasDefaultBranch: true,
        matchMode: "first",
        ...overrides,
      },
      { x: 0, y: 0 },
    );

  const getBranch = (step: { type: string }) => {
    if (step.type !== "Branch") throw new Error("Branch であるべき");
    return step as Extract<
      ReturnType<
        typeof convertReactFlowToFlowData
      >["flowData"]["sections"][number]["steps"][number],
      { type: "Branch" }
    >;
  };

  test("ConditionalBranch は枝の内容をネストし、合流点以降は分岐の後に続く", () => {
    const cond = conditionalBranch({ matchMode: "all", evaluatedConditionIds: ["c1"] });
    const a = setFlag({ x: -100, y: 200 }, "枝1の中");
    const b = setFlag({ x: 100, y: 200 }, "デフォルトの中");
    const join = setFlag({ x: 0, y: 400 }, "合流後");
    const { flowData, warnings } = convert(
      [cond, a, b, join],
      [
        edge(cond, a, "source-cond-c1"),
        edge(cond, b, "source-default"),
        edge(a, join),
        edge(b, join),
      ],
    );

    expect(warnings).toEqual([]);
    const steps = flowData.sections[0].steps;
    expect(steps.map((s) => s.title)).toEqual(["章で分岐", "合流後"]);
    const branch = getBranch(steps[0]);
    expect(branch.mode).toBe("auto");
    expect(branch.matchMode).toBe("all");
    expect(branch.executedBranchIds).toEqual(["c1"]);
    expect(branch.branches[0].condition).toBeDefined();
    expect(branch.branches[0].steps.map((s) => s.title)).toEqual(["枝1の中"]);
    expect(branch.branches[1].condition).toBeUndefined();
    expect(branch.branches[1].steps.map((s) => s.title)).toEqual(["デフォルトの中"]);
  });

  test("合流点へ直接つながる枝は空のまま残る", () => {
    const cond = conditionalBranch();
    const a = setFlag({ x: 0, y: 200 }, "枝1の中");
    const join = setFlag({ x: 0, y: 400 }, "合流後");
    const { flowData, warnings } = convert(
      [cond, a, join],
      [edge(cond, a, "source-cond-c1"), edge(cond, join, "source-default"), edge(a, join)],
    );

    expect(warnings).toEqual([]);
    const steps = flowData.sections[0].steps;
    expect(steps.map((s) => s.title)).toEqual(["章で分岐", "合流後"]);
    const branch = getBranch(steps[0]);
    expect(branch.branches[0].steps.map((s) => s.title)).toEqual(["枝1の中"]);
    expect(branch.branches[1].steps).toEqual([]);
  });

  test("枝の途中で合流する場合は合流点以降を分岐の後ろへ出す", () => {
    const cond = conditionalBranch();
    const a = setFlag({ x: 0, y: 200 }, "枝1の中");
    const tail = setFlag({ x: 0, y: 400 }, "共有テール");
    const last = setFlag({ x: 0, y: 600 }, "最後");
    const { flowData, warnings } = convert(
      [cond, a, tail, last],
      [
        edge(cond, a, "source-cond-c1"),
        edge(cond, tail, "source-default"),
        edge(a, tail),
        edge(tail, last),
      ],
    );

    expect(warnings).toEqual([]);
    const steps = flowData.sections[0].steps;
    expect(steps.map((s) => s.title)).toEqual(["章で分岐", "共有テール", "最後"]);
    expect(getBranch(steps[0]).branches[0].steps.map((s) => s.title)).toEqual(["枝1の中"]);
  });

  test("分岐の中に分岐をネストできる", () => {
    const outer = conditionalBranch({ title: "外側" });
    const inner = conditionalBranch({ title: "内側" });
    inner.position = { x: 0, y: 200 };
    const a = setFlag({ x: -100, y: 400 }, "内側の枝1");
    const b = setFlag({ x: 100, y: 400 }, "内側のデフォルト");
    const join = setFlag({ x: 0, y: 600 }, "合流後");
    const { flowData, warnings } = convert(
      [outer, inner, a, b, join],
      [
        edge(outer, inner, "source-cond-c1"),
        edge(outer, join, "source-default"),
        edge(inner, a, "source-cond-c1"),
        edge(inner, b, "source-default"),
        edge(a, join),
        edge(b, join),
      ],
    );

    expect(warnings).toEqual([]);
    const steps = flowData.sections[0].steps;
    expect(steps.map((s) => s.title)).toEqual(["外側", "合流後"]);
    const outerBranch = getBranch(steps[0]);
    const innerBranch = getBranch(outerBranch.branches[0].steps[0]);
    expect(innerBranch.title).toBe("内側");
    expect(innerBranch.branches[0].steps.map((s) => s.title)).toEqual(["内側の枝1"]);
    expect(innerBranch.branches[1].steps.map((s) => s.title)).toEqual(["内側のデフォルト"]);
  });

  test("デフォルト枝の実行 (evaluatedConditionIds が空) は default 枝の実行として引き継ぐ", () => {
    const cond = conditionalBranch({
      evaluatedConditionIds: [],
      executedAt: "2026-06-01T00:00:00.000Z",
    });
    const { flowData } = convert([cond]);

    const branch = getBranch(flowData.sections[0].steps[0]);
    expect(branch.executedBranchIds).toEqual(["default"]);
    expect(branch.executedAt).toEqual(new Date("2026-06-01T00:00:00.000Z"));
  });

  test("同じ枝ハンドルに複数の接続がある場合はフラット化 + ⚠️ メモ + 警告にフォールバックする", () => {
    const cond = conditionalBranch();
    const a = setFlag({ x: 0, y: 200 }, "A");
    const b = setFlag({ x: 100, y: 200 }, "B");
    const { flowData, warnings } = convert(
      [cond, a, b],
      [edge(cond, a, "source-cond-c1"), edge(cond, b, "source-cond-c1")],
    );

    const steps = flowData.sections[0].steps;
    expect(steps.map((s) => s.title)).toEqual(["章で分岐", "A", "B"]);
    const branch = getBranch(steps[0]);
    expect(branch.branches.every((arm) => arm.steps.length === 0)).toBe(true);
    expect(branch.memo).toContain("⚠️");
    expect(warnings.some((w) => w.nodeId === cond.id)).toBe(true);
  });

  test("対応する枝が無いハンドルの接続はフラット化して警告する", () => {
    const cond = conditionalBranch();
    const a = setFlag({ x: 0, y: 200 }, "枝1の中");
    const zombie = setFlag({ x: 100, y: 200 }, "迷子");
    const { flowData, warnings } = convert(
      [cond, a, zombie],
      [edge(cond, a, "source-cond-c1"), edge(cond, zombie, "source-cond-removed")],
    );

    const steps = flowData.sections[0].steps;
    expect(steps.map((s) => s.title)).toEqual(["章で分岐", "迷子"]);
    expect(getBranch(steps[0]).branches[0].steps.map((s) => s.title)).toEqual(["枝1の中"]);
    expect(warnings.some((w) => w.nodeId === cond.id)).toBe(true);
  });

  test("エッジの並び順に関係なく合流点を検出する", () => {
    const cond = conditionalBranch();
    const a = setFlag({ x: 0, y: 200 }, "枝1の中");
    const join = setFlag({ x: 0, y: 400 }, "合流後");
    const { flowData, warnings } = convert(
      [cond, a, join],
      [edge(cond, join, "source-default"), edge(cond, a, "source-cond-c1"), edge(a, join)],
    );

    expect(warnings).toEqual([]);
    expect(flowData.sections[0].steps.map((s) => s.title)).toEqual(["章で分岐", "合流後"]);
    expect(getBranch(flowData.sections[0].steps[0]).branches[0].steps.map((s) => s.title)).toEqual([
      "枝1の中",
    ]);
  });

  test("条件ツリーが壊れている分岐はスキップして警告する", () => {
    const cond = conditionalBranch({ conditions: [{ id: "c1", root: null }] });
    const { flowData, warnings } = convert([cond]);

    expect(flowData.sections).toEqual([]);
    expect(warnings.some((w) => w.nodeId === cond.id)).toBe(true);
  });

  test("分岐データ自体が壊れている場合はスキップし、接続は辿る", () => {
    const cond = conditionalBranch({ conditions: "broken" });
    const next = setFlag({ x: 0, y: 200 }, "次");
    const { flowData, warnings } = convert([cond, next], [edge(cond, next, "source-cond-c1")]);

    expect(flowData.sections[0].steps.map((s) => s.title)).toEqual(["次"]);
    expect(warnings.some((w) => w.nodeId === cond.id)).toBe(true);
  });

  test("分岐以外のノードに複数の接続がある場合は最初のみ辿り、残りは末尾に回す", () => {
    const s = setFlag({ x: 0, y: 0 }, "S");
    const a = setFlag({ x: 0, y: 200 }, "A");
    const b = setFlag({ x: 100, y: 200 }, "B");
    const { flowData, warnings } = convert([s, a, b], [edge(s, a), edge(s, b)]);

    expect(flowData.sections[0].steps.map((step) => step.title)).toEqual(["S", "A", "B"]);
    expect(warnings.some((w) => w.nodeId === s.id)).toBe(true);
  });

  test("Comment はネストされた枝の中のステップにも吸収される", () => {
    const cond = conditionalBranch();
    const a = setFlag({ x: 0, y: 200 }, "枝1の中");
    const c = rfNode(
      "Comment",
      { comment: "枝メモ" },
      { x: 0, y: 220 },
      { style: { width: 100, height: 50 } },
    );
    const { flowData } = convert([cond, a, c], [edge(cond, a, "source-cond-c1")]);

    const branch = getBranch(flowData.sections[0].steps[0]);
    expect(branch.branches[0].steps[0].memo).toBe("枝メモ");
  });
});

describe("convertReactFlowToFlowData: Blueprint", () => {
  test("Blueprint はステップ化せず、セクション memo に内容を残して警告する", () => {
    const bp = rfNode(
      "Blueprint",
      {
        title: "基本セット",
        parameters: {
          characterNames: ["A", "B"],
          voiceChannelCount: 2,
          categoryName: "cat",
          sharedTextChannels: [],
        },
      },
      { x: 0, y: 0 },
    );
    const next = setFlag({ x: 0, y: 200 }, "次");
    const { flowData, warnings } = convert([bp, next], [edge(bp, next)]);

    expect(flowData.sections[0].steps.map((s) => s.title)).toEqual(["次"]);
    expect(flowData.sections[0].memo).toContain("Blueprint");
    expect(flowData.sections[0].memo).toContain("characterNames");
    expect(warnings.some((w) => w.nodeId === bp.id)).toBe(true);
  });
});
