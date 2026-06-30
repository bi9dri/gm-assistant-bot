import { describe, expect, test } from "bun:test";

import type { FlowData } from "./schema";

import { collectResourcesFromFlow } from "./resources";

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
