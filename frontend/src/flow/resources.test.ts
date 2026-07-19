import { describe, expect, test } from "bun:test";

import type { FlowData } from "./schema";

import {
  collectFlagKeyOptions,
  collectFlagValueOptions,
  collectResourcesFromFlow,
  formatFlagValue,
} from "./resources";

const flow: FlowData = {
  version: 1,
  sections: [
    {
      id: "s1",
      title: "",
      memo: "",
      collapsed: false,
      steps: [
        {
          id: "r1",
          type: "CreateRole",
          title: "",
          memo: "",
          autoAdvance: false,
          roles: ["市民", "  ", "人狼"],
        },
        {
          id: "c1",
          type: "CreateChannel",
          title: "",
          memo: "",
          autoAdvance: false,
          channels: [
            { name: "全体", type: "text", rolePermissions: [] },
            { name: " ", type: "voice", rolePermissions: [] },
          ],
        },
        {
          id: "f1",
          type: "SetGameFlag",
          title: "",
          memo: "",
          autoAdvance: false,
          flagKey: "phase",
          flagValue: "night",
          flagKeyOptions: [],
          flagValueOptions: [],
        },
        {
          id: "ct1",
          type: "Counter",
          title: "",
          memo: "",
          autoAdvance: false,
          flagKey: "round",
          step: 1,
        },
        {
          id: "sa1",
          type: "ShuffleAssign",
          title: "",
          memo: "",
          autoAdvance: false,
          items: ["x", "y"],
          targets: ["t1", "t2"],
          resultFlagPrefix: "assign",
        },
      ],
    },
    {
      id: "s2",
      title: "",
      memo: "",
      collapsed: false,
      steps: [
        {
          id: "b1",
          type: "Branch",
          title: "",
          memo: "",
          autoAdvance: false,
          mode: "select",
          matchMode: "first",
          flagName: "vote",
          branches: [
            {
              id: "a1",
              label: "賛成",
              steps: [
                {
                  id: "rs1",
                  type: "RandomSelect",
                  title: "",
                  memo: "",
                  autoAdvance: false,
                  items: ["A", "B"],
                  resultFlagKey: "winner",
                },
              ],
            },
            { id: "a2", label: "反対", steps: [] },
          ],
        },
      ],
    },
  ],
};

describe("collectResourcesFromFlow", () => {
  const resources = collectResourcesFromFlow(flow);

  test("空白を除いたロール名を収集", () => {
    expect(resources.roles.map((role) => role.name)).toEqual(["市民", "人狼"]);
  });

  test("空白を除いたチャンネル名を収集 (type 付き)", () => {
    expect(resources.channels).toEqual([{ name: "全体", type: "text", sourceNodeId: "c1" }]);
  });

  test("各種ステップからゲームフラグ key を収集", () => {
    expect(resources.gameFlags.map((flag) => flag.key).sort()).toEqual(
      ["assign_t1", "assign_t2", "phase", "round", "vote", "winner"].sort(),
    );
  });

  test("ShuffleAssign は prefix_target 形式のフラグを target ごとに生成", () => {
    expect(
      resources.gameFlags
        .filter((flag) => flag.key.startsWith("assign_"))
        .map((flag) => flag.key)
        .sort(),
    ).toEqual(["assign_t1", "assign_t2"]);
  });

  test("select 分岐は枝ラベルを values にする", () => {
    expect(resources.gameFlags.find((flag) => flag.key === "vote")?.values).toEqual([
      "賛成",
      "反対",
    ]);
  });

  test("分岐枝の中のステップも再帰的に収集", () => {
    expect(resources.gameFlags.some((flag) => flag.key === "winner")).toBe(true);
  });
});

// auto モード分岐は select と異なり flagName を持たず、枝ラベルも values にしない。
const autoFlow: FlowData = {
  version: 1,
  sections: [
    {
      id: "s1",
      title: "",
      memo: "",
      collapsed: false,
      steps: [
        {
          id: "ab1",
          type: "Branch",
          title: "",
          memo: "",
          autoAdvance: false,
          mode: "auto",
          matchMode: "first",
          flagName: "ignoredFlag",
          branches: [
            {
              id: "arm1",
              label: "条件枝",
              condition: {
                type: "rule",
                id: "rule1",
                flagKey: "team",
                operator: "equals",
                value: "red",
                valueType: "literal",
              },
              steps: [
                {
                  id: "sg1",
                  type: "SetGameFlag",
                  title: "",
                  memo: "",
                  autoAdvance: false,
                  flagKey: "innerFlag",
                  flagValue: "1",
                  flagKeyOptions: [],
                  flagValueOptions: [],
                },
              ],
            },
            { id: "arm2", label: "デフォルト枝", steps: [] },
          ],
        },
      ],
    },
  ],
};

describe("collectResourcesFromFlow (auto モード分岐)", () => {
  const resources = collectResourcesFromFlow(autoFlow);

  test("auto モードは flagName を gameFlag に出さない", () => {
    expect(resources.gameFlags.some((flag) => flag.key === "ignoredFlag")).toBe(false);
  });

  test("auto モードでも枝内のステップは再帰的に収集する", () => {
    expect(resources.gameFlags.some((flag) => flag.key === "innerFlag")).toBe(true);
  });
});

describe("collectResourcesFromFlow (gameFlags マージ)", () => {
  const resources = collectResourcesFromFlow(flow, {
    seedOnly: "初期値",
    phase: "day",
    count: 3,
    "  ": "空白キーはスキップ",
    empty: "",
  });

  test("フラグパネル由来のキーを候補に含める", () => {
    expect(resources.gameFlags.some((flag) => flag.key === "seedOnly")).toBe(true);
  });

  test("非文字列の値も文字列化して values に載せる", () => {
    expect(resources.gameFlags.find((flag) => flag.key === "count")?.values).toEqual(["3"]);
  });

  test("空白キーはスキップ・空値は values に載せない", () => {
    expect(resources.gameFlags.some((flag) => flag.key.trim() === "")).toBe(false);
    expect(resources.gameFlags.find((flag) => flag.key === "empty")?.values).toEqual([]);
  });

  test("ステップ由来のフラグと共存する (phase は seed とステップの両方から)", () => {
    expect(resources.gameFlags.filter((flag) => flag.key === "phase")).toHaveLength(2);
  });
});

describe("collectFlagKeyOptions / collectFlagValueOptions", () => {
  const resources = collectResourcesFromFlow(flow, { phase: "day" });

  test("キー候補は重複を除いて列挙する", () => {
    const options = collectFlagKeyOptions(resources);
    expect(options.filter((key) => key === "phase")).toHaveLength(1);
    expect(options.sort()).toEqual(
      ["assign_t1", "assign_t2", "phase", "round", "vote", "winner"].sort(),
    );
  });

  test("値候補は指定キーの値のみを重複を除いて列挙する", () => {
    expect(collectFlagValueOptions(resources, "phase").sort()).toEqual(["day", "night"].sort());
    expect(collectFlagValueOptions(resources, "vote")).toEqual(["賛成", "反対"]);
  });

  test("キー未入力・未知キーの値候補は空", () => {
    expect(collectFlagValueOptions(resources, "")).toEqual([]);
    expect(collectFlagValueOptions(resources, "unknown")).toEqual([]);
  });
});

describe("formatFlagValue", () => {
  test("null / undefined は空文字列", () => {
    expect(formatFlagValue(null)).toBe("");
    expect(formatFlagValue(undefined)).toBe("");
  });

  test("プリミティブは String 化・それ以外は JSON 化", () => {
    expect(formatFlagValue("a")).toBe("a");
    expect(formatFlagValue(3)).toBe("3");
    expect(formatFlagValue(true)).toBe("true");
    expect(formatFlagValue({ a: 1 })).toBe('{"a":1}');
  });
});
